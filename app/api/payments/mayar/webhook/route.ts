import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { mayarGetStatus } from '@/lib/mayar';
import { settleIntent } from '@/lib/midtrans';

export const dynamic = 'force-dynamic';

// Mayar payment notification. Mayar's signature scheme is undocumented, so we
// never trust this payload directly: we use it only as a nudge to re-verify the
// transaction via the authenticated status API before settling.
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  const data = body?.data ?? {};
  const candidateIds = [data.id, data.transactionId, data.transaction_id].filter(Boolean);

  if (candidateIds.length === 0) return NextResponse.json({ ok: true });

  const supabase = createAdminClient();
  const { data: intents } = await supabase
    .from('payment_intents')
    .select('id, midtrans_transaction_id')
    .eq('status', 'PENDING')
    .in('midtrans_transaction_id', candidateIds);

  for (const intent of intents ?? []) {
    const txId = intent.midtrans_transaction_id;
    if (!txId) continue;
    const result = await mayarGetStatus(txId);
    if (result.ok && result.status === 'PAID') {
      await settleIntent(intent.id, txId);
    }
  }

  return NextResponse.json({ ok: true });
}
