-- ============================================================
-- Lengkapi meja sampai nomor 30
-- ============================================================
--
-- Warung memakai SATU QR umum; nomor meja dipilih pelanggan sendiri saat
-- checkout, jadi daftar meja di tabel ini yang menentukan pilihan yang muncul.
--
-- Aman dijalankan berulang kali: `ON CONFLICT (table_number) DO NOTHING`
-- membiarkan meja yang sudah ada apa adanya — termasuk label yang mungkin sudah
-- diganti staff lewat halaman QR ("Meja Pojok", "Lantai 2", dst.). Skrip ini
-- hanya MENAMBAH yang belum ada, tidak pernah menimpa atau menghapus.

INSERT INTO tables (table_number, label, is_active)
SELECT n, 'Meja ' || n, true
FROM generate_series(1, 30) AS n
ON CONFLICT (table_number) DO NOTHING;

-- Meja yang pernah dinonaktifkan tidak ikut dihidupkan lagi oleh skrip di atas
-- (barisnya sudah ada, jadi kena DO NOTHING). Itu disengaja: menonaktifkan meja
-- adalah keputusan staff. Kalau memang mau semuanya aktif, jalankan ini juga:
--
--   UPDATE tables SET is_active = true WHERE table_number BETWEEN 1 AND 30;

-- Hasil akhir:
SELECT count(*) AS total_meja,
       count(*) FILTER (WHERE is_active) AS meja_aktif
FROM tables;
