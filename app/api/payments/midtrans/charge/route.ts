import { NextRequest, NextResponse } from 'next/server';

const MIDTRANS_BASE_URL = process.env.MIDTRANS_IS_PRODUCTION === 'true'
  ? 'https://api.midtrans.com'
  : 'https://api.sandbox.midtrans.com';

export async function POST(request: NextRequest) {
  const serverKey = process.env.MIDTRANS_SERVER_KEY;
  if (!serverKey) return NextResponse.json({ error: 'Midtrans not configured' }, { status: 500 });

  const { orderId, amount } = await request.json();
  if (!orderId || !amount) return NextResponse.json({ error: 'orderId and amount required' }, { status: 400 });

  const authString = Buffer.from(serverKey + ':').toString('base64');

  const res = await fetch(`${MIDTRANS_BASE_URL}/v2/charge`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      Authorization: `Basic ${authString}`,
    },
    body: JSON.stringify({
      payment_type: 'qris',
      transaction_details: {
        order_id: orderId,
        gross_amount: Math.round(amount),
      },
      qris: { acquirer: 'gopay' },
    }),
  });

  const data = await res.json();
  if (!res.ok || data.status_code === '500' || data.status_code === '400') {
    return NextResponse.json({ error: data.status_message || 'Midtrans charge failed' }, { status: 500 });
  }

  return NextResponse.json({
    qrString: data.qr_string,
    expiryTime: data.expiry_time,
    transactionId: data.transaction_id,
  });
}
