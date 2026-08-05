import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('categories').select('*').order('sort_order');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  if (!await requireStaff(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  if (!name) return NextResponse.json({ error: 'Nama kategori wajib diisi' }, { status: 400 });

  const supabase = createAdminClient();

  // Kalau sort_order tidak dikirim, taruh di urutan paling belakang.
  let sortOrder = body.sort_order;
  if (typeof sortOrder !== 'number') {
    const { data: last } = await supabase
      .from('categories').select('sort_order').order('sort_order', { ascending: false }).limit(1).maybeSingle();
    sortOrder = (last?.sort_order ?? 0) + 1;
  }

  const { data, error } = await supabase
    .from('categories').insert({ name, sort_order: sortOrder }).select().single();

  if (error) {
    // 23505 = kena unique index categories_name_unique. Dua tablet bisa
    // menambah nama yang sama bersamaan — pengecekan di aplikasi tidak cukup.
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Kategori ini sudah ada' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
