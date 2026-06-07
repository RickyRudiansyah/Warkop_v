import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const { order_id, status_code, gross_amount, signature_key, transaction_status, fraud_status } = body;

  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) return NextResponse.json({ error: 'Not configured' }, { status: 500 });

  // Verify Midtrans signature: SHA512(order_id + status_code + gross_amount + serverKey)
  const expected = crypto
    .createHash('sha512')
    .update(order_id + status_code + gross_amount + serverKey)
    .digest('hex');

  if (expected !== signature_key) {
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  const isPaid =
    transaction_status === 'settlement' ||
    (transaction_status === 'capture' && fraud_status === 'accept');

  if (isPaid) {
    const supabase = createAdminClient();
    await supabase.from('orders').update({ payment_status: 'PAID' }).eq('id', order_id);
  }

  return NextResponse.json({ ok: true });
}
