ALTER TABLE public.booking_reviews
  ADD COLUMN IF NOT EXISTS body TEXT,
  ADD COLUMN IF NOT EXISTS customer_phone TEXT,
  ALTER COLUMN user_id DROP NOT NULL;

-- relax insert: allow phone-based atau auth-based
DROP POLICY IF EXISTS "review_owner_insert" ON public.booking_reviews;
CREATE POLICY "review_insert_any" ON public.booking_reviews
  FOR INSERT WITH CHECK (true);

-- Tabel pelacak permintaan review (dipakai UI existing)
CREATE TABLE IF NOT EXISTS public.booking_review_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_phone TEXT,
  customer_user_id UUID,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  clicked_at TIMESTAMPTZ,
  UNIQUE (booking_id)
);

ALTER TABLE public.booking_review_requests ENABLE ROW LEVEL SECURITY;
CREATE POLICY "rrq_read" ON public.booking_review_requests FOR SELECT USING (true);
CREATE POLICY "rrq_insert" ON public.booking_review_requests FOR INSERT WITH CHECK (true);
CREATE POLICY "rrq_update" ON public.booking_review_requests FOR UPDATE USING (true);

-- Update function process_booking_reminders untuk juga isi booking_review_requests
CREATE OR REPLACE FUNCTION public.process_booking_reminders()
RETURNS TABLE(h1_count INT, h1h_count INT, review_count INT)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_h1 INT := 0; v_h1h INT := 0; v_review INT := 0; v_booking RECORD;
BEGIN
  FOR v_booking IN
    SELECT b.id, b.customer_user_id, b.shop_id, s.service_name, s.slot_date, s.slot_time, cs.name AS shop_name
    FROM bookings b JOIN booking_slots s ON s.id=b.slot_id JOIN coffee_shops cs ON cs.id=b.shop_id
    WHERE b.status IN ('pending','confirmed') AND b.reminded_h1_at IS NULL AND b.customer_user_id IS NOT NULL
      AND (s.slot_date + s.slot_time) BETWEEN (now() + interval '23 hours') AND (now() + interval '25 hours')
  LOOP
    INSERT INTO notifications (recipient_user_id, shop_id, type, title, body, link, severity, dedupe_key)
    VALUES (v_booking.customer_user_id, v_booking.shop_id, 'booking_reminder_h1', 'Pengingat: booking besok',
      format('Booking %s di %s besok jam %s.', v_booking.service_name, v_booking.shop_name, to_char(v_booking.slot_time, 'HH24:MI')),
      '/akun/bookings', 'info', 'booking_h1_' || v_booking.id::text) ON CONFLICT DO NOTHING;
    UPDATE bookings SET reminded_h1_at = now() WHERE id = v_booking.id;
    v_h1 := v_h1 + 1;
  END LOOP;

  FOR v_booking IN
    SELECT b.id, b.customer_user_id, b.shop_id, s.service_name, s.slot_date, s.slot_time, cs.name AS shop_name
    FROM bookings b JOIN booking_slots s ON s.id=b.slot_id JOIN coffee_shops cs ON cs.id=b.shop_id
    WHERE b.status IN ('pending','confirmed') AND b.reminded_h1h_at IS NULL AND b.customer_user_id IS NOT NULL
      AND (s.slot_date + s.slot_time) BETWEEN (now() + interval '50 minutes') AND (now() + interval '70 minutes')
  LOOP
    INSERT INTO notifications (recipient_user_id, shop_id, type, title, body, link, severity, dedupe_key)
    VALUES (v_booking.customer_user_id, v_booking.shop_id, 'booking_reminder_h1h', 'Booking 1 jam lagi',
      format('%s di %s mulai 1 jam lagi.', v_booking.service_name, v_booking.shop_name),
      '/akun/bookings', 'warning', 'booking_h1h_' || v_booking.id::text) ON CONFLICT DO NOTHING;
    UPDATE bookings SET reminded_h1h_at = now() WHERE id = v_booking.id;
    v_h1h := v_h1h + 1;
  END LOOP;

  FOR v_booking IN
    SELECT b.id, b.customer_user_id, b.customer_phone, b.shop_id, s.service_name, cs.name AS shop_name
    FROM bookings b JOIN booking_slots s ON s.id=b.slot_id JOIN coffee_shops cs ON cs.id=b.shop_id
    LEFT JOIN booking_reviews r ON r.booking_id = b.id
    WHERE b.status IN ('confirmed','completed') AND b.feedback_requested_at IS NULL AND r.id IS NULL
      AND (s.slot_date + s.slot_time + (s.duration_minutes || ' minutes')::interval) < (now() - interval '2 hours')
      AND (s.slot_date + s.slot_time) > (now() - interval '7 days')
  LOOP
    INSERT INTO booking_review_requests (booking_id, customer_phone, customer_user_id)
    VALUES (v_booking.id, v_booking.customer_phone, v_booking.customer_user_id)
    ON CONFLICT (booking_id) DO NOTHING;
    IF v_booking.customer_user_id IS NOT NULL THEN
      INSERT INTO notifications (recipient_user_id, shop_id, type, title, body, link, severity, dedupe_key)
      VALUES (v_booking.customer_user_id, v_booking.shop_id, 'booking_review_request',
        'Bagaimana pengalamanmu di ' || v_booking.shop_name || '?',
        'Bagikan rating untuk booking ' || v_booking.service_name || '.',
        '/akun/bookings', 'info', 'booking_review_' || v_booking.id::text) ON CONFLICT DO NOTHING;
    END IF;
    UPDATE bookings SET feedback_requested_at = now() WHERE id = v_booking.id;
    v_review := v_review + 1;
  END LOOP;

  RETURN QUERY SELECT v_h1, v_h1h, v_review;
END;
$$;