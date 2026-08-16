-- ============================================================
-- Role karyawan bebas ditentukan owner
-- ============================================================
--
-- Sebelumnya `role` dikunci CHECK (cashier|owner), jadi owner tidak bisa
-- menambahkan "koki", "barista", atau "pramusaji" sendiri.
--
-- Yang perlu dipahami sebelum mengubah ini: di sistem ini **hanya ada satu
-- batas hak akses yang nyata — owner vs bukan owner.** HPP, laba, kelola
-- karyawan, dan dashboard owner dijaga oleh `role = 'owner'`. Role lain apa pun
-- (cashier, koki, barista) mendapat akses staff biasa yang sama.
--
-- Jadi menambah role di sini = menambah **label**, bukan menambah tingkat
-- keamanan baru. Yang harus dijaga justru sebaliknya: jangan sampai role baru
-- tanpa sengaja mendapat akses owner. Itu ditutup di `middleware.ts` dengan
-- membalik pemeriksaannya jadi "bukan owner = ditolak", bukan "cashier = ditolak".
--
-- Aman dijalankan berulang kali.

ALTER TABLE staff_users DROP CONSTRAINT IF EXISTS staff_users_role_check;

-- Yang tersisa cuma syarat paling dasar: role tidak boleh kosong.
ALTER TABLE staff_users ADD CONSTRAINT staff_users_role_check
  CHECK (role IS NOT NULL AND length(trim(role)) > 0);

-- Rapikan kalau ada yang terlanjur tersimpan dengan huruf besar atau spasi.
UPDATE staff_users SET role = lower(trim(role)) WHERE role <> lower(trim(role));

SELECT role, count(*) FROM staff_users GROUP BY role ORDER BY role;
