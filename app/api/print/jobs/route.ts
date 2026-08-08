import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import {
  enqueueReceipt,
  requirePrintAccess,
  requeueStaleJobs,
  isPrintStation,
  PRINT_STATIONS,
  type PrintStation,
} from '@/lib/print';

export const dynamic = 'force-dynamic';

// GET /api/print/jobs
//   ?claim=1&limit=5  -> aplikasi Android: ambil & kunci job PENDING (PRINTING)
//   (tanpa claim)     -> dashboard: daftar job terbaru untuk monitoring
//
// Auth: header `x-print-token` (perangkat) ATAU session staff.
export async function GET(request: NextRequest) {
  const access = await requirePrintAccess(request);
  if (!access) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const claim = searchParams.get('claim') === '1';
  const limit = Math.min(Math.max(Number(searchParams.get('limit')) || 5, 1), 20);

  // Satu perangkat memegang satu koneksi Bluetooth, jadi ia menyambar per
  // stasiun — bukan semua job sekaligus. Tanpa filter ini, alat yang sedang
  // tersambung ke printer kasir bisa ikut mengunci job dapur lalu menahannya
  // 2 menit tanpa bisa mencetaknya.
  const stationParam = searchParams.get('station');
  if (stationParam && !isPrintStation(stationParam)) {
    return NextResponse.json({ error: 'station tidak dikenal' }, { status: 400 });
  }
  const station = stationParam as PrintStation | null;

  const supabase = createAdminClient();

  await requeueStaleJobs();

  if (!claim) {
    let monitor = supabase
      .from('print_jobs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (station) monitor = monitor.eq('station', station);
    const { data, error } = await monitor;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ jobs: data ?? [], stations: PRINT_STATIONS });
  }

  let pendingQuery = supabase
    .from('print_jobs')
    .select('id')
    .eq('status', 'PENDING')
    .order('created_at', { ascending: true })
    .limit(limit);
  if (station) pendingQuery = pendingQuery.eq('station', station);

  const { data: pending, error: pendingError } = await pendingQuery;

  if (pendingError) return NextResponse.json({ error: pendingError.message }, { status: 500 });
  if (!pending?.length) return NextResponse.json({ jobs: [] });

  // Filter `.eq('status','PENDING')` di update = kunci optimistik: kalau ada dua
  // perangkat mengambil bersamaan, hanya satu yang dapat barisnya.
  const deviceId = access.kind === 'device' ? access.deviceId : 'dashboard';
  const { data: claimed, error: claimError } = await supabase
    .from('print_jobs')
    .update({ status: 'PRINTING', claimed_at: new Date().toISOString(), device_id: deviceId })
    .in('id', pending.map(j => j.id))
    .eq('status', 'PENDING')
    .select('*');

  if (claimError) return NextResponse.json({ error: claimError.message }, { status: 500 });
  return NextResponse.json({ jobs: claimed ?? [] });
}

// POST /api/print/jobs  { order_id }  -> cetak ulang manual (staff saja)
export async function POST(request: NextRequest) {
  const access = await requirePrintAccess(request);
  if (!access || access.kind !== 'staff') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { order_id, verified_by } = await request.json().catch(() => ({}));
  if (!order_id) return NextResponse.json({ error: 'order_id wajib diisi' }, { status: 400 });

  const result = await enqueueReceipt(order_id, {
    trigger: 'STAFF_REPRINT',
    reprint: true,
    verifiedBy: verified_by ?? null,
  });

  if (!result.ok) return NextResponse.json({ error: result.error }, { status: 500 });
  return NextResponse.json({ ok: true, jobId: result.jobId }, { status: 201 });
}
