-- ============================================================
-- Fix: Rename categories -> menu_categories + Reseed
-- ============================================================

-- 1. Hapus FK constraint dulu (kalau ada) lalu drop table lama
ALTER TABLE IF EXISTS menu_items DROP CONSTRAINT IF EXISTS menu_items_category_id_fkey;
DROP TABLE IF EXISTS categories CASCADE;

-- 2. Buat menu_categories (nama yang diharapkan app)
DROP TABLE IF EXISTS menu_categories CASCADE;
CREATE TABLE menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0
);

-- 3. Seed 5 kategori
INSERT INTO menu_categories (id, name, sort_order) VALUES
  ('11111111-1111-1111-1111-111111111111', 'Kopi', 1),
  ('22222222-2222-2222-2222-222222222222', 'Minuman Dingin', 2),
  ('33333333-3333-3333-3333-333333333333', 'Makanan Berat', 3),
  ('44444444-4444-4444-4444-444444444444', 'Camilan', 4),
  ('55555555-5555-5555-5555-555555555555', 'Minuman Hangat', 5);

-- 4. Update menu_items dengan category_id baru
UPDATE menu_items SET category_id = '11111111-1111-1111-1111-111111111111'
  WHERE name IN ('Kopi Hitam', 'Es Kopi Susu');

UPDATE menu_items SET category_id = '22222222-2222-2222-2222-222222222222'
  WHERE name IN ('Es Jeruk', 'Es Teh Manis');

UPDATE menu_items SET category_id = '33333333-3333-3333-3333-333333333333'
  WHERE name IN ('Nasi Lemak', 'Indomie Goreng Original', 'Indomie Goreng Spesial', 'Indomie Kuah');

UPDATE menu_items SET category_id = '44444444-4444-4444-4444-444444444444'
  WHERE name IN ('Pisang Goreng', 'Ropang Coklat', 'Ropang Coklat Keju', 'Ropang Keju', 'Kentang Goreng');

-- 5. Tambah FK constraint
ALTER TABLE menu_items
  ADD CONSTRAINT menu_items_category_id_fkey
  FOREIGN KEY (category_id) REFERENCES menu_categories(id) ON DELETE SET NULL;

-- 6. Enable RLS
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Anyone can view menu categories" ON menu_categories;
CREATE POLICY "Anyone can view menu categories" ON menu_categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Staff full access categories" ON menu_categories;
CREATE POLICY "Staff full access categories" ON menu_categories FOR ALL USING (auth.role() = 'authenticated');

-- 7. Refresh PostgREST cache (penting!)
NOTIFY pgrst, 'reload schema';

-- 8. Verifikasi
SELECT '=== FIX RESULT ===' AS info
UNION ALL SELECT 'Categories: '  || COUNT(*)::text FROM menu_categories
UNION ALL SELECT 'Menu Items: '  || COUNT(*)::text FROM menu_items
UNION ALL SELECT 'With Cat: '    || COUNT(*)::text FROM menu_items WHERE category_id IS NOT NULL;
