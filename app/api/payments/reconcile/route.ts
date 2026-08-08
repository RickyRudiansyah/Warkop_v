import { NextRequest, NextResponse } from 'next/server';
import { requirePrintAccess } from '@/lib/print';
import { reconcilePendingIntents } from '@/lib/reconcile';

export const dynamic = 'force-dynamic';

/**
 * Sapu pembayaran QRIS yang tertinggal — lihat `lib/reconcile.ts`.
 *
 * Autentikasinya sengaja memakai `requirePrintAccess`: yang paling sering
 * memanggil ini adalah **aplikasi kasir**, satu-satunya perangkat yang menyala
 * sepanjang hari di warung. Ia sudah memegang token perangkat atau sesi staff,
 * jadi tidak perlu kredensial baru.
 *
 * Dibuat POST, bukan GET, karena ia mengubah data (membuat order + antrian
 * cetak) — jangan sampai terpanggil oleh prefetch atau crawler.
 */
export async function POST(request: NextRequest) {
  const access = await requirePrintAccess(request);
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const result = await reconcilePendingIntents();
  return NextResponse.json(result);
}
