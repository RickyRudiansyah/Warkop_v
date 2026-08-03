import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { requirePrintAccess } from '@/lib/print';

export const dynamic = 'force-dynamic';

// PATCH /api/print/jobs/:id/ack   { status: 'PRINTED' | 'FAILED', error?: string }
// Dipanggil aplikasi Android setelah struk selesai (atau gagal) dicetak.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const access = await requirePrintAccess(request);
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { id } = await params;
  const body = await request.json().catch(() => ({}));
  const status = body.status;

  if (status !== 'PRINTED' && status !== 'FAILED') {
    return NextResponse.json({ error: "status harus 'PRINTED' atau 'FAILED'" }, { status: 400 });
  }

  const supabase = createAdminClient();
  const { data: current } = await supabase
    .from('print_jobs')
    .select('attempts')
    .eq('id', id)
    .maybeSingle();

  if (!current) return NextResponse.json({ error: 'Print job tidak ditemukan' }, { status: 404 });

  const { data, error } = await supabase
    .from('print_jobs')
    .update({
      status,
      attempts: (current.attempts ?? 0) + 1,
      printed_at: status === 'PRINTED' ? new Date().toISOString() : null,
      last_error: status === 'FAILED' ? String(body.error ?? 'Gagal mencetak').slice(0, 500) : null,
      claimed_at: null,
    })
    .eq('id', id)
    .select('id, status, attempts')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}
