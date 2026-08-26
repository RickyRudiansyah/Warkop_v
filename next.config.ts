import type { NextConfig } from "next";

// Host Supabase Storage tempat foto menu disimpan.
//
// Diambil dari env supaya tidak ada hostname yang dihardcode di dua tempat.
// Cadangannya wildcard: kalau env-nya tidak ada saat build, next/image lebih
// baik tetap melayani foto daripada melempar error di halaman pelanggan.
const supabaseHost = (() => {
  try {
    return new URL(process.env.NEXT_PUBLIC_SUPABASE_URL ?? '').hostname;
  } catch {
    return '**.supabase.co';
  }
})();

const nextConfig: NextConfig = {
  // Emit a self-contained build at .next/standalone for a minimal Docker image.
  output: 'standalone',

  // Foto menu dilayani lewat Image Optimization, bukan ditarik mentah dari
  // Supabase Storage.
  //
  // Sebelum ini, membuka halaman menu mengunduh 57 foto ukuran asli sekaligus:
  // 9,8 MB per pelanggan. Kuota egress Supabase Free 5 GB habis dalam ~520 kali
  // buka halaman, dan pada 27 Agustus 2026 memang nyaris habis (3,95 GB dalam
  // 9 hari). Dengan ini fotonya diperkecil ke ukuran kartu yang sebenarnya
  // (~200px), dikonversi ke AVIF/WebP, dan dilayani dari CDN Vercel — Supabase
  // hanya ditarik SEKALI per foto per periode cache.
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: supabaseHost,
        pathname: '/storage/v1/object/public/**',
      },
    ],
    formats: ['image/avif', 'image/webp'],
    // Next 16 mewajibkan daftar putih ini; 60 sudah lebih dari cukup untuk foto
    // makanan seukuran ibu jari, dan jauh lebih ringan daripada 75.
    qualities: [60, 75],
    // Nama berkas unggahan sudah ber-timestamp (`1779863478047-Ropang.png`),
    // jadi URL yang sama selalu berisi gambar yang sama. Aman di-cache lama;
    // default 4 jam berarti Supabase ditarik ulang 6x sehari tanpa guna.
    minimumCacheTTL: 2678400, // 31 hari
  },

  // Next 16 memblokir akses cross-origin ke resource dev — termasuk websocket
  // HMR (/_next/webpack-hmr) — kecuali origin-nya didaftarkan di sini. Tanpa ini,
  // membuka dev server lewat IP LAN/Tailscale (mis. menguji tampilan mobile dari
  // HP) membuat HMR gagal connect dan halaman reload berulang-ulang.
  //
  // Hanya berlaku saat `next dev`, tidak berpengaruh di build produksi.
  // Tambahkan alamat baru di sini kalau IP mesinmu berubah.
  allowedDevOrigins: [
    '100.91.199.56', // Tailscale (mesin ini)
    '100.*.*.*',     // rentang Tailscale (CGNAT 100.64.0.0/10)
    '192.168.*.*',   // LAN rumah/kantor
    '10.*.*.*',      // LAN privat
  ],
};

export default nextConfig;
