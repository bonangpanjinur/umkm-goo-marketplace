-- M-18: Review Post-Booking Otomatis H+1
-- Jalankan di Supabase SQL Editor

-- 1. Kolom untuk mencatat kapan notifikasi review dikirim ke pembeli
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS review_request_sent_at timestamptz;

-- 2. Tabel record permintaan ulasan (keyed by booking_id, diakses via customer_phone)
CREATE TABLE IF NOT EXISTS public.booking_review_requests (
  id             uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id     uuid        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  customer_phone text        NOT NULL,
  sent_at        timestamptz NOT NULL DEFAULT now(),
  clicked_at     timestamptz,
  UNIQUE(booking_id)
);
ALTER TABLE public.booking_review_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "brr_select_public" ON public.booking_review_requests
  FOR SELECT USING (true);

CREATE POLICY "brr_update_public" ON public.booking_review_requests
  FOR UPDATE USING (true) WITH CHECK (true);

-- 3. Fungsi inti: cari booking selesai kemarin, buat record permintaan ulasan
CREATE OR REPLACE FUNCTION public.fn_send_review_requests()
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_count     integer := 0;
  v_rec       record;
  v_yesterday date    := (CURRENT_DATE - INTERVAL '1 day')::date;
BEGIN
  FOR v_rec IN
    SELECT b.id, b.customer_phone
    FROM   public.bookings       b
    JOIN   public.booking_slots  s ON s.id = b.slot_id
    WHERE  b.status                  = 'completed'
      AND  b.customer_phone          IS NOT NULL
      AND  b.review_request_sent_at  IS NULL
      AND  s.slot_date               = v_yesterday
  LOOP
    -- Buat record permintaan ulasan in-app (keyed by booking)
    INSERT INTO public.booking_review_requests (booking_id, customer_phone)
    VALUES (v_rec.id, v_rec.customer_phone)
    ON CONFLICT (booking_id) DO NOTHING;

    -- Tandai sudah dikirim di baris booking
    UPDATE public.bookings
    SET    review_request_sent_at = now()
    WHERE  id = v_rec.id;

    v_count := v_count + 1;
  END LOOP;

  RETURN v_count;
END;
$$;

-- 4. Jadwalkan via pg_cron — setiap hari 09:00 WIB (02:00 UTC)
-- Hapus jadwal lama jika ada, lalu buat baru
DO $$
BEGIN
  BEGIN
    PERFORM cron.unschedule('m18-send-review-requests');
  EXCEPTION WHEN others THEN NULL;
  END;
END $$;

SELECT cron.schedule(
  'm18-send-review-requests',
  '0 2 * * *',
  $$ SELECT public.fn_send_review_requests(); $$
);
