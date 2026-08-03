-- ============================================================
-- Rumipang - FULL RESET + SEED (Match image/ folder)
-- Run this ENTIRE file in Supabase SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- STEP 1: HAPUS SEMUA DATA & HISTORY
-- ============================================================
DELETE FROM activity_logs;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM menu_variations;
DELETE FROM menu_items;
DELETE FROM categories;
DELETE FROM staff_users;
DELETE FROM tables;

-- Hapus auth users lama
DELETE FROM auth.identities WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('owner@warkop.com','koki@warkop.com','kasir@warkop.com','cashier@warkop.com')
);
DELETE FROM auth.users WHERE email IN ('owner@warkop.com','koki@warkop.com','kasir@warkop.com','cashier@warkop.com');

-- Drop old tables & policies
DROP POLICY IF EXISTS "Anyone can view tables" ON tables;
DROP POLICY IF EXISTS "Anyone can view menu categories" ON categories;
DROP POLICY IF EXISTS "Anyone can view menu items" ON menu_items;
DROP POLICY IF EXISTS "Anyone can view menu variations" ON menu_variations;
DROP POLICY IF EXISTS "Staff full access tables" ON tables;
DROP POLICY IF EXISTS "Staff full access categories" ON categories;
DROP POLICY IF EXISTS "Staff full access menu_items" ON menu_items;
DROP POLICY IF EXISTS "Staff full access menu_variations" ON menu_variations;
DROP POLICY IF EXISTS "Staff full access orders" ON orders;
DROP POLICY IF EXISTS "Staff full access order_items" ON order_items;
DROP POLICY IF EXISTS "Staff full access staff_users" ON staff_users;
DROP POLICY IF EXISTS "Staff full access activity_logs" ON activity_logs;

DROP TABLE IF EXISTS activity_logs CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS menu_variations CASCADE;
DROP TABLE IF EXISTS menu_items CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS menu_categories CASCADE;
DROP TABLE IF EXISTS staff_users CASCADE;
DROP TABLE IF EXISTS tables CASCADE;

-- ============================================================
-- STEP 2: BUAT SEMUA TABEL
-- ============================================================

CREATE TABLE tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_number INT UNIQUE NOT NULL,
  label TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0
);

CREATE TABLE menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price INT NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  is_sold_out BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE menu_variations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  variation_type TEXT NOT NULL,
  label TEXT NOT NULL,
  extra_price INT DEFAULT 0
);

CREATE TABLE orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'PENDING_CASH'
    CHECK (status IN ('PENDING_CASH','PENDING_PAYMENT','CONFIRMED','PROCESSING','SERVED','CANCELLED')),
  payment_method TEXT NOT NULL
    CHECK (payment_method IN ('CASH','QRIS','TRANSFER_BCA')),
  total_amount INT NOT NULL,
  notes TEXT,
  cancel_reason TEXT,
  confirmed_at TIMESTAMPTZ,
  estimated_ready_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE order_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE SET NULL,
  menu_item_name TEXT NOT NULL,
  menu_item_price INT NOT NULL,
  quantity INT NOT NULL,
  variations JSONB DEFAULT '[]',
  subtotal INT NOT NULL,
  notes TEXT
);

CREATE TABLE staff_users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('cashier', 'owner')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  actor_email TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  action TEXT NOT NULL,
  target_type TEXT,
  target_id TEXT,
  detail JSONB,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- STEP 3: BUAT AUTH USERS
-- ============================================================

INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) VALUES
('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
 'owner@warkop.com', crypt('Vonzy123_', gen_salt('bf')), now(),
 '{"provider":"email","providers":["email"]}', '{"name":"Owner"}',
 now(), now(), '', '', '', ''),
('00000000-0000-0000-0000-000000000000', gen_random_uuid(), 'authenticated', 'authenticated',
 'kasir@warkop.com', crypt('janganngutang123', gen_salt('bf')), now(),
 '{"provider":"email","providers":["email"]}', '{"name":"Kasir"}',
 now(), now(), '', '', '', '')
ON CONFLICT DO NOTHING;

INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
SELECT gen_random_uuid(), id,
  jsonb_build_object('sub', id::text, 'email', email),
  'email', email, now(), now(), now()
FROM auth.users
WHERE email IN ('owner@warkop.com','kasir@warkop.com')
AND id NOT IN (SELECT user_id FROM auth.identities);

-- ============================================================
-- STEP 4: INSERT STAFF USERS
-- ============================================================
INSERT INTO staff_users (id, email, name, role)
SELECT id, email, 'Owner', 'owner'  FROM auth.users WHERE email = 'owner@warkop.com'
UNION ALL
SELECT id, email, 'Kasir', 'cashier' FROM auth.users WHERE email = 'kasir@warkop.com';

-- ============================================================
-- STEP 5: SEED 10 MEJA
-- ============================================================
INSERT INTO tables (table_number, label) VALUES
  (1,'Meja 1'),(2,'Meja 2'),(3,'Meja 3'),(4,'Meja 4'),(5,'Meja 5'),
  (6,'Meja 6'),(7,'Meja 7'),(8,'Meja 8'),(9,'Meja 9'),(10,'Meja 10');

-- ============================================================
-- STEP 6: SEED 5 KATEGORI
-- ============================================================
INSERT INTO categories (name, sort_order) VALUES
  ('Kopi',           1),
  ('Minuman Dingin', 2),
  ('Makanan Berat',  3),
  ('Camilan',        4),
  ('Minuman Hangat', 5);

-- ============================================================
-- STEP 7: SEED 12 MENU (match image/ folder)
-- image_url diisi NULL dulu, nanti diisi via script upload-images.mjs
-- ============================================================

-- KOPI (2)
INSERT INTO menu_items (category_id, name, description, price)
SELECT c.id, 'Kopi Hitam',    'Kopi hitam robusta kental tanpa gula',       7000  FROM categories c WHERE c.name = 'Kopi'
UNION ALL
SELECT c.id, 'Es Kopi Susu',  'Es kopi susu segar dengan gula aren',       15000  FROM categories c WHERE c.name = 'Kopi';

-- MINUMAN DINGIN (2)
INSERT INTO menu_items (category_id, name, description, price)
SELECT c.id, 'Es Jeruk',      'Jeruk peras segar dingin premium',            8000  FROM categories c WHERE c.name = 'Minuman Dingin'
UNION ALL
SELECT c.id, 'Es Teh Manis',  'Teh manis segar dengan es batu',              5000  FROM categories c WHERE c.name = 'Minuman Dingin';

-- MAKANAN BERAT (3)
INSERT INTO menu_items (category_id, name, description, price)
SELECT c.id, 'Indomie Goreng Original', 'Indomie goreng klasik dengan telur ceplok',  12000 FROM categories c WHERE c.name = 'Makanan Berat'
UNION ALL
SELECT c.id, 'Indomie Goreng Spesial',  'Indomie goreng spesial double topping',      18000 FROM categories c WHERE c.name = 'Makanan Berat'
UNION ALL
SELECT c.id, 'Indomie Kuah',            'Indomie kuah hangat dengan telur rebus',     12000 FROM categories c WHERE c.name = 'Makanan Berat';

-- CAMILAN (5)
INSERT INTO menu_items (category_id, name, description, price)
SELECT c.id, 'Pisang Goreng',       'Pisang goreng crispy dengan madu',          10000 FROM categories c WHERE c.name = 'Camilan'
UNION ALL
SELECT c.id, 'Kentang Goreng',      'Kentang goreng crispy dengan saus',         12000 FROM categories c WHERE c.name = 'Camilan'
UNION ALL
SELECT c.id, 'Ropang Coklat',       'Roti bakar coklat meleleh',                 10000 FROM categories c WHERE c.name = 'Camilan'
UNION ALL
SELECT c.id, 'Ropang Coklat Keju',  'Roti bakar coklat keju premium',            13000 FROM categories c WHERE c.name = 'Camilan'
UNION ALL
SELECT c.id, 'Ropang Keju',         'Roti bakar keju mozzarella',                12000 FROM categories c WHERE c.name = 'Camilan';

-- ============================================================
-- STEP 8: SEED VARIATIONS
-- ============================================================
DO $$
DECLARE
  kopi UUID;
  eskopi UUID;
  esjeruk UUID;
  esteh UUID;
  indomie UUID;
  spesial UUID;
  ropang UUID;
BEGIN
  SELECT id INTO kopi    FROM menu_items WHERE name = 'Kopi Hitam'             LIMIT 1;
  SELECT id INTO eskopi  FROM menu_items WHERE name = 'Es Kopi Susu'           LIMIT 1;
  SELECT id INTO esjeruk FROM menu_items WHERE name = 'Es Jeruk'               LIMIT 1;
  SELECT id INTO esteh   FROM menu_items WHERE name = 'Es Teh Manis'           LIMIT 1;
  SELECT id INTO indomie FROM menu_items WHERE name = 'Indomie Goreng Original' LIMIT 1;
  SELECT id INTO spesial FROM menu_items WHERE name = 'Indomie Goreng Spesial'  LIMIT 1;
  SELECT id INTO ropang  FROM menu_items WHERE name = 'Ropang Coklat'           LIMIT 1;
  -- Kopi Hitam - level gula
  INSERT INTO menu_variations (menu_item_id, variation_type, label, extra_price) VALUES
    (kopi, 'Level Gula', 'Tanpa Gula',   0),
    (kopi, 'Level Gula', 'Kurang Manis', 0),
    (kopi, 'Level Gula', 'Manis',        0),
    (kopi, 'Level Gula', 'Extra Manis',  0);

  -- Es Kopi Susu - ukuran
  INSERT INTO menu_variations (menu_item_id, variation_type, label, extra_price) VALUES
    (eskopi, 'Ukuran', 'Regular', 0),
    (eskopi, 'Ukuran', 'Large',   4000);

  -- Es Jeruk - ukuran
  INSERT INTO menu_variations (menu_item_id, variation_type, label, extra_price) VALUES
    (esjeruk, 'Ukuran', 'Regular', 0),
    (esjeruk, 'Ukuran', 'Large',   3000);

  -- Es Teh Manis - ukuran
  INSERT INTO menu_variations (menu_item_id, variation_type, label, extra_price) VALUES
    (esteh, 'Ukuran', 'Regular', 0),
    (esteh, 'Ukuran', 'Large',   2000);

  -- Indomie - telur
  INSERT INTO menu_variations (menu_item_id, variation_type, label, extra_price) VALUES
    (indomie, 'Tambahan', 'Tanpa Telur',  0),
    (indomie, 'Tambahan', 'Telur Ceplok', 3000),
    (indomie, 'Tambahan', 'Telur Rebus',  3000);

  -- Indomie Spesial - toping ekstra
  INSERT INTO menu_variations (menu_item_id, variation_type, label, extra_price) VALUES
    (spesial, 'Toping Ekstra', 'Standard',       0),
    (spesial, 'Toping Ekstra', 'Tambah Sosis',   5000),
    (spesial, 'Toping Ekstra', 'Tambah Kornet',  5000);

  -- Ropang Coklat - level manis
  INSERT INTO menu_variations (menu_item_id, variation_type, label, extra_price) VALUES
    (ropang, 'Level Manis', 'Normal',       0),
    (ropang, 'Level Manis', 'Extra Manis',  2000);
END $$;

-- ============================================================
-- STEP 9: RLS POLICIES
-- ============================================================
ALTER TABLE tables          ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories      ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items      ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders          ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items     ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_users      ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs   ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view tables"           ON tables          FOR SELECT USING (true);
CREATE POLICY "Anyone can view categories"       ON categories      FOR SELECT USING (true);
CREATE POLICY "Anyone can view menu items"       ON menu_items      FOR SELECT USING (true);
CREATE POLICY "Anyone can view menu variations"  ON menu_variations FOR SELECT USING (true);

CREATE POLICY "Staff full access tables"          ON tables          FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Staff full access categories"      ON categories      FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Staff full access menu_items"      ON menu_items      FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Staff full access menu_variations" ON menu_variations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Staff full access orders"          ON orders          FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Staff full access order_items"     ON order_items     FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Staff full access staff_users"     ON staff_users      FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Staff full access activity_logs"   ON activity_logs   FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- STEP 10: STORAGE BUCKET
-- ============================================================
INSERT INTO storage.buckets (id, name, public) VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view menu images" ON storage.objects;
CREATE POLICY "Public can view menu images" ON storage.objects
  FOR SELECT USING (bucket_id = 'menu-images');

DROP POLICY IF EXISTS "Staff can insert menu images" ON storage.objects;
CREATE POLICY "Staff can insert menu images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'menu-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Staff can update menu images" ON storage.objects;
CREATE POLICY "Staff can update menu images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'menu-images' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Staff can delete menu images" ON storage.objects;
CREATE POLICY "Staff can delete menu images" ON storage.objects
  FOR DELETE USING (bucket_id = 'menu-images' AND auth.role() = 'authenticated');

-- ============================================================
-- STEP 11: REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;

-- ============================================================
-- STEP 12: REFRESH CACHE
-- ============================================================
NOTIFY pgrst, 'reload schema';

-- ============================================================
-- VERIFY
-- ============================================================
SELECT '=== SEED RESULT ===' AS info
UNION ALL SELECT 'Categories: '  || COUNT(*)::text FROM categories
UNION ALL SELECT 'Menu Items: '  || COUNT(*)::text FROM menu_items
UNION ALL SELECT 'Variations: '  || COUNT(*)::text FROM menu_variations
UNION ALL SELECT 'Tables: '      || COUNT(*)::text FROM tables
UNION ALL SELECT 'Staff: '       || COUNT(*)::text FROM staff_users
UNION ALL SELECT ''
UNION ALL SELECT '=== AKUN LOGIN ==='
UNION ALL SELECT 'owner@warkop.com  / Vonzy123_'
UNION ALL SELECT 'kasir@warkop.com  / janganngutang123'
UNION ALL SELECT ''
UNION ALL SELECT '=== NEXT: jalankan >>> node scripts/upload-images.mjs <<< untuk upload gambar ===';
