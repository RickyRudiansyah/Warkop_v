import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';

export const dynamic = 'force-dynamic';

/**
 * Pengeluaran harian — supaya rekap menampilkan uang **bersih**, bukan omzet.
 *
 * Rentangnya ditentukan pemanggil lewat `?from=&to=` (ISO ber-offset), sama
 * seperti hapus riwayat: batas "hari" di warung adalah tengah malam WIB, dan
 * hanya klien yang tahu zona itu. Server tidak boleh menebaknya — tengah malam
 * UTC jatuh pukul 07.00 pagi, tepat di tengah hari kerja.
 */
export async function GET(request: NextRequest) {
  if (!await requireStaff(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  for (const [name, value] of [['from', from], ['to', to]] as const) {
    if (value && Number.isNaN(Date.parse(value))) {
      return NextResponse.json({ error: `Parameter ${name} bukan tanggal yang sah` }, { status: 400 });
    }
  }

  const supabase = createAdminClient();
  let query = supabase.from('expenses').select('*').order('spent_at', { ascending: false });
  if (from) query = query.gte('spent_at', from);
  if (to) query = query.lt('spent_at', to);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

export async function POST(request: NextRequest) {
  const staff = await requireStaff(request);
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));

  // Dibulatkan, bukan ditolak kalau desimal: kasir mengetik angka rupiah, dan
  // menolak "20.500,5" karena satu digit di belakang koma cuma menghambat.
  const amount = Math.round(Number(body.amount));
  if (!Number.isFinite(amount) || amount <= 0) {
    return NextResponse.json({ error: 'Nominal harus lebih dari 0' }, { status: 400 });
  }

  const note = typeof body.note === 'string' ? body.note.trim() : '';
  if (!note) {
    return NextResponse.json({ error: 'Keterangan wajib diisi' }, { status: 400 });
  }

  const spentAt = typeof body.spent_at === 'string' && !Number.isNaN(Date.parse(body.spent_at))
    ? body.spent_at
    : new Date().toISOString();

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('expenses')
    .insert({
      amount,
      note,
      category: typeof body.category === 'string' && body.category.trim() ? body.category.trim() : null,
      spent_at: spentAt,
      created_by: staff.name,
    })
    .select('*')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
