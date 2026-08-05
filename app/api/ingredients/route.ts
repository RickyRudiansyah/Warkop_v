import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!await requireStaff(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);
  // ?all=1 menampilkan yang sudah dinonaktifkan juga.
  let query = supabase.from('ingredients').select('*').order('name');
  if (searchParams.get('all') !== '1') query = query.eq('is_active', true);

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  if (!await requireStaff(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return NextResponse.json({ error: 'Nama bahan wajib diisi' }, { status: 400 });

  const num = (v: unknown, fallback: number) => (typeof v === 'number' && isFinite(v) ? v : fallback);

  const supabase = createAdminClient();
  const { data, error } = await supabase.from('ingredients').insert({
    name,
    unit: typeof body.unit === 'string' && body.unit.trim() ? body.unit.trim() : 'pcs',
    stock_qty: num(body.stock_qty, 0),
    alert_threshold: num(body.alert_threshold, 20),
  }).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
