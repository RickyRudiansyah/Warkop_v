import crypto from 'crypto';
import { createAdminClient } from '@/lib/supabase/server';

export const MIDTRANS_BASE_URL =
  process.env.MIDTRANS_IS_PRODUCTION === 'true'
    ? 'https://api.midtrans.com'
    : 'https://api.sandbox.midtrans.com';

function authHeader(): string {
  const serverKey = process.env.MIDTRANS_SERVER_KEY ?? '';
  return 'Basic ' + Buffer.from(serverKey + ':').toString('base64');
}

export function isMidtransConfigured(): boolean {
  const key = process.env.MIDTRANS_SERVER_KEY;
  return !!key && key !== 'SB-Mid-server-xxxxxxxx';
}

export interface ChargeResult {
  ok: boolean;
  error?: string;
  qrString?: string;
  qrUrl?: string;
  transactionId?: string;
  expiryTime?: string;
}

// Create a QRIS charge. `orderId` must be unique per Midtrans transaction.
export async function midtransChargeQris(orderId: string, grossAmount: number): Promise<ChargeResult> {
  let res: Response;
  try {
    res = await fetch(`${MIDTRANS_BASE_URL}/v2/charge`, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        Authorization: authHeader(),
      },
      body: JSON.stringify({
        payment_type: 'qris',
        transaction_details: { order_id: orderId, gross_amount: Math.round(grossAmount) },
        qris: { acquirer: 'gopay' },
      }),
    });
  } catch {
    return { ok: false, error: 'Tidak dapat menghubungi Midtrans' };
  }

  const data = await res.json().catch(() => ({}));

  // Midtrans returns 200/201 on success. status_code "201" = pending (expected for QRIS).
  if (!res.ok || !['200', '201'].includes(String(data.status_code))) {
    return { ok: false, error: data.status_message || 'Midtrans charge gagal' };
  }

  const qrAction = Array.isArray(data.actions)
    ? data.actions.find((a: { name?: string }) => a.name === 'generate-qr-code')
    : undefined;

  return {
    ok: true,
    qrString: data.qr_string,
    qrUrl: qrAction?.url,
    transactionId: data.transaction_id,
    expiryTime: data.expiry_time,
  };
}

export interface StatusResult {
  ok: boolean;
  error?: string;
  transactionStatus?: string;
  fraudStatus?: string;
  transactionId?: string;
}

// Query the current transaction status for a Midtrans order_id.
export async function midtransGetStatus(orderId: string): Promise<StatusResult> {
  let res: Response;
  try {
    res = await fetch(`${MIDTRANS_BASE_URL}/v2/${encodeURIComponent(orderId)}/status`, {
      method: 'GET',
      headers: { Accept: 'application/json', Authorization: authHeader() },
    });
  } catch {
    return { ok: false, error: 'Tidak dapat menghubungi Midtrans' };
  }

  const data = await res.json().catch(() => ({}));
  // 404 (transaction not found yet) is not a hard error — treat as still pending.
  if (String(data.status_code) === '404') {
    return { ok: true, transactionStatus: 'pending' };
  }
  if (!res.ok) {
    return { ok: false, error: data.status_message || 'Gagal cek status pembayaran' };
  }

  return {
    ok: true,
    transactionStatus: data.transaction_status,
    fraudStatus: data.fraud_status,
    transactionId: data.transaction_id,
  };
}

// Verify a webhook notification signature.
// signature_key = SHA512(order_id + status_code + gross_amount + serverKey)
export function verifyWebhookSignature(
  orderId: string,
  statusCode: string,
  grossAmount: string,
  signatureKey: string,
): boolean {
  const serverKey = process.env.MIDTRANS_SERVER_KEY ?? '';
  const expected = crypto
    .createHash('sha512')
    .update(orderId + statusCode + grossAmount + serverKey)
    .digest('hex');
  // Length guard before timingSafeEqual (throws on mismatched lengths).
  if (expected.length !== (signatureKey || '').length) return false;
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureKey));
}

export function isSettled(transactionStatus?: string, fraudStatus?: string): boolean {
  return (
    transactionStatus === 'settlement' ||
    (transactionStatus === 'capture' && fraudStatus === 'accept')
  );
}

export type SettleOutcome =
  | { status: 'PAID'; orderId: string }
  | { status: 'PENDING' }
  | { status: 'EXPIRED' }
  | { status: 'FAILED' };

interface CartItem {
  menu_item_id: string;
  menu_item_name: string;
  menu_item_price: number;
  quantity: number;
  variations?: unknown;
  subtotal: number;
  notes?: string | null;
}
interface CartPayload {
  table_id: string | null;
  payment_method: string;
  total_amount: number;
  notes: string | null;
  items: CartItem[];
}

// Turn a settled payment intent into a real PAID order — exactly once.
// A conditional PENDING -> PAID update acts as a lock so concurrent callers
// (status poll + webhook) can't create duplicate orders.
export async function settleIntent(intentId: string, transactionId?: string): Promise<string | null> {
  const supabase = createAdminClient();

  const { data: locked } = await supabase
    .from('payment_intents')
    .update({ status: 'PAID', paid_at: new Date().toISOString(), midtrans_transaction_id: transactionId ?? null })
    .eq('id', intentId)
    .eq('status', 'PENDING')
    .select('id, cart')
    .maybeSingle();

  if (!locked) {
    // Someone else already settled it (or it isn't PENDING). Return the existing order id.
    const { data: existing } = await supabase
      .from('payment_intents')
      .select('order_id')
      .eq('id', intentId)
      .maybeSingle();
    return existing?.order_id ?? null;
  }

  const cart = locked.cart as CartPayload;

  const { data: order, error: orderError } = await supabase
    .from('orders')
    .insert({
      table_id: cart.table_id,
      payment_method: cart.payment_method,
      payment_status: 'PAID',
      total_amount: cart.total_amount,
      notes: cart.notes,
      status: 'QUEUED',
    })
    .select()
    .single();

  if (orderError || !order) {
    // Roll the lock back so a later attempt (webhook/poll) can retry.
    await supabase.from('payment_intents').update({ status: 'PENDING', paid_at: null }).eq('id', intentId);
    return null;
  }

  const orderItems = cart.items.map((item) => ({
    order_id: order.id,
    menu_item_id: item.menu_item_id,
    menu_item_name: item.menu_item_name,
    menu_item_price: item.menu_item_price,
    quantity: item.quantity,
    variations: item.variations || [],
    subtotal: item.subtotal,
    notes: item.notes || null,
  }));

  const { error: itemsError } = await supabase.from('order_items').insert(orderItems);
  if (itemsError) {
    await supabase.from('orders').delete().eq('id', order.id);
    await supabase.from('payment_intents').update({ status: 'PENDING', paid_at: null }).eq('id', intentId);
    return null;
  }

  await supabase.from('payment_intents').update({ order_id: order.id }).eq('id', intentId);
  return order.id;
}
