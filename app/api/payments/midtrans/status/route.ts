import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { isSettled, midtransGetStatus, settleIntent } from '@/lib/midtrans';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const intentId = new URL(request.url).searchParams.get('intentId');
  if (!intentId) {
    return NextResponse.json({ error: 'intentId required' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: intent } = await supabase
    .from('payment_intents')
    .select('id, status, order_id')
    .eq('id', intentId)
    .maybeSingle();

  if (!intent) {
    return NextResponse.json({ error: 'Pembayaran tidak ditemukan' }, { status: 404 });
  }

  // Already resolved — return the stored result without re-hitting Midtrans.
  if (intent.status === 'PAID') {
    // order_id is written moments after the status flips; keep the client polling
    // until it's present so we never redirect with a null orderId.
    if (intent.order_id) return NextResponse.json({ status: 'PAID', orderId: intent.order_id });
    return NextResponse.json({ status: 'PENDING' });
  }
  if (intent.status === 'EXPIRED' || intent.status === 'FAILED') {
    return NextResponse.json({ status: intent.status });
  }

  const result = await midtransGetStatus(intentId);
  if (!result.ok) {
    // Transient Midtrans error — tell the client to keep polling.
    return NextResponse.json({ status: 'PENDING' });
  }

  const ts = result.transactionStatus;

  if (isSettled(ts, result.fraudStatus)) {
    const orderId = await settleIntent(intentId, result.transactionId);
    if (orderId) return NextResponse.json({ status: 'PAID', orderId });
    return NextResponse.json({ status: 'PENDING' });
  }

  if (ts === 'expire') {
    await supabase.from('payment_intents').update({ status: 'EXPIRED' }).eq('id', intentId).eq('status', 'PENDING');
    return NextResponse.json({ status: 'EXPIRED' });
  }
  if (ts === 'cancel' || ts === 'deny') {
    await supabase.from('payment_intents').update({ status: 'FAILED' }).eq('id', intentId).eq('status', 'PENDING');
    return NextResponse.json({ status: 'FAILED' });
  }

  return NextResponse.json({ status: 'PENDING' });
}
