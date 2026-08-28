import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';
import { readHistoryRange } from '@/lib/history-range';

export const dynamic = 'force-dynamic';

/**
 * Ringkasan rekap penjualan untuk dashboard owner.
 *
 * GET /api/reports/summary?from=&to=
 *
 * **Dibuat karena dashboard owner dulu menghitungnya sendiri di browser.**
 * Ia menarik `/api/orders?history=1` lengkap dengan seluruh `order_items`
 * — 775 KB untuk rentang 7 hari — lalu memakainya untuk menampilkan enam angka,
 * satu daftar top-10 menu, dan sepuluh order terbaru. Balasan endpoint ini
 * sekitar 2 KB.
 *
 * Yang penting bukan cuma ukurannya. Angka rekap sekarang dihitung di SATU
 * tempat, dengan aturan yang sama seperti aplikasi kasir:
 *
 *   * omzet = `total_amount - refunded_amount`, hanya order `SERVED`
 *     (keputusan pemilik: uang refund mengurangi omzet hari itu);
 *   * order batal tidak pernah masuk omzet, tapi ikut dihitung jumlahnya.
 *
 * Sebelumnya rumus itu hidup terpisah di browser, dan setiap kali aturannya
 * berubah ada dua tempat yang harus diingat.
 */

interface TopMenu {
  name: string;
  count: number;
  revenue: number;
}

export async function GET(request: NextRequest) {
  if (!await requireStaff(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { from, to, error: rangeError } = readHistoryRange(request);
  if (rangeError) return NextResponse.json({ error: rangeError }, { status: 400 });

  const supabase = createAdminClient();
  const isHistory = 'is_archived.eq.true,status.eq.CANCELLED';

  // Kolomnya sengaja sedikit: yang dibutuhkan cuma status dan dua angka.
  // Menarik `*` di sini akan mengembalikan lagi sebagian besar berat yang
  // justru sedang dihilangkan.
  let ordersQuery = supabase
    .from('orders')
    .select('status, total_amount, refunded_amount')
    .or(isHistory);
  if (from) ordersQuery = ordersQuery.gte('created_at', from);
  if (to) ordersQuery = ordersQuery.lt('created_at', to);

  // Sepuluh order terbaru untuk panel "Order Terbaru". Dibatasi di server, jadi
  // tidak ada hubungannya dengan berapa banyak order dalam rentangnya.
  let recentQuery = supabase
    .from('orders')
    .select('id, status, total_amount, created_at, table:tables(table_number, label)')
    .or(isHistory)
    .order('created_at', { ascending: false })
    .limit(10);
  if (from) recentQuery = recentQuery.gte('created_at', from);
  if (to) recentQuery = recentQuery.lt('created_at', to);

  // Item untuk "Top Menu Terlaris". `orders!inner` memfilter lewat tabel induk
  // dalam SATU permintaan — tanpa itu, jalannya jadi ambil-id-lalu-ambil-item
  // bertahap, yang persis membuat /api/reports/menu-sales makan 2 detik.
  let itemsQuery = supabase
    .from('order_items')
    .select('menu_item_name, quantity, subtotal, orders!inner(status, is_archived, created_at)')
    .eq('orders.status', 'SERVED')
    .eq('orders.is_archived', true);
  if (from) itemsQuery = itemsQuery.gte('orders.created_at', from);
  if (to) itemsQuery = itemsQuery.lt('orders.created_at', to);

  const [orders, recent, items] = await Promise.all([
    ordersQuery,
    recentQuery,
    itemsQuery,
  ]);

  for (const r of [orders, recent, items]) {
    if (r.error) return NextResponse.json({ error: r.error.message }, { status: 500 });
  }

  let revenue = 0;
  let refunded = 0;
  let cancelled = 0;

  for (const o of orders.data ?? []) {
    refunded += o.refunded_amount ?? 0;
    if (o.status === 'CANCELLED') { cancelled++; continue; }
    if (o.status === 'SERVED') revenue += o.total_amount - (o.refunded_amount ?? 0);
  }

  const totalOrders = orders.data?.length ?? 0;

  const tally = new Map<string, TopMenu>();
  for (const it of items.data ?? []) {
    const row = tally.get(it.menu_item_name)
      ?? { name: it.menu_item_name, count: 0, revenue: 0 };
    row.count += it.quantity ?? 0;
    row.revenue += it.subtotal ?? 0;
    tally.set(it.menu_item_name, row);
  }
  const topMenu = [...tally.values()].sort((a, b) => b.count - a.count).slice(0, 10);

  return NextResponse.json({
    from,
    to,
    revenue,
    refunded,
    orders: totalOrders,
    cancelled,
    // Dihitung di sini supaya browser tidak perlu menjaga aturan pembagian nol.
    avg_order: totalOrders > 0 ? Math.round(revenue / totalOrders) : 0,
    cancel_rate: totalOrders > 0 ? Math.round((cancelled / totalOrders) * 100) : 0,
    top_menu: topMenu,
    recent: recent.data ?? [],
  });
}
