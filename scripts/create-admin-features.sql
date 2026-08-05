-- Rumipang — Fitur admin untuk aplikasi kasir Flutter
-- Jalankan SEKALI di Supabase SQL Editor.
--
-- Isi: HPP per menu, stok bahan baku, jatah makan karyawan, tema event.
-- Aman dijalankan ulang (semua memakai IF NOT EXISTS / OR REPLACE).

-- ============================================================
-- 1. HPP (harga pokok penjualan)
-- ============================================================

ALTER TABLE menu_items
  ADD COLUMN IF NOT EXISTS cost_price INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN menu_items.cost_price IS
  'HPP per porsi dalam rupiah, diisi manual oleh owner. 0 = belum diisi.';

-- Snapshot HPP saat order dibuat. TANPA ini, menaikkan HPP hari ini akan
-- mengubah laba bulan lalu — angka historis bergerak sendiri dan laporan
-- tidak bisa dipercaya.
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS cost_price_snapshot INTEGER NOT NULL DEFAULT 0;

COMMENT ON COLUMN order_items.cost_price_snapshot IS
  'Salinan menu_items.cost_price pada saat order dibuat. Jangan dihitung ulang.';

-- ============================================================
-- 2. Kategori — cegah duplikat nama dari dua perangkat sekaligus
-- ============================================================

CREATE UNIQUE INDEX IF NOT EXISTS categories_name_unique
  ON categories (lower(name));

-- ============================================================
-- 3. Stok bahan baku
-- ============================================================

CREATE TABLE IF NOT EXISTS ingredients (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  unit            TEXT NOT NULL DEFAULT 'pcs',   -- kg, gram, liter, pcs, ...
  stock_qty       NUMERIC NOT NULL DEFAULT 0,
  alert_threshold NUMERIC NOT NULL DEFAULT 20,
  is_active       BOOLEAN NOT NULL DEFAULT true,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Jejak audit. Tanpa ini stok cuma satu angka yang berubah tanpa riwayat,
-- dan selisih tidak akan pernah bisa ditelusuri.
CREATE TABLE IF NOT EXISTS stock_movements (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
  delta         NUMERIC NOT NULL,              -- positif = masuk, negatif = pakai
  reason        TEXT NOT NULL
                  CHECK (reason IN ('PURCHASE', 'USAGE', 'WASTE', 'CORRECTION')),
  note          TEXT,
  actor_email   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS stock_movements_ingredient_idx
  ON stock_movements (ingredient_id, created_at DESC);

-- Ubah stok DAN catat jejaknya dalam satu transaksi. Dipanggil server lewat
-- rpc('apply_stock_movement'). Memakai delta (bukan menimpa stock_qty) supaya
-- dua kasir yang menyesuaikan bersamaan terakumulasi benar, bukan saling timpa.
CREATE OR REPLACE FUNCTION apply_stock_movement(
  p_ingredient_id UUID,
  p_delta         NUMERIC,
  p_reason        TEXT,
  p_note          TEXT DEFAULT NULL,
  p_actor_email   TEXT DEFAULT NULL
) RETURNS ingredients AS $$
DECLARE
  hasil ingredients;
BEGIN
  UPDATE ingredients
     SET stock_qty  = stock_qty + p_delta,
         updated_at = now()
   WHERE id = p_ingredient_id
  RETURNING * INTO hasil;

  IF hasil IS NULL THEN
    RAISE EXCEPTION 'Bahan tidak ditemukan';
  END IF;

  INSERT INTO stock_movements (ingredient_id, delta, reason, note, actor_email)
  VALUES (p_ingredient_id, p_delta, p_reason, p_note, p_actor_email);

  RETURN hasil;
END;
$$ LANGUAGE plpgsql;

-- ============================================================
-- 4. Jatah makan karyawan — 1x per orang per hari
-- ============================================================

CREATE TABLE IF NOT EXISTS staff_meals (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  staff_id      UUID NOT NULL REFERENCES staff_users(id) ON DELETE CASCADE,
  meal_date     DATE NOT NULL DEFAULT current_date,
  menu_item_id  UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  cost_snapshot INTEGER NOT NULL DEFAULT 0,
  note          TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  -- Di sinilah aturan "1 kali sehari" ditegakkan. Pengecekan di aplikasi saja
  -- tidak cukup: dua tablet bisa mencatat bersamaan dan keduanya lolos.
  UNIQUE (staff_id, meal_date)
);

CREATE INDEX IF NOT EXISTS staff_meals_date_idx ON staff_meals (meal_date DESC);

-- ============================================================
-- 5. Pengaturan aplikasi (tema event, dst.)
-- ============================================================

CREATE TABLE IF NOT EXISTS app_settings (
  key        TEXT PRIMARY KEY,
  value      JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_by TEXT
);

INSERT INTO app_settings (key, value)
VALUES ('theme', '{"preset":"NORMAL"}')
ON CONFLICT (key) DO NOTHING;

-- ============================================================
-- 6. RLS
-- ============================================================
-- Server memakai service-role key (bypass RLS), jadi ini lapisan kedua.

ALTER TABLE ingredients      ENABLE ROW LEVEL SECURITY;
ALTER TABLE stock_movements  ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_meals      ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_settings     ENABLE ROW LEVEL SECURITY;

-- Data operasional toko: staff saja.
DROP POLICY IF EXISTS "Staff full access ingredients" ON ingredients;
CREATE POLICY "Staff full access ingredients" ON ingredients
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Staff full access stock_movements" ON stock_movements;
CREATE POLICY "Staff full access stock_movements" ON stock_movements
  FOR ALL USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Staff full access staff_meals" ON staff_meals;
CREATE POLICY "Staff full access staff_meals" ON staff_meals
  FOR ALL USING (auth.role() = 'authenticated');

-- Tema dibaca juga oleh pengunjung web yang belum login.
DROP POLICY IF EXISTS "Anyone can read app_settings" ON app_settings;
CREATE POLICY "Anyone can read app_settings" ON app_settings
  FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff can write app_settings" ON app_settings;
CREATE POLICY "Staff can write app_settings" ON app_settings
  FOR ALL USING (auth.role() = 'authenticated');

-- Opsional: tema berubah di semua perangkat tanpa muat ulang.
DO $$
BEGIN
  ALTER PUBLICATION supabase_realtime ADD TABLE app_settings;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
