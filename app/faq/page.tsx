import type { Metadata } from 'next';
import Link from 'next/link';
import { ChevronDown } from 'lucide-react';
import { StaticPage } from '@/components/ui/StaticPage';

export const metadata: Metadata = {
  title: 'FAQ — Rumipang',
  description: 'Pertanyaan yang sering diajukan seputar pemesanan dan pembayaran.',
};

function FaqItem({ question, children }: { question: React.ReactNode; children: React.ReactNode }) {
  return (
    <details className="card group p-0 overflow-hidden">
      <summary className="flex items-center justify-between gap-3 cursor-pointer list-none [&::-webkit-details-marker]:hidden px-5 py-4 font-semibold text-text">
        <span>{question}</span>
        <ChevronDown
          className="w-5 h-5 text-text-secondary shrink-0 transition-transform group-open:rotate-180"
          aria-hidden="true"
        />
      </summary>
      <div className="px-5 pb-5 -mt-1 text-text-secondary leading-relaxed space-y-3">
        {children}
      </div>
    </details>
  );
}

export default function FaqPage() {
  return (
    <StaticPage title="Pertanyaan Umum (FAQ)">
      <p className="text-text-secondary leading-relaxed mb-6">
        Kumpulan pertanyaan yang paling sering ditanyakan pelanggan. Tidak
        menemukan jawaban yang Anda cari? Silakan hubungi kami melalui halaman{' '}
        <Link href="/kontak" className="text-primary font-medium hover:underline">
          Kontak
        </Link>
        .
      </p>

      <div className="space-y-3">
        <FaqItem question="Apa itu layanan pemesanan ini?">
          <p>
            Rumipang adalah sistem pesan mandiri berbasis QR Code. Anda cukup
            memindai QR Code yang ada di meja, memilih menu, lalu membayar —
            tanpa perlu antri ke kasir.
          </p>
        </FaqItem>

        <FaqItem question="Bagaimana cara memesan?">
          <p>
            Pindai (scan) QR Code di meja Anda, pilih menu dan variasi yang
            diinginkan, tambahkan ke keranjang, lalu lanjut ke halaman checkout
            untuk memilih metode pembayaran dan menyelesaikan pesanan.
          </p>
        </FaqItem>

        <FaqItem question="Apakah saya harus berada di lokasi untuk memesan?">
          <p>
            Ya. Pemesanan dilakukan langsung di tempat dengan memindai QR Code
            pada meja Anda. Sistem akan memverifikasi bahwa Anda berada di
            sekitar lokasi kami sebelum pesanan dapat dibuat.
          </p>
        </FaqItem>

        <FaqItem question="Metode pembayaran apa saja yang tersedia?">
          <p>
            Kami menerima pembayaran Tunai (Cash), QRIS, transfer bank, serta
            pembayaran online yang diproses melalui payment gateway resmi.
            Ketersediaan metode dapat berbeda sesuai kebijakan kami.
          </p>
        </FaqItem>

        <FaqItem question="Apakah pembayaran online aman?">
          <p>
            Aman. Transaksi pembayaran online diproses oleh penyedia payment
            gateway berlisensi. Kami tidak menyimpan data kartu atau kredensial
            pembayaran Anda di sistem kami.
          </p>
        </FaqItem>

        <FaqItem question="Bagaimana cara melacak status pesanan saya?">
          <p>
            Setelah pesanan berhasil dibuat, Anda akan diarahkan ke halaman
            pelacakan yang menampilkan status pesanan secara realtime beserta
            estimasi waktu penyajian.
          </p>
        </FaqItem>

        <FaqItem question="Berapa lama pesanan saya siap?">
          <p>
            Estimasi waktu penyajian akan ditampilkan pada halaman pelacakan
            saat dapur mulai memproses pesanan Anda. Waktu dapat bervariasi
            tergantung jumlah antrean dan jenis menu.
          </p>
        </FaqItem>

        <FaqItem question="Apakah pesanan bisa dibatalkan?">
          <p>
            Setelah pesanan dikirim ke kasir, pesanan tidak dapat dibatalkan
            sendiri melalui aplikasi. Jika terjadi kendala, segera hubungi staf
            kami di lokasi atau melalui halaman{' '}
            <Link href="/kontak" className="text-primary font-medium hover:underline">
              Kontak
            </Link>
            .
          </p>
        </FaqItem>

        <FaqItem question="Pembayaran saya berhasil, tetapi pesanan tidak muncul. Apa yang harus saya lakukan?">
          <p>
            Mohon jangan mengulang pembayaran. Hubungi kami segera melalui
            halaman{' '}
            <Link href="/kontak" className="text-primary font-medium hover:underline">
              Kontak
            </Link>{' '}
            dengan menyertakan bukti pembayaran dan nomor pesanan. Kami akan
            memeriksa dan menindaklanjuti sesuai{' '}
            <Link href="/refund-policy" className="text-primary font-medium hover:underline">
              Kebijakan Refund
            </Link>
            .
          </p>
        </FaqItem>

        <FaqItem question="Bagaimana jika pesanan saya salah atau ada yang kurang?">
          <p>
            Segera laporkan kepada staf kami di lokasi pada saat itu juga, atau
            hubungi kontak resmi kami, agar dapat kami perbaiki atau proses
            sesuai kebijakan yang berlaku.
          </p>
        </FaqItem>

        <FaqItem question="Bagaimana kebijakan pengembalian dana (refund)?">
          <p>
            Ketentuan lengkap mengenai pengembalian dana dapat Anda baca pada
            halaman{' '}
            <Link href="/refund-policy" className="text-primary font-medium hover:underline">
              Kebijakan Refund
            </Link>
            .
          </p>
        </FaqItem>

        <FaqItem question="Apakah makanan di Rumipang halal?">
          <p>
            Makanan dan minuman kami diolah menggunakan bahan-bahan yang halal.
            Saat ini kami belum memiliki sertifikat halal resmi, namun kami
            berkomitmen menjaga kehalalan bahan yang kami gunakan.
          </p>
        </FaqItem>
      </div>
    </StaticPage>
  );
}
