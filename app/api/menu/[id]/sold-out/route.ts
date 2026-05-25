import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: current } = await supabase.from('menu_items').select('is_sold_out').eq('id', id).single();
  if (!current) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { data, error } = await supabase.from('menu_items').update({ is_sold_out: !current.is_sold_out }).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
