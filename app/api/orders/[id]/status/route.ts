import { createAdminClient, createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

async function requireAuth() {
  const supabaseAuth = await createClient();
  const { data: { session } } = await supabaseAuth.auth.getSession();
  if (!session) return null;
  const { data: staff } = await supabaseAuth.from('staff_users').select('role').eq('id', session.user.id).maybeSingle();
  return staff || null;
}

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const { status, estimated_minutes } = await request.json();
  const supabase = createAdminClient();
  const update: Record<string, unknown> = { status };
  if (status === 'CONFIRMED' || status === 'PROCESSING') update.confirmed_at = new Date().toISOString();
  if (estimated_minutes && estimated_minutes > 0) {
    update.estimated_ready_at = new Date(Date.now() + estimated_minutes * 60000).toISOString();
  }
  const { data, error } = await supabase.from('orders').update(update).eq('id', id).select().single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
