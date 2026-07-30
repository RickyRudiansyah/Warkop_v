import type { Metadata } from 'next';
import Link from 'next/link';
import { StaticPage } from '@/components/ui/StaticPage';
import { Placeholder } from '@/components/ui/Placeholder';

export const metadata: Metadata = {
  title: 'Kebijakan Refund — Rumipang',
  description: 'Ketentuan pengembalian dana untuk pesanan dan pembayaran.',
};

export default function RefundPolicyPage() {
  return (
    <StaticPage title="Kebijakan Refund (Pengembalian Dana)">
      <p className="text-sm text-text-secondary mb-6">
        Terakhir diperbarui: <Placeholder>Tanggal, mis. 30 Juli 2026</Placeholder>
      </p>

      <p className="text-text-secondary leading-relaxed">
        Kebijakan ini menjelaskan ketentuan pengembalian dana (refund) atas
        pembayaran yang dilakukan kepada{' '}
        <Placeholder>Nama Bisnis</Placeholder> untuk pembelian{' '}
        <Placeholder>Jenis Produk/Jasa, mis. makanan &amp; minuman</Placeholder>.
        Dengan melakukan pemesanan dan pembayaran, Anda dianggap telah membaca,
        memahami, dan menyetujui kebijakan ini.
      </p>

      <h2 className="text-lg font-bold mt-8 mb-3">1. Ketentuan Umum</h2>
      <p className="text-text-secondary leading-relaxed">
        Karena produk kami merupakan barang yang mudah rusak dan disiapkan
        segera setelah pesanan diterima, pada dasarnya pesanan yang sudah
        diproses tidak dapat dibatalkan. Pengembalian dana hanya dapat
        diajukan pada kondisi tertentu yang dijelaskan di bawah ini.
      </p>

      <h2 className="text-lg font-bold mt-8 mb-3">2. Kondisi yang Dapat Diajukan Refund</h2>
      <ul className="list-disc pl-5 space-y-2 text-text-secondary leading-relaxed">
        <li>
          <strong className="text-text font-semibold">Pembayaran gagal namun dana terpotong.</strong>{' '}
          Transaksi tidak berhasil terkonfirmasi, tetapi saldo/rekening Anda
          telah terdebit.
        </li>
        <li>
          <strong className="text-text font-semibold">Pembayaran ganda (double charge).</strong>{' '}
          Anda terkena tagihan lebih dari satu kali untuk pesanan yang sama.
        </li>
        <li>
          <strong className="text-text font-semibold">Pesanan dibatalkan oleh pihak kami.</strong>{' '}
          Misalnya stok/menu habis sebelum pesanan sempat kami proses.
        </li>
        <li>
          <strong className="text-text font-semibold">Pesanan salah, tidak sesuai, atau rusak</strong>{' '}
          saat diterima, dengan bukti yang memadai dan dilaporkan sesuai batas
          waktu klaim.
        </li>
        <li>
          <Placeholder>
            Kondisi lain yang berlaku khusus untuk bisnis Anda (bila ada)
          </Placeholder>
        </li>
      </ul>

      <h2 className="text-lg font-bold mt-8 mb-3">3. Kondisi yang Tidak Dapat Direfund</h2>
      <ul className="list-disc pl-5 space-y-2 text-text-secondary leading-relaxed">
        <li>Produk sudah disiapkan, disajikan, dan/atau sudah dikonsumsi.</li>
        <li>Perubahan pikiran (change of mind) setelah pesanan dikonfirmasi.</li>
        <li>
          Kesalahan pemilihan menu, variasi, atau catatan yang dilakukan oleh
          pelanggan sendiri.
        </li>
        <li>
          <Placeholder>Pengecualian lain sesuai kebijakan bisnis Anda (bila ada)</Placeholder>
        </li>
      </ul>

      <h2 className="text-lg font-bold mt-8 mb-3">4. Cara Mengajukan Refund</h2>
      <p className="text-text-secondary leading-relaxed">
        Ajukan permohonan refund melalui halaman{' '}
        <Link href="/kontak" className="text-primary font-medium hover:underline">
          Kontak
        </Link>{' '}
        paling lambat{' '}
        <Placeholder>Batas Waktu Klaim, mis. 1×24 jam</Placeholder> sejak
        transaksi. Sertakan informasi berikut agar proses lebih cepat:
      </p>
      <ul className="list-disc pl-5 space-y-2 text-text-secondary leading-relaxed mt-3">
        <li>Nomor pesanan dan tanggal transaksi.</li>
        <li>Bukti pembayaran (struk/screenshot).</li>
        <li>Alasan pengajuan dan foto (bila terkait pesanan salah/rusak).</li>
      </ul>

      <h2 className="text-lg font-bold mt-8 mb-3">5. Proses &amp; Waktu Pengembalian</h2>
      <p className="text-text-secondary leading-relaxed">
        Setelah permohonan disetujui, dana akan dikembalikan ke metode
        pembayaran asal (QRIS, transfer bank, atau melalui payment gateway)
        dalam waktu{' '}
        <Placeholder>Estimasi Proses, mis. 3–14 hari kerja</Placeholder>. Lama
        proses dapat dipengaruhi oleh kebijakan bank atau penyedia pembayaran.
        Potongan biaya administrasi (jika ada) sebesar{' '}
        <Placeholder>Biaya Admin, mis. 0% / sesuai ketentuan gateway</Placeholder>.
      </p>

      <h2 className="text-lg font-bold mt-8 mb-3">6. Hubungi Kami</h2>
      <p className="text-text-secondary leading-relaxed">
        Pertanyaan seputar kebijakan ini dapat diajukan melalui halaman{' '}
        <Link href="/kontak" className="text-primary font-medium hover:underline">
          Kontak
        </Link>{' '}
        atau email{' '}
        <Placeholder>Email Bisnis</Placeholder>.
      </p>
    </StaticPage>
  );
}
