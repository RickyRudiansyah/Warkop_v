import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPage } from '@/components/ui/StaticPage';

export const metadata: Metadata = {
  title: 'Kebijakan Refund — Rumipang',
  description: 'Ketentuan pengembalian dana: seluruh transaksi bersifat final.',
};

export default function RefundPolicyPage() {
  return (
    <StaticPage title="Kebijakan Refund (Pengembalian Dana)">
      <p className="text-sm text-text-secondary mb-6">Terakhir diperbarui: 30 Juli 2026</p>

      <p className="text-text-secondary leading-relaxed">
        Kebijakan ini menjelaskan ketentuan pengembalian dana atas pembayaran
        yang dilakukan kepada Rumipang untuk pembelian makanan &amp; minuman.
        Pembayaran dilakukan langsung di tempat dan produk disiapkan segera
        setelah pesanan diterima. Dengan melakukan pemesanan dan pembayaran,
        Anda dianggap telah membaca, memahami, dan menyetujui kebijakan ini.
      </p>

      <h2 className="text-lg font-bold mt-8 mb-3">1. Seluruh Transaksi Bersifat Final</h2>
      <ul className="list-disc pl-5 space-y-2 text-text-secondary leading-relaxed">
        <li>
          Karena produk kami berupa makanan &amp; minuman (barang yang mudah
          rusak) dan langsung disiapkan, seluruh pembayaran bersifat{' '}
          <strong className="text-text font-semibold">final</strong>.
        </li>
        <li>
          Kami{' '}
          <strong className="text-text font-semibold">
            tidak menyediakan pengembalian dana (refund) maupun pembatalan
          </strong>{' '}
          atas pesanan yang telah dibayar dan/atau diproses.
        </li>
        <li>
          Mohon pastikan pilihan menu, variasi, jumlah, dan catatan sudah benar
          sebelum menyelesaikan pembayaran.
        </li>
      </ul>

      <h2 className="text-lg font-bold mt-8 mb-3">2. Kendala Pembayaran (Dana Terpotong Tanpa Pesanan)</h2>
      <p className="text-text-secondary leading-relaxed">
        Ketentuan final di atas tidak berlaku untuk kesalahan teknis pembayaran.
        Apabila saldo/rekening Anda terpotong tetapi pesanan{' '}
        <strong className="text-text font-semibold">tidak terbentuk</strong>,
        atau terjadi{' '}
        <strong className="text-text font-semibold">pembayaran ganda
        (double charge)</strong>, dana yang keliru terpotong akan kami
        kembalikan karena tidak ada transaksi yang sah. Laporkan melalui halaman{' '}
        <Link href="/kontak" className="text-text font-medium hover:underline">
          Kontak
        </Link>{' '}
        dengan menyertakan bukti pembayaran dan waktu transaksi, dan mohon
        jangan mengulang pembayaran.
      </p>

      <h2 className="text-lg font-bold mt-8 mb-3">3. Pesanan Salah atau Tidak Sesuai</h2>
      <p className="text-text-secondary leading-relaxed">
        Jika pesanan yang Anda terima salah atau tidak sesuai, segera laporkan
        kepada staf kami di lokasi pada saat itu juga agar dapat kami perbaiki
        atau ganti. Penyelesaian dilakukan dalam bentuk penggantian pesanan,
        bukan pengembalian uang.
      </p>

      <h2 className="text-lg font-bold mt-8 mb-3">4. Hubungi Kami</h2>
      <p className="text-text-secondary leading-relaxed">
        Pertanyaan seputar kebijakan ini dapat diajukan melalui halaman{' '}
        <Link href="/kontak" className="text-text font-medium hover:underline">
          Kontak
        </Link>{' '}
        atau email{' '}
        <a href="mailto:rumipang.id@gmail.com" className="text-text font-medium hover:underline">
          rumipang.id@gmail.com
        </a>
        .
      </p>
    </StaticPage>
  );
}
