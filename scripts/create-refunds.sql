-- ============================================================
-- Refund: seluruh order atau sebagian item
-- ============================================================
--
-- Keputusan pemilik: **uang refund mengurangi omzet hari itu.**
--
-- Karena itu jumlah refund menempel pada ORDER-nya, bukan dicatat sebagai
-- pengeluaran terpisah. Rekap menghitung omzet sebagai
--
--     SUM(total_amount - refunded_amount)
--
-- sehingga pengurangannya otomatis jatuh pada tanggal order itu dibuat. Kalau
-- refund dicatat sebagai baris pemasukan negatif bertanggal sendiri, refund
-- lintas hari akan menaikkan omzet hari kemarin dan menurunkan hari ini —
-- dua angka salah sekaligus.
--
-- Aman dijalankan berulang kali.

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS refunded_amount INTEGER NOT NULL DEFAULT 0;

ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_refund_check;
-- Tidak boleh negatif, dan tidak boleh melebihi nilai ordernya sendiri.
ALTER TABLE orders ADD CONSTRAINT orders_refund_check
  CHECK (refunded_amount >= 0 AND refunded_amount <= total_amount);

-- Jejak audit: siapa mengembalikan berapa, untuk apa, dan item mana saja.
-- Kolom refunded_amount di atas hanyalah ringkasannya.
CREATE TABLE IF NOT EXISTS refunds (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  amount     INTEGER NOT NULL CHECK (amount > 0),
  reason     TEXT,
  -- [{ order_item_id, name, quantity, amount }] — kosong berarti seluruh order.
  items      JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS refunds_order_idx ON refunds (order_id);
CREATE INDEX IF NOT EXISTS refunds_created_idx ON refunds (created_at DESC);

ALTER TABLE refunds ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Staff full access refunds" ON refunds;
CREATE POLICY "Staff full access refunds" ON refunds
  FOR ALL USING (auth.role() = 'authenticated');

SELECT count(*) AS total_refund FROM refunds;
