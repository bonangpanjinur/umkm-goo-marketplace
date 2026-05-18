-- Activate 6 features blocked on missing tables.

-- 1. F&B Combos
CREATE TABLE IF NOT EXISTS public.fnb_combos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  image_url text,
  combo_price numeric(12,2) NOT NULL,
  original_price numeric(12,2) NOT NULL DEFAULT 0,
  discount_pct numeric(5,2) DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  tag text,
  items jsonb NOT NULL DEFAULT '[]',
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_fnb_combos_shop ON public.fnb_combos(shop_id, sort_order);
ALTER TABLE public.fnb_combos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all_fnb_combos" ON public.fnb_combos
  USING (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()))
  WITH CHECK (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()));
CREATE POLICY "public_read_fnb_combos" ON public.fnb_combos FOR SELECT USING (is_active = true);

-- 2. Freelance Contracts
CREATE TABLE IF NOT EXISTS public.freelance_contracts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  client_name text NOT NULL,
  client_phone text,
  client_email text,
  project_name text NOT NULL,
  project_description text NOT NULL,
  total_value numeric(12,2) NOT NULL,
  start_date date NOT NULL,
  end_date date NOT NULL,
  deliverables text NOT NULL,
  revision_count int NOT NULL DEFAULT 2,
  payment_terms text NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  signed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_freelance_contracts_shop ON public.freelance_contracts(shop_id, created_at DESC);
ALTER TABLE public.freelance_contracts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all_freelance_contracts" ON public.freelance_contracts
  USING (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()))
  WITH CHECK (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()));

-- 3. Rental Units + Bookings
CREATE TABLE IF NOT EXISTS public.rental_units (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  unit_code text,
  category text,
  description text,
  condition text NOT NULL DEFAULT 'good' CHECK (condition IN ('excellent','good','fair','maintenance')),
  daily_price numeric(12,2),
  deposit_amount numeric(12,2),
  image_url text,
  is_active boolean NOT NULL DEFAULT true,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS public.rental_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  unit_id uuid NOT NULL REFERENCES public.rental_units(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  customer_name text NOT NULL,
  customer_phone text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','active','completed','cancelled')),
  notes text,
  total_days int GENERATED ALWAYS AS (end_date - start_date) STORED,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (end_date > start_date)
);
CREATE INDEX IF NOT EXISTS idx_rental_units_shop ON public.rental_units(shop_id);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_unit ON public.rental_bookings(unit_id, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_rental_bookings_shop ON public.rental_bookings(shop_id, start_date);
ALTER TABLE public.rental_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rental_bookings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all_rental_units" ON public.rental_units
  USING (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()))
  WITH CHECK (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()));
CREATE POLICY "owner_all_rental_bookings" ON public.rental_bookings
  USING (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()))
  WITH CHECK (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()));
CREATE POLICY "public_read_rental_units" ON public.rental_units FOR SELECT USING (is_active = true);
CREATE POLICY "public_insert_rental_booking" ON public.rental_bookings FOR INSERT WITH CHECK (true);

-- 4. Size Charts
CREATE TABLE IF NOT EXISTS public.shop_size_charts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  unit text NOT NULL DEFAULT 'cm',
  is_active boolean NOT NULL DEFAULT true,
  rows jsonb NOT NULL DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_shop_size_charts_shop ON public.shop_size_charts(shop_id);
ALTER TABLE public.shop_size_charts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all_size_charts" ON public.shop_size_charts
  USING (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()))
  WITH CHECK (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()));
CREATE POLICY "public_read_size_charts" ON public.shop_size_charts FOR SELECT USING (is_active = true);

-- 5. Studio Packages
CREATE TABLE IF NOT EXISTS public.studio_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  duration_minutes int NOT NULL DEFAULT 60,
  price numeric(12,2) NOT NULL DEFAULT 0,
  description text NOT NULL DEFAULT '',
  includes text[] NOT NULL DEFAULT '{}',
  max_capacity int NOT NULL DEFAULT 1,
  is_active boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_studio_packages_shop ON public.studio_packages(shop_id, sort_order);
ALTER TABLE public.studio_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "owner_all_studio_packages" ON public.studio_packages
  USING (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()))
  WITH CHECK (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()));
CREATE POLICY "public_read_studio_packages" ON public.studio_packages FOR SELECT USING (is_active = true);