
CREATE OR REPLACE FUNCTION public.is_shop_owner(_shop_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.shops s WHERE s.id = _shop_id AND s.owner_id = auth.uid());
$$;

-- Antrian
CREATE TABLE IF NOT EXISTS public.queue_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  session_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Jakarta')::date,
  is_active boolean NOT NULL DEFAULT true,
  avg_service_minutes int NOT NULL DEFAULT 10,
  current_number int NOT NULL DEFAULT 0,
  label text,
  started_at timestamptz NOT NULL DEFAULT now(),
  ended_at timestamptz
);
CREATE INDEX IF NOT EXISTS idx_queue_sessions_shop_date ON public.queue_sessions(shop_id, session_date);

CREATE TABLE IF NOT EXISTS public.queue_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.queue_sessions(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  queue_number int NOT NULL,
  customer_name text NOT NULL,
  customer_phone text,
  notes text,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','serving','done','skipped')),
  called_at timestamptz,
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_queue_entries_session ON public.queue_entries(session_id, queue_number);

-- Studio
CREATE TABLE IF NOT EXISTS public.studio_briefs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  client_name text NOT NULL, client_phone text, session_date date, package_name text,
  location_preference text, mood_vibe text, outfit_count int NOT NULL DEFAULT 1,
  reference_style text, special_requests text, props_needed text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','submitted','reviewed')),
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text,'-',''),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_studio_briefs_shop ON public.studio_briefs(shop_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.studio_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  client_name text NOT NULL, client_phone text, session_date date, package_name text,
  file_urls text[] NOT NULL DEFAULT '{}', drive_link text,
  download_token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text,'-',''),
  expires_at timestamptz, download_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'preparing' CHECK (status IN ('preparing','delivered','downloaded','expired')),
  notes text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_studio_deliveries_shop ON public.studio_deliveries(shop_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.studio_photo_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE DEFAULT replace(gen_random_uuid()::text,'-',''),
  client_name text NOT NULL, client_phone text, session_date date, package_name text,
  rating int NOT NULL DEFAULT 5 CHECK (rating BETWEEN 1 AND 5),
  comment text, photos text[] NOT NULL DEFAULT '{}',
  is_hidden boolean NOT NULL DEFAULT false, shop_reply text, shop_replied_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_studio_photo_reviews_shop ON public.studio_photo_reviews(shop_id, created_at DESC);

-- Klinik
CREATE TABLE IF NOT EXISTS public.medical_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  patient_name text NOT NULL, patient_dob date, doctor_name text,
  visit_date date NOT NULL DEFAULT current_date,
  diagnosis text, prescription text,
  items jsonb NOT NULL DEFAULT '[]', total numeric(14,2) NOT NULL DEFAULT 0,
  paid boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_medical_invoices_shop ON public.medical_invoices(shop_id, visit_date DESC);

CREATE TABLE IF NOT EXISTS public.anamnesis_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  booking_id uuid, patient_name text NOT NULL,
  chief_complaint text DEFAULT '', history text DEFAULT '',
  allergies text DEFAULT '', current_medications text DEFAULT '', vital_notes text DEFAULT '',
  submitted_at timestamptz NOT NULL DEFAULT now(), reviewed boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS idx_anamnesis_shop ON public.anamnesis_forms(shop_id, submitted_at DESC);

-- Digital
CREATE TABLE IF NOT EXISTS public.digital_licenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  product_id uuid REFERENCES public.menu_items(id) ON DELETE SET NULL,
  license_key text NOT NULL UNIQUE DEFAULT upper(substr(replace(gen_random_uuid()::text,'-',''),1,16)),
  license_type text NOT NULL DEFAULT 'personal' CHECK (license_type IN ('personal','commercial','extended')),
  download_count int NOT NULL DEFAULT 0, max_downloads int,
  last_downloaded_at timestamptz, is_active boolean NOT NULL DEFAULT true,
  customer_name text, order_no text, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_digital_licenses_shop ON public.digital_licenses(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_digital_licenses_order ON public.digital_licenses(order_id, product_id);

CREATE TABLE IF NOT EXISTS public.digital_download_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES public.digital_licenses(id) ON DELETE CASCADE,
  downloaded_at timestamptz NOT NULL DEFAULT now(),
  ip_address text, user_agent text
);
CREATE INDEX IF NOT EXISTS idx_digital_dl_logs_license ON public.digital_download_logs(license_id, downloaded_at DESC);

CREATE TABLE IF NOT EXISTS public.digital_product_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.menu_items(id) ON DELETE CASCADE,
  product_name text, version text NOT NULL, changelog text, file_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_digital_versions_shop ON public.digital_product_versions(shop_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.authenticity_certificates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  product_name text NOT NULL, edition text,
  serial_no text NOT NULL DEFAULT upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
  materials text, dimensions text, creation_year text,
  buyer_name text, sale_date date, notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, serial_no)
);
CREATE INDEX IF NOT EXISTS idx_authenticity_shop ON public.authenticity_certificates(shop_id, created_at DESC);

-- Kreatif
CREATE TABLE IF NOT EXISTS public.wip_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  title text NOT NULL, caption text, image_url text NOT NULL,
  stage text NOT NULL DEFAULT 'sketch',
  is_published boolean NOT NULL DEFAULT true, linked_product_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wip_shop ON public.wip_gallery(shop_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.shop_lookbook (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  title text, model_name text, tags text[] NOT NULL DEFAULT '{}',
  image_url text NOT NULL, is_published boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  linked_product_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lookbook_shop ON public.shop_lookbook(shop_id, sort_order, created_at DESC);

CREATE TABLE IF NOT EXISTS public.project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_name text NOT NULL, customer_phone text,
  project_name text NOT NULL, total_value numeric(14,2) NOT NULL DEFAULT 0,
  milestones jsonb NOT NULL DEFAULT '[]', status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_milestones_shop ON public.project_milestones(shop_id, status, created_at DESC);

CREATE TABLE IF NOT EXISTS public.limited_editions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL, description text,
  price numeric(14,2) NOT NULL DEFAULT 0,
  stock_total int NOT NULL DEFAULT 0, stock_sold int NOT NULL DEFAULT 0,
  image_url text, launch_date date, end_date date,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_limited_shop ON public.limited_editions(shop_id, created_at DESC);

-- Promo / engagement
CREATE TABLE IF NOT EXISTS public.shop_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_shop_follows_shop ON public.shop_follows(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_follows_user ON public.shop_follows(user_id);

CREATE TABLE IF NOT EXISTS public.happy_hour_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL, days_of_week int[] NOT NULL DEFAULT '{}',
  start_time time NOT NULL, end_time time NOT NULL,
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent','fixed')),
  discount_value numeric(12,2) NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_happy_hour_shop ON public.happy_hour_rules(shop_id, is_active);

CREATE TABLE IF NOT EXISTS public.wa_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  segment_label text NOT NULL, message_template text NOT NULL,
  recipient_count int NOT NULL DEFAULT 0, sent_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'done',
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_wa_broadcasts_shop ON public.wa_broadcasts(shop_id, created_at DESC);

-- Booking add-on / packages / vouchers / reschedule logs
CREATE TABLE IF NOT EXISTS public.booking_service_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL, description text,
  price numeric(12,2) NOT NULL DEFAULT 0, sort_order int NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#6366f1', is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bsp_shop ON public.booking_service_packages(shop_id, sort_order);

CREATE TABLE IF NOT EXISTS public.booking_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL, description text,
  price numeric(12,2) NOT NULL DEFAULT 0, sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_baddon_shop ON public.booking_addons(shop_id, sort_order);

CREATE TABLE IF NOT EXISTS public.booking_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  code text NOT NULL,
  discount_type text NOT NULL DEFAULT 'percent' CHECK (discount_type IN ('percent','fixed')),
  discount_value numeric(12,2) NOT NULL DEFAULT 0,
  min_slot_price numeric(12,2) NOT NULL DEFAULT 0,
  max_uses int, used_count int NOT NULL DEFAULT 0,
  valid_from date, valid_until date,
  description text, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, code)
);
CREATE INDEX IF NOT EXISTS idx_bvouchers_shop ON public.booking_vouchers(shop_id, is_active);

CREATE TABLE IF NOT EXISTS public.booking_reschedule_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  old_slot_id uuid REFERENCES public.booking_slots(id) ON DELETE SET NULL,
  new_slot_id uuid REFERENCES public.booking_slots(id) ON DELETE SET NULL,
  reason text, actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_breschedule_booking ON public.booking_reschedule_logs(booking_id, created_at DESC);

-- Rental checklist
CREATE TABLE IF NOT EXISTS public.rental_checklists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  booking_id uuid REFERENCES public.rental_bookings(id) ON DELETE SET NULL,
  unit_id uuid REFERENCES public.rental_units(id) ON DELETE SET NULL,
  type text NOT NULL CHECK (type IN ('before','after')),
  customer_name text NOT NULL, customer_phone text,
  odometer_km int, fuel_level text,
  items jsonb NOT NULL DEFAULT '[]',
  signature_data text, signed_by text, signed_at timestamptz,
  general_notes text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_rchecklist_shop ON public.rental_checklists(shop_id, created_at DESC);

-- Buyer ratings + order status logs
CREATE TABLE IF NOT EXISTS public.buyer_ratings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  rated_user_id uuid, customer_name text,
  rating int NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (order_id, shop_id)
);
CREATE INDEX IF NOT EXISTS idx_buyer_ratings_user ON public.buyer_ratings(rated_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buyer_ratings_shop ON public.buyer_ratings(shop_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.order_status_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL, note text, actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_status_logs_order ON public.order_status_logs(order_id, created_at);

-- RLS shop-scoped
DO $$
DECLARE
  t text;
  shop_scoped text[] := ARRAY[
    'queue_sessions','queue_entries','studio_briefs','studio_deliveries','studio_photo_reviews',
    'medical_invoices','anamnesis_forms','digital_licenses','digital_product_versions',
    'authenticity_certificates','wip_gallery','shop_lookbook','project_milestones','limited_editions',
    'happy_hour_rules','wa_broadcasts','booking_service_packages','booking_addons',
    'booking_vouchers','booking_reschedule_logs','rental_checklists','buyer_ratings'
  ];
BEGIN
  FOREACH t IN ARRAY shop_scoped LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_owner_all" ON public.%I', t, t);
    EXECUTE format($p$
      CREATE POLICY "%s_owner_all" ON public.%I
        FOR ALL TO authenticated
        USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role))
        WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
    $p$, t, t);
  END LOOP;
END $$;

ALTER TABLE public.digital_download_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dl_logs_owner_all" ON public.digital_download_logs;
CREATE POLICY "dl_logs_owner_all" ON public.digital_download_logs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.digital_licenses l WHERE l.id = license_id AND public.is_shop_owner(l.shop_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.digital_licenses l WHERE l.id = license_id));

ALTER TABLE public.order_status_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "osl_shop_all" ON public.order_status_logs;
CREATE POLICY "osl_shop_all" ON public.order_status_logs
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (public.is_shop_owner(o.shop_id) OR o.customer_user_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (public.is_shop_owner(o.shop_id) OR o.customer_user_id = auth.uid())));

ALTER TABLE public.shop_follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "follows_self_write" ON public.shop_follows;
DROP POLICY IF EXISTS "follows_public_count" ON public.shop_follows;
CREATE POLICY "follows_self_write" ON public.shop_follows
  FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "follows_public_count" ON public.shop_follows
  FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "wip_public_read" ON public.wip_gallery;
CREATE POLICY "wip_public_read" ON public.wip_gallery FOR SELECT TO anon, authenticated USING (is_published = true);

DROP POLICY IF EXISTS "lookbook_public_read" ON public.shop_lookbook;
CREATE POLICY "lookbook_public_read" ON public.shop_lookbook FOR SELECT TO anon, authenticated USING (is_published = true);

DROP POLICY IF EXISTS "studio_reviews_public_read" ON public.studio_photo_reviews;
CREATE POLICY "studio_reviews_public_read" ON public.studio_photo_reviews FOR SELECT TO anon, authenticated USING (is_hidden = false);

DROP POLICY IF EXISTS "buyer_ratings_self_read" ON public.buyer_ratings;
CREATE POLICY "buyer_ratings_self_read" ON public.buyer_ratings
  FOR SELECT TO authenticated USING (rated_user_id = auth.uid());

DROP POLICY IF EXISTS "limited_public_read" ON public.limited_editions;
CREATE POLICY "limited_public_read" ON public.limited_editions FOR SELECT TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "cert_public_read" ON public.authenticity_certificates;
CREATE POLICY "cert_public_read" ON public.authenticity_certificates FOR SELECT TO anon, authenticated USING (true);
