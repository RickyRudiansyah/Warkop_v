import { createAdminClient, createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

async function requireAuth() {
  const supabaseAuth = await createClient();
  const { data: { session } } = await supabaseAuth.auth.getSession();
  if (!session) return null;
  const { data: staff } = await supabaseAuth.from('staff_users').select('role').eq('id', session.user.id).single();
  return staff || null;
}

export async function GET(request: NextRequest) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);
  const menuItemId = searchParams.get('menu_item_id');

  let query = supabase.from('menu_variations').select('*').order('group_name').order('label');

  if (menuItemId) {
    query = query.eq('menu_item_id', menuItemId);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createAdminClient();
  const body = await request.json();

  const { data, error } = await supabase.from('menu_variations').insert(body).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
