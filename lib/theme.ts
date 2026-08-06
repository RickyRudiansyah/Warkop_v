// Preset tema event, dipakai bersama oleh route API, layout server, dan sinkronisasi
// realtime di klien. Daftar ini HARUS identik dengan yang ada di aplikasi kasir
// (shared/app_theme_preset.dart).
//
// Preset event BERBEDA dari mode terang/gelap di ThemeContext: preset diatur owner
// dan berlaku untuk semua orang, sedangkan terang/gelap tetap pilihan tiap perangkat.
// Keduanya berjalan berdampingan — tiap preset punya varian terang dan gelap.
export const THEME_PRESETS = ['NORMAL', 'NATAL', 'RAMADAN', 'KEMERDEKAAN', 'IMLEK'] as const;

export type ThemePreset = (typeof THEME_PRESETS)[number];

export const DEFAULT_PRESET: ThemePreset = 'NORMAL';

// Preset tak dikenal dianggap NORMAL, bukan error — kasir versi lama boleh saja
// mengirim nilai yang belum dikenal build web ini.
export function normalizePreset(value: unknown): ThemePreset {
  return THEME_PRESETS.includes(value as ThemePreset) ? (value as ThemePreset) : DEFAULT_PRESET;
}

// Bentuk baris app_settings.value untuk key 'theme'.
export function presetFromSettingsValue(value: unknown): ThemePreset {
  return normalizePreset((value as { preset?: unknown } | null)?.preset);
}
