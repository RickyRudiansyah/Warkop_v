import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';

export async function DELETE(request: NextRequest) {
  const staff = await requireStaff(request);
  if (!staff || staff.role !== 'owner') return NextResponse.json({ error: 'Unauthorized — only owner can reset all data' }, { status: 401 });

  const supabase = createAdminClient();

  const { error: logError } = await supabase.from('activity_logs').delete().neq('id', '' as any);
  if (logError) return NextResponse.json({ error: 'Gagal hapus activity logs: ' + logError.message }, { status: 500 });

  const { error: orderError } = await supabase.from('orders').delete().neq('id', '' as any);
  if (orderError) return NextResponse.json({ error: 'Gagal hapus orders: ' + orderError.message }, { status: 500 });

  return NextResponse.json({ success: true, message: 'Semua order dan activity log berhasil dihapus' });
}
