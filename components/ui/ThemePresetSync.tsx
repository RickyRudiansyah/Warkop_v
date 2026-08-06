'use client';

import { useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { presetFromSettingsValue } from '@/lib/theme';

/**
 * Menjaga atribut `data-preset` di <html> tetap sama dengan app_settings.
 *
 * Nilai awal sudah dirender server di layout, jadi komponen ini tidak menyentuh
 * DOM saat mount — tugasnya hanya menyusul perubahan yang terjadi setelah halaman
 * terbuka, mis. owner mengganti tema dari aplikasi kasir sementara pengunjung
 * sedang memesan. Tanpa ini tema baru baru muncul setelah reload.
 */
export function ThemePresetSync() {
  useEffect(() => {
    const supabase = createClient();
    let cancelled = false;

    const sync = async () => {
      const { data, error } = await supabase
        .from('app_settings').select('value').eq('key', 'theme').maybeSingle();
      // Gagal baca dibiarkan diam: tema bukan alasan untuk mengganggu pemesanan,
      // dan nilai hasil render server tetap terpasang.
      if (cancelled || error) return;
      document.documentElement.dataset.preset = presetFromSettingsValue(data?.value);
    };

    const channel = supabase
      .channel('app-settings-theme')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'app_settings', filter: 'key=eq.theme' },
        sync,
      )
      .subscribe();

    // Realtime bisa putus tanpa pemberitahuan (tab lama di background, jaringan
    // seluler mati-nyala). Samakan sekali lagi tiap tab kembali terlihat supaya
    // perubahan yang terlewat saat koneksi putus tidak menggantung.
    const onVisible = () => { if (document.visibilityState === 'visible') sync(); };
    document.addEventListener('visibilitychange', onVisible);

    return () => {
      cancelled = true;
      supabase.removeChannel(channel);
      document.removeEventListener('visibilitychange', onVisible);
    };
  }, []);

  return null;
}
