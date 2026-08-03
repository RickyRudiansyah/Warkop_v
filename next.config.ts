import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Emit a self-contained build at .next/standalone for a minimal Docker image.
  output: 'standalone',

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
