-- Rumipang — Hapus role "koki"
-- Jalankan SEKALI di Supabase SQL Editor.
--
-- Setelah migrasi ini hanya ada dua role staff: cashier & owner.
-- Semua user berrole 'koki' dipindah jadi 'cashier' supaya tetap bisa login
-- dan tetap bisa membuka Kitchen Display (sekarang dipegang kasir).

-- 1. Pindahkan user koki yang sudah ada -> cashier
UPDATE staff_users SET role = 'cashier' WHERE role = 'koki';

-- 2. Ganti CHECK constraint (nama default dari supabase-schema.sql)
ALTER TABLE staff_users DROP CONSTRAINT IF EXISTS staff_users_role_check;
ALTER TABLE staff_users ADD CONSTRAINT staff_users_role_check
  CHECK (role IN ('cashier', 'owner'));

-- 3. Log lama tetap dibiarkan apa adanya (activity_logs.actor_role tidak punya
--    constraint, jadi histori aksi koki masih terbaca di halaman History).
