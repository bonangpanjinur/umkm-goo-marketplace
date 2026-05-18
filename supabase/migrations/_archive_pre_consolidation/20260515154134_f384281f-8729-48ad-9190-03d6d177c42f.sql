ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.studio_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS location_name text,
  ADD COLUMN IF NOT EXISTS location_type text,
  ADD COLUMN IF NOT EXISTS location_fee numeric NOT NULL DEFAULT 0;

-- Allow public to read active studio_locations for booking page
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='studio_locations'
      AND policyname='Public can view active studio locations'
  ) THEN
    CREATE POLICY "Public can view active studio locations"
      ON public.studio_locations
      FOR SELECT
      TO anon, authenticated
      USING (is_active = true);
  END IF;
END $$;