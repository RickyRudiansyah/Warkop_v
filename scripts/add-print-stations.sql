-- ============================================================
-- Stasiun cetak: satu struk untuk kasir, satu untuk dapur
-- ============================================================
--
-- Sebelumnya satu order = satu struk, dijaga unique index
-- `print_jobs_one_receipt_per_order`. Index itu memang pengaman anti
-- dobel-cetak (webhook + polling bisa menyelesaikan pembayaran bersamaan), jadi
-- ia tidak dihapus — hanya diperlebar: unik per **(order, stasiun)**.
--
-- Hasilnya: kasir dan dapur sama-sama mendapat satu struk, dan tidak ada
-- stasiun yang bisa kebagian dua.
--
-- Aman dijalankan berulang kali.

ALTER TABLE print_jobs
  ADD COLUMN IF NOT EXISTS station TEXT NOT NULL DEFAULT 'CASHIER';

-- Baris lama otomatis jadi 'CASHIER' lewat DEFAULT di atas — itu memang
-- printer yang selama ini dipakai.

ALTER TABLE print_jobs DROP CONSTRAINT IF EXISTS print_jobs_station_check;
ALTER TABLE print_jobs ADD CONSTRAINT print_jobs_station_check
  CHECK (station IN ('CASHIER', 'KITCHEN'));

DROP INDEX IF EXISTS print_jobs_one_receipt_per_order;

CREATE UNIQUE INDEX IF NOT EXISTS print_jobs_one_receipt_per_order_station
  ON print_jobs (order_id, station)
  WHERE kind = 'RECEIPT';

-- Loop cetak menyambar per stasiun: WHERE station = ? AND status = 'PENDING'.
CREATE INDEX IF NOT EXISTS print_jobs_station_status_idx
  ON print_jobs (station, status);

-- Hasil akhir:
SELECT station, status, count(*) FROM print_jobs GROUP BY station, status ORDER BY station, status;
