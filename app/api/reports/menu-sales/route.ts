import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface Row {
  menu_item_id: string | null;
  menu_item_name: string;
  qty_sold: number;
  revenue: number;
  cost: number;
  gross_profit: number;
}

/**
 * Laporan penjualan per menu dalam rentang waktu.
 *
 * GET /api/reports/menu-sales?from=<ISO8601>&to=<ISO8601>
 *
 * Dua hal yang menentukan angkanya bisa dipercaya atau tidak:
 *
 * 1. Hanya order `payment_status = PAID` dan `status != CANCELLED` yang dihitung.
 *    Order batal atau belum dibayar bukan penjualan.
 * 2. Biaya diambil dari `cost_price_snapshot` (nilai saat transaksi terjadi),
 *    BUKAN dari `menu_items.cost_price` sekarang. Kalau memakai yang sekarang,
 *    laba bulan lalu akan berubah sendiri setiap harga modal diperbarui.
 */
export async function GET(request: NextRequest) {
  if (!await requireStaff(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const supabase = createAdminClient();

  // SATU permintaan, difilter lewat tabel induk dengan `orders!inner`.
  //
  // Versi sebelumnya dua tahap: ambil seluruh id order dalam rentang, lalu
  // ambil `order_items` bertahap per 200 id karena `.in()` punya batas panjang
  // URL. Pada 723 order itu lima perjalanan bolak-balik ke Supabase dan
  // memakan ~2,1 detik. Filter pada tabel induk melakukannya sekaligus.
  let itemQuery = supabase
    .from('order_items')
    // Ditulis satu baris utuh: potongan string yang disambung `+` membuat
    // inferensi tipe supabase-js menyerah, dan hasilnya jadi GenericStringError.
    .select('menu_item_id, menu_item_name, quantity, subtotal, cost_price_snapshot, orders!inner(created_at, payment_status, status)')
    .eq('orders.payment_status', 'PAID')
    .neq('orders.status', 'CANCELLED');

  if (from) itemQuery = itemQuery.gte('orders.created_at', from);
  if (to) itemQuery = itemQuery.lte('orders.created_at', to);

  const { data: rows, error: itemError } = await itemQuery;
  if (itemError) return NextResponse.json({ error: itemError.message }, { status: 500 });

  const totals = new Map<string, Row>();

  for (const it of rows ?? []) {
    // Menu yang sudah dihapus punya menu_item_id null — kelompokkan per nama
    // supaya penjualannya tidak hilang dari laporan.
    const key = it.menu_item_id ?? 'nama:' + it.menu_item_name;
    const row = totals.get(key) ?? {
      menu_item_id: it.menu_item_id,
      menu_item_name: it.menu_item_name,
      qty_sold: 0, revenue: 0, cost: 0, gross_profit: 0,
    };
    row.qty_sold += it.quantity ?? 0;
    row.revenue += it.subtotal ?? 0;
    row.cost += (it.cost_price_snapshot ?? 0) * (it.quantity ?? 0);
    totals.set(key, row);
  }

  // Menu yang TIDAK pernah terjual tetap dimunculkan dengan qty_sold 0 —
  // justru inilah yang paling ingin dilihat owner di daftar "kurang laku".
  const { data: allMenu, error: menuError } = await supabase
    .from('menu_items').select('id, name');
  if (menuError) return NextResponse.json({ error: menuError.message }, { status: 500 });

  for (const m of allMenu ?? []) {
    if (!totals.has(m.id)) {
      totals.set(m.id, {
        menu_item_id: m.id, menu_item_name: m.name,
        qty_sold: 0, revenue: 0, cost: 0, gross_profit: 0,
      });
    }
  }

  const items = [...totals.values()].map(r => ({ ...r, gross_profit: r.revenue - r.cost }));

  // Urutan tidak diatur di sini — aplikasi menyortir sendiri untuk menampilkan
  // "terlaris" dan "kurang laku" dari daftar yang sama.
  return NextResponse.json({ from, to, items });
}
