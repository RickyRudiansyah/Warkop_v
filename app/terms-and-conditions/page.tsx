import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPage } from '@/components/ui/StaticPage';
import { Placeholder } from '@/components/ui/Placeholder';

export const metadata: Metadata = {
  title: 'Syarat & Ketentuan — Rumipang',
  description: 'Syarat dan ketentuan penggunaan layanan pemesanan.',
};

export default function TermsPage() {
  return (
    <StaticPage title="Syarat & Ketentuan">
      <p className="text-sm text-text-secondary mb-6">
        Terakhir diperbarui: <Placeholder>Tanggal, mis. 30 Juli 2026</Placeholder>
      </p>

      <p className="text-text-secondary leading-relaxed">
        Selamat datang di layanan pemesanan{' '}
        <Placeholder>Nama Bisnis</Placeholder>. Dengan mengakses dan
        menggunakan layanan ini, Anda menyetujui untuk terikat pada syarat dan
        ketentuan di bawah ini. Mohon baca dengan saksama sebelum melakukan
        pemesanan.
      </p>

      <h2 className="text-lg font-bold mt-8 mb-3">1. Tentang Layanan</h2>
      <p className="text-text-secondary leading-relaxed">
        <Placeholder>Nama Bisnis</Placeholder> menyediakan layanan pemesanan
        mandiri berbasis QR Code untuk pembelian{' '}
        <Placeholder>Jenis Produk/Jasa, mis. makanan &amp; minuman</Placeholder>{' '}
        yang dinikmati di tempat. Pemesanan dilakukan dengan memindai QR Code
        pada meja di lokasi kami.
      </p>

      <h2 className="text-lg font-bold mt-8 mb-3">2. Pemesanan</h2>
      <ul className="list-disc pl-5 space-y-2 text-text-secondary leading-relaxed">
        <li>
          Pesanan dianggap sah setelah Anda menyelesaikan proses checkout dan
          pembayaran (atau konfirmasi pembayaran oleh kasir).
        </li>
        <li>
          Anda bertanggung jawab memastikan pilihan menu, variasi, jumlah, dan
          catatan sudah benar sebelum mengirim pesanan.
        </li>
        <li>
          Setelah pesanan dikirim ke kasir, pesanan tidak dapat dibatalkan
          sendiri melalui aplikasi.
        </li>
      </ul>

      <h2 className="text-lg font-bold mt-8 mb-3">3. Harga &amp; Pembayaran</h2>
      <ul className="list-disc pl-5 space-y-2 text-text-secondary leading-relaxed">
        <li>
          Seluruh harga ditampilkan dalam Rupiah (IDR) dan sudah termasuk/belum
          termasuk pajak atau biaya lain sesuai{' '}
          <Placeholder>ketentuan pajak/biaya layanan Anda</Placeholder>.
        </li>
        <li>
          Pembayaran dapat dilakukan melalui Tunai, QRIS, transfer bank, atau
          pembayaran online melalui payment gateway resmi.
        </li>
        <li>
          Pembayaran online diproses oleh penyedia pihak ketiga. Kami tidak
          menyimpan data kartu atau kredensial pembayaran Anda.
        </li>
      </ul>

      <h2 className="text-lg font-bold mt-8 mb-3">4. Pembatalan &amp; Pengembalian Dana</h2>
      <p className="text-text-secondary leading-relaxed">
        Ketentuan pembatalan dan pengembalian dana mengikuti{' '}
        <Link href="/refund-policy" className="text-primary font-medium hover:underline">
          Kebijakan Refund
        </Link>{' '}
        yang merupakan bagian tidak terpisahkan dari syarat dan ketentuan ini.
      </p>

      <h2 className="text-lg font-bold mt-8 mb-3">5. Kewajiban Pengguna</h2>
      <ul className="list-disc pl-5 space-y-2 text-text-secondary leading-relaxed">
        <li>Memberikan informasi yang benar saat melakukan pemesanan.</li>
        <li>
          Tidak menyalahgunakan layanan untuk tujuan melanggar hukum, menipu,
          atau merugikan pihak lain.
        </li>
        <li>Melakukan pembayaran sesuai jumlah yang tertera pada pesanan.</li>
      </ul>

      <h2 className="text-lg font-bold mt-8 mb-3">6. Ketersediaan Produk</h2>
      <p className="text-text-secondary leading-relaxed">
        Ketersediaan menu dapat berubah sewaktu-waktu. Jika suatu menu habis
        setelah pesanan dibuat, kami akan menghubungi Anda untuk penggantian
        atau pengembalian dana sesuai{' '}
        <Link href="/refund-policy" className="text-primary font-medium hover:underline">
          Kebijakan Refund
        </Link>
        .
      </p>

      <h2 className="text-lg font-bold mt-8 mb-3">7. Batasan Tanggung Jawab</h2>
      <p className="text-text-secondary leading-relaxed">
        Sepanjang diizinkan oleh hukum yang berlaku, kami tidak bertanggung
        jawab atas kerugian tidak langsung yang timbul dari gangguan jaringan,
        perangkat pelanggan, atau layanan pihak ketiga (termasuk penyedia
        pembayaran) yang berada di luar kendali kami.
      </p>

      <h2 className="text-lg font-bold mt-8 mb-3">8. Hak Kekayaan Intelektual</h2>
      <p className="text-text-secondary leading-relaxed">
        Seluruh merek, logo, nama, dan konten dalam layanan ini merupakan milik{' '}
        <Placeholder>Nama Bisnis</Placeholder> dan dilindungi undang-undang.
        Dilarang menggunakan tanpa izin tertulis.
      </p>

      <h2 className="text-lg font-bold mt-8 mb-3">9. Perubahan Syarat</h2>
      <p className="text-text-secondary leading-relaxed">
        Kami dapat memperbarui syarat dan ketentuan ini sewaktu-waktu. Versi
        terbaru yang berlaku adalah yang dipublikasikan pada halaman ini.
      </p>

      <h2 className="text-lg font-bold mt-8 mb-3">10. Hukum yang Berlaku</h2>
      <p className="text-text-secondary leading-relaxed">
        Syarat dan ketentuan ini tunduk pada hukum Republik Indonesia. Setiap
        perselisihan akan diselesaikan secara musyawarah, dan bila tidak
        tercapai, melalui yurisdiksi hukum di{' '}
        <Placeholder>Kota/Kabupaten domisili usaha</Placeholder>.
      </p>

      <h2 className="text-lg font-bold mt-8 mb-3">11. Hubungi Kami</h2>
      <p className="text-text-secondary leading-relaxed">
        Pertanyaan mengenai syarat dan ketentuan ini dapat diajukan melalui
        halaman{' '}
        <Link href="/kontak" className="text-primary font-medium hover:underline">
          Kontak
        </Link>
        .
      </p>
    </StaticPage>
  );
}
