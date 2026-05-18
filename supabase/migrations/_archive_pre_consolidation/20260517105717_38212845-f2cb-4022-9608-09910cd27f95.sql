-- F-16: Align bookings & shops schema for deposit booking flow

-- bookings: add deposit_status & deposit_required
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS deposit_required boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS deposit_status text NOT NULL DEFAULT 'none';

-- Constrain deposit_status values
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'bookings_deposit_status_check'
  ) THEN
    ALTER TABLE public.bookings
      ADD CONSTRAINT bookings_deposit_status_check
      CHECK (deposit_status IN ('none','pending','paid','failed','expired','refunded'));
  END IF;
END $$;

-- Backfill deposit_status from existing deposit_paid flag
UPDATE public.bookings
SET deposit_status = CASE
  WHEN deposit_paid THEN 'paid'
  WHEN deposit_amount > 0 THEN 'pending'
  ELSE 'none'
END
WHERE deposit_status = 'none';

-- Backfill deposit_required when an amount was set
UPDATE public.bookings
SET deposit_required = true
WHERE deposit_amount > 0 AND deposit_required = false;

-- Helpful index for owner dashboard filtering
CREATE INDEX IF NOT EXISTS idx_bookings_shop_deposit_status
  ON public.bookings (shop_id, deposit_status);

-- cancel_token already exists on bookings (gen_random_uuid()) — no change needed.

-- shops: add deposit_notes, deposit_percentage, require_id_upload used by booking UI
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS deposit_notes text,
  ADD COLUMN IF NOT EXISTS deposit_percentage numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS require_id_upload boolean NOT NULL DEFAULT false;

-- Sanity constraint on percentage
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'shops_deposit_percentage_check'
  ) THEN
    ALTER TABLE public.shops
      ADD CONSTRAINT shops_deposit_percentage_check
      CHECK (deposit_percentage >= 0 AND deposit_percentage <= 100);
  END IF;
END $$;