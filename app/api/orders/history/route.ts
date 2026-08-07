import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';

export async function GET(request: NextRequest) {
  if (!await requireStaff(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('orders').select('*, table:tables(*), items:order_items(*)').or('is_archived.eq.true,status.eq.CANCELLED').order('created_at', { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/**
 * Hapus riwayat. Tanpa parameter = seluruh riwayat (perilaku lama, dipakai
 * tombol "Hapus Semua" di dashboard owner).
 *
 * `?from=&to=` membatasi ke satu rentang `created_at` — inilah yang dipakai
 * aplikasi kasir untuk "hapus riwayat hari / bulan / tahun ini". Keduanya
 * ISO-8601 **lengkap dengan offset zona waktu**: batas "hari" di warung adalah
 * tengah malam WIB, bukan UTC, dan pemanggilnya yang tahu zona itu.
 * `from` inklusif, `to` eksklusif.
 */
export async function DELETE(request: NextRequest) {
  if (!await requireStaff(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createAdminClient();

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  for (const [name, value] of [['from', from], ['to', to]] as const) {
    if (value && Number.isNaN(Date.parse(value))) {
      return NextResponse.json({ error: `Parameter ${name} bukan tanggal yang sah` }, { status: 400 });
    }
  }

  // Definisi "riwayat" harus sama persis dengan GET di atas. Memakai
  // `status in (SERVED, CANCELLED)` seperti versi lama ikut menghapus order
  // SERVED yang masih menunggu pembayaran di board kasir.
  let query = supabase.from('orders').delete().or('is_archived.eq.true,status.eq.CANCELLED');
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lt('created_at', to);

  const { data, error } = await query.select('id');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, deleted: data?.length ?? 0 });
}
