import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest, { params }: { params: Promise<{ number: string }> }) {
  const { number } = await params;
  const tableNumber = parseInt(number);
  if (isNaN(tableNumber)) {
    return NextResponse.json({ error: 'Invalid table number' }, { status: 400 });
  }
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('tables').select('*').eq('table_number', tableNumber).single();
  if (error) return NextResponse.json({ error: 'Table not found' }, { status: 404 });
  return NextResponse.json(data);
}
