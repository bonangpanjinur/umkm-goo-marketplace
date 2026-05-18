
-- ============================================================
-- FASE A & B: Schema migration
-- ============================================================

-- ---------------- TRAVEL ----------------
ALTER TABLE public.umroh_packages
  ADD COLUMN IF NOT EXISTS package_type text NOT NULL DEFAULT 'umroh'
    CHECK (package_type IN ('umroh','hajj','tour-domestic','tour-international','event')),
  ADD COLUMN IF NOT EXISTS itinerary jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS price_single numeric(14,2);

CREATE TABLE IF NOT EXISTS public.travel_jamaah_manifest (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  package_id uuid REFERENCES public.umroh_packages(id) ON DELETE SET NULL,
  full_name text NOT NULL,
  nik text,
  passport_number text,
  passport_expiry date,
  birth_date date,
  gender text CHECK (gender IS NULL OR gender IN ('L','P')),
  phone text,
  email text,
  address text,
  emergency_contact text,
  special_needs text,
  room_assignment text,
  document_urls jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','docs-incomplete','ready','departed','returned','cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_travel_manifest_shop ON public.travel_jamaah_manifest(shop_id);
CREATE INDEX IF NOT EXISTS idx_travel_manifest_pkg ON public.travel_jamaah_manifest(package_id);
ALTER TABLE public.travel_jamaah_manifest ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "travel_manifest_owner_all" ON public.travel_jamaah_manifest;
CREATE POLICY "travel_manifest_owner_all" ON public.travel_jamaah_manifest
  FOR ALL TO authenticated
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()))
  WITH CHECK (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.travel_installments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  package_id uuid REFERENCES public.umroh_packages(id) ON DELETE SET NULL,
  jamaah_id uuid REFERENCES public.travel_jamaah_manifest(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text,
  total_amount numeric(14,2) NOT NULL,
  paid_amount numeric(14,2) NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'IDR',
  schedule jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{due_date, amount, paid_at, method, note}]
  status text NOT NULL DEFAULT 'open'
    CHECK (status IN ('open','partial','paid','overdue','cancelled')),
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_travel_inst_shop ON public.travel_installments(shop_id);
ALTER TABLE public.travel_installments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "travel_inst_owner_all" ON public.travel_installments;
CREATE POLICY "travel_inst_owner_all" ON public.travel_installments
  FOR ALL TO authenticated
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()))
  WITH CHECK (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- ---------------- RENTAL ----------------
ALTER TABLE public.rental_units
  ADD COLUMN IF NOT EXISTS subtype text,
  ADD COLUMN IF NOT EXISTS plate_number text,
  ADD COLUMN IF NOT EXISTS production_year int,
  ADD COLUMN IF NOT EXISTS transmission text,
  ADD COLUMN IF NOT EXISTS fuel_type text,
  ADD COLUMN IF NOT EXISTS capacity int,
  ADD COLUMN IF NOT EXISTS color text,
  ADD COLUMN IF NOT EXISTS odometer int,
  ADD COLUMN IF NOT EXISTS next_service_at date;

ALTER TABLE public.rental_bookings
  ADD COLUMN IF NOT EXISTS kyc_status text NOT NULL DEFAULT 'pending'
    CHECK (kyc_status IN ('pending','submitted','verified','rejected')),
  ADD COLUMN IF NOT EXISTS kyc_id_url text,
  ADD COLUMN IF NOT EXISTS kyc_drivers_license_url text,
  ADD COLUMN IF NOT EXISTS kyc_selfie_url text,
  ADD COLUMN IF NOT EXISTS kyc_verified_at timestamptz,
  ADD COLUMN IF NOT EXISTS addons jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{name, price}]
  ADD COLUMN IF NOT EXISTS deposit_paid numeric(12,2),
  ADD COLUMN IF NOT EXISTS total_amount numeric(12,2);

CREATE TABLE IF NOT EXISTS public.rental_inspections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  booking_id uuid NOT NULL REFERENCES public.rental_bookings(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('before','after')),
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  checklist jsonb NOT NULL DEFAULT '{}'::jsonb, -- {item: 'ok|damaged|missing'}
  condition_score int CHECK (condition_score BETWEEN 1 AND 10),
  notes text,
  recorded_at timestamptz NOT NULL DEFAULT now(),
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);
CREATE INDEX IF NOT EXISTS idx_rental_insp_booking ON public.rental_inspections(booking_id);
ALTER TABLE public.rental_inspections ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rental_insp_owner_all" ON public.rental_inspections;
CREATE POLICY "rental_insp_owner_all" ON public.rental_inspections
  FOR ALL TO authenticated
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()))
  WITH CHECK (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- ---------------- KLINIK: MEDICATIONS & PRESCRIPTIONS ----------------
CREATE TABLE IF NOT EXISTS public.medications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  generic_name text,
  dose text,
  unit text,
  form text, -- 'tablet','syrup','capsule','injection','cream', etc
  stock int NOT NULL DEFAULT 0,
  low_stock_threshold int NOT NULL DEFAULT 10,
  expiry_date date,
  price numeric(12,2),
  manufacturer text,
  notes text,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_medications_shop ON public.medications(shop_id, is_active);
ALTER TABLE public.medications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "medications_owner_all" ON public.medications;
CREATE POLICY "medications_owner_all" ON public.medications
  FOR ALL TO authenticated
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()))
  WITH CHECK (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.prescriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  patient_id uuid REFERENCES public.patient_records(id) ON DELETE SET NULL,
  visit_id uuid REFERENCES public.patient_visits(id) ON DELETE SET NULL,
  doctor_name text,
  issued_at timestamptz NOT NULL DEFAULT now(),
  diagnosis text,
  notes text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','issued','dispensed','cancelled')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_prescriptions_shop ON public.prescriptions(shop_id, issued_at DESC);
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "prescriptions_owner_all" ON public.prescriptions;
CREATE POLICY "prescriptions_owner_all" ON public.prescriptions
  FOR ALL TO authenticated
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()))
  WITH CHECK (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.prescription_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prescription_id uuid NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
  medication_id uuid REFERENCES public.medications(id) ON DELETE SET NULL,
  name_snapshot text NOT NULL,
  dose text,
  frequency text,
  duration text,
  qty int NOT NULL DEFAULT 1,
  instructions text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_presc_items_presc ON public.prescription_items(prescription_id);
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "presc_items_owner_all" ON public.prescription_items;
CREATE POLICY "presc_items_owner_all" ON public.prescription_items
  FOR ALL TO authenticated
  USING (prescription_id IN (
    SELECT p.id FROM public.prescriptions p
    JOIN public.shops s ON s.id = p.shop_id
    WHERE s.owner_id = auth.uid()
  ))
  WITH CHECK (prescription_id IN (
    SELECT p.id FROM public.prescriptions p
    JOIN public.shops s ON s.id = p.shop_id
    WHERE s.owner_id = auth.uid()
  ));

-- ---------------- RETAIL: RETURNS ----------------
CREATE TABLE IF NOT EXISTS public.product_returns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text,
  reason text NOT NULL,
  items jsonb NOT NULL DEFAULT '[]'::jsonb, -- [{menu_item_id, name, qty, condition}]
  refund_amount numeric(12,2),
  refund_method text, -- 'cash','wallet','exchange'
  restock boolean NOT NULL DEFAULT false,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','completed')),
  notes text,
  processed_at timestamptz,
  processed_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_returns_shop ON public.product_returns(shop_id, status);
ALTER TABLE public.product_returns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "returns_owner_all" ON public.product_returns;
CREATE POLICY "returns_owner_all" ON public.product_returns
  FOR ALL TO authenticated
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()))
  WITH CHECK (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- ---------------- F&B: MENU EXTENSIONS ----------------
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS allergens text[] NOT NULL DEFAULT '{}'::text[],
  ADD COLUMN IF NOT EXISTS is_halal boolean,
  ADD COLUMN IF NOT EXISTS nutrition jsonb NOT NULL DEFAULT '{}'::jsonb, -- {calories, protein_g, carbs_g, fat_g}
  ADD COLUMN IF NOT EXISTS available_modes text[] NOT NULL DEFAULT ARRAY['dine-in','takeaway','delivery']::text[];

-- ---------------- SALON: TREATMENT HISTORY ----------------
CREATE TABLE IF NOT EXISTS public.customer_treatments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  customer_name text NOT NULL,
  customer_phone text,
  service_name text NOT NULL,
  staff_name text,
  formula text, -- contoh: formula warna untuk salon
  allergies_noted text,
  before_photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  after_photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes text,
  performed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_treatments_shop ON public.customer_treatments(shop_id, performed_at DESC);
ALTER TABLE public.customer_treatments ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "treatments_owner_all" ON public.customer_treatments;
CREATE POLICY "treatments_owner_all" ON public.customer_treatments
  FOR ALL TO authenticated
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()))
  WITH CHECK (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- Membership session credit
ALTER TABLE public.customer_memberships
  ADD COLUMN IF NOT EXISTS sessions_total int,
  ADD COLUMN IF NOT EXISTS sessions_remaining int;

-- ---------------- STUDIO: CLIENT GALLERY ----------------
CREATE TABLE IF NOT EXISTS public.studio_galleries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  title text NOT NULL,
  client_name text,
  client_email text,
  share_token text UNIQUE NOT NULL DEFAULT encode(gen_random_bytes(16),'hex'),
  expires_at timestamptz,
  watermark_enabled boolean NOT NULL DEFAULT true,
  max_selections int,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft','sent','reviewed','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_galleries_shop ON public.studio_galleries(shop_id);
CREATE INDEX IF NOT EXISTS idx_galleries_token ON public.studio_galleries(share_token);
ALTER TABLE public.studio_galleries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "galleries_owner_all" ON public.studio_galleries;
CREATE POLICY "galleries_owner_all" ON public.studio_galleries
  FOR ALL TO authenticated
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()))
  WITH CHECK (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));
DROP POLICY IF EXISTS "galleries_public_via_token" ON public.studio_galleries;
CREATE POLICY "galleries_public_via_token" ON public.studio_galleries
  FOR SELECT TO anon, authenticated
  USING (true); -- view allowed; sensitive ops still need owner role; share via app layer filter on token

CREATE TABLE IF NOT EXISTS public.studio_gallery_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  gallery_id uuid NOT NULL REFERENCES public.studio_galleries(id) ON DELETE CASCADE,
  photo_url text NOT NULL,
  thumbnail_url text,
  is_selected boolean NOT NULL DEFAULT false,
  customer_note text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gallery_photos_gallery ON public.studio_gallery_photos(gallery_id);
ALTER TABLE public.studio_gallery_photos ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "gallery_photos_owner_all" ON public.studio_gallery_photos;
CREATE POLICY "gallery_photos_owner_all" ON public.studio_gallery_photos
  FOR ALL TO authenticated
  USING (gallery_id IN (
    SELECT g.id FROM public.studio_galleries g
    JOIN public.shops s ON s.id = g.shop_id
    WHERE s.owner_id = auth.uid()
  ))
  WITH CHECK (gallery_id IN (
    SELECT g.id FROM public.studio_galleries g
    JOIN public.shops s ON s.id = g.shop_id
    WHERE s.owner_id = auth.uid()
  ));
DROP POLICY IF EXISTS "gallery_photos_public_view" ON public.studio_gallery_photos;
CREATE POLICY "gallery_photos_public_view" ON public.studio_gallery_photos
  FOR SELECT TO anon, authenticated USING (true);

-- Allow clients to mark selection via share token (handled in app with admin client + token check)
DROP POLICY IF EXISTS "gallery_photos_public_update" ON public.studio_gallery_photos;
CREATE POLICY "gallery_photos_public_update" ON public.studio_gallery_photos
  FOR UPDATE TO anon, authenticated
  USING (true)
  WITH CHECK (true);

-- ---------------- CATEGORY: NEW FEATURE KEYS (declarative only) ----------------
-- (feature-keys.ts client constant akan ditambah lewat kode; di DB tidak ada enum)

-- ---------------- TRIGGERS: updated_at ----------------
CREATE TRIGGER trg_travel_manifest_updated_at BEFORE UPDATE ON public.travel_jamaah_manifest
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_travel_inst_updated_at BEFORE UPDATE ON public.travel_installments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_medications_updated_at BEFORE UPDATE ON public.medications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_prescriptions_updated_at BEFORE UPDATE ON public.prescriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER trg_galleries_updated_at BEFORE UPDATE ON public.studio_galleries
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
