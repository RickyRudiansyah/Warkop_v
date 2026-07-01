-- Rumipang — Payment Flow Redesign migration
-- Run this ONCE in your Supabase SQL Editor.
--
-- What it does:
--   * Splits payment state out of the kitchen status field.
--   * status        -> kitchen lifecycle only: QUEUED, PROCESSING, SERVED, CANCELLED
--   * payment_status (new) -> PAID | UNPAID
--   * payment_method -> CASH | QRIS (drops TRANSFER_BCA)

-- 1. Add payment_status column
ALTER TABLE orders ADD COLUMN IF NOT EXISTS payment_status TEXT NOT NULL DEFAULT 'UNPAID';

-- 2. Drop old CHECK constraints (names per supabase-schema.sql defaults)
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_status_check;
ALTER TABLE orders DROP CONSTRAINT IF EXISTS orders_payment_method_check;

-- 3. Backfill existing rows BEFORE re-adding constraints
UPDATE orders SET payment_status = 'PAID'
  WHERE status IN ('CONFIRMED','PROCESSING','SERVED');
UPDATE orders SET status = 'QUEUED'
  WHERE status IN ('PENDING_CASH','PENDING_PAYMENT','CONFIRMED');
UPDATE orders SET payment_method = 'QRIS' WHERE payment_method = 'TRANSFER_BCA';

-- 4. Re-add constraints with new allowed values
ALTER TABLE orders ADD CONSTRAINT orders_status_check
  CHECK (status IN ('QUEUED','PROCESSING','SERVED','CANCELLED'));
ALTER TABLE orders ADD CONSTRAINT orders_payment_method_check
  CHECK (payment_method IN ('CASH','QRIS'));
ALTER TABLE orders ADD CONSTRAINT orders_payment_status_check
  CHECK (payment_status IN ('PAID','UNPAID'));

-- 5. Default for new rows
ALTER TABLE orders ALTER COLUMN status SET DEFAULT 'QUEUED';
