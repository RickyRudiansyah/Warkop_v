import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { status } = await request.json();
  const supabase = createAdminClient();
  const update: Record<string, unknown> = { status };
  if (status === 'CONFIRMED' || status === 'PROCESSING') update.confirmed_at = new Date().toISOString();
  const { data, error } = await supabase.from('orders').update(update).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
