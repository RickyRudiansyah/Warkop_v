import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';
import { SELECT_STAFF, normalizeStaffInput } from './shared';

export const dynamic = 'force-dynamic';

// Daftar karyawan aktif — dipakai aplikasi untuk memilih siapa yang mengambil
// jatah makan. Sengaja tidak mengembalikan kolom lain dari staff_users.
export async function GET(request: NextRequest) {
  if (!await requireStaff(request)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('staff_users')
    .select(SELECT_STAFF)
    .eq('is_active', true)
    .order('name');

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

/**
 * Tambah karyawan. **Khusus owner.**
 *
 * Baris ini hanya membuat karyawan berhak menerima jatah makan — bukan akun
 * login. Akun Supabase Auth dibuat terpisah di dashboard.
 *
 * Kalau karyawan itu memang akan memakai aplikasi, buat dulu user auth-nya lalu
 * kirim UUID-nya sebagai `id` di body: `requireStaff` mencocokkan sesi dengan
 * baris ini lewat `id`, jadi id yang berbeda = tidak bisa masuk aplikasi
 * walaupun akun auth-nya sah. Tanpa `id`, dibuatkan UUID acak (cukup untuk
 * karyawan yang hanya menerima jatah makan).
 */
export async function POST(request: NextRequest) {
  const staff = await requireStaff(request);
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (staff.role !== 'owner') {
    return NextResponse.json({ error: 'Hanya owner yang boleh menambah karyawan' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const parsed = normalizeStaffInput(body, { partial: false });
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 400 });

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from('staff_users')
    .insert({ ...parsed.value, is_active: parsed.value.is_active ?? true })
    .select(SELECT_STAFF)
    .single();

  if (error) {
    // 23505 = tabrakan UNIQUE. Kolom unik di tabel ini cuma email dan primary
    // key; id-nya kita yang buat, jadi praktis selalu email.
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Email itu sudah dipakai karyawan lain' }, { status: 409 });
    }
    // 23502 = kolom NOT NULL dibiarkan kosong. Yang paling mungkin: migrasi
    // scripts/staff-optional-email.sql belum dijalankan di database ini.
    // Pesan asli Postgres menyebut nama kolomnya — jangan ditelan.
    if (error.code === '23502') {
      return NextResponse.json(
        { error: `Kolom wajib di database masih kosong (${error.message}). Cek scripts/staff-optional-email.sql.` },
        { status: 400 },
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
