import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { isSettled, settleIntent, verifyWebhookSignature } from '@/lib/midtrans';

export const dynamic = 'force-dynamic';

// Midtrans HTTP notification. order_id here is our payment_intents.id.
export async function POST(request: NextRequest) {
  if (!process.env.MIDTRANS_SERVER_KEY) {
    return NextResponse.json({ error: 'Not configured' }, { status: 500 });
  }

  const body = await request.json().catch(() => ({}));
  const { order_id, status_code, gross_amount, signature_key, transaction_status, fraud_status, transaction_id } = body;

  if (!order_id || !verifyWebhookSignature(order_id, status_code, gross_amount, signature_key)) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const supabase = createAdminClient();

  if (isSettled(transaction_status, fraud_status)) {
    await settleIntent(order_id, transaction_id);
  } else if (transaction_status === 'expire') {
    await supabase.from('payment_intents').update({ status: 'EXPIRED' }).eq('id', order_id).eq('status', 'PENDING');
  } else if (transaction_status === 'cancel' || transaction_status === 'deny') {
    await supabase.from('payment_intents').update({ status: 'FAILED' }).eq('id', order_id).eq('status', 'PENDING');
  }

  return NextResponse.json({ ok: true });
}
