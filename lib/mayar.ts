// Mayar.id payment provider (https://docs.mayar.id).
// We use the "Single Payment Request" API: it returns a hosted payment `link`
// (where the customer pays via QRIS) plus a `transactionId` we poll for status.

export const MAYAR_BASE_URL =
  process.env.MAYAR_IS_PRODUCTION === 'true'
    ? 'https://api.mayar.id'
    : 'https://api.mayar.club';

function authHeader(): string {
  return 'Bearer ' + (process.env.MAYAR_API_KEY ?? '');
}

export function isMayarConfigured(): boolean {
  const k = process.env.MAYAR_API_KEY;
  return !!k && k !== 'your-mayar-api-key';
}

export interface CreatePaymentResult {
  ok: boolean;
  error?: string;
  transactionId?: string;
  link?: string;
}

// Create a single payment request. Returns a hosted checkout `link` + transactionId.
export async function mayarCreatePayment(opts: {
  amount: number;
  name: string;
  description: string;
  redirectUrl: string;
}): Promise<CreatePaymentResult> {
  let res: Response;
  try {
    res = await fetch(`${MAYAR_BASE_URL}/hl/v1/payment/create`, {
      method: 'POST',
      headers: { Accept: 'application/json', 'Content-Type': 'application/json', Authorization: authHeader() },
      body: JSON.stringify({
        name: opts.name,
        email: 'orders@rumipang.id',
        amount: Math.round(opts.amount),
        mobile: '08123456789',
        redirectUrl: opts.redirectUrl,
        description: opts.description,
        expiredAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      }),
    });
  } catch {
    return { ok: false, error: 'Tidak dapat menghubungi Mayar' };
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok || String(data.statusCode) !== '200' || !data.data) {
    console.error('[Mayar create failed]', JSON.stringify(data));
    return { ok: false, error: data.messages || 'Gagal membuat pembayaran Mayar' };
  }

  const transactionId = data.data.transactionId || data.data.transaction_id || data.data.id;
  return { ok: true, transactionId, link: data.data.link };
}

export type MayarStatus = 'PAID' | 'PENDING' | 'EXPIRED';

export interface StatusResult {
  ok: boolean;
  error?: string;
  status?: MayarStatus;
  raw?: string;
}

// Poll a transaction's status. Authoritative (server-to-server, authenticated).
export async function mayarGetStatus(transactionId: string): Promise<StatusResult> {
  let res: Response;
  try {
    res = await fetch(`${MAYAR_BASE_URL}/hl/v2/transactions/${encodeURIComponent(transactionId)}`, {
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: authHeader() },
    });
  } catch {
    return { ok: false, error: 'Tidak dapat menghubungi Mayar' };
  }

  const data = await res.json().catch(() => ({}));
  // Not found yet -> treat as still pending rather than a hard error.
  if (res.status === 404) return { ok: true, status: 'PENDING' };
  if (!res.ok || !data.data) return { ok: false, error: data.messages || 'Gagal cek status' };

  const raw = String(data.data.status || '').toLowerCase();
  let status: MayarStatus = 'PENDING';
  if (raw === 'paid' || raw === 'settled' || raw === 'success') status = 'PAID';
  else if (raw === 'expired') status = 'EXPIRED';
  return { ok: true, status, raw };
}
