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
//   ?counts=1         -> ringkasan antrian saja (loop cetak, tiap 4 detik)
//   ?id=<uuid>        -> satu job LENGKAP dengan `text_body` (pratinjau struk)
//   ?claim=1&limit=5  -> aplikasi Android: ambil & kunci job PENDING (PRINTING)
//   (tanpa parameter) -> dashboard: 50 job terbaru, TANPA `text_body`
//
// Auth: header `x-print-token` (perangkat) ATAU session staff.
//
// Kenapa ada mode `counts`: loop cetak di tablet memanggil endpoint ini tiap 4
// detik, dan dulu ia menarik 50 baris LENGKAP (89 KB) hanya untuk menghitung
// berapa struk yang menunggu. Dengan dua printer, `pump()` bahkan menariknya
// dua kali per putaran - 178 KB tiap 4 detik, sekitar 3,8 GB sehari, sementara
// seluruh kuota egress Supabase Free cuma 5 GB sebulan. Ringkasan ini
// mengembalikan angka yang sama dalam ~200 byte.
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

  // Satu job saja, lengkap dengan isinya. Dipakai tombol "Lihat Struk" - satu
  // permintaan saat ditekan, bukan 50 badan struk yang ikut di setiap daftar.
  const jobId = searchParams.get('id');
  if (jobId) {
    const { data, error } = await supabase
      .from('print_jobs').select('*').eq('id', jobId).maybeSingle();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if (!data) return NextResponse.json({ error: 'Job tidak ditemukan' }, { status: 404 });
    return NextResponse.json({ job: data });
  }

  // Ringkasan antrian: hanya baris yang belum tuntas, dan hanya dua kolomnya.
  //
  // `pending_stations` ikut dikembalikan supaya loop cetak tidak perlu menarik
  // daftar terpisah untuk tahu printer mana yang punya antrian - dulu itu
  // panggilan kedua, sama mahalnya dengan yang pertama.
  if (searchParams.get('counts') === '1') {
    const { data, error } = await supabase
      .from('print_jobs')
      .select('status, station')
      .in('status', ['PENDING', 'PRINTING', 'FAILED']);

    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    const rows = data ?? [];
    const printing = rows.filter(j => j.status === 'PRINTING').length;

    // Requeue hanya kalau memang ADA yang berstatus PRINTING. Dulu UPDATE ini
    // jalan di setiap panggilan - ~21.600 write sehari yang 99,9% tidak
    // menyentuh satu baris pun.
    if (printing > 0) await requeueStaleJobs();

    return NextResponse.json({
      pending: rows.filter(j => j.status === 'PENDING').length,
      printing,
      failed: rows.filter(j => j.status === 'FAILED').length,
      pending_stations: [...new Set(
        rows.filter(j => j.status === 'PENDING').map(j => j.station),
      )],
      stations: PRINT_STATIONS,
    });
  }

  if (!claim) {
    // `text_body` sengaja TIDAK ikut: badan struk 32 kolom adalah ~70% berat
    // baris ini, dan daftar monitoring tidak pernah menampilkannya. Yang butuh
    // isinya cuma tombol pratinjau, dan itu punya jalurnya sendiri (`?id=`).
    let monitor = supabase
      .from('print_jobs')
      .select('id, order_id, kind, station, status, trigger, attempts, payload, last_error, device_id, claimed_at, printed_at, created_at')
      .order('created_at', { ascending: false })
      .limit(50);
    if (station) monitor = monitor.eq('station', station);
    const { data, error } = await monitor;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    if ((data ?? []).some(j => j.status === 'PRINTING')) await requeueStaleJobs();
    return NextResponse.json({ jobs: data ?? [], stations: PRINT_STATIONS });
  }

  // Jalur klaim tetap SELALU membebaskan job yang nyangkut lebih dulu. Di
  // sinilah satu-satunya tempat yang benar-benar butuh: job PRINTING yang
  // ditinggal mati aplikasinya baru bisa dicetak lagi setelah dikembalikan ke
  // PENDING, dan yang menunggunya adalah query tepat di bawah ini.
  await requeueStaleJobs();

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
