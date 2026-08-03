import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireStaff(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const { status, estimated_minutes } = await request.json();
  const supabase = createAdminClient();
  const update: Record<string, unknown> = { status };
  if (status === 'PROCESSING') update.confirmed_at = new Date().toISOString();
  if (estimated_minutes && estimated_minutes > 0) {
    update.estimated_ready_at = new Date(Date.now() + estimated_minutes * 60000).toISOString();
  }
  const { data, error } = await supabase.from('orders').update(update).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
