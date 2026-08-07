/**
 * Sakelar fitur yang dibaca browser **dan** server.
 *
 * `NEXT_PUBLIC_*` di-bake saat build, jadi mengubahnya menuntut deploy ulang —
 * bukan sakelar yang bisa dipencet saat warung sedang ramai. Itu memang
 * disengaja: mematikan pembayaran di tengah transaksi berjalan lebih berbahaya
 * daripada menunggu satu deploy.
 */

/**
 * QRIS untuk pelanggan (gateway Mayar).
 *
 * **Default: mati.** Gateway-nya belum bisa dipakai (keputusan pemilik,
 * 7 Agustus 2026), dan pilihan pembayaran yang gagal di tengah jalan jauh lebih
 * buruk daripada pilihan yang sejak awal terlihat belum tersedia — pelanggan
 * sudah menaruh keranjang, memilih meja, lalu buntu.
 *
 * Menyalakannya: set `NEXT_PUBLIC_QRIS_ENABLED=true` **dan** pastikan
 * `MAYAR_API_KEY` terisi, lalu deploy ulang. Keduanya harus benar — flag ini
 * tidak menggantikan `isMayarConfigured()`, ia hanya lapis di depannya.
 *
 * Ini **bukan** tentang QRIS di POS kasir: di sana "QRIS" berarti uangnya sudah
 * diterima lewat cara lain (mis. stiker QRIS statis di meja kasir), tidak ada
 * gateway yang dipanggil, jadi pilihan itu tetap hidup.
 */
export const QRIS_ENABLED = process.env.NEXT_PUBLIC_QRIS_ENABLED === 'true';
