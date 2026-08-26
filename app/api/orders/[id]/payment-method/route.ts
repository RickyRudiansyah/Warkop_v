import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Tukar metode bayar sebuah order: `CASH` ↔ `QRIS`.
 *
 * Pelanggan sering memilih tunai di web lalu berubah pikiran di meja kasir.
 * Tanpa ini, kasir harus membatalkan ordernya dan mengetik ulang seluruh
 * pesanan.
 *
 * **Hanya selama `UNPAID`.** Setelah lunas, metode bayar menentukan uangnya ada
 * di mana — tunai di laci, QRIS di rekening — dan rekap kas memisahkan keduanya
 * persis untuk itu. Mengubahnya setelah pembayaran akan memindahkan uang antar
 * pos secara diam-diam, dan selisihnya baru ketahuan saat menghitung laci.
 */
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireStaff(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const method = typeof body?.payment_method === 'string' ? body.payment_method.toUpperCase() : '';

  if (method !== 'CASH' && method !== 'QRIS') {
    return NextResponse.json({ error: 'payment_method harus CASH atau QRIS' }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: current } = await supabase
    .from('orders').select('payment_status, status').eq('id', id).maybeSingle();

  if (!current) return NextResponse.json({ error: 'Order tidak ditemukan' }, { status: 404 });
  if (current.status === 'CANCELLED') {
    return NextResponse.json({ error: 'Order sudah dibatalkan' }, { status: 400 });
  }
  if (current.payment_status === 'PAID') {
    return NextResponse.json(
      { error: 'Order sudah lunas — metode bayarnya tidak bisa diubah lagi' },
      { status: 409 },
    );
  }

  const { data, error } = await supabase
    .from('orders').update({ payment_method: method }).eq('id', id).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
