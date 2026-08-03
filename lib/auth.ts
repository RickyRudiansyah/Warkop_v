import type { NextRequest } from 'next/server';
import { createAdminClient, createClient } from '@/lib/supabase/server';

export interface StaffIdentity {
  role: string;
  name: string;
}

// Penjagaan autentikasi staff untuk seluruh API.
//
// Menerima DUA cara login, karena ada dua jenis klien:
//   * `Authorization: Bearer <JWT>`  -> aplikasi kasir Flutter (native, tidak
//     punya cookie browser). Token diverifikasi ke server auth Supabase.
//   * cookie sesi                    -> dashboard web (@supabase/ssr).
//
// Cookie diperiksa hanya kalau header Authorization tidak ada, jadi perilaku
// dashboard web sama persis seperti sebelumnya.
export async function requireStaff(request?: NextRequest): Promise<StaffIdentity | null> {
  const header = request?.headers.get('authorization');

  if (header?.startsWith('Bearer ')) {
    const token = header.slice(7).trim();
    if (!token) return null;

    // getUser(token) memvalidasi tanda tangan & masa berlaku JWT ke Supabase —
    // bukan sekadar mendekode isinya, jadi token palsu tetap ditolak.
    const admin = createAdminClient();
    const { data: { user }, error } = await admin.auth.getUser(token);
    if (error || !user) return null;

    return fetchStaff(admin, user.id);
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;

  return fetchStaff(supabase, user.id);
}

// Punya akun Supabase saja tidak cukup — harus terdaftar sebagai staff aktif.
type QueryableClient = { from: (table: string) => any }; // eslint-disable-line @typescript-eslint/no-explicit-any

async function fetchStaff(client: QueryableClient, userId: string): Promise<StaffIdentity | null> {
  const { data } = await client
    .from('staff_users')
    .select('role, name, is_active')
    .eq('id', userId)
    .maybeSingle();

  if (!data || data.is_active === false) return null;
  return { role: data.role, name: data.name };
}
