import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const REASONS = ['PURCHASE', 'USAGE', 'WASTE', 'CORRECTION'];

// Riwayat pergerakan stok satu bahan.
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireStaff(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('stock_movements')
    .select('*')
    .eq('ingredient_id', id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// Satu-satunya cara mengubah stok.
//
// Memakai `delta` (bukan menimpa nilai absolut) supaya dua kasir yang
// menyesuaikan stok bersamaan terakumulasi benar, bukan saling menghapus.
// Update stok + pencatatan jejak dijalankan dalam SATU transaksi lewat fungsi
// Postgres `apply_stock_movement` — kalau salah satunya gagal, keduanya batal.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff(request);
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const delta = body.delta;
  const reason = body.reason;

  if (typeof delta !== 'number' || !isFinite(delta) || delta === 0) {
    return NextResponse.json({ error: 'delta harus angka dan tidak boleh 0' }, { status: 400 });
  }
  if (!REASONS.includes(reason)) {
    return NextResponse.json({ error: 'reason harus salah satu dari: ' + REASONS.join(', ') }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc('apply_stock_movement', {
    p_ingredient_id: id,
    p_delta: delta,
    p_reason: reason,
    p_note: typeof body.note === 'string' ? body.note : null,
    p_actor_email: body.actor_email ?? null,
  });

  if (error) {
    if (error.message?.includes('Bahan tidak ditemukan')) {
      return NextResponse.json({ error: 'Bahan tidak ditemukan' }, { status: 404 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
