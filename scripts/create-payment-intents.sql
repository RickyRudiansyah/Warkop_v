-- Payment intents for the QRIS gateway.
-- An intent is created when a customer chooses QRIS. The real order row is only
-- created once Midtrans confirms settlement (via status poll or webhook), so
-- unpaid QRIS attempts never reach the kitchen/cashier boards.

CREATE TABLE IF NOT EXISTS payment_intents (
  id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  status                  TEXT NOT NULL DEFAULT 'PENDING'
                            CHECK (status IN ('PENDING', 'PAID', 'EXPIRED', 'FAILED')),
  gross_amount            INTEGER NOT NULL,
  qr_string               TEXT,
  qr_url                  TEXT,
  cart                    JSONB NOT NULL,
  order_id                UUID REFERENCES orders(id) ON DELETE SET NULL,
  midtrans_transaction_id TEXT,
  created_at              TIMESTAMPTZ NOT NULL DEFAULT now(),
  paid_at                 TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS payment_intents_status_idx ON payment_intents (status);

-- Server code uses the service-role key (bypasses RLS). Enable RLS with no public
-- policies so the anon key cannot read/write these rows directly.
ALTER TABLE payment_intents ENABLE ROW LEVEL SECURITY;
