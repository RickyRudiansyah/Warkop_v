// Bentuk baris karyawan yang dikirim ke klien. Sengaja tidak `select('*')`:
// aplikasi hanya butuh keempat kolom ini, dan daftar eksplisit membuat kolom
// baru di `staff_users` tidak ikut bocor tanpa disengaja.
export const SELECT_STAFF = 'id, name, email, role, is_active';

type StaffInput = {
  id?: string;
  name?: string;
  email?: string | null;
  role?: string;
  is_active?: boolean;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Validasi + rapikan body untuk POST/PATCH karyawan.
 *
 * `partial: true` (PATCH) hanya memproses field yang benar-benar dikirim;
 * `partial: false` (POST) mewajibkan nama.
 *
 * Email kosong menjadi `null`, bukan string kosong: kolomnya UNIQUE, dan dua
 * karyawan tanpa email akan saling menabrak kalau keduanya menyimpan `''`.
 * (Postgres membolehkan banyak `NULL` pada kolom unik.)
 */
export function normalizeStaffInput(
  body: Record<string, unknown>,
  { partial }: { partial: boolean },
): { value: StaffInput } | { error: string } {
  const value: StaffInput = {};

  // `staff_users.id` TIDAK punya DEFAULT (scripts/complete-schema.sql) — id-nya
  // sengaja dibuat cerminan UUID user di Supabase Auth, bukan nomor acak.
  // Jadi:
  //   * karyawan yang SUDAH punya akun login -> kirim `id` = UUID user auth-nya,
  //     supaya `requireStaff` (yang mencocokkan lewat `id`) mengenalinya;
  //   * karyawan yang hanya menerima jatah makan -> biarkan kosong, di sini
  //     dibuatkan UUID acak.
  // Tanpa ini insert-nya ditolak `null value in column "id"`.
  if (!partial) {
    if (body.id !== undefined && body.id !== null && body.id !== '') {
      if (typeof body.id !== 'string' || !UUID.test(body.id)) {
        return { error: 'id harus berupa UUID (salin dari user Supabase Auth)' };
      }
      value.id = body.id.toLowerCase();
    } else {
      value.id = crypto.randomUUID();
    }
  }

  if (!partial || body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return { error: 'Nama karyawan wajib diisi' };
    value.name = name;
  }

  if (!partial || body.role !== undefined) {
    // Owner bebas membuat role sendiri ("koki", "barista"). Yang dijaga bukan
    // daftar namanya, melainkan siapa yang boleh jadi 'owner' — dan itu dijaga
    // di route (owner-only) serta middleware (bukan-owner ditolak dari halaman
    // owner). Role di luar 'owner' semuanya berakses staff biasa.
    const raw = typeof body.role === 'string' ? body.role.trim().toLowerCase() : 'cashier';
    if (!raw) return { error: 'Peran tidak boleh kosong' };
    if (raw.length > 30) return { error: 'Nama peran terlalu panjang' };
    if (!/^[a-z0-9 _-]+$/.test(raw)) {
      return { error: 'Peran hanya boleh huruf, angka, spasi, - dan _' };
    }
    value.role = raw;
  }

  if (body.email !== undefined) {
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { error: 'Format email tidak sah' };
    }
    value.email = email || null;
  }

  if (body.is_active !== undefined) {
    if (typeof body.is_active !== 'boolean') return { error: 'is_active harus true/false' };
    value.is_active = body.is_active;
  }

  return { value };
}
