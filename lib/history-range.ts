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
 * **Ini jaring pengaman, BUKAN alat penghemat.** Yang menghemat adalah rentang
 * tanggal: "Hari Ini" berharga 0,6 KB, sementara seluruh riwayat 897 KB.
 *
 * Versi pertama batas ini 200, dan itu **salah dan berbahaya**. Pada 723 order,
 * riwayat terpotong jadi hanya 25 Agustus ke atas: 523 order (72%) lenyap dari
 * layar tanpa satu pun pesan. Yang melapor bukan sistem, tapi karyawan warung
 * yang mencari rekap tanggal 7 dan tidak menemukannya. Diam-diam menyembunyikan
 * catatan uang adalah kegagalan yang jauh lebih mahal daripada balasan besar.
 *
 * Karena itu angkanya sekarang longgar, dan pemotongannya **wajib terlihat**:
 * kalau jumlah baris yang kembali sama dengan `limit`, klien menampilkan
 * peringatan bahwa masih ada yang lebih lama.
 */
const MAX_LIMIT = 5000;
const DEFAULT_LIMIT = 1000;

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
