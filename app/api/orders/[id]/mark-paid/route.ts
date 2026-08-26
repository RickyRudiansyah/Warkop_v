import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';
import { enqueueReceipt } from '@/lib/print';
import { autoArchiveIfSettled } from '@/lib/archive';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff(request);
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;

  // Nama kasir yang bertugas, dikirim aplikasi. Warung memakai satu akun login
  // bersama, jadi `staff.name` dari JWT selalu sama siapa pun yang melayani.
  //
  // Sengaja TIDAK divalidasi ke tabel staff: itu satu query tambahan pada
  // jalur terpanas (tiap pembayaran tunai), demi mencegah teks bebas dari
  // klien yang sudah terautentikasi staff. Yang dilakukan cuma memangkas -
  // dampak terburuknya nama aneh tercetak di struk, bukan data rusak.
  const body = await request.json().catch(() => ({}));
  const claimed = typeof body?.verified_by === 'string'
    ? body.verified_by.trim().slice(0, 40)
    : '';

  const supabase = createAdminClient();

  const { data: current } = await supabase.from('orders').select('payment_status').eq('id', id).single();
  if (!current) return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  if (current.payment_status === 'PAID') {
    return NextResponse.json({ error: 'Order is already paid' }, { status: 400 });
  }

  const { data, error } = await supabase.from('orders').update({ payment_status: 'PAID' }).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Pembayaran tunai sudah diverifikasi kasir -> struk masuk antrian printer.
  const print = await enqueueReceipt(id, { trigger: 'CASH_VERIFIED', verifiedBy: claimed || staff.name });

  // Order yang sudah diantar + lunas langsung pindah ke riwayat — tidak ada
  // lagi tombol "Selesai" yang harus ditekan kasir (lib/archive.ts).
  const archived = await autoArchiveIfSettled(id);

  return NextResponse.json({ ...data, is_archived: archived || data.is_archived, print_queued: print.ok });
}
