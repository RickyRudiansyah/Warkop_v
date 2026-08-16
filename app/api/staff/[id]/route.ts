import { createAdminClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import { requireStaff } from '@/lib/auth';
import { SELECT_STAFF, normalizeStaffInput } from '../shared';

export const dynamic = 'force-dynamic';

// Ubah karyawan. Field yang tidak dikirim tidak disentuh — berbeda dari
// `PUT /api/menu/[id]` yang mengganti seluruh baris.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff(request);
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  // Mengubah daftar karyawan = mengubah siapa yang berhak jatah makan dan siapa
  // yang bisa mengelola aplikasi. Itu keputusan pemilik.
  if (staff.role !== 'owner') {
    return NextResponse.json({ error: 'Hanya owner yang boleh mengubah data karyawan' }, { status: 403 });
  }

  const { id } = await params;
  const body = await request.json().catch(() => ({}));

  const patch = normalizeStaffInput(body, { partial: true });
  if ('error' in patch) return NextResponse.json({ error: patch.error }, { status: 400 });
  if (Object.keys(patch.value).length === 0) {
    return NextResponse.json({ error: 'Tidak ada perubahan yang dikirim' }, { status: 400 });
  }

  const supabase = createAdminClient();

  const { data: current } = await supabase
    .from('staff_users').select('id, role, is_active').eq('id', id).maybeSingle();
  if (!current) return NextResponse.json({ error: 'Karyawan tidak ditemukan' }, { status: 404 });

  // Owner terakhir tidak boleh menurunkan perannya sendiri atau menonaktifkan
  // dirinya: tanpa satu pun owner aktif, tidak ada lagi yang bisa mengembalikan
  // keadaan lewat aplikasi.
  const losesOwner =
    current.role === 'owner' &&
    ((patch.value.role !== undefined && patch.value.role !== 'owner') ||
      patch.value.is_active === false);

  if (losesOwner) {
    const { count } = await supabase
      .from('staff_users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'owner')
      .eq('is_active', true);

    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: 'Ini satu-satunya owner aktif — angkat owner lain dulu sebelum mengubahnya' },
        { status: 409 },
      );
    }
  }

  const { data, error } = await supabase
    .from('staff_users').update(patch.value).eq('id', id).select(SELECT_STAFF).single();


  if (error) {
    // 23505 = email sudah dipakai baris lain (kolomnya UNIQUE).
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Email itu sudah dipakai karyawan lain' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

/**
 * Keluarkan karyawan dari daftar — **dinonaktifkan, bukan dihapus permanen.**
 *
 * `staff_meals.staff_id` memakai `ON DELETE CASCADE`, jadi menghapus barisnya
 * ikut menghapus seluruh riwayat jatah makannya. Biaya jatah bulan lalu akan
 * berubah sendiri hanya karena seorang karyawan berhenti — persis jenis
 * kerusakan angka yang paling lama tidak disadari.
 *
 * `is_active = false` membuatnya hilang dari daftar karyawan dan dari layar
 * jatah makan (GET /api/staff hanya mengembalikan yang aktif), sementara
 * catatannya tetap utuh.
 */
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const staff = await requireStaff(request);
  if (!staff) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (staff.role !== 'owner') {
    return NextResponse.json({ error: 'Hanya owner yang boleh mengeluarkan karyawan' }, { status: 403 });
  }

  const { id } = await params;
  const supabase = createAdminClient();

  const { data: current } = await supabase
    .from('staff_users').select('id, role, is_active').eq('id', id).maybeSingle();
  if (!current) return NextResponse.json({ error: 'Karyawan tidak ditemukan' }, { status: 404 });

  // Owner aktif terakhir tidak boleh mengeluarkan dirinya sendiri: tanpa satu
  // pun owner aktif, tidak ada lagi yang bisa mengembalikan keadaan.
  if (current.role === 'owner') {
    const { count } = await supabase
      .from('staff_users')
      .select('id', { count: 'exact', head: true })
      .eq('role', 'owner')
      .eq('is_active', true);

    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: 'Ini satu-satunya owner aktif — angkat owner lain dulu' },
        { status: 409 },
      );
    }
  }

  const { error } = await supabase
    .from('staff_users').update({ is_active: false }).eq('id', id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true, deactivated: true });
}
