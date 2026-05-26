import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { estimated_minutes } = await request.json();
  if (!estimated_minutes || estimated_minutes < 1 || estimated_minutes > 1440) {
    return NextResponse.json({ error: 'Invalid estimated_minutes (must be 1-1440)' }, { status: 400 });
  }
  const supabase = createAdminClient();

  const { data: current } = await supabase.from('orders').select('estimated_ready_at').eq('id', id).single();
  let baseTime = Date.now();
  if (current?.estimated_ready_at) {
    const existing = new Date(current.estimated_ready_at).getTime();
    if (existing > Date.now()) {
      baseTime = existing;
    }
  }

  const readyAt = new Date(baseTime + estimated_minutes * 60000).toISOString();
  const { data, error } = await supabase.from('orders').update({ estimated_ready_at: readyAt }).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
