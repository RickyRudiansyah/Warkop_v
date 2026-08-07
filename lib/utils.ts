export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatDate(date: string | Date): string {
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(date));
}

export function getElapsedMinutes(date: string | Date): number {
  const now = new Date();
  const then = new Date(date);
  if (isNaN(then.getTime())) return 0;
  return Math.floor((now.getTime() - then.getTime()) / 60000);
}

export function cn(...classes: (string | boolean | undefined | null)[]): string {
  return classes.filter(Boolean).join(' ');
}

/** Ditulis lengkap di tempat memilih (POS, checkout); "Take Away" saja di daftar. */
export const TAKE_AWAY_LABEL = 'Take Away · Tanpa Meja';

/**
 * Nama meja sebuah order. Order tanpa `table` adalah pesanan bungkus.
 *
 * Ditulis **"Take Away"**, bukan "Tanpa Meja", supaya terbaca sebagai jenis
 * pesanan yang memang dipilih — bukan sebagai data meja yang gagal dimuat.
 * Sebelumnya beberapa layar bahkan menuliskannya "Meja -", yang terbaca seperti
 * kerusakan data. Aplikasi kasir Flutter memakai kata yang sama
 * (`OrderModel.tableLabel`); keduanya harus tetap seragam, karena order yang
 * sama muncul di dua layar itu sekaligus.
 */
export function tableLabel(table?: { table_number?: number | null; label?: string | null } | null): string {
  if (!table) return 'Take Away';
  if (table.label) return table.label;
  return table.table_number != null ? 'Meja ' + table.table_number : 'Take Away';
}
