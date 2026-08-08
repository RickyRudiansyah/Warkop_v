import { NextRequest } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requireStaff } from '@/lib/auth';
import { buildReceipt, renderKitchenText, renderReceiptText } from '@/lib/receipt';
import { Order, PrintJobTrigger } from '@/types';

// Job PRINTING yang tidak di-ACK dalam waktu ini dianggap nyangkut
// (aplikasi Android ditutup / printer mati) dan dikembalikan ke PENDING.
export const STALE_CLAIM_MS = 2 * 60 * 1000;

export const ALL_PRINT_STATIONS = ['CASHIER', 'KITCHEN'] as const;
export type PrintStation = (typeof ALL_PRINT_STATIONS)[number];

/**
 * Stasiun yang benar-benar punya printer.
 *
 * **Default hanya `CASHIER`.** Menambahkan `KITCHEN` sebelum printernya ada
 * membuat setiap order meninggalkan satu job yang tidak akan pernah diambil
 * siapa pun — antrian menumpuk, lencana "struk menunggu" menyala selamanya,
 * dan kasir belajar mengabaikannya. Isi `PRINT_STATIONS=CASHIER,KITCHEN` saat
 * printer dapur sudah terpasang.
 */
export const PRINT_STATIONS: PrintStation[] = (() => {
  const raw = process.env.PRINT_STATIONS;
  if (!raw) return ['CASHIER'];
  const picked = raw
    .split(',')
    .map(s => s.trim().toUpperCase())
    .filter((s): s is PrintStation => (ALL_PRINT_STATIONS as readonly string[]).includes(s));
  return picked.length > 0 ? picked : ['CASHIER'];
})();

export function isPrintStation(value: string | null): value is PrintStation {
  return !!value && (ALL_PRINT_STATIONS as readonly string[]).includes(value);
}

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

    // Isi struk berbeda per stasiun: kasir dapat harga & total, dapur dapat
    // daftar masakannya saja. Dirender di sini, bukan saat dicetak, supaya
    // `text_body` tetap snapshot — struk yang sudah diantrikan tidak berubah
    // walau format renderernya nanti diperbaiki.
    const bodyFor = (station: PrintStation) =>
      station === 'KITCHEN' ? renderKitchenText(receipt) : renderReceiptText(receipt);

    // Satu job per stasiun. Dipisah — bukan satu job yang dicetak dua kali —
    // supaya kegagalan di printer dapur tidak menarik ulang salinan kasir yang
    // sudah tercetak. Itu justru jalan paling mudah menuju struk dobel. Bonus
    // dari pemisahan ini: isinya jadi bisa berbeda per stasiun.
    const rows = PRINT_STATIONS.map(station => ({
      order_id: orderId,
      station,
      kind: options.reprint ? 'REPRINT' : 'RECEIPT',
      status: 'PENDING',
      trigger: options.trigger,
      payload: receipt,
      text_body: bodyFor(station),
    }));

    const inserted: string[] = [];
    let duplicates = 0;

    // Sengaja satu per satu, bukan insert massal: kalau salah satu stasiun kena
    // unique index (struknya memang sudah diantrikan), stasiun lain tetap
    // masuk. Insert massal akan menggagalkan semuanya sekaligus.
    for (const row of rows) {
      const { data: job, error: insertError } = await supabase
        .from('print_jobs').insert(row).select('id').single();

      if (!insertError) {
        inserted.push(job.id);
        continue;
      }
      // 23505 = kena unique index print_jobs_one_receipt_per_order_station.
      // Struk otomatis untuk (order, stasiun) ini sudah pernah diantrikan — itu
      // sukses, bukan error (webhook + status poll bisa sama-sama memanggil ini).
      if (insertError.code === '23505') {
        duplicates++;
        continue;
      }
      console.error('[print] gagal membuat print job', row.station, insertError.message);
    }

    if (inserted.length === 0) {
      if (duplicates > 0) return { ok: true, duplicate: true };
      return { ok: false, error: 'Gagal mengantrikan struk ke stasiun mana pun' };
    }

    return { ok: true, jobId: inserted[0] };
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

// Endpoint cetak dipakai tiga pihak:
//   * alat cetak khusus  -> header  x-print-token: <PRINT_DEVICE_TOKEN>
//   * aplikasi kasir     -> header  Authorization: Bearer <JWT>
//   * dashboard web      -> cookie session Supabase
// Dua yang terakhir sama-sama ditangani requireStaff().
export async function requirePrintAccess(request: NextRequest): Promise<PrintAccess | null> {
  const token = request.headers.get('x-print-token');
  const expected = process.env.PRINT_DEVICE_TOKEN;

  if (token && expected && token.length === expected.length && timingSafeEqualString(token, expected)) {
    return { kind: 'device', deviceId: request.headers.get('x-print-device') || 'unknown' };
  }

  const staff = await requireStaff(request);
  return staff ? { kind: 'staff', role: staff.role } : null;
}

function timingSafeEqualString(a: string, b: string): boolean {
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
