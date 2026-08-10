-- ============================================================
-- Pengeluaran harian
-- ============================================================
--
-- Supaya rekap harian bisa menampilkan uang BERSIH, bukan cuma omzet:
--   pemasukan 200.000 - pengeluaran 20.000 = 180.000
--
-- Batas harinya sengaja disamakan dengan omzet: **tengah malam waktu tablet**.
-- Kalau suatu saat warung memakai batas lain (mis. jam 4 pagi supaya satu malam
-- kerja tidak terbelah dua tanggal), ubah di SATU tempat — pemanggilnya yang
-- menentukan rentang, bukan tabel ini.
--
-- Aman dijalankan berulang kali.

CREATE TABLE IF NOT EXISTS expenses (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Rupiah bulat. Konsisten dengan orders.total_amount yang juga integer —
  -- uang tidak pernah disimpan sebagai float di sistem ini.
  amount      INTEGER NOT NULL CHECK (amount > 0),
  note        TEXT NOT NULL,
  category    TEXT,
  -- Kapan uangnya keluar (bisa diisi mundur kalau kasir lupa mencatat).
  -- Terpisah dari created_at yang mencatat kapan barisnya dibuat.
  spent_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by  TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rekap selalu bertanya "pengeluaran dalam rentang tanggal ini".
CREATE INDEX IF NOT EXISTS expenses_spent_at_idx ON expenses (spent_at DESC);

ALTER TABLE expenses ENABLE ROW LEVEL SECURITY;

-- Angka keuangan warung: staff saja, tidak pernah publik.
DROP POLICY IF EXISTS "Staff full access expenses" ON expenses;
CREATE POLICY "Staff full access expenses" ON expenses
  FOR ALL USING (auth.role() = 'authenticated');

SELECT count(*) AS total_pengeluaran FROM expenses;
