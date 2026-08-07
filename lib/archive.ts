import { createAdminClient } from '@/lib/supabase/server';

/**
 * Order **QRIS** yang sudah diantar dan lunas pindah sendiri ke riwayat.
 *
 * Kenapa hanya QRIS: uangnya sudah masuk sebelum ordernya lahir, jadi tidak ada
 * satu pun langkah yang tersisa untuk kasir — menahannya di board hanya menunggu
 * klik yang jawabannya selalu "ya".
 *
 * **Tunai sengaja TIDAK ikut.** Di situ masih ada urusan fisik yang tidak
 * terlihat oleh server: uang dihitung, kembalian diberikan, meja dibereskan.
 * Kasirlah yang tahu kapan itu benar-benar selesai, lewat tombol "Selesai" —
 * jadi `mark-paid` untuk order tunai berhenti di lunas, tidak sampai diarsipkan.
 * Keputusan pemilik.
 *
 * Aman dipanggil di setiap titik sebuah order bisa menjadi lunas — `mark-paid`,
 * `POST /api/orders`, dan `settleIntent` — karena penyaringan metode bayarnya
 * ada di sini, bukan di pemanggilnya.
 *
 * Idempoten dan tidak pernah throw: gagal mengarsipkan tidak boleh menggagalkan
 * transaksi yang uangnya sudah diterima.
 */
export async function autoArchiveIfSettled(orderId: string): Promise<boolean> {
  try {
    const supabase = createAdminClient();

    const { data } = await supabase
      .from('orders')
      .select('status, payment_status, payment_method, is_archived')
      .eq('id', orderId)
      .maybeSingle();

    if (!data || data.is_archived) return false;

    // Tunai diselesaikan manual oleh kasir — lihat catatan di atas.
    if (data.payment_method !== 'QRIS') return false;

    // Syarat sisanya sama persis dengan `OrderModel.isSettled` di aplikasi Flutter.
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
