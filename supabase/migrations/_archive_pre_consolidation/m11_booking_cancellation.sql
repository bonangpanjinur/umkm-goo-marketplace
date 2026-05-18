-- M-11: Booking Cancellation Token
-- Adds a secure one-time cancellation token per booking

ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS cancellation_token UUID UNIQUE DEFAULT gen_random_uuid(),
  ADD COLUMN IF NOT EXISTS cancelled_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_bookings_cancellation_token
  ON bookings (cancellation_token);

COMMENT ON COLUMN bookings.cancellation_token IS 'Secure one-time UUID used to identify the booking in the public cancellation URL';
COMMENT ON COLUMN bookings.cancelled_at IS 'Timestamp when the customer self-cancelled the booking';
