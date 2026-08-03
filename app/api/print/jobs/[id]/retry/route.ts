import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requirePrintAccess } from '@/lib/print';

export const dynamic = 'force-dynamic';

// POST /api/print/jobs/:id/retry — staff mengembalikan job gagal ke antrian.
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePrintAccess(request);
  if (!access || access.kind !== 'staff') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { id } = await params;
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from('print_jobs')
    .update({ status: 'PENDING', claimed_at: null, last_error: null })
    .eq('id', id)
    .select('id, status')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
