/**
 * Sakelar fitur yang dibaca browser **dan** server.
 *
 * `NEXT_PUBLIC_*` di-bake saat build, jadi mengubahnya menuntut deploy ulang —
 * bukan sakelar yang bisa dipencet saat warung sedang ramai. Itu memang
 * disengaja: mematikan pembayaran di tengah transaksi berjalan lebih berbahaya
 * daripada menunggu satu deploy.
 */

/**
 * QRIS untuk pelanggan — gateway **Midtrans**.
 *
 * Jalur yang benar-benar dipakai checkout adalah
 * `POST /api/payments/midtrans/charge`, bukan Mayar. Sakelar ini karena itu
 * dipasang di route Midtrans; Mayar ikut dijaga hanya supaya tidak ada pintu
 * belakang yang terbuka.
 *
 * `false` membuat pilihan QRIS di checkout tampil mati ("Belum tersedia") dan
 * endpoint charge membalas 503. Pilihan pembayaran yang gagal di tengah jalan
 * jauh lebih buruk daripada yang sejak awal terlihat belum tersedia —
 * pelanggan sudah menaruh keranjang, memilih meja, lalu buntu.
 *
 * Flag ini **tidak menggantikan** `isMidtransConfigured()`; ia hanya lapis di
 * depannya. Keduanya harus benar sebelum QRIS betul-betul melayani pelanggan,
 * bersama `MIDTRANS_IS_PRODUCTION` yang menentukan sandbox atau uang asli.
 *
 * Ini **bukan** tentang QRIS di POS kasir: di sana "QRIS" berarti uangnya sudah
 * diterima lewat cara lain (mis. stiker QRIS statis di meja kasir), tidak ada
 * gateway yang dipanggil, jadi pilihan itu tetap hidup.
 */
export const QRIS_ENABLED = process.env.NEXT_PUBLIC_QRIS_ENABLED === 'true';
