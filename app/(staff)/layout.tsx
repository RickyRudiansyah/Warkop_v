import { ThemePresetSync } from '@/components/ui/ThemePresetSync';

/**
 * Tata letak untuk seluruh halaman staff.
 *
 * Ada hanya untuk satu hal: menyalakan [ThemePresetSync] di sini, **bukan** di
 * root layout.
 *
 * Sebelumnya komponen itu dipasang di `app/layout.tsx`, jadi setiap pelanggan
 * yang memindai QR ikut membuka koneksi WebSocket Realtime ke Supabase - hanya
 * untuk memantau satu baris `app_settings` yang berubah mungkin dua kali
 * setahun. Kuota koneksi bersamaan Free Plan cuma 200, dan warung ini punya 30
 * meja; satu jam ramai bisa menghabiskannya untuk sesuatu yang tidak pernah
 * dilihat siapa pun.
 *
 * Pelanggan tidak kehilangan apa-apa: `data-preset` sudah ditanam server saat
 * render (lihat `getThemePreset()` di root layout), jadi tema yang mereka lihat
 * tetap benar. Yang hilang cuma pembaruan langsung tanpa muat ulang, dan itu
 * memang cuma berguna untuk layar staff yang dibiarkan terbuka seharian.
 */
export default function StaffLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      <ThemePresetSync />
      {children}
    </>
  );
}
