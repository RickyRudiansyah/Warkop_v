import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireStaff(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const supabase = createAdminClient();
  const { data: current, error: fetchError } = await supabase.from('menu_items').select('is_sold_out').eq('id', id).single();
  if (fetchError || !current) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  const { data, error } = await supabase.from('menu_items').update({ is_sold_out: !current.is_sold_out }).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
