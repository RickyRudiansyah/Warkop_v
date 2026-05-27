-- Warkop QR - Seed Menu Categories & Update Existing Items
-- Run this in Supabase SQL Editor

-- 1. Create menu_categories table if not exists
CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0
);

-- 2. Insert categories
INSERT INTO menu_categories (name, sort_order) VALUES
  ('Kopi', 1),
  ('Minuman Dingin', 2),
  ('Makanan Berat', 3),
  ('Camilan', 4),
  ('Minuman Hangat', 5)
ON CONFLICT DO NOTHING;

-- 3. Update existing menu items with category_id
UPDATE menu_items SET category_id = (SELECT id FROM menu_categories WHERE name = 'Kopi')
  WHERE name IN ('Kopi Hitam', 'Es Kopi Susu');

UPDATE menu_items SET category_id = (SELECT id FROM menu_categories WHERE name = 'Minuman Dingin')
  WHERE name IN ('Es Jeruk', 'Es Teh Manis');

UPDATE menu_items SET category_id = (SELECT id FROM menu_categories WHERE name = 'Makanan Berat')
  WHERE name IN ('Nasi Lemak', 'Indomie Goreng Original', 'Indomie Goreng Spesial', 'Indomie Kuah');

UPDATE menu_items SET category_id = (SELECT id FROM menu_categories WHERE name = 'Camilan')
  WHERE name IN ('Pisang Goreng', 'Ropang Coklat', 'Ropang Coklat Keju', 'Ropang Keju', 'Kentang Goreng');

-- 4. Add image_urls for richer demo display
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=400&fit=crop' WHERE name = 'Kopi Hitam';
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=400&fit=crop' WHERE name = 'Es Kopi Susu';
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400&h=400&fit=crop' WHERE name = 'Es Jeruk';
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=400&fit=crop' WHERE name = 'Es Teh Manis';
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1644556888737-83f4b0a6b7f3?w=400&h=400&fit=crop' WHERE name = 'Nasi Lemak';
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&h=400&fit=crop' WHERE name = 'Indomie Goreng Original';
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=400&fit=crop' WHERE name = 'Indomie Goreng Spesial';
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400&h=400&fit=crop' WHERE name = 'Indomie Kuah';
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1529059997568-3d847b1154f0?w=400&h=400&fit=crop' WHERE name = 'Pisang Goreng';
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1603496987351-f84a3ba45ec4?w=400&h=400&fit=crop' WHERE name = 'Ropang Coklat';
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=400&fit=crop' WHERE name = 'Ropang Coklat Keju';
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1528736235302-53922df5c531?w=400&h=400&fit=crop' WHERE name = 'Ropang Keju';
UPDATE menu_items SET image_url = 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=400&fit=crop' WHERE name = 'Kentang Goreng';

-- 5. Make all items available, update descriptions
UPDATE menu_items SET is_available = true, is_sold_out = false;

UPDATE menu_items SET description = 'Kopi hitam robusta kental tanpa gula' WHERE name = 'Kopi Hitam';
UPDATE menu_items SET description = 'Es kopi susu segar dengan gula aren' WHERE name = 'Es Kopi Susu';
UPDATE menu_items SET description = 'Jeruk peras segar dingin' WHERE name = 'Es Jeruk';
UPDATE menu_items SET description = 'Teh manis segar dengan es batu' WHERE name = 'Es Teh Manis';
UPDATE menu_items SET description = 'Nasi lemak khas dengan sambal, telur, dan ikan bilis' WHERE name = 'Nasi Lemak';
UPDATE menu_items SET description = 'Indomie goreng klasik dengan telur ceplok' WHERE name = 'Indomie Goreng Original';
UPDATE menu_items SET description = 'Indomie goreng spesial double topping' WHERE name = 'Indomie Goreng Spesial';
UPDATE menu_items SET description = 'Indomie kuah hangat dengan telur' WHERE name = 'Indomie Kuah';
UPDATE menu_items SET description = 'Pisang goreng crispy dengan madu' WHERE name = 'Pisang Goreng';
UPDATE menu_items SET description = 'Roti bakar coklat meleleh' WHERE name = 'Ropang Coklat';
UPDATE menu_items SET description = 'Roti bakar coklat keju premium' WHERE name = 'Ropang Coklat Keju';
UPDATE menu_items SET description = 'Roti bakar keju mozzarella' WHERE name = 'Ropang Keju';
UPDATE menu_items SET description = 'Kentang goreng crispy dengan saus' WHERE name = 'Kentang Goreng';

-- 6. Add sample variations for demo
-- First ensure menu_variations table exists
CREATE TABLE IF NOT EXISTS menu_variations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL,
  label TEXT NOT NULL,
  extra_price INT DEFAULT 0
);

-- Kopi & Teh variations
DO $$
DECLARE
  kopi UUID;
  eskopi UUID;
  esjeruk UUID;
  esteh UUID;
  nasi UUID;
BEGIN
  SELECT id INTO kopi FROM menu_items WHERE name = 'Kopi Hitam' LIMIT 1;
  SELECT id INTO eskopi FROM menu_items WHERE name = 'Es Kopi Susu' LIMIT 1;
  SELECT id INTO esjeruk FROM menu_items WHERE name = 'Es Jeruk' LIMIT 1;
  SELECT id INTO esteh FROM menu_items WHERE name = 'Es Teh Manis' LIMIT 1;
  SELECT id INTO nasi FROM menu_items WHERE name = 'Nasi Lemak' LIMIT 1;

  -- Kopi Hitam - sugar level
  INSERT INTO menu_variations (menu_item_id, group_name, label, extra_price) VALUES
    (kopi, 'Level Gula', 'Tanpa Gula', 0),
    (kopi, 'Level Gula', 'Kurang Manis', 0),
    (kopi, 'Level Gula', 'Manis', 0),
    (kopi, 'Level Gula', 'Extra Manis', 0);

  -- Es Kopi Susu - size
  INSERT INTO menu_variations (menu_item_id, group_name, label, extra_price) VALUES
    (eskopi, 'Ukuran', 'Regular', 0),
    (eskopi, 'Ukuran', 'Large', 4000);

  -- Es Jeruk - size
  INSERT INTO menu_variations (menu_item_id, group_name, label, extra_price) VALUES
    (esjeruk, 'Ukuran', 'Regular', 0),
    (esjeruk, 'Ukuran', 'Large', 3000);

  -- Es Teh Manis - size
  INSERT INTO menu_variations (menu_item_id, group_name, label, extra_price) VALUES
    (esteh, 'Ukuran', 'Regular', 0),
    (esteh, 'Ukuran', 'Large', 2000);

  -- Nasi Lemak - spice level
  INSERT INTO menu_variations (menu_item_id, group_name, label, extra_price) VALUES
    (nasi, 'Level Pedas', 'Tidak Pedas', 0),
    (nasi, 'Level Pedas', 'Sedang', 0),
    (nasi, 'Level Pedas', 'Pedas', 0),
    (nasi, 'Level Pedas', 'Extra Pedas', 2000);
END $$;

-- 7. Enable RLS on new tables
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_variations ENABLE ROW LEVEL SECURITY;

-- Public read
DROP POLICY IF EXISTS "Anyone can view menu categories" ON menu_categories;
CREATE POLICY "Anyone can view menu categories" ON menu_categories FOR SELECT USING (true);
DROP POLICY IF EXISTS "Anyone can view menu variations" ON menu_variations;
CREATE POLICY "Anyone can view menu variations" ON menu_variations FOR SELECT USING (true);

-- Staff full access
DROP POLICY IF EXISTS "Staff full access categories" ON menu_categories;
CREATE POLICY "Staff full access categories" ON menu_categories FOR ALL USING (auth.role() = 'authenticated');
DROP POLICY IF EXISTS "Staff full access menu_variations" ON menu_variations;
CREATE POLICY "Staff full access menu_variations" ON menu_variations FOR ALL USING (auth.role() = 'authenticated');

-- 8. Verify
SELECT 'Categories: ' || COUNT(*)::text AS result FROM menu_categories
UNION ALL
SELECT 'Menu Items: ' || COUNT(*)::text FROM menu_items
UNION ALL
SELECT 'With Categories: ' || COUNT(*)::text FROM menu_items WHERE category_id IS NOT NULL
UNION ALL
SELECT 'Variations: ' || COUNT(*)::text FROM menu_variations
UNION ALL
SELECT 'Tables: ' || COUNT(*)::text FROM tables;
