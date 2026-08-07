-- ============================================================
-- Email karyawan jadi opsional
-- ============================================================
--
-- Sejak jatah makan karyawan ada, `staff_users` tidak lagi hanya berisi orang
-- yang login ke aplikasi: juru masak dan pramusaji ikut didaftarkan supaya bisa
-- menerima jatah, dan mereka tidak punya email.
--
-- Kolomnya tetap UNIQUE. Postgres membolehkan banyak baris bernilai NULL pada
-- kolom unik, jadi beberapa karyawan tanpa email tidak akan saling menabrak —
-- selama API menyimpan NULL, bukan string kosong (lihat app/api/staff/shared.ts).
--
-- Aman dijalankan berulang kali.

ALTER TABLE staff_users ALTER COLUMN email DROP NOT NULL;

-- Baris lama yang terlanjur menyimpan '' dirapikan sekalian, kalau ada:
-- keduanya berarti "tidak punya email", tapi hanya NULL yang lolos UNIQUE.
UPDATE staff_users SET email = NULL WHERE email = '';
