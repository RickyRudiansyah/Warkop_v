import { createAdminClient, createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

async function requireAuth() {
  const supabaseAuth = await createClient();
  const { data: { session } } = await supabaseAuth.auth.getSession();
  if (!session) return null;
  const { data: staff } = await supabaseAuth.from('staff_users').select('role').eq('id', session.user.id).maybeSingle();
  return staff || null;
}

export async function DELETE() {
  const staff = await requireAuth();
  if (!staff || staff.role !== 'owner') return NextResponse.json({ error: 'Unauthorized — only owner can reset all data' }, { status: 401 });

  const supabase = createAdminClient();

  const { error: logError } = await supabase.from('activity_logs').delete().neq('id', '' as any);
  if (logError) return NextResponse.json({ error: 'Gagal hapus activity logs: ' + logError.message }, { status: 500 });

  const { error: orderError } = await supabase.from('orders').delete().neq('id', '' as any);
  if (orderError) return NextResponse.json({ error: 'Gagal hapus orders: ' + orderError.message }, { status: 500 });

  return NextResponse.json({ success: true, message: 'Semua order dan activity log berhasil dihapus' });
}
