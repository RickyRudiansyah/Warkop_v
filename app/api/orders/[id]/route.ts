import { createAdminClient, createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

async function requireAuth() {
  const supabaseAuth = await createClient();
  const { data: { session } } = await supabaseAuth.auth.getSession();
  if (!session) return null;
  const { data: staff } = await supabaseAuth.from('staff_users').select('role').eq('id', session.user.id).single();
  return staff || null;
}

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!await requireAuth()) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const supabase = createAdminClient();
  const { data, error } = await supabase.from('orders').select('*, table:tables(*), items:order_items(*)').eq('id', id).single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
