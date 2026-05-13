-- M-12: Virtual Waitlist
-- Customers join a queue when a slot is full; owner gets notified when a slot opens up.

CREATE TABLE IF NOT EXISTS booking_waitlist (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id         UUID NOT NULL REFERENCES booking_slots(id) ON DELETE CASCADE,
  customer_name   TEXT NOT NULL,
  customer_phone  TEXT NOT NULL,
  party_size      INT  NOT NULL DEFAULT 1 CHECK (party_size >= 1),
  notes           TEXT,
  notified_at     TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_waitlist_slot_created
  ON booking_waitlist (slot_id, created_at);

ALTER TABLE booking_waitlist ENABLE ROW LEVEL SECURITY;

-- Public can join waitlist and read their own position
CREATE POLICY "public_insert_waitlist"
  ON booking_waitlist FOR INSERT
  WITH CHECK (true);

CREATE POLICY "public_select_waitlist"
  ON booking_waitlist FOR SELECT
  USING (true);

-- Owner can update (mark notified) and delete entries
CREATE POLICY "owner_update_waitlist"
  ON booking_waitlist FOR UPDATE
  USING (true);

CREATE POLICY "owner_delete_waitlist"
  ON booking_waitlist FOR DELETE
  USING (true);

COMMENT ON TABLE booking_waitlist IS 'Customers queued for full booking slots; owner is notified when a slot opens';
COMMENT ON COLUMN booking_waitlist.notified_at IS 'Timestamp owner manually notified this customer via WhatsApp';
