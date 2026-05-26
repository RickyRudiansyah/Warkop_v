import { createAdminClient, createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const ALLOWED_MENU_FIELDS = ['category_id', 'name', 'description', 'price', 'image_url', 'is_available', 'is_sold_out'];

async function requireAuth() {
  const supabaseAuth = await createClient();
  const { data: { session } } = await supabaseAuth.auth.getSession();
  if (!session) return null;
  const { data: staff } = await supabaseAuth.from('staff_users').select('role').eq('id', session.user.id).single();
  return staff || null;
}

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('menu_items').select('*, category:menu_categories(*)').order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createAdminClient();
  const body = await request.json();

  if (!body.name || typeof body.name !== 'string' || !body.name.trim()) {
    return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  }
  if (body.price == null || typeof body.price !== 'number' || body.price < 0) {
    return NextResponse.json({ error: 'Valid price is required' }, { status: 400 });
  }

  const sanitized: Record<string, unknown> = {};
  for (const key of ALLOWED_MENU_FIELDS) {
    if (key in body) sanitized[key] = body[key];
  }

  const { data, error } = await supabase.from('menu_items').insert(sanitized).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
