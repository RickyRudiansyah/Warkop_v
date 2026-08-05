import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';

// Field di luar daftar ini DIBUANG DIAM-DIAM — request tetap balas 200 tapi
// datanya tidak tersimpan. Setiap menambah kolom baru di menu_items, tambahkan
// juga di sini, kalau tidak owner akan bingung kenapa isiannya selalu hilang.
const ALLOWED_MENU_FIELDS = ['category_id', 'name', 'description', 'price', 'cost_price', 'image_url', 'is_available', 'is_sold_out'];

export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireStaff(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const supabase = createAdminClient();
  const body = await request.json();

  if (body.name !== undefined && (!body.name || typeof body.name !== 'string' || !body.name.trim())) {
    return NextResponse.json({ error: 'Name cannot be empty' }, { status: 400 });
  }
  if (body.price !== undefined && (typeof body.price !== 'number' || body.price < 0)) {
    return NextResponse.json({ error: 'Invalid price' }, { status: 400 });
  }
  // cost_price > price sengaja DITERIMA: margin negatif itu keputusan bisnis
  // (menu promo), bukan kesalahan teknis. Aplikasi menandainya merah sendiri.
  if (body.cost_price !== undefined && (typeof body.cost_price !== 'number' || body.cost_price < 0)) {
    return NextResponse.json({ error: 'Invalid cost_price' }, { status: 400 });
  }

  const sanitized: Record<string, unknown> = {};
  for (const key of ALLOWED_MENU_FIELDS) {
    if (key in body) sanitized[key] = body[key];
  }

  const { data, error } = await supabase.from('menu_items').update(sanitized).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireStaff(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const supabase = createAdminClient();
  const { error } = await supabase.from('menu_items').delete().eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
