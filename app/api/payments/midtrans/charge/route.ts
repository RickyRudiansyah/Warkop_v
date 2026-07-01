import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { isMidtransConfigured, midtransChargeQris } from '@/lib/midtrans';

export const dynamic = 'force-dynamic';

interface ChargeBody {
  table_id?: string | null;
  total_amount?: number;
  notes?: string | null;
  items?: Array<{
    menu_item_id: string;
    menu_item_name: string;
    menu_item_price: number;
    quantity: number;
    variations?: unknown;
    subtotal: number;
    notes?: string | null;
  }>;
}

export async function POST(request: NextRequest) {
  if (!isMidtransConfigured()) {
    return NextResponse.json({ error: 'Pembayaran QRIS belum dikonfigurasi' }, { status: 503 });
  }

  const body: ChargeBody = await request.json().catch(() => ({}));
  const { table_id, total_amount, notes, items } = body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Items are required' }, { status: 400 });
  }
  if (!total_amount || total_amount <= 0) {
    return NextResponse.json({ error: 'Invalid total_amount' }, { status: 400 });
  }

  const supabase = createAdminClient();

  // Store the full cart so the order can be created later, once payment settles.
  const { data: intent, error: intentError } = await supabase
    .from('payment_intents')
    .insert({
      status: 'PENDING',
      gross_amount: Math.round(total_amount),
      cart: { table_id: table_id ?? null, payment_method: 'QRIS', total_amount, notes: notes ?? null, items },
    })
    .select('id')
    .single();

  if (intentError || !intent) {
    return NextResponse.json({ error: intentError?.message || 'Gagal membuat pembayaran' }, { status: 500 });
  }

  const charge = await midtransChargeQris(intent.id, total_amount);
  if (!charge.ok) {
    await supabase.from('payment_intents').update({ status: 'FAILED' }).eq('id', intent.id);
    return NextResponse.json({ error: charge.error }, { status: 502 });
  }

  await supabase
    .from('payment_intents')
    .update({
      qr_string: charge.qrString ?? null,
      qr_url: charge.qrUrl ?? null,
      midtrans_transaction_id: charge.transactionId ?? null,
    })
    .eq('id', intent.id);

  return NextResponse.json({
    intentId: intent.id,
    qrString: charge.qrString ?? null,
    qrUrl: charge.qrUrl ?? null,
    expiryTime: charge.expiryTime ?? null,
    grossAmount: Math.round(total_amount),
  });
}
