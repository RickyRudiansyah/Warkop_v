-- Rumipang Ordering System v2 - Supabase Schema
-- Run this in your Supabase SQL Editor

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tables (Meja)
CREATE TABLE IF NOT EXISTS tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_number INT UNIQUE NOT NULL,
  label TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Menu Categories
CREATE TABLE IF NOT EXISTS menu_categories (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  sort_order INT DEFAULT 0
);

-- Menu Items
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

-- Menu Variations
CREATE TABLE IF NOT EXISTS menu_variations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  menu_item_id UUID REFERENCES menu_items(id) ON DELETE CASCADE,
  group_name TEXT NOT NULL,
  label TEXT NOT NULL,
  extra_price INT DEFAULT 0
);

-- Orders
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

-- Order Items
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

-- Staff Users
CREATE TABLE IF NOT EXISTS staff_users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('cashier', 'owner')),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Activity Logs
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

-- Enable Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
ALTER PUBLICATION supabase_realtime ADD TABLE order_items;

-- RLS Policies
ALTER TABLE tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE menu_variations ENABLE ROW LEVEL SECURITY;
ALTER TABLE orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE staff_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

-- Public read
CREATE POLICY "Anyone can view tables" ON tables FOR SELECT USING (true);
CREATE POLICY "Anyone can view menu categories" ON menu_categories FOR SELECT USING (true);
CREATE POLICY "Anyone can view menu items" ON menu_items FOR SELECT USING (true);
CREATE POLICY "Anyone can view menu variations" ON menu_variations FOR SELECT USING (true);

-- Staff full access (authenticated users only)
CREATE POLICY "Staff full access tables" ON tables FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Staff full access categories" ON menu_categories FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Staff full access menu_items" ON menu_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Staff full access menu_variations" ON menu_variations FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Staff full access orders" ON orders FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Staff full access order_items" ON order_items FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Staff full access staff_users" ON staff_users FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Staff full access activity_logs" ON activity_logs FOR ALL USING (auth.role() = 'authenticated');

-- Seed data
INSERT INTO menu_categories (name, sort_order) VALUES
  ('Kopi', 1),
  ('Teh', 2),
  ('Makanan', 3),
  ('Camilan', 4),
  ('Minuman Dingin', 5)
ON CONFLICT DO NOTHING;

INSERT INTO menu_items (category_id, name, description, price, is_available) 
SELECT mc.id, 'Kopi Hitam', 'Kopi hitam tanpa gula', 8000, true FROM menu_categories mc WHERE mc.name = 'Kopi'
UNION ALL SELECT mc.id, 'Kopi Susu', 'Kopi dengan susu segar', 12000, true FROM menu_categories mc WHERE mc.name = 'Kopi'
UNION ALL SELECT mc.id, 'Cappuccino', 'Cappuccino classic', 15000, true FROM menu_categories mc WHERE mc.name = 'Kopi'
UNION ALL SELECT mc.id, 'Teh Hangat', 'Teh manis hangat', 5000, true FROM menu_categories mc WHERE mc.name = 'Teh'
UNION ALL SELECT mc.id, 'Teh Tarik', 'Teh tarik khas', 10000, true FROM menu_categories mc WHERE mc.name = 'Teh'
UNION ALL SELECT mc.id, 'Nasi Goreng', 'Nasi goreng spesial', 18000, true FROM menu_categories mc WHERE mc.name = 'Makanan'
UNION ALL SELECT mc.id, 'Mie Goreng', 'Mie goreng dengan telur', 15000, true FROM menu_categories mc WHERE mc.name = 'Makanan'
UNION ALL SELECT mc.id, 'Indomie Rebus', 'Indomie original', 10000, true FROM menu_categories mc WHERE mc.name = 'Makanan'
UNION ALL SELECT mc.id, 'Roti Bakar', 'Roti bakar coklat/keju', 12000, true FROM menu_categories mc WHERE mc.name = 'Camilan'
UNION ALL SELECT mc.id, 'Pisang Goreng', 'Pisang goreng crispy', 8000, true FROM menu_categories mc WHERE mc.name = 'Camilan'
UNION ALL SELECT mc.id, 'Es Jeruk', 'Jeruk peras segar', 10000, true FROM menu_categories mc WHERE mc.name = 'Minuman Dingin'
UNION ALL SELECT mc.id, 'Es Teh Manis', 'Teh manis dingin', 5000, true FROM menu_categories mc WHERE mc.name = 'Minuman Dingin'
ON CONFLICT DO NOTHING;

INSERT INTO tables (table_number, label) VALUES
  (1, 'Meja 1'),
  (2, 'Meja 2'),
  (3, 'Meja 3'),
  (4, 'Meja 4'),
  (5, 'Meja 5')
ON CONFLICT DO NOTHING;

-- Storage bucket untuk gambar menu
INSERT INTO storage.buckets (id, name, public) VALUES ('menu-images', 'menu-images', true)
ON CONFLICT (id) DO NOTHING;

-- Public read untuk gambar menu
CREATE POLICY "Public can view menu images" ON storage.objects
  FOR SELECT USING (bucket_id = 'menu-images');

-- Staff can upload/update/delete (authenticated users only)
CREATE POLICY "Staff can insert menu images" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'menu-images' AND auth.role() = 'authenticated');

CREATE POLICY "Staff can update menu images" ON storage.objects
  FOR UPDATE USING (bucket_id = 'menu-images' AND auth.role() = 'authenticated');

CREATE POLICY "Staff can delete menu images" ON storage.objects
  FOR DELETE USING (bucket_id = 'menu-images' AND auth.role() = 'authenticated');

