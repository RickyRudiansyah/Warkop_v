import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';

export const dynamic = 'force-dynamic';

const SELECT = '*, staff:staff_users(id, name, email), menu_item:menu_items(id, name)';

// ?date=YYYY-MM-DD  -> jatah makan satu hari (layar harian)
// ?from=&to=        -> rekap rentang (laporan biaya)
export async function GET(request: NextRequest) {
  if (!await requireStaff(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const from = searchParams.get('from');
  const to = searchParams.get('to');

  const supabase = createAdminClient();
  let query = supabase.from('staff_meals').select(SELECT).order('meal_date', { ascending: false });

  if (date) query = query.eq('meal_date', date);
  else if (from || to) {
    if (from) query = query.gte('meal_date', from);
    if (to) query = query.lte('meal_date', to);
  } else {
    // Tanpa parameter, tampilkan hari ini saja — bukan seluruh riwayat.
    query = query.eq('meal_date', new Date().toISOString().slice(0, 10));
  }

  const { data, error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  if (!await requireStaff(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await request.json().catch(() => ({}));
  const staffId = body.staff_id;
  if (!staffId) return NextResponse.json({ error: 'staff_id wajib diisi' }, { status: 400 });

  const supabase = createAdminClient();

  // Salin HPP saat pencatatan. Sama alasannya dengan cost_price_snapshot di
  // order_items: biaya jatah makan bulan lalu tidak boleh ikut berubah saat
  // HPP menu diperbarui.
  let costSnapshot = 0;
  if (body.menu_item_id) {
    const { data: menu } = await supabase
      .from('menu_items').select('cost_price').eq('id', body.menu_item_id).maybeSingle();
    costSnapshot = menu?.cost_price ?? 0;
  }

  const { data, error } = await supabase.from('staff_meals').insert({
    staff_id: staffId,
    menu_item_id: body.menu_item_id ?? null,
    cost_snapshot: costSnapshot,
    note: body.note ?? null,
    // meal_date sengaja TIDAK diambil dari klien — ditentukan server (default
    // current_date) supaya jam tablet yang salah tidak bisa menembus batas 1x/hari.
  }).select(SELECT).single();

  if (error) {
    // 23505 = kena UNIQUE (staff_id, meal_date). Inilah penegak aturan 1x/hari;
    // pengecekan di aplikasi saja bisa ditembus dua tablet bersamaan.
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Karyawan ini sudah mengambil jatah makan hari ini' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
