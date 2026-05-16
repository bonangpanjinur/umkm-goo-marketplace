-- Phase 3: queue, reminders, review prompts, custom-order attachments

-- 1. booking_waitlist: tambah queue number, served_at, estimasi tunggu
ALTER TABLE public.booking_waitlist
  ADD COLUMN IF NOT EXISTS queue_number INTEGER,
  ADD COLUMN IF NOT EXISTS served_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS estimated_wait_minutes INTEGER;

-- Public select agar siapa pun bisa lihat antrian shop (TANPA PII detail — kita filter di server fn)
CREATE POLICY "waitlist_public_read_anon" ON public.booking_waitlist
  FOR SELECT
  USING (true);

-- 2. bookings: tambah feedback_requested_at + reminded_h1h_at (h-1 jam)
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS reminded_h1h_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS feedback_requested_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS rating_submitted_at TIMESTAMPTZ;

-- 3. custom_order_requests: multi-file attachments
ALTER TABLE public.custom_order_requests
  ADD COLUMN IF NOT EXISTS attachment_urls TEXT[] DEFAULT ARRAY[]::TEXT[];

-- 4. shop_reviews: review per booking
CREATE TABLE IF NOT EXISTS public.booking_reviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (booking_id)
);

ALTER TABLE public.booking_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "review_public_read" ON public.booking_reviews FOR SELECT USING (true);
CREATE POLICY "review_owner_insert" ON public.booking_reviews FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "review_owner_update" ON public.booking_reviews FOR UPDATE USING (auth.uid() = user_id);

-- 5. Storage bucket untuk custom-order attachments (reuse chat-attachments? buat baru terpisah)
INSERT INTO storage.buckets (id, name, public) VALUES ('custom-order-attachments', 'custom-order-attachments', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "custom_order_attach_read" ON storage.objects FOR SELECT USING (bucket_id = 'custom-order-attachments');
CREATE POLICY "custom_order_attach_insert" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'custom-order-attachments' AND auth.role() = 'authenticated');

-- 6. Function: process_booking_reminders - dipanggil cron
CREATE OR REPLACE FUNCTION public.process_booking_reminders()
RETURNS TABLE(h1_count INT, h1h_count INT, review_count INT)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_h1 INT := 0;
  v_h1h INT := 0;
  v_review INT := 0;
  v_booking RECORD;
BEGIN
  -- H-1 hari (24jam): kirim notifikasi
  FOR v_booking IN
    SELECT b.id, b.customer_user_id, b.shop_id, s.service_name, s.slot_date, s.slot_time, cs.name AS shop_name
    FROM bookings b
    JOIN booking_slots s ON s.id = b.slot_id
    JOIN coffee_shops cs ON cs.id = b.shop_id
    WHERE b.status IN ('pending','confirmed')
      AND b.reminded_h1_at IS NULL
      AND b.customer_user_id IS NOT NULL
      AND (s.slot_date + s.slot_time) BETWEEN (now() + interval '23 hours') AND (now() + interval '25 hours')
  LOOP
    INSERT INTO notifications (recipient_user_id, shop_id, type, title, body, link, severity, dedupe_key)
    VALUES (
      v_booking.customer_user_id, v_booking.shop_id, 'booking_reminder_h1',
      'Pengingat: booking besok',
      format('Booking %s di %s besok jam %s. Sampai jumpa!', v_booking.service_name, v_booking.shop_name, to_char(v_booking.slot_time, 'HH24:MI')),
      '/akun/bookings', 'info',
      'booking_h1_' || v_booking.id::text
    ) ON CONFLICT DO NOTHING;
    UPDATE bookings SET reminded_h1_at = now() WHERE id = v_booking.id;
    v_h1 := v_h1 + 1;
  END LOOP;

  -- H-1 jam: kirim notifikasi
  FOR v_booking IN
    SELECT b.id, b.customer_user_id, b.shop_id, s.service_name, s.slot_date, s.slot_time, cs.name AS shop_name
    FROM bookings b
    JOIN booking_slots s ON s.id = b.slot_id
    JOIN coffee_shops cs ON cs.id = b.shop_id
    WHERE b.status IN ('pending','confirmed')
      AND b.reminded_h1h_at IS NULL
      AND b.customer_user_id IS NOT NULL
      AND (s.slot_date + s.slot_time) BETWEEN (now() + interval '50 minutes') AND (now() + interval '70 minutes')
  LOOP
    INSERT INTO notifications (recipient_user_id, shop_id, type, title, body, link, severity, dedupe_key)
    VALUES (
      v_booking.customer_user_id, v_booking.shop_id, 'booking_reminder_h1h',
      'Booking 1 jam lagi',
      format('%s di %s dimulai 1 jam lagi.', v_booking.service_name, v_booking.shop_name),
      '/akun/bookings', 'warning',
      'booking_h1h_' || v_booking.id::text
    ) ON CONFLICT DO NOTHING;
    UPDATE bookings SET reminded_h1h_at = now() WHERE id = v_booking.id;
    v_h1h := v_h1h + 1;
  END LOOP;

  -- Auto-review: 2 jam setelah slot selesai (status confirmed/completed), belum diminta, belum review
  FOR v_booking IN
    SELECT b.id, b.customer_user_id, b.shop_id, s.service_name, cs.name AS shop_name
    FROM bookings b
    JOIN booking_slots s ON s.id = b.slot_id
    JOIN coffee_shops cs ON cs.id = b.shop_id
    LEFT JOIN booking_reviews r ON r.booking_id = b.id
    WHERE b.status IN ('confirmed','completed')
      AND b.feedback_requested_at IS NULL
      AND b.customer_user_id IS NOT NULL
      AND r.id IS NULL
      AND (s.slot_date + s.slot_time + (s.duration_minutes || ' minutes')::interval) < (now() - interval '2 hours')
      AND (s.slot_date + s.slot_time) > (now() - interval '7 days')
  LOOP
    INSERT INTO notifications (recipient_user_id, shop_id, type, title, body, link, severity, dedupe_key)
    VALUES (
      v_booking.customer_user_id, v_booking.shop_id, 'booking_review_request',
      'Bagaimana pengalamanmu di ' || v_booking.shop_name || '?',
      'Ceritakan pengalamanmu booking ' || v_booking.service_name || ' — bantu pelanggan lain.',
      '/akun/bookings', 'info',
      'booking_review_' || v_booking.id::text
    ) ON CONFLICT DO NOTHING;
    UPDATE bookings SET feedback_requested_at = now() WHERE id = v_booking.id;
    v_review := v_review + 1;
  END LOOP;

  RETURN QUERY SELECT v_h1, v_h1h, v_review;
END;
$$;