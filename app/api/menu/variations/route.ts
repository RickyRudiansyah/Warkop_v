import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';

export async function GET(request: NextRequest) {
  const supabase = createAdminClient();
  const { searchParams } = new URL(request.url);
  const menuItemId = searchParams.get('menu_item_id');

  let query = supabase.from('menu_variations').select('*').order('variation_type').order('label');

  if (menuItemId) {
    query = query.eq('menu_item_id', menuItemId);
  }

  const { data, error } = await query;

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  if (!await requireStaff(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createAdminClient();
  const body = await request.json();

  const { data, error } = await supabase.from('menu_variations').insert(body).select().single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}
