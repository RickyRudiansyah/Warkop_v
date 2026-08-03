import { NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';
import { buildReceipt, renderReceiptText } from '@/lib/receipt';
import { Order, PrintJobTrigger } from '@/types';

// Job PRINTING yang tidak di-ACK dalam waktu ini dianggap nyangkut
// (aplikasi Android ditutup / printer mati) dan dikembalikan ke PENDING.
export const STALE_CLAIM_MS = 2 * 60 * 1000;

export interface EnqueueOptions {
  trigger: PrintJobTrigger;
  verifiedBy?: string | null;
  reprint?: boolean;
}

export interface EnqueueResult {
  ok: boolean;
  jobId?: string;
  duplicate?: boolean;
  error?: string;
}

// Masukkan struk sebuah order ke antrian cetak.
//
// Sengaja tidak pernah melempar error: kegagalan cetak tidak boleh membatalkan
// pembayaran yang sudah berhasil. Kalau gagal, job bisa dibuat ulang lewat
// tombol "Cetak Ulang" di dashboard.
export async function enqueueReceipt(orderId: string, options: EnqueueOptions): Promise<EnqueueResult> {
  try {
    const supabase = createAdminClient();

    const { data: order, error } = await supabase
      .from('orders')
      .select('*, table:tables(*), items:order_items(*)')
      .eq('id', orderId)
      .maybeSingle();

    if (error || !order) {
      console.error('[print] order tidak ditemukan', orderId, error?.message);
      return { ok: false, error: error?.message || 'Order tidak ditemukan' };
    }

    const receipt = buildReceipt(order as Order, {
      isReprint: options.reprint ?? false,
      verifiedBy: options.verifiedBy ?? null,
    });

    const { data: job, error: insertError } = await supabase
      .from('print_jobs')
      .insert({
        order_id: orderId,
        kind: options.reprint ? 'REPRINT' : 'RECEIPT',
        status: 'PENDING',
        trigger: options.trigger,
        payload: receipt,
        text_body: renderReceiptText(receipt),
      })
      .select('id')
      .single();

    if (insertError) {
      // 23505 = kena unique index print_jobs_one_receipt_per_order.
      // Struk otomatis untuk order ini sudah pernah diantrikan — itu sukses,
      // bukan error (webhook + status poll bisa sama-sama memanggil ini).
      if (insertError.code === '23505') return { ok: true, duplicate: true };
      console.error('[print] gagal membuat print job', insertError.message);
      return { ok: false, error: insertError.message };
    }

    return { ok: true, jobId: job.id };
  } catch (err) {
    console.error('[print] enqueue error', err);
    return { ok: false, error: err instanceof Error ? err.message : 'Gagal mengantrikan cetak' };
  }
}

// Kembalikan job PRINTING yang tidak di-ACK ke PENDING supaya bisa diambil lagi.
export async function requeueStaleJobs(): Promise<void> {
  const supabase = createAdminClient();
  const cutoff = new Date(Date.now() - STALE_CLAIM_MS).toISOString();
  await supabase
    .from('print_jobs')
    .update({ status: 'PENDING', claimed_at: null })
    .eq('status', 'PRINTING')
    .lt('claimed_at', cutoff);
}

export type PrintAccess =
  | { kind: 'device'; deviceId: string }
  | { kind: 'staff'; role: string };

// Endpoint cetak dipakai dua pihak:
//   * aplikasi Android printer -> header  x-print-token: <PRINT_DEVICE_TOKEN>
//   * dashboard staff          -> session Supabase biasa
export async function requirePrintAccess(request: NextRequest): Promise<PrintAccess | null> {
  const token = request.headers.get('x-print-token');
  const expected = process.env.PRINT_DEVICE_TOKEN;

  if (token && expected && token.length === expected.length && timingSafeEqualString(token, expected)) {
    return { kind: 'device', deviceId: request.headers.get('x-print-device') || 'unknown' };
  }

  const supabaseAuth = await createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return null;
  const { data: staff } = await supabaseAuth.from('staff_users').select('role').eq('id', user.id).maybeSingle();
  return staff ? { kind: 'staff', role: staff.role } : null;
}

function timingSafeEqualString(a: string, b: string): boolean {
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
