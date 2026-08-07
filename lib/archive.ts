import { createAdminClient } from '@/lib/supabase/server';

/**
 * Order yang sudah diantar DAN lunas tidak menyisakan pekerjaan apa pun untuk
 * kasir — jadi ia pindah sendiri ke riwayat.
 *
 * Dulu ini menunggu tombol "Selesai · Pindahkan ke History" per meja. Tombolnya
 * dihapus (keputusan pemilik): satu-satunya jawaban yang pernah diberikan kasir
 * adalah "ya", jadi menanyakannya hanya menahan order di board.
 *
 * Dipanggil di **setiap** titik sebuah order bisa menjadi lunas:
 * `mark-paid` (tunai), `POST /api/orders` (POS yang uangnya sudah diterima),
 * dan `settleIntent` (QRIS). Kalau salah satu terlewat, ordernya menggantung di
 * board tanpa cara memindahkannya.
 *
 * Idempoten dan tidak pernah throw — kegagalan mengarsipkan tidak boleh
 * menggagalkan transaksi yang uangnya sudah diterima.
 */
export async function autoArchiveIfSettled(orderId: string): Promise<boolean> {
  try {
    const supabase = createAdminClient();

    const { data } = await supabase
      .from('orders')
      .select('status, payment_status, is_archived')
      .eq('id', orderId)
      .maybeSingle();

    if (!data || data.is_archived) return false;
    // Syaratnya sama persis dengan `OrderModel.isSettled` di aplikasi Flutter.
    if (data.status !== 'SERVED' || data.payment_status !== 'PAID') return false;

    const { error } = await supabase
      .from('orders')
      .update({ is_archived: true })
      .eq('id', orderId);

    return !error;
  } catch {
    return false;
  }
}
