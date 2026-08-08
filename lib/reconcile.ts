import { createAdminClient } from '@/lib/supabase/server';
import { isSettled, midtransGetStatus, settleIntent } from '@/lib/midtrans';

/**
 * Cocokkan `payment_intents` yang masih PENDING dengan status sebenarnya di
 * Midtrans, lalu selesaikan yang ternyata sudah dibayar.
 *
 * **Kenapa ini ada.** Order QRIS hanya lahir dari `settleIntent()`, dan
 * pemicunya cuma dua: tab checkout yang polling, dan webhook. Keduanya rapuh —
 * pelanggan menutup tab, sinyalnya putus, HP-nya terkunci, webhook-nya salah
 * alamat. Pada 7 Agustus 2026 keduanya gagal bersamaan dan **dua pelanggan
 * membayar Rp 107.000 tanpa ordernya pernah dibuat**: uangnya masuk ke Midtrans,
 * sistem tidak tahu apa-apa, kasir tidak melihat apa pun, struk tidak keluar.
 *
 * Uang tidak boleh bergantung pada sebuah tab browser tetap terbuka. Inilah
 * jaring pengamannya, dan ia sengaja bertanya **langsung ke Midtrans** —
 * satu-satunya pihak yang tahu pasti uangnya sudah masuk atau belum.
 *
 * Aman dipanggil sesering apa pun: `settleIntent()` memakai kunci kondisional
 * `PENDING → PAID`, jadi dua penyapu yang berjalan bersamaan tidak akan membuat
 * order ganda.
 */

/** Intent semuda ini dibiarkan — tab checkout-nya kemungkinan masih polling. */
const MIN_AGE_MS = 60 * 1000;

/** Lewat ini, intent yang belum dibayar ditutup supaya tidak disapu selamanya. */
const EXPIRE_AFTER_MS = 24 * 60 * 60 * 1000;

/** Batas per sapuan, supaya satu panggilan tidak menahan banyak request Midtrans. */
const BATCH = 20;

export interface ReconcileResult {
  checked: number;
  recovered: number;
  expired: number;
  orderIds: string[];
}

export async function reconcilePendingIntents(): Promise<ReconcileResult> {
  const result: ReconcileResult = { checked: 0, recovered: 0, expired: 0, orderIds: [] };

  try {
    const supabase = createAdminClient();
    const now = Date.now();

    const { data: pending } = await supabase
      .from('payment_intents')
      .select('id, created_at')
      .eq('status', 'PENDING')
      .lt('created_at', new Date(now - MIN_AGE_MS).toISOString())
      .order('created_at', { ascending: false })
      .limit(BATCH);

    if (!pending?.length) return result;

    for (const intent of pending) {
      result.checked++;
      const age = now - Date.parse(intent.created_at);

      const status = await midtransGetStatus(intent.id);

      // Midtrans tidak terjangkau: JANGAN tutup intentnya. Menandai EXPIRED di
      // sini berarti membuang pembayaran yang mungkin sudah masuk.
      if (!status.ok) continue;

      if (isSettled(status.transactionStatus, status.fraudStatus)) {
        const orderId = await settleIntent(intent.id, status.transactionId);
        if (orderId) {
          result.recovered++;
          result.orderIds.push(orderId);
          console.warn('[reconcile] intent tertinggal diselamatkan', intent.id, '-> order', orderId);
        }
        continue;
      }

      const ts = status.transactionStatus;
      if (ts === 'expire' || ts === 'cancel' || ts === 'deny' || age > EXPIRE_AFTER_MS) {
        await supabase
          .from('payment_intents')
          .update({ status: ts === 'cancel' || ts === 'deny' ? 'FAILED' : 'EXPIRED' })
          .eq('id', intent.id)
          .eq('status', 'PENDING');
        result.expired++;
      }
    }
  } catch (err) {
    // Tidak pernah throw: ini dipanggil dari loop latar aplikasi kasir, dan
    // kegagalannya tidak boleh mengganggu antrian cetak.
    console.error('[reconcile] gagal', err);
  }

  return result;
}
