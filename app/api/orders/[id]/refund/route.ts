import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';

export const dynamic = 'force-dynamic';

interface RefundLine {
  order_item_id: string;
  quantity: number;
}

/**
 * Kembalikan uang: seluruh order, atau sebagian itemnya.
 *
 * Body:
 *   { reason?: string }                          -> seluruh sisa order
 *   { items: [{ order_item_id, quantity }], … }  -> per item
 *
 * **Nominalnya dihitung server, tidak pernah diambil dari klien.** Uang yang
 * keluar tidak boleh bergantung pada angka yang dikirim tablet — salah hitung
 * di sana langsung jadi omzet yang salah, dan tidak ada yang mengoreksinya.
 *
 * Refund menempel pada `orders.refunded_amount`, jadi pengurangannya jatuh pada
 * tanggal order itu dibuat (keputusan pemilik: "mengurangi omzet hari itu").
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff(request);
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const reason = typeof body?.reason === 'string' ? body.reason.trim().slice(0, 200) : null;
  const lines: RefundLine[] = Array.isArray(body?.items) ? body.items : [];

  const supabase = createAdminClient();

  const { data: order } = await supabase
    .from('orders')
    .select('id, total_amount, refunded_amount, payment_status, status, items:order_items(id, menu_item_name, quantity, subtotal)')
    .eq('id', id)
    .maybeSingle();

  if (!order) return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 });
  if (order.payment_status !== 'PAID') {
    return NextResponse.json(
      { error: 'Order belum lunas — tidak ada uang yang bisa dikembalikan' },
      { status: 400 },
    );
  }

  const already = order.refunded_amount ?? 0;
  const remaining = order.total_amount - already;
  if (remaining <= 0) {
    return NextResponse.json({ error: 'Order ini sudah direfund penuh' }, { status: 409 });
  }

  type Item = { id: string; menu_item_name: string; quantity: number; subtotal: number };
  const items = (order.items ?? []) as Item[];

  let amount = 0;
  const detail: Array<Record<string, unknown>> = [];

  if (lines.length === 0) {
    // Seluruh sisa order.
    amount = remaining;
  } else {
    for (const line of lines) {
      const item = items.find(i => i.id === line.order_item_id);
      if (!item) {
        return NextResponse.json(
          { error: 'Item tidak ada di order ini' },
          { status: 400 },
        );
      }
      const qty = Math.floor(Number(line.quantity));
      if (!Number.isFinite(qty) || qty < 1 || qty > item.quantity) {
        return NextResponse.json(
          { error: `Jumlah refund "${item.menu_item_name}" harus 1–${item.quantity}` },
          { status: 400 },
        );
      }
      // Harga per porsi diturunkan dari subtotal supaya variasi berbayar ikut
      // terhitung — `menu_item_price` saja tidak memuat topping.
      const perUnit = Math.round(item.subtotal / item.quantity);
      const lineAmount = perUnit * qty;
      amount += lineAmount;
      detail.push({
        order_item_id: item.id,
        name: item.menu_item_name,
        quantity: qty,
        amount: lineAmount,
      });
    }
  }

  if (amount <= 0) {
    return NextResponse.json({ error: 'Tidak ada yang direfund' }, { status: 400 });
  }
  // Pembulatan per porsi bisa membuat total item sedikit melebihi sisa;
  // dipangkas, bukan ditolak — kasir tidak bisa berbuat apa-apa soal itu.
  if (amount > remaining) amount = remaining;

  const { data: refund, error: refundError } = await supabase
    .from('refunds')
    .insert({ order_id: id, amount, reason, items: detail, created_by: staff.name })
    .select('id')
    .single();

  if (refundError) {
    return NextResponse.json({ error: refundError.message }, { status: 500 });
  }

  // Kunci optimistik: `eq('refunded_amount', already)` menolak kalau ada refund
  // lain yang menyelip di antara pembacaan dan penulisan — dua tablet menekan
  // refund bersamaan tidak boleh menghasilkan pengembalian ganda.
  const { data: updated, error } = await supabase
    .from('orders')
    .update({ refunded_amount: already + amount })
    .eq('id', id)
    .eq('refunded_amount', already)
    .select()
    .maybeSingle();

  if (error || !updated) {
    await supabase.from('refunds').delete().eq('id', refund.id);
    return NextResponse.json(
      { error: 'Refund lain baru saja tercatat untuk order ini — muat ulang dulu' },
      { status: 409 },
    );
  }

  return NextResponse.json({
    ...updated,
    refund_id: refund.id,
    refunded_now: amount,
    refunded_total: already + amount,
  });
}
