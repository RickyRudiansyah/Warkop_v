-- Rumipang — Antrian cetak struk (Bluetooth thermal printer)
-- Jalankan SEKALI di Supabase SQL Editor.
--
-- Alur: server membuat print_job saat sebuah order dinyatakan LUNAS
--   * QRIS  -> otomatis begitu Midtrans settle (webhook / status poll)
--   * CASH  -> saat kasir menekan "Tandai Lunas" (verifikasi manual)
-- Aplikasi Android (companion printer app) menarik job PENDING, mencetak ke
-- printer Bluetooth, lalu meng-ACK job tersebut jadi PRINTED/FAILED.

CREATE TABLE IF NOT EXISTS print_jobs (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id    UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  -- RECEIPT = cetakan pertama (satu per order), REPRINT = cetak ulang manual
  kind        TEXT NOT NULL DEFAULT 'RECEIPT'
                CHECK (kind IN ('RECEIPT', 'REPRINT')),
  status      TEXT NOT NULL DEFAULT 'PENDING'
                CHECK (status IN ('PENDING', 'PRINTING', 'PRINTED', 'FAILED')),
  -- Apa yang memicu job ini: 'QRIS_SETTLED' | 'CASH_VERIFIED' | 'STAFF_REPRINT' | ...
  trigger     TEXT,
  -- Snapshot struk (JSON terstruktur) — order boleh berubah setelahnya,
  -- struk yang dicetak harus tetap sama dengan saat pembayaran.
  payload     JSONB NOT NULL,
  -- Versi teks siap kirim ke printer ESC/POS (32 kolom / kertas 58mm).
  text_body   TEXT NOT NULL,
  attempts    INTEGER NOT NULL DEFAULT 0,
  last_error  TEXT,
  device_id   TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  claimed_at  TIMESTAMPTZ,
  printed_at  TIMESTAMPTZ
);

-- Satu struk otomatis per order. Cetak ulang memakai kind='REPRINT' sehingga
-- tidak kena unique index ini. Insert kedua akan gagal dengan 23505 dan
-- diperlakukan server sebagai "sudah antri" (idempoten).
CREATE UNIQUE INDEX IF NOT EXISTS print_jobs_one_receipt_per_order
  ON print_jobs (order_id) WHERE kind = 'RECEIPT';

CREATE INDEX IF NOT EXISTS print_jobs_queue_idx
  ON print_jobs (status, created_at);

-- Server memakai service-role key (bypass RLS). RLS aktif tanpa policy publik
-- supaya anon key tidak bisa membaca/menulis antrian cetak.
ALTER TABLE print_jobs ENABLE ROW LEVEL SECURITY;

-- Realtime opsional: aplikasi Android bisa subscribe INSERT alih-alih polling.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE print_jobs;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
