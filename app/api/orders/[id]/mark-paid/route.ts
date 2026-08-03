import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';
import { enqueueReceipt } from '@/lib/print';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff(request);
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const supabase = createAdminClient();

  const { data: current } = await supabase.from('orders').select('payment_status').eq('id', id).single();
  if (!current) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (current.payment_status === 'PAID') {
    return NextResponse.json({ error: 'Order is already paid' }, { status: 400 });
  }

  const { data, error } = await supabase.from('orders').update({ payment_status: 'PAID' }).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Pembayaran tunai sudah diverifikasi kasir -> struk masuk antrian printer.
  const print = await enqueueReceipt(id, { trigger: 'CASH_VERIFIED', verifiedBy: staff.name });

  return NextResponse.json({ ...data, print_queued: print.ok });
}
