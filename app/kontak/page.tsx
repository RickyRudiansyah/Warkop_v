import type { Metadata } from 'next';
import { Mail, Phone, MapPin, Clock } from 'lucide-react';
import { StaticPage } from '@/components/ui/StaticPage';
import { Placeholder } from '@/components/ui/Placeholder';

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
        {/* EMAIL — wajib tampil jelas untuk verifikasi iPaymu.
            Setelah diisi, ubah menjadi: <a href="mailto:email@bisnis.com"> */}
        <div className="card p-5 flex items-start gap-4">
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Mail className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text">Email</p>
            <p className="text-base mt-0.5 break-words">
              <Placeholder>Email Bisnis, mis. halo@rumipang.com</Placeholder>
            </p>
            <p className="text-sm text-text-secondary mt-1">
              Balasan maksimal 1×24 jam pada hari kerja.
            </p>
          </div>
        </div>

        {/* NOMOR TELEPON — wajib tampil jelas untuk verifikasi iPaymu.
            Setelah diisi, ubah menjadi: <a href="tel:+62..."> */}
        <div className="card p-5 flex items-start gap-4">
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Phone className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text">Telepon / WhatsApp</p>
            <p className="text-base mt-0.5 break-words">
              <Placeholder>Nomor Telepon, mis. +62 812-3456-7890</Placeholder>
            </p>
            <p className="text-sm text-text-secondary mt-1">
              Dapat dihubungi via telepon maupun WhatsApp.
            </p>
          </div>
        </div>

        {/* ALAMAT USAHA — wajib tampil jelas untuk verifikasi iPaymu. */}
        <div className="card p-5 flex items-start gap-4">
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <MapPin className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text">Alamat Usaha</p>
            <p className="text-base mt-0.5 leading-relaxed">
              <Placeholder>
                Alamat Lengkap Usaha — nama jalan, nomor, kelurahan, kecamatan,
                kota, provinsi, dan kode pos
              </Placeholder>
            </p>
          </div>
        </div>

        {/* JAM OPERASIONAL — opsional tapi disarankan. */}
        <div className="card p-5 flex items-start gap-4">
          <div className="w-11 h-11 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
            <Clock className="w-5 h-5 text-primary" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-text">Jam Operasional</p>
            <p className="text-base mt-0.5 leading-relaxed">
              <Placeholder>Jam Buka, mis. Senin–Minggu, 08.00–22.00 WIB</Placeholder>
            </p>
          </div>
        </div>
      </div>

      <p className="text-sm text-text-secondary leading-relaxed mt-8">
        Nama badan usaha:{' '}
        <Placeholder>Nama Bisnis / Badan Usaha</Placeholder>. Kontak di atas
        adalah saluran resmi kami — mohon berhati-hati terhadap pihak yang
        mengatasnamakan usaha kami di luar kontak ini.
      </p>
    </StaticPage>
  );
}
