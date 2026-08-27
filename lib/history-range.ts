import type { NextRequest } from 'next/server';

/**
 * Batas rentang riwayat yang dikirim klien.
 *
 * Keduanya ISO-8601 **lengkap dengan offset zona waktu**: batas "hari" di
 * warung adalah tengah malam WIB, bukan UTC, dan hanya klien yang tahu zona
 * itu. Tengah malam UTC jatuh pukul 07.00 pagi, tepat di tengah hari kerja.
 * `from` inklusif, `to` eksklusif.
 */
export interface HistoryRange {
  from: string | null;
  to: string | null;
  limit: number;
  /** Pesan error kalau parameternya tidak sah. */
  error?: string;
}

/**
 * Batas atas jumlah order yang boleh dikembalikan sekali panggil.
 *
 * Ada karena dulu tidak ada: `/api/orders/history` mengembalikan SELURUH
 * riwayat sejak hari pertama, dan pada 636 order sudah 897 KB. Warung ini
 * membuat ~32 order sehari, jadi dalam setahun balasannya menembus 16 MB —
 * ditarik ulang setiap kali tab Riwayat dibuka, oleh tiga pemanggil berbeda.
 */
const MAX_LIMIT = 500;
const DEFAULT_LIMIT = 200;

export function readHistoryRange(request: NextRequest): HistoryRange {
  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  for (const [name, value] of [['from', from], ['to', to]] as const) {
    if (value && Number.isNaN(Date.parse(value))) {
      return { from: null, to: null, limit: DEFAULT_LIMIT, error: `Parameter ${name} bukan tanggal yang sah` };
    }
  }

  const raw = Number(searchParams.get('limit'));
  const limit = Number.isFinite(raw) && raw > 0 ? Math.min(raw, MAX_LIMIT) : DEFAULT_LIMIT;

  return { from, to, limit };
}
