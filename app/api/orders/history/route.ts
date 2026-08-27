import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';
import { readHistoryRange } from '@/lib/history-range';

/**
 * Riwayat order: diarsipkan **atau** dibatalkan.
 *
 * `?from=&to=&limit=` — lihat `lib/history-range.ts`. Tanpa parameter, yang
 * dikembalikan adalah 200 order terbaru, **bukan** seluruh riwayat.
 *
 * `?count=1` mengembalikan `{ count }` saja untuk rentang yang sama. Dipakai
 * dialog "Hapus Riwayat": jumlah yang akan terhapus tidak boleh dihitung dari
 * daftar yang kebetulan sedang dimuat klien, karena sejak ada batas di atas
 * daftar itu tidak lagi memuat semuanya — dan penghapusannya permanen.
 */
export async function GET(request: NextRequest) {
  if (!await requireStaff(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { from, to, limit, error: rangeError } = readHistoryRange(request);
  if (rangeError) return NextResponse.json({ error: rangeError }, { status: 400 });

  const supabase = createAdminClient();
  const isHistory = 'is_archived.eq.true,status.eq.CANCELLED';

  if (new URL(request.url).searchParams.get('count') === '1') {
    let counter = supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .or(isHistory);
    if (from) counter = counter.gte('created_at', from);
    if (to) counter = counter.lt('created_at', to);

    const { count, error } = await counter;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ count: count ?? 0 });
  }

  let query = supabase
    .from('orders')
    .select('*, table:tables(*), items:order_items(*)')
    .or(isHistory)
    .order('created_at', { ascending: false })
    .limit(limit);
  if (from) query = query.gte('created_at', from);
  if (to) query = query.lt('created_at', to);

  const { data, error } = await query;
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
