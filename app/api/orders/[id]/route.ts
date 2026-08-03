import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireStaff(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('orders').select('*, table:tables(*), items:order_items(*)').eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireStaff(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: order } = await supabase.from('orders').select('status').eq('id', id).single();
  if (!order) return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 });
  if (!['SERVED', 'CANCELLED'].includes(order.status)) {
    return NextResponse.json({ error: 'Hanya order yang sudah selesai atau dibatalkan yang bisa dihapus' }, { status: 400 });
  }

  const { error } = await supabase.from('orders').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
