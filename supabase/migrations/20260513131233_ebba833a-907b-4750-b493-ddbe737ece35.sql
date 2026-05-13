CREATE TABLE public.booking_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  slot_date date NOT NULL,
  slot_time time NOT NULL,
  duration_minutes int NOT NULL DEFAULT 60,
  capacity int NOT NULL DEFAULT 1,
  price numeric(12,2),
  deposit_percent int NOT NULL DEFAULT 0 CHECK (deposit_percent BETWEEN 0 AND 100),
  staff_user_id uuid,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_booking_slots_shop_date ON public.booking_slots(shop_id, slot_date);
CREATE INDEX idx_booking_slots_active ON public.booking_slots(is_active) WHERE is_active = true;

CREATE TABLE public.bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id uuid NOT NULL REFERENCES public.booking_slots(id) ON DELETE RESTRICT,
  shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  customer_user_id uuid,
  customer_name text NOT NULL,
  customer_phone text,
  customer_email text,
  party_size int NOT NULL DEFAULT 1,
  notes text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','cancelled','completed','no_show')),
  deposit_amount numeric(12,2) NOT NULL DEFAULT 0,
  deposit_paid boolean NOT NULL DEFAULT false,
  deposit_paid_at timestamptz,
  cancel_token uuid NOT NULL DEFAULT gen_random_uuid(),
  cancelled_at timestamptz,
  cancelled_reason text,
  reminded_h3_at timestamptz,
  reminded_h1_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_bookings_slot ON public.bookings(slot_id);
CREATE INDEX idx_bookings_shop_status ON public.bookings(shop_id, status);
CREATE INDEX idx_bookings_customer ON public.bookings(customer_user_id) WHERE customer_user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_bookings_cancel_token ON public.bookings(cancel_token);

CREATE TABLE public.booking_waitlist (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  slot_id uuid REFERENCES public.booking_slots(id) ON DELETE CASCADE,
  customer_user_id uuid,
  customer_name text NOT NULL,
  customer_phone text,
  party_size int NOT NULL DEFAULT 1,
  requested_date date,
  requested_time time,
  status text NOT NULL DEFAULT 'waiting'
    CHECK (status IN ('waiting','notified','converted','expired','cancelled')),
  notified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_waitlist_shop_status ON public.booking_waitlist(shop_id, status);

CREATE TRIGGER trg_booking_slots_updated BEFORE UPDATE ON public.booking_slots
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_bookings_updated BEFORE UPDATE ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

CREATE OR REPLACE FUNCTION public.bookings_fill_shop_id()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.shop_id IS NULL THEN
    SELECT shop_id INTO NEW.shop_id FROM public.booking_slots WHERE id = NEW.slot_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_bookings_fill_shop BEFORE INSERT ON public.bookings
  FOR EACH ROW EXECUTE FUNCTION public.bookings_fill_shop_id();

ALTER TABLE public.booking_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bookings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.booking_waitlist ENABLE ROW LEVEL SECURITY;

CREATE POLICY "slots_public_read" ON public.booking_slots
  FOR SELECT USING (is_active = true);
CREATE POLICY "slots_owner_all" ON public.booking_slots
  FOR ALL USING (
    EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid())
  );

CREATE POLICY "bookings_customer_select" ON public.bookings
  FOR SELECT USING (auth.uid() = customer_user_id);
CREATE POLICY "bookings_customer_insert" ON public.bookings
  FOR INSERT WITH CHECK (auth.uid() = customer_user_id OR customer_user_id IS NULL);
CREATE POLICY "bookings_customer_cancel" ON public.bookings
  FOR UPDATE USING (auth.uid() = customer_user_id)
  WITH CHECK (auth.uid() = customer_user_id);
CREATE POLICY "bookings_owner_select" ON public.bookings
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid())
  );
CREATE POLICY "bookings_owner_update" ON public.bookings
  FOR UPDATE USING (
    EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid())
  );

CREATE POLICY "waitlist_customer_select" ON public.booking_waitlist
  FOR SELECT USING (auth.uid() = customer_user_id);
CREATE POLICY "waitlist_public_insert" ON public.booking_waitlist
  FOR INSERT WITH CHECK (auth.uid() = customer_user_id OR customer_user_id IS NULL);
CREATE POLICY "waitlist_owner_all" ON public.booking_waitlist
  FOR ALL USING (
    EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid())
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = shop_id AND s.owner_id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.booking_cancel_by_token(_token uuid, _reason text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_booking bookings%ROWTYPE; v_slot_dt timestamptz;
BEGIN
  SELECT * INTO v_booking FROM bookings WHERE cancel_token = _token FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'booking_not_found'; END IF;
  IF v_booking.status IN ('cancelled','completed','no_show') THEN
    RETURN jsonb_build_object('skipped', true, 'status', v_booking.status);
  END IF;

  SELECT (slot_date + slot_time)::timestamptz INTO v_slot_dt
    FROM booking_slots WHERE id = v_booking.slot_id;
  IF v_slot_dt < now() + interval '24 hours' THEN
    RAISE EXCEPTION 'too_late_to_cancel';
  END IF;

  UPDATE bookings
    SET status = 'cancelled', cancelled_at = now(), cancelled_reason = _reason, updated_at = now()
    WHERE id = v_booking.id;

  PERFORM create_notification(
    (SELECT owner_id FROM coffee_shops WHERE id = v_booking.shop_id),
    'booking_cancelled', 'Booking dibatalkan pelanggan',
    v_booking.customer_name || ' membatalkan booking',
    '/pos-app/booking', 'warning', v_booking.shop_id,
    'booking_cancelled:' || v_booking.id::text
  );
  RETURN jsonb_build_object('ok', true, 'booking_id', v_booking.id);
END $$;

CREATE OR REPLACE FUNCTION public.send_booking_reminders()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_h1 int := 0;
  v_h3 int := 0;
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT b.id, b.customer_user_id, b.customer_name, b.shop_id,
           s.service_name, s.slot_date, s.slot_time,
           c.name AS shop_name
    FROM bookings b
    JOIN booking_slots s ON s.id = b.slot_id
    JOIN coffee_shops c ON c.id = b.shop_id
    WHERE b.status = 'confirmed'
      AND b.reminded_h1_at IS NULL
      AND b.customer_user_id IS NOT NULL
      AND s.slot_date = (now() AT TIME ZONE 'Asia/Jakarta')::date + 1
  LOOP
    PERFORM create_notification(
      rec.customer_user_id, 'booking_reminder',
      'Pengingat: booking besok di ' || rec.shop_name,
      rec.service_name || ' - ' || to_char(rec.slot_date, 'DD Mon YYYY') || ' jam ' || to_char(rec.slot_time, 'HH24:MI'),
      '/akun/bookings', 'info', rec.shop_id,
      'booking_reminder_h1:' || rec.id::text
    );
    UPDATE bookings SET reminded_h1_at = now() WHERE id = rec.id;
    v_h1 := v_h1 + 1;
  END LOOP;

  FOR rec IN
    SELECT b.id, b.customer_user_id, b.customer_name, b.shop_id,
           s.service_name, s.slot_date, s.slot_time,
           c.name AS shop_name
    FROM bookings b
    JOIN booking_slots s ON s.id = b.slot_id
    JOIN coffee_shops c ON c.id = b.shop_id
    WHERE b.status = 'confirmed'
      AND b.reminded_h3_at IS NULL
      AND b.customer_user_id IS NOT NULL
      AND s.slot_date = (now() AT TIME ZONE 'Asia/Jakarta')::date + 3
  LOOP
    PERFORM create_notification(
      rec.customer_user_id, 'booking_reminder',
      '3 hari lagi booking di ' || rec.shop_name,
      rec.service_name || ' - ' || to_char(rec.slot_date, 'DD Mon YYYY') || ' jam ' || to_char(rec.slot_time, 'HH24:MI'),
      '/akun/bookings', 'info', rec.shop_id,
      'booking_reminder_h3:' || rec.id::text
    );
    UPDATE bookings SET reminded_h3_at = now() WHERE id = rec.id;
    v_h3 := v_h3 + 1;
  END LOOP;

  RETURN jsonb_build_object('h1_sent', v_h1, 'h3_sent', v_h3, 'run_at', now());
END $$;

CREATE EXTENSION IF NOT EXISTS pg_cron;
SELECT cron.schedule(
  'send-booking-reminders-daily',
  '0 2 * * *',
  $$ SELECT public.send_booking_reminders(); $$
);