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

  let orderQuery = supabase
    .from('orders')
    .select('id')
    .eq('payment_status', 'PAID')
    .neq('status', 'CANCELLED');

  if (from) orderQuery = orderQuery.gte('created_at', from);
  if (to) orderQuery = orderQuery.lte('created_at', to);

  const { data: orders, error: orderError } = await orderQuery;
  if (orderError) return NextResponse.json({ error: orderError.message }, { status: 500 });

  const totals = new Map<string, Row>();

  if (orders?.length) {
    // Ambil bertahap: daftar id order bisa panjang dan `.in()` punya batas URL.
    const ids = orders.map(o => o.id);
    for (let i = 0; i < ids.length; i += 200) {
      const { data: items, error } = await supabase
        .from('order_items')
        .select('menu_item_id, menu_item_name, quantity, subtotal, cost_price_snapshot')
        .in('order_id', ids.slice(i, i + 200));

      if (error) return NextResponse.json({ error: error.message }, { status: 500 });

      for (const it of items ?? []) {
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
    }
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
