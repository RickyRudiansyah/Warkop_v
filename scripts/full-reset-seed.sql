-- ============================================================
-- Rumipang - Full Reset + Seed Data
-- Run this ENTIRE file in Supabase SQL Editor
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- STEP 1: HAPUS SEMUA DATA LAMA
-- ============================================================
DELETE FROM activity_logs;
DELETE FROM order_items;
DELETE FROM orders;
DELETE FROM menu_variations;
DELETE FROM menu_items;
DELETE FROM menu_categories;
DELETE FROM staff_users;
DELETE FROM tables;

-- Hapus auth identities & users lama
DELETE FROM auth.identities WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('owner@warkop.com','koki@warkop.com','kasir@warkop.com','cashier@warkop.com')
);
DELETE FROM auth.users WHERE email IN ('owner@warkop.com','koki@warkop.com','kasir@warkop.com','cashier@warkop.com');

-- ============================================================
-- STEP 2: DROP OLD POLICIES & TABLES (clean slate)
-- ============================================================
DROP POLICY IF EXISTS "Anyone can view tables" ON tables;
DROP POLICY IF EXISTS "Anyone can view menu categories" ON menu_categories;
DROP POLICY IF EXISTS "Anyone can view menu items" ON menu_items;
DROP POLICY IF EXISTS "Anyone can view menu variations" ON menu_variations;
DROP POLICY IF EXISTS "Staff full access tables" ON tables;
DROP POLICY IF EXISTS "Staff full access categories" ON menu_categories;
DROP POLICY IF EXISTS "Staff full access menu_items" ON menu_items;
DROP POLICY IF EXISTS "Staff full access menu_variations" ON menu_variations;
DROP POLICY IF EXISTS "Staff full access orders" ON orders;
DROP POLICY IF EXISTS "Staff full access order_items" ON order_items;
DROP POLICY IF EXISTS "Staff full access staff_users" ON staff_users;
DROP POLICY IF EXISTS "Staff full access activity_logs" ON activity_logs;

-- ============================================================
-- STEP 3: BUAT TABEL (gunakan IF NOT EXISTS, data sudah dihapus)
-- ============================================================

CREATE TABLE IF NOT EXISTS tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_number INT UNIQUE NOT NULL,
  label TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS menu_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category_id UUID REFERENCES menu_categories(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  description TEXT,
  price INT NOT NULL,
  image_url TEXT,
  is_available BOOLEAN DEFAULT true,
  is_sold_out BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS menu_variations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL,
  label TEXT NOT NULL,
  extra_price INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_id UUID REFERENCES tables(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'PENDING_CASH' CHECK (status IN ('PENDING_CASH','PENDING_PAYMENT','CONFIRMED','PROCESSING','SERVED','CANCELLED')),
  payment_method TEXT NOT NULL CHECK (payment_method IN ('CASH','QRIS','TRANSFER_BCA')),
  total_amount INT NOT NULL,
  notes TEXT,
  cancel_reason TEXT,
  confirmed_at TIMESTAMPTZ,
  estimated_ready_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
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

CREATE TABLE IF NOT EXISTS staff_users (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('cashier', 'owner')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE IF NOT EXISTS activity_logs (
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
-- STEP 4: BUAT AUTH USERS DENGAN PASSWORD
-- ============================================================

-- Owner
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'owner@warkop.com',
  crypt('Vonzy123_', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Owner"}',
  now(), now(), '', '', '', ''
);

-- Kasir
INSERT INTO auth.users (
  instance_id, id, aud, role, email, encrypted_password,
  email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
  created_at, updated_at, confirmation_token, email_change,
  email_change_token_new, recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'kasir@warkop.com',
  crypt('janganngutang123', gen_salt('bf')),
  now(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Kasir"}',
  now(), now(), '', '', '', ''
);

-- Identities table
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
SELECT gen_random_uuid(), id,
  jsonb_build_object('sub', id::text, 'email', email),
  'email', email, now(), now(), now()
FROM auth.users
WHERE email IN ('owner@warkop.com','kasir@warkop.com')
AND id NOT IN (SELECT user_id FROM auth.identities);

-- ============================================================
-- STEP 5: INSERT STAFF USERS (match auth.users id)
-- ============================================================
INSERT INTO staff_users (id, email, name, role)
SELECT id, email, 'Owner', 'owner'
FROM auth.users WHERE email = 'owner@warkop.com';

INSERT INTO staff_users (id, email, name, role)
SELECT id, email, 'Kasir', 'cashier'
FROM auth.users WHERE email = 'kasir@warkop.com';

-- ============================================================
-- STEP 6: SEED TABLES (10 Meja)
-- ============================================================
INSERT INTO tables (table_number, label) VALUES
  (1, 'Meja 1'), (2, 'Meja 2'), (3, 'Meja 3'), (4, 'Meja 4'), (5, 'Meja 5'),
  (6, 'Meja 6'), (7, 'Meja 7'), (8, 'Meja 8'), (9, 'Meja 9'), (10, 'Meja 10');

-- ============================================================
-- STEP 7: SEED CATEGORIES (5 Kategori)
-- ============================================================
INSERT INTO menu_categories (name, sort_order) VALUES
  ('Kopi', 1),
  ('Minuman Dingin', 2),
  ('Makanan Berat', 3),
  ('Camilan', 4),
  ('Minuman Hangat', 5);

-- ============================================================
-- STEP 8: SEED MENU (13 Item dengan foto Unsplash)
-- ============================================================

-- Kopi (2 item)
INSERT INTO menu_items (category_id, name, description, price, image_url) VALUES
  ((SELECT id FROM menu_categories WHERE name = 'Kopi'), 'Kopi Hitam', 'Kopi hitam robusta kental tanpa gula, cocok untuk pecinta kopi sejati', 7000, 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=400&h=400&fit=crop'),
  ((SELECT id FROM menu_categories WHERE name = 'Kopi'), 'Es Kopi Susu', 'Es kopi susu segar dengan gula aren asli, creamy dan nikmat', 15000, 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&h=400&fit=crop');

-- Minuman Dingin (2 item)
INSERT INTO menu_items (category_id, name, description, price, image_url) VALUES
  ((SELECT id FROM menu_categories WHERE name = 'Minuman Dingin'), 'Es Jeruk', 'Jeruk peras segar dingin dengan perasan jeruk mandarin premium', 8000, 'https://images.unsplash.com/photo-1623065422902-30a2d299bbe4?w=400&h=400&fit=crop'),
  ((SELECT id FROM menu_categories WHERE name = 'Minuman Dingin'), 'Es Teh Manis', 'Teh manis segar dengan es batu kristal, pelepas dahaga', 5000, 'https://images.unsplash.com/photo-1544145945-f90425340c7e?w=400&h=400&fit=crop');

-- Makanan Berat (4 item)
INSERT INTO menu_items (category_id, name, description, price, image_url) VALUES
  ((SELECT id FROM menu_categories WHERE name = 'Makanan Berat'), 'Nasi Lemak', 'Nasi lemak khas dengan sambal, telur, dan ikan bilis renyah', 20000, 'https://images.unsplash.com/photo-1644556888737-83f4b0a6b7f3?w=400&h=400&fit=crop'),
  ((SELECT id FROM menu_categories WHERE name = 'Makanan Berat'), 'Indomie Goreng Original', 'Indomie goreng klasik dengan telur ceplok dan kerupuk', 12000, 'https://images.unsplash.com/photo-1563379926898-05f4575a45d8?w=400&h=400&fit=crop'),
  ((SELECT id FROM menu_categories WHERE name = 'Makanan Berat'), 'Indomie Goreng Spesial', 'Indomie goreng spesial double topping telur + sosis', 18000, 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=400&h=400&fit=crop'),
  ((SELECT id FROM menu_categories WHERE name = 'Makanan Berat'), 'Indomie Kuah', 'Indomie kuah hangat dengan telur rebus dan taburan bawang goreng', 12000, 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?w=400&h=400&fit=crop');

-- Camilan (5 item)
INSERT INTO menu_items (category_id, name, description, price, image_url) VALUES
  ((SELECT id FROM menu_categories WHERE name = 'Camilan'), 'Pisang Goreng', 'Pisang goreng crispy dengan madu murni dan taburan keju', 10000, 'https://images.unsplash.com/photo-1529059997568-3d847b1154f0?w=400&h=400&fit=crop'),
  ((SELECT id FROM menu_categories WHERE name = 'Camilan'), 'Ropang Coklat', 'Roti bakar coklat meleleh dengan susu kental manis', 10000, 'https://images.unsplash.com/photo-1603496987351-f84a3ba45ec4?w=400&h=400&fit=crop'),
  ((SELECT id FROM menu_categories WHERE name = 'Camilan'), 'Ropang Coklat Keju', 'Roti bakar coklat keju premium dengan taburan meses', 13000, 'https://images.unsplash.com/photo-1621996346565-e3dbc646d9a9?w=400&h=400&fit=crop'),
  ((SELECT id FROM menu_categories WHERE name = 'Camilan'), 'Ropang Keju', 'Roti bakar keju mozzarella dengan susu dan mentega', 12000, 'https://images.unsplash.com/photo-1528736235302-53922df5c531?w=400&h=400&fit=crop'),
  ((SELECT id FROM menu_categories WHERE name = 'Camilan'), 'Kentang Goreng', 'Kentang goreng crispy dengan saus keju dan saus sambal', 12000, 'https://images.unsplash.com/photo-1573080496219-bb080dd4f877?w=400&h=400&fit=crop');

-- ============================================================
-- STEP 9: SEED VARIATIONS
-- ============================================================
DO $$
DECLARE
  kopi UUID; eskopi UUID; esjeruk UUID; esteh UUID;
  nasi UUID; indomie UUID; indospesial UUID; ropang UUID;
BEGIN
  SELECT id INTO kopi FROM menu_items WHERE name = 'Kopi Hitam' LIMIT 1;
  SELECT id INTO eskopi FROM menu_items WHERE name = 'Es Kopi Susu' LIMIT 1;
  SELECT id INTO esjeruk FROM menu_items WHERE name = 'Es Jeruk' LIMIT 1;
  SELECT id INTO esteh FROM menu_items WHERE name = 'Es Teh Manis' LIMIT 1;
  SELECT id INTO nasi FROM menu_items WHERE name = 'Nasi Lemak' LIMIT 1;
  SELECT id INTO indomie FROM menu_items WHERE name = 'Indomie Goreng Original' LIMIT 1;
  SELECT id INTO indospesial FROM menu_items WHERE name = 'Indomie Goreng Spesial' LIMIT 1;
  SELECT id INTO ropang FROM menu_items WHERE name = 'Ropang Coklat' LIMIT 1;

  -- Kopi Hitam - level gula
  INSERT INTO menu_variations (menu_item_id, group_name, label, extra_price) VALUES
    (kopi, 'Level Gula', 'Tanpa Gula', 0),
    (kopi, 'Level Gula', 'Kurang Manis', 0),
    (kopi, 'Level Gula', 'Manis', 0),
    (kopi, 'Level Gula', 'Extra Manis', 0);

  -- Es Kopi Susu - ukuran
  INSERT INTO menu_variations (menu_item_id, group_name, label, extra_price) VALUES
    (eskopi, 'Ukuran', 'Regular', 0),
    (eskopi, 'Ukuran', 'Large', 4000);

  -- Es Jeruk - ukuran
  INSERT INTO menu_variations (menu_item_id, group_name, label, extra_price) VALUES
    (esjeruk, 'Ukuran', 'Regular', 0),
    (esjeruk, 'Ukuran', 'Large', 3000);

  -- Es Teh Manis - ukuran
  INSERT INTO menu_variations (menu_item_id, group_name, label, extra_price) VALUES
    (esteh, 'Ukuran', 'Regular', 0),
    (esteh, 'Ukuran', 'Large', 2000);

  -- Nasi Lemak - level pedas
  INSERT INTO menu_variations (menu_item_id, group_name, label, extra_price) VALUES
    (nasi, 'Level Pedas', 'Tidak Pedas', 0),
    (nasi, 'Level Pedas', 'Sedang', 0),
    (nasi, 'Level Pedas', 'Pedas', 0),
    (nasi, 'Level Pedas', 'Extra Pedas', 2000);

  -- Indomie - telur
  INSERT INTO menu_variations (menu_item_id, group_name, label, extra_price) VALUES
    (indomie, 'Tambahan', 'Tanpa Telur', 0),
    (indomie, 'Tambahan', 'Telur Ceplok', 3000),
    (indomie, 'Tambahan', 'Telur Rebus', 3000);

  -- Indomie Spesial - toping
  INSERT INTO menu_variations (menu_item_id, group_name, label, extra_price) VALUES
    (indospesial, 'Toping Ekstra', 'Standard', 0),
    (indospesial, 'Toping Ekstra', 'Tambah Sosis', 5000),
    (indospesial, 'Toping Ekstra', 'Tambah Kornet', 5000);

  -- Ropang Coklat - level manis
  INSERT INTO menu_variations (menu_item_id, group_name, label, extra_price) VALUES
    (ropang, 'Level Manis', 'Normal', 0),
    (ropang, 'Level Manis', 'Extra Manis', 2000);
END $$;

-- ============================================================
-- STEP 10: RLS POLICIES
-- ============================================================
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Public read untuk customer
CREATE POLICY "Anyone can view tables" ON tables FOR SELECT USING (true);
CREATE POLICY "Anyone can view menu categories" ON menu_categories FOR SELECT USING (true);
CREATE POLICY "Anyone can view menu items" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Anyone can view menu variations" ON menu_variations FOR SELECT USING (true);

-- Staff full access (authenticated only)
CREATE POLICY "Staff full access tables" ON tables FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Staff full access categories" ON menu_categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Staff full access menu_items" ON menu_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Staff full access menu_variations" ON menu_variations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Staff full access orders" ON orders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Staff full access order_items" ON order_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Staff full access staff_users" ON staff_users FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Staff full access activity_logs" ON activity_logs FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- STEP 11: REALTIME
-- ============================================================
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;

-- ============================================================
-- VERIFIKASI
-- ============================================================
SELECT '=== HASIL SEED ===' AS info
UNION ALL SELECT 'Categories: '  || COUNT(*)::text FROM menu_categories
UNION ALL SELECT 'Menu Items: '  || COUNT(*)::text FROM menu_items
UNION ALL SELECT 'Variations: '  || COUNT(*)::text FROM menu_variations
UNION ALL SELECT 'Tables: '      || COUNT(*)::text FROM tables
UNION ALL SELECT 'Staff: '       || COUNT(*)::text FROM staff_users
UNION ALL SELECT ''
UNION ALL SELECT '=== AKUN LOGIN ==='
UNION ALL SELECT 'owner@warkop.com / Vonzy123_ (Owner)'
UNION ALL SELECT 'kasir@warkop.com / janganngutang123 (Kasir)';
