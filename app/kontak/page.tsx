import type { Metadata } from 'next';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { StaticPage } from '@/components/ui/StaticPage';

export const metadata: Metadata = {
  title: 'Kontak — Rumipang',
  description: 'Hubungi kami: email, nomor telepon, dan alamat usaha resmi.',
};

export default function KontakPage() {
  return (
    <StaticPage title="Hubungi Kami">
      <p className="text-text-secondary leading-relaxed mb-6">
        Ada pertanyaan seputar pesanan, pembayaran, atau ingin menyampaikan
        masukan? Silakan hubungi kami melalui kontak resmi di bawah ini. Kami
        akan membantu secepat mungkin pada jam operasional.
      </p>

      <div className="space-y-4">
        {/* EMAIL — wajib tampil jelas untuk verifikasi iPaymu. */}
        <div className="card p-5 flex items-start gap-4">
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-text" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text">Email</p>
            <p className="text-base mt-0.5 break-words">
              <a href="mailto:rumipang.id@gmail.com" className="text-text hover:underline">
                rumipang.id@gmail.com
              </a>
            </p>
            <p className="text-sm text-text-secondary mt-1">
              Balasan maksimal 1×24 jam pada hari kerja.
            </p>
          </div>
        </div>

        {/* NOMOR TELEPON — wajib tampil jelas untuk verifikasi iPaymu. */}
        <div className="card p-5 flex items-start gap-4">
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Phone className="w-5 h-5 text-text" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text">Telepon / WhatsApp</p>
            <p className="text-base mt-0.5 break-words">
              <a href="tel:+6285117408510" className="text-text hover:underline">
                0851-1740-8510
              </a>
            </p>
            <p className="text-sm text-text-secondary mt-1">
              Telepon atau{' '}
              <a
                href="https://wa.me/6285117408510"
                target="_blank"
                rel="noopener noreferrer"
                className="text-text hover:underline"
              >
                chat via WhatsApp
              </a>
              .
            </p>
          </div>
        </div>

        {/* ALAMAT USAHA — wajib tampil jelas untuk verifikasi iPaymu. */}
        <div className="card p-5 flex items-start gap-4">
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-text" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text">Alamat Usaha</p>
            <p className="text-base mt-0.5 leading-relaxed">
              Jl. Ruko Poris Indah No.11 Blok A9C, RT.003/RW.003, Cipondoh
              Indah, Kec. Cipondoh, Kota Tangerang, Banten 15122
            </p>
          </div>
        </div>

        {/* JAM OPERASIONAL — opsional tapi disarankan. */}
        <div className="card p-5 flex items-start gap-4">
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-text" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text">Jam Operasional</p>
            <p className="text-base mt-0.5 leading-relaxed">
              Setiap hari, pukul 11.00 – 00.00 WIB
            </p>
          </div>
        </div>
      </div>

      <p className="text-sm text-text-secondary leading-relaxed mt-8">
        Nama badan usaha: Rumipang. Kontak di atas
        adalah saluran resmi kami — mohon berhati-hati terhadap pihak yang
        mengatasnamakan usaha kami di luar kontak ini.
      </p>
    </StaticPage>
  );
}
