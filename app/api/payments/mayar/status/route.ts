import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { mayarGetStatus } from '@/lib/mayar';
import { settleIntent } from '@/lib/midtrans';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const intentId = new URL(request.url).searchParams.get('intentId');
  if (!intentId) return NextResponse.json({ error: 'intentId required' }, { status: 400 });

  const supabase = createAdminClient();
  const { data: intent } = await supabase
    .from('payment_intents')
    .select('id, status, order_id, midtrans_transaction_id')
    .eq('id', intentId)
    .maybeSingle();

  if (!intent) return NextResponse.json({ error: 'Pembayaran tidak ditemukan' }, { status: 404 });

  if (intent.status === 'PAID') {
    if (intent.order_id) return NextResponse.json({ status: 'PAID', orderId: intent.order_id });
    return NextResponse.json({ status: 'PENDING' });
  }
  if (intent.status === 'EXPIRED' || intent.status === 'FAILED') {
    return NextResponse.json({ status: intent.status });
  }

  const txId = intent.midtrans_transaction_id;
  if (!txId) return NextResponse.json({ status: 'PENDING' });

  const result = await mayarGetStatus(txId);
  if (!result.ok) return NextResponse.json({ status: 'PENDING' });

  if (result.status === 'PAID') {
    const orderId = await settleIntent(intentId, txId);
    if (orderId) return NextResponse.json({ status: 'PAID', orderId });
    return NextResponse.json({ status: 'PENDING' });
  }
  if (result.status === 'EXPIRED') {
    await supabase.from('payment_intents').update({ status: 'EXPIRED' }).eq('id', intentId).eq('status', 'PENDING');
    return NextResponse.json({ status: 'EXPIRED' });
  }

  return NextResponse.json({ status: 'PENDING' });
}
