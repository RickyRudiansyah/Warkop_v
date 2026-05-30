-- Migration: Warkop v2 — Restrukturasi Orders + Table Sessions
-- Run this in Supabase SQL Editor

-- 1. Create table_sessions
CREATE TABLE IF NOT EXISTS table_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  table_number INT NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED')),
  total_amount INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  closed_at TIMESTAMPTZ
);

-- 2. Alter orders table — add v2 columns
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS session_id UUID REFERENCES table_sessions(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'UNPAID' CHECK (payment_status IN ('UNPAID', 'PAID')),
  ADD COLUMN IF NOT EXISTS payment_ref TEXT,
  ADD COLUMN IF NOT EXISTS receipt_printed BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- 3. Drop old status constraint, add new one
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('PENDING_CASH','PAID','PROCESSING','SERVED','CANCELLED'));

-- 4. Enable RLS on new table
ALTER TABLE table_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view table sessions" ON table_sessions FOR SELECT USING (true);
CREATE POLICY "Staff full access sessions" ON table_sessions FOR ALL USING (auth.role() = 'authenticated');

-- 5. Add realtime for table_sessions
ALTER PUBLICATION supabase_realtime ADD TABLE table_sessions;
