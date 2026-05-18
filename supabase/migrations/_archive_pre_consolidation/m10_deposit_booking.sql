-- ============================================================
-- M-10: Deposit Booking Online
-- Ringkasan Implementasi:
--   - coffee_shops: require_deposit, deposit_percent, deposit_notes
--   - bookings: deposit_required, deposit_amount, deposit_status
-- ============================================================

ALTER TABLE coffee_shops ADD COLUMN IF NOT EXISTS require_deposit boolean DEFAULT false;
ALTER TABLE coffee_shops ADD COLUMN IF NOT EXISTS deposit_percent integer DEFAULT 50;
ALTER TABLE coffee_shops ADD COLUMN IF NOT EXISTS deposit_notes text;

ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_required boolean DEFAULT false;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_amount numeric DEFAULT 0;
ALTER TABLE bookings ADD COLUMN IF NOT EXISTS deposit_status text DEFAULT 'waiting_payment';

-- Index untuk query deposit yang pending verifikasi
CREATE INDEX IF NOT EXISTS idx_bookings_deposit_status
  ON bookings (deposit_required, deposit_status)
  WHERE deposit_required = true;
