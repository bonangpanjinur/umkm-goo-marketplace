
-- Add booking_type discriminator to unify "service booking" and "table reservation"
ALTER TABLE public.booking_slots
  ADD COLUMN IF NOT EXISTS booking_type text NOT NULL DEFAULT 'service'
  CHECK (booking_type IN ('service','table'));

ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS booking_type text NOT NULL DEFAULT 'service'
  CHECK (booking_type IN ('service','table'));

CREATE INDEX IF NOT EXISTS idx_booking_slots_type
  ON public.booking_slots (shop_id, booking_type, slot_date);

CREATE INDEX IF NOT EXISTS idx_bookings_type
  ON public.bookings (shop_id, booking_type, status);

-- Trigger: when a booking is inserted, inherit booking_type from its slot
CREATE OR REPLACE FUNCTION public.set_booking_type_from_slot()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.slot_id IS NOT NULL THEN
    SELECT booking_type INTO NEW.booking_type
    FROM public.booking_slots
    WHERE id = NEW.slot_id;
    IF NEW.booking_type IS NULL THEN
      NEW.booking_type := 'service';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_set_booking_type ON public.bookings;
CREATE TRIGGER trg_set_booking_type
BEFORE INSERT ON public.bookings
FOR EACH ROW
EXECUTE FUNCTION public.set_booking_type_from_slot();
