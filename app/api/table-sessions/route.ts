import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  const supabase = createAdminClient();
  const body = await request.json();
  const { table_number, action } = body; // action: 'create' | 'join'

  if (!table_number) {
    return NextResponse.json({ error: 'table_number is required' }, { status: 400 });
  }

  if (!action || !['create', 'join'].includes(action)) {
    return NextResponse.json({ error: 'action must be create or join' }, { status: 400 });
  }

  // Check if active session exists for this table
  const { data: existing } = await supabase
    .from('table_sessions')
    .select('id, status')
    .eq('table_number', table_number)
    .eq('status', 'ACTIVE')
    .maybeSingle();

  if (action === 'create') {
    if (existing) {
      return NextResponse.json(existing);
    }

    const { data: session, error } = await supabase
      .from('table_sessions')
      .insert({ table_number, status: 'ACTIVE', total_amount: 0 })
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(session, { status: 201 });
  }

  // action === 'join'
  if (existing) {
    return NextResponse.json(existing);
  }

  // No active session, create one
  const { data: session, error } = await supabase
    .from('table_sessions')
    .insert({ table_number, status: 'ACTIVE', total_amount: 0 })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(session, { status: 201 });
}
