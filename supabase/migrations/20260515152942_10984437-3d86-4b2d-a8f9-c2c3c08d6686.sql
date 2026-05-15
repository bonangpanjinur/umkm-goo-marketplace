-- 1. Konfigurasi Booking per Kategori (SA-05)
ALTER TABLE public.business_categories
  ADD COLUMN IF NOT EXISTS booking_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS booking_type text,
  ADD COLUMN IF NOT EXISTS booking_config jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.business_categories
  DROP CONSTRAINT IF EXISTS business_categories_booking_type_check;
ALTER TABLE public.business_categories
  ADD CONSTRAINT business_categories_booking_type_check
  CHECK (booking_type IS NULL OR booking_type IN ('session','rental','both'));

-- 2. Studio Locations (SF-03)
CREATE TABLE IF NOT EXISTS public.studio_locations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  location_type text NOT NULL CHECK (location_type IN ('studio','outdoor','client')),
  address text,
  description text,
  extra_fee numeric NOT NULL DEFAULT 0,
  travel_radius_km numeric,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_studio_locations_shop ON public.studio_locations(shop_id, sort_order);
ALTER TABLE public.studio_locations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_all_studio_locations" ON public.studio_locations;
CREATE POLICY "owner_all_studio_locations" ON public.studio_locations
  FOR ALL TO authenticated
  USING (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()))
  WITH CHECK (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "public_read_studio_locations" ON public.studio_locations;
CREATE POLICY "public_read_studio_locations" ON public.studio_locations
  FOR SELECT USING (is_active = true);

-- Booking can reference a location
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS location_id uuid REFERENCES public.studio_locations(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS location_address text;

-- 3. Patient Records (KL-03)
CREATE TABLE IF NOT EXISTS public.patient_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  patient_name text NOT NULL,
  patient_contact text,
  birth_date date,
  gender text CHECK (gender IS NULL OR gender IN ('L','P','other')),
  blood_type text,
  allergies text,
  medical_history text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_patient_records_shop ON public.patient_records(shop_id, patient_name);
ALTER TABLE public.patient_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_all_patient_records" ON public.patient_records;
CREATE POLICY "owner_all_patient_records" ON public.patient_records
  FOR ALL TO authenticated
  USING (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()))
  WITH CHECK (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.patient_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patient_records(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  visit_date timestamptz NOT NULL DEFAULT now(),
  complaint text,
  diagnosis text,
  treatment text,
  prescription text,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_patient_visits_patient ON public.patient_visits(patient_id, visit_date DESC);
ALTER TABLE public.patient_visits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_all_patient_visits" ON public.patient_visits;
CREATE POLICY "owner_all_patient_visits" ON public.patient_visits
  FOR ALL TO authenticated
  USING (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()))
  WITH CHECK (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()));

-- 4. Job Deliverables (JU-05)
CREATE TABLE IF NOT EXISTS public.job_deliverables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  custom_order_id uuid REFERENCES public.custom_order_requests(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_contact text NOT NULL,
  title text NOT NULL,
  description text,
  file_url text,
  file_name text,
  file_size_bytes bigint,
  external_url text,
  delivery_token text NOT NULL DEFAULT replace(gen_random_uuid()::text,'-',''),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','received','revision','completed')),
  sent_at timestamptz,
  received_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_job_deliverables_token ON public.job_deliverables(delivery_token);
CREATE INDEX IF NOT EXISTS idx_job_deliverables_shop ON public.job_deliverables(shop_id, created_at DESC);
ALTER TABLE public.job_deliverables ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_all_job_deliverables" ON public.job_deliverables;
CREATE POLICY "owner_all_job_deliverables" ON public.job_deliverables
  FOR ALL TO authenticated
  USING (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()))
  WITH CHECK (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "public_read_job_deliverables_by_token" ON public.job_deliverables;
CREATE POLICY "public_read_job_deliverables_by_token" ON public.job_deliverables
  FOR SELECT USING (status IN ('sent','received','revision','completed'));

-- 5. Custom Order Quotes (Estimasi biaya)
CREATE TABLE IF NOT EXISTS public.custom_order_quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id uuid NOT NULL REFERENCES public.custom_order_requests(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  total numeric NOT NULL,
  breakdown jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  valid_until date,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','sent','accepted','rejected','expired')),
  sent_at timestamptz,
  responded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_custom_order_quotes_request ON public.custom_order_quotes(request_id, created_at DESC);
ALTER TABLE public.custom_order_quotes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_all_custom_order_quotes" ON public.custom_order_quotes;
CREATE POLICY "owner_all_custom_order_quotes" ON public.custom_order_quotes
  FOR ALL TO authenticated
  USING (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()))
  WITH CHECK (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "public_read_custom_order_quotes" ON public.custom_order_quotes;
CREATE POLICY "public_read_custom_order_quotes" ON public.custom_order_quotes
  FOR SELECT USING (status IN ('sent','accepted','rejected','expired'));

-- updated_at triggers
CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

DO $$ BEGIN
  CREATE TRIGGER trg_studio_locations_updated BEFORE UPDATE ON public.studio_locations
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_patient_records_updated BEFORE UPDATE ON public.patient_records
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_job_deliverables_updated BEFORE UPDATE ON public.job_deliverables
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TRIGGER trg_custom_order_quotes_updated BEFORE UPDATE ON public.custom_order_quotes
    FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL; END $$;