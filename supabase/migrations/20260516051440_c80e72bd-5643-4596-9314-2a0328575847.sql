-- Prevent double-booking on table reservations (and overcapacity in general)
CREATE OR REPLACE FUNCTION public.check_booking_capacity()
RETURNS TRIGGER AS $$
DECLARE
  v_capacity int;
  v_type text;
  v_booked int;
BEGIN
  -- Only validate active bookings
  IF NEW.status IN ('cancelled') THEN
    RETURN NEW;
  END IF;

  SELECT capacity, booking_type INTO v_capacity, v_type
  FROM public.booking_slots WHERE id = NEW.slot_id;

  IF v_capacity IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT COALESCE(SUM(party_size), 0) INTO v_booked
  FROM public.bookings
  WHERE slot_id = NEW.slot_id
    AND status IN ('pending','confirmed','completed')
    AND (TG_OP = 'INSERT' OR id <> NEW.id);

  IF (v_booked + NEW.party_size) > v_capacity THEN
    IF v_type = 'table' THEN
      RAISE EXCEPTION 'Meja/area ini sudah dipesan pada waktu tersebut. Pilih slot lain.'
        USING ERRCODE = '23514';
    ELSE
      RAISE EXCEPTION 'Slot ini sudah penuh. Pilih slot lain.'
        USING ERRCODE = '23514';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_check_booking_capacity ON public.bookings;
CREATE TRIGGER trg_check_booking_capacity
  BEFORE INSERT OR UPDATE OF slot_id, party_size, status
  ON public.bookings
  FOR EACH ROW
  EXECUTE FUNCTION public.check_booking_capacity();