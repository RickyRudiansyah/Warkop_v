import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { isMayarConfigured, mayarCreatePayment } from '@/lib/mayar';
import { QRIS_ENABLED } from '@/lib/features';

export const dynamic = 'force-dynamic';

interface CreateBody {
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
  // Menyembunyikan tombolnya di UI saja tidak cukup: endpoint ini publik, dan
  // tab yang sudah lama terbuka masih memegang UI versi lama. Penjagaannya di
  // sini, sebelum satu pun payment_intent dibuat.
  if (!QRIS_ENABLED) {
    return NextResponse.json({ error: 'Pembayaran QRIS belum tersedia. Silakan pilih Cash (bayar di kasir).' }, { status: 503 });
  }
  if (!isMayarConfigured()) {
    return NextResponse.json({ error: 'Pembayaran QRIS belum dikonfigurasi' }, { status: 503 });
  }

  const body: CreateBody = await request.json().catch(() => ({}));
  const { table_id, total_amount, notes, items } = body;

  if (!items || !Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ error: 'Items are required' }, { status: 400 });
  }
  if (!total_amount || total_amount <= 0) {
    return NextResponse.json({ error: 'Invalid total_amount' }, { status: 400 });
  }

  const supabase = createAdminClient();

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

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  const payment = await mayarCreatePayment({
    amount: total_amount,
    name: 'Pelanggan Rumipang',
    description: 'Pesanan ' + intent.id,
    redirectUrl: appUrl + '/order',
  });

  if (!payment.ok || !payment.transactionId || !payment.link) {
    await supabase.from('payment_intents').update({ status: 'FAILED' }).eq('id', intent.id);
    return NextResponse.json({ error: payment.error || 'Gagal membuat pembayaran' }, { status: 502 });
  }

  // Reuse existing columns: midtrans_transaction_id = provider transaction id, qr_url = hosted pay link.
  await supabase
    .from('payment_intents')
    .update({ midtrans_transaction_id: payment.transactionId, qr_url: payment.link })
    .eq('id', intent.id);

  return NextResponse.json({ intentId: intent.id, link: payment.link });
}
