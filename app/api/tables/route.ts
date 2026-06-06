import { createAdminClient, createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

async function requireAuth() {
  const supabaseAuth = await createClient();
  const { data: { user } } = await supabaseAuth.auth.getUser();
  if (!user) return null;
  const { data: staff } = await supabaseAuth.from('staff_users').select('role').eq('id', user.id).maybeSingle();
  return staff || null;
}

export async function GET() {
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('tables').select('*').eq('is_active', true).order('table_number');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await request.json();
  const table_number = parseInt(body.table_number);
  if (!table_number || table_number <= 0) {
    return NextResponse.json({ error: 'Nomor meja tidak valid' }, { status: 400 });
  }
  const label = typeof body.label === 'string' && body.label.trim() ? body.label.trim() : 'Meja ' + table_number;
  const supabase = createAdminClient();

  // If a table with this number exists but was deactivated, re-activate it instead of erroring on the unique constraint.
  const { data: existing } = await supabase.from('tables').select('id, is_active').eq('table_number', table_number).maybeSingle();
  if (existing) {
    if (existing.is_active) {
      return NextResponse.json({ error: 'Meja dengan nomor ini sudah ada' }, { status: 400 });
    }
    const { data, error } = await supabase.from('tables').update({ is_active: true, label }).eq('id', existing.id).select().single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data, { status: 201 });
  }

  const { data, error } = await supabase.from('tables').insert({ table_number, label }).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { searchParams } = new URL(request.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
  const supabase = createAdminClient();

  // Soft-deactivate so existing orders keep their table reference.
  const { error } = await supabase.from('tables').update({ is_active: false }).eq('id', id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
