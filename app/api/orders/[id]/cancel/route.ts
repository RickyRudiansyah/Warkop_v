import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireStaff(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const { reason } = await request.json();
  const supabase = createAdminClient();

  const { data: current } = await supabase.from('orders').select('status').eq('id', id).single();
  if (!current) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (current.status === 'SERVED' || current.status === 'CANCELLED') {
    return NextResponse.json({ error: 'Cannot cancel a completed or already cancelled order' }, { status: 400 });
  }

  const { data, error } = await supabase.from('orders').update({ status: 'CANCELLED', cancel_reason: reason }).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
