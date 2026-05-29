-- =============================================================================
-- FRESH SCHEMA — PART 6: Post-Consolidation Updates
-- Covers all changes added AFTER the base consolidation (00000000000000_init_schema.sql)
-- Migrations: 20260518 → 20260522 (29 migration files consolidated into one)
-- Run this file AFTER 01_core_schema.sql through 05_seed_reference_data.sql
-- All statements are idempotent (IF NOT EXISTS / OR REPLACE / ON CONFLICT DO NOTHING)
-- =============================================================================

SET statement_timeout = 0;
SET lock_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', 'public,storage', false);
SET check_function_bodies = false;
SET row_security = off;


-- =============================================================================
-- SECTION 1 — UPDATED/NEW HELPER FUNCTIONS (required before RLS policies)
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_shop_owner(_shop_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.shops s WHERE s.id = _shop_id AND s.owner_id = auth.uid());
$$;


-- =============================================================================
-- SECTION 2 — DROP LEGACY VIEWS (recreated as tables or updated views below)
-- =============================================================================

DROP VIEW IF EXISTS public.shop_health_score CASCADE;
DROP VIEW IF EXISTS public.courier_earnings CASCADE;
DROP VIEW IF EXISTS public.menu_hpp_view CASCADE;
DROP VIEW IF EXISTS public.v_shop_capabilities CASCADE;
DROP VIEW IF EXISTS public.coffee_shops CASCADE;


-- =============================================================================
-- SECTION 3 — ALTER EXISTING TABLES (add missing columns)
-- =============================================================================

-- orders: backward-compat generated columns
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS total_price numeric(12,2) GENERATED ALWAYS AS (total) STORED,
  ADD COLUMN IF NOT EXISTS total_amount numeric(12,2) GENERATED ALWAYS AS (total) STORED,
  ADD COLUMN IF NOT EXISTS order_number text GENERATED ALWAYS AS (order_no) STORED,
  ADD COLUMN IF NOT EXISTS commission_fee numeric(14,2) GENERATED ALWAYS AS (COALESCE(commission_amount, 0)) STORED;

-- product_reviews: admin moderation columns
ALTER TABLE public.product_reviews
  ADD COLUMN IF NOT EXISTS is_flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flag_reason text,
  ADD COLUMN IF NOT EXISTS body text GENERATED ALWAYS AS (comment) STORED;

-- shops: storefront + shipping + geo columns
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS custom_css text,
  ADD COLUMN IF NOT EXISTS shipping_origin_province_id integer,
  ADD COLUMN IF NOT EXISTS shipping_origin_city_id integer,
  ADD COLUMN IF NOT EXISTS shipping_couriers text[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS google_maps_url text;

-- outlets: geo coordinates
ALTER TABLE public.outlets
  ADD COLUMN IF NOT EXISTS latitude numeric,
  ADD COLUMN IF NOT EXISTS longitude numeric;

-- notifications: soft-dismiss support
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS dismissed_at timestamptz;

-- loyalty_rewards: enhanced columns
ALTER TABLE public.loyalty_rewards
  ADD COLUMN IF NOT EXISTS points_required integer,
  ADD COLUMN IF NOT EXISTS reward_item_id uuid,
  ADD COLUMN IF NOT EXISTS max_redemptions_per_customer integer,
  ADD COLUMN IF NOT EXISTS total_redemptions_limit integer,
  ADD COLUMN IF NOT EXISTS current_redemptions integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS valid_from timestamptz,
  ADD COLUMN IF NOT EXISTS valid_until timestamptz;
UPDATE public.loyalty_rewards SET points_required = COALESCE(points_required, cost_points) WHERE points_required IS NULL;

-- loyalty_redemptions: enhanced columns
ALTER TABLE public.loyalty_redemptions
  ADD COLUMN IF NOT EXISTS points_redeemed integer,
  ADD COLUMN IF NOT EXISTS order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL;
UPDATE public.loyalty_redemptions SET points_redeemed = COALESCE(points_redeemed, points_used) WHERE points_redeemed IS NULL;

-- referral_programs: enhanced columns
ALTER TABLE public.referral_programs
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS referrer_bonus_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referrer_bonus_rupiah numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referee_bonus_points integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referee_bonus_rupiah numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS min_order_value_for_bonus numeric,
  ADD COLUMN IF NOT EXISTS max_referrals_per_user integer;

-- referrals: enhanced columns
ALTER TABLE public.referrals
  ADD COLUMN IF NOT EXISTS program_id uuid REFERENCES public.referral_programs(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS referral_code text,
  ADD COLUMN IF NOT EXISTS converted_at timestamptz;
UPDATE public.referrals SET referral_code = COALESCE(referral_code, code) WHERE referral_code IS NULL;


-- =============================================================================
-- SECTION 4 — NEW TABLES
-- =============================================================================

-- ---- DISPUTE & WEBHOOK INFRA -----------------------------------------------

CREATE TABLE IF NOT EXISTS public.disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id uuid,
  status text NOT NULL DEFAULT 'open',
  reason text,
  description text,
  refund_amount numeric(14,2),
  resolution text,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.webhook_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL,
  event_type text,
  status text NOT NULL DEFAULT 'received',
  payload jsonb,
  response jsonb,
  error_message text,
  attempts integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  processed_at timestamptz
);

-- ---- BROADCAST & BANK ACCOUNTS ---------------------------------------------

CREATE TABLE IF NOT EXISTS public.buyer_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  target text NOT NULL DEFAULT 'all',
  channel text NOT NULL DEFAULT 'in_app',
  sent_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'draft',
  sent_at timestamptz,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shop_bank_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  bank_name text NOT NULL,
  account_number text NOT NULL,
  account_holder text NOT NULL,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---- QUEUE (antrian) --------------------------------------------------------

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

CREATE TABLE IF NOT EXISTS public.queue_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES public.queue_sessions(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  queue_number int NOT NULL,
  customer_name text NOT NULL,
  customer_phone text,
  notes text,
  status text NOT NULL DEFAULT 'waiting' CHECK (status IN ('waiting','serving','done','skipped','called')),
  called_at timestamptz,
  done_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- STUDIO -----------------------------------------------------------------

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

-- ---- KLINIK -----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.medical_invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  patient_name text NOT NULL, patient_dob date, doctor_name text,
  visit_date date NOT NULL DEFAULT current_date,
  diagnosis text, prescription text,
  items jsonb NOT NULL DEFAULT '[]', total numeric(14,2) NOT NULL DEFAULT 0,
  paid boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.anamnesis_forms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  booking_id uuid, patient_name text NOT NULL,
  chief_complaint text DEFAULT '', history text DEFAULT '',
  allergies text DEFAULT '', current_medications text DEFAULT '', vital_notes text DEFAULT '',
  submitted_at timestamptz NOT NULL DEFAULT now(), reviewed boolean NOT NULL DEFAULT false
);

-- ---- DIGITAL PRODUCTS -------------------------------------------------------

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

CREATE TABLE IF NOT EXISTS public.digital_download_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  license_id uuid NOT NULL REFERENCES public.digital_licenses(id) ON DELETE CASCADE,
  downloaded_at timestamptz NOT NULL DEFAULT now(),
  ip_address text, user_agent text
);

CREATE TABLE IF NOT EXISTS public.digital_product_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  product_id uuid REFERENCES public.menu_items(id) ON DELETE CASCADE,
  product_name text, version text NOT NULL, changelog text, file_url text,
  created_at timestamptz NOT NULL DEFAULT now()
);

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

-- ---- KREATIF ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.wip_gallery (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  title text NOT NULL, caption text, image_url text NOT NULL,
  stage text NOT NULL DEFAULT 'sketch',
  is_published boolean NOT NULL DEFAULT true, linked_product_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shop_lookbook (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  title text, model_name text, tags text[] NOT NULL DEFAULT '{}',
  image_url text NOT NULL, is_published boolean NOT NULL DEFAULT true,
  sort_order int NOT NULL DEFAULT 0,
  linked_product_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.project_milestones (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  customer_name text NOT NULL, customer_phone text,
  project_name text NOT NULL, total_value numeric(14,2) NOT NULL DEFAULT 0,
  milestones jsonb NOT NULL DEFAULT '[]', status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

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

-- ---- PROMO & ENGAGEMENT ----------------------------------------------------

CREATE TABLE IF NOT EXISTS public.shop_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, user_id)
);

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

CREATE TABLE IF NOT EXISTS public.wa_broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  segment_label text NOT NULL, message_template text NOT NULL,
  recipient_count int NOT NULL DEFAULT 0, sent_count int NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'done',
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- BOOKING ADD-ONS --------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.booking_service_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL, description text,
  price numeric(12,2) NOT NULL DEFAULT 0, sort_order int NOT NULL DEFAULT 0,
  color text NOT NULL DEFAULT '#6366f1', is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.booking_addons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL, description text,
  price numeric(12,2) NOT NULL DEFAULT 0, sort_order int NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

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

CREATE TABLE IF NOT EXISTS public.booking_reschedule_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  old_slot_id uuid REFERENCES public.booking_slots(id) ON DELETE SET NULL,
  new_slot_id uuid REFERENCES public.booking_slots(id) ON DELETE SET NULL,
  reason text, actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- RENTAL CHECKLIST -------------------------------------------------------

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

-- ---- BUYER RATINGS & ORDER STATUS LOGS -------------------------------------

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

CREATE TABLE IF NOT EXISTS public.order_status_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  status text NOT NULL, note text, actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- LOYALTY & REFERRAL (full schema including tiers) -----------------------

CREATE TABLE IF NOT EXISTS public.loyalty_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL, min_points integer NOT NULL DEFAULT 0,
  multiplier numeric NOT NULL DEFAULT 1, color text,
  perks jsonb NOT NULL DEFAULT '[]'::jsonb, sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.loyalty_analytics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  date date NOT NULL,
  new_members integer NOT NULL DEFAULT 0,
  points_issued integer NOT NULL DEFAULT 0,
  points_redeemed integer NOT NULL DEFAULT 0,
  rewards_claimed integer NOT NULL DEFAULT 0,
  referral_signups integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, date)
);

-- ---- CASHBACK ---------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.cashback_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance numeric NOT NULL DEFAULT 0,
  total_earned numeric NOT NULL DEFAULT 0,
  total_redeemed numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cashback_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  shop_id uuid REFERENCES public.shops(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  amount numeric NOT NULL, type text NOT NULL, description text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- TABLES & RESERVATIONS --------------------------------------------------

CREATE TABLE IF NOT EXISTS public.tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  outlet_id uuid REFERENCES public.outlets(id) ON DELETE SET NULL,
  label text NOT NULL, capacity integer NOT NULL DEFAULT 2, zone text,
  is_active boolean NOT NULL DEFAULT true, qr_token text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.table_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  outlet_id uuid REFERENCES public.outlets(id) ON DELETE SET NULL,
  name text NOT NULL, layout jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reservation_settings (
  shop_id uuid PRIMARY KEY REFERENCES public.shops(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT false, slot_minutes integer NOT NULL DEFAULT 60,
  min_party_size integer NOT NULL DEFAULT 1, max_party_size integer NOT NULL DEFAULT 10,
  buffer_minutes integer NOT NULL DEFAULT 15, deposit_required boolean NOT NULL DEFAULT false,
  deposit_amount numeric NOT NULL DEFAULT 0, advance_days integer NOT NULL DEFAULT 30,
  open_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reservation_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  slot_date date NOT NULL, slot_time time NOT NULL,
  capacity integer NOT NULL DEFAULT 10, booked integer NOT NULL DEFAULT 0,
  is_blocked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  outlet_id uuid REFERENCES public.outlets(id) ON DELETE SET NULL,
  table_id uuid REFERENCES public.tables(id) ON DELETE SET NULL,
  slot_id uuid REFERENCES public.reservation_slots(id) ON DELETE SET NULL,
  user_id uuid, customer_name text NOT NULL,
  customer_phone text, customer_email text,
  party_size integer NOT NULL DEFAULT 1,
  reserved_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  deposit_amount numeric NOT NULL DEFAULT 0,
  deposit_paid boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---- RETURNS ----------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.return_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE SET NULL,
  user_id uuid NOT NULL, reason text NOT NULL, description text,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending', resolution text, refund_amount numeric,
  resolved_by uuid, resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- ---- THIRD-PARTY INTEGRATIONS & API -----------------------------------------

CREATE TABLE IF NOT EXISTS public.third_party_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  provider text NOT NULL, name text, config jsonb NOT NULL DEFAULT '{}'::jsonb,
  credentials_encrypted text, status text NOT NULL DEFAULT 'inactive',
  last_sync_at timestamptz, last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.integration_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.third_party_integrations(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  local_type text NOT NULL, local_id uuid, remote_id text NOT NULL, data jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.integration_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.third_party_integrations(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  event text NOT NULL, payload jsonb, signature text,
  status text NOT NULL DEFAULT 'received', error text,
  received_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL, key_prefix text NOT NULL, key_hash text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}',
  rate_limit_per_minute integer NOT NULL DEFAULT 60,
  is_active boolean NOT NULL DEFAULT true, last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.api_usage (
  id bigserial PRIMARY KEY,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  endpoint text NOT NULL, method text NOT NULL,
  status_code integer, duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shop_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  provider text NOT NULL,
  api_key text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_id, provider)
);

-- ---- SUPER ADMIN ------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE, display_name text,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true, invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE, code text NOT NULL UNIQUE,
  display_name text, email text,
  commission_rate numeric NOT NULL DEFAULT 0.05,
  total_clicks integer NOT NULL DEFAULT 0,
  total_signups integer NOT NULL DEFAULT 0,
  total_commission numeric NOT NULL DEFAULT 0,
  paid_commission numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.data_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, request_type text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  notes text, result_url text, processed_by uuid, processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shop_health_score (
  shop_id uuid PRIMARY KEY REFERENCES public.shops(id) ON DELETE CASCADE,
  overall_score integer NOT NULL DEFAULT 0, sla_score integer NOT NULL DEFAULT 0,
  fulfillment_score integer NOT NULL DEFAULT 0, rating_score integer NOT NULL DEFAULT 0,
  complaint_score integer NOT NULL DEFAULT 0,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now()
);

-- ---- KLINIK ADD-ONS ---------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.shop_skin_quiz (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id uuid, customer_name text, customer_phone text,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  skin_type text, concerns text[], recommended_products jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.shop_product_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE CASCADE,
  claim_type text NOT NULL, claim_value text, certificate_url text, expires_at date,
  is_verified boolean NOT NULL DEFAULT false,
  verified_by uuid, verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- EMAIL CAMPAIGNS --------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL, subject text NOT NULL,
  body_html text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','sent','failed')),
  scheduled_at timestamptz, sent_at timestamptz,
  recipient_count integer NOT NULL DEFAULT 0,
  segment text, created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.email_campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id uuid,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','bounced')),
  sent_at timestamptz, error text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- ---- STOREFRONT LAYOUT ------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.storefront_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL UNIQUE REFERENCES public.shops(id) ON DELETE CASCADE,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);


-- =============================================================================
-- SECTION 5 — NEW INDEXES
-- =============================================================================

CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status_created ON public.webhook_logs(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shop_bank_accounts_shop ON public.shop_bank_accounts(shop_id);
CREATE UNIQUE INDEX IF NOT EXISTS uniq_shop_bank_primary ON public.shop_bank_accounts(shop_id) WHERE is_primary = true;
CREATE INDEX IF NOT EXISTS idx_queue_sessions_shop_date ON public.queue_sessions(shop_id, session_date);
CREATE INDEX IF NOT EXISTS idx_queue_entries_session ON public.queue_entries(session_id, queue_number);
CREATE INDEX IF NOT EXISTS idx_studio_briefs_shop ON public.studio_briefs(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_studio_deliveries_shop ON public.studio_deliveries(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_studio_photo_reviews_shop ON public.studio_photo_reviews(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_medical_invoices_shop ON public.medical_invoices(shop_id, visit_date DESC);
CREATE INDEX IF NOT EXISTS idx_anamnesis_shop ON public.anamnesis_forms(shop_id, submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_digital_licenses_shop ON public.digital_licenses(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_digital_licenses_order ON public.digital_licenses(order_id, product_id);
CREATE INDEX IF NOT EXISTS idx_digital_dl_logs_license ON public.digital_download_logs(license_id, downloaded_at DESC);
CREATE INDEX IF NOT EXISTS idx_digital_versions_shop ON public.digital_product_versions(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_authenticity_shop ON public.authenticity_certificates(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_wip_shop ON public.wip_gallery(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_lookbook_shop ON public.shop_lookbook(shop_id, sort_order, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_milestones_shop ON public.project_milestones(shop_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_limited_shop ON public.limited_editions(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shop_follows_shop ON public.shop_follows(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_follows_user ON public.shop_follows(user_id);
CREATE INDEX IF NOT EXISTS idx_happy_hour_shop ON public.happy_hour_rules(shop_id, is_active);
CREATE INDEX IF NOT EXISTS idx_wa_broadcasts_shop ON public.wa_broadcasts(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bsp_shop ON public.booking_service_packages(shop_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_baddon_shop ON public.booking_addons(shop_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_bvouchers_shop ON public.booking_vouchers(shop_id, is_active);
CREATE INDEX IF NOT EXISTS idx_breschedule_booking ON public.booking_reschedule_logs(booking_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rchecklist_shop ON public.rental_checklists(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buyer_ratings_user ON public.buyer_ratings(rated_user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_buyer_ratings_shop ON public.buyer_ratings(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_status_logs_order ON public.order_status_logs(order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_loyalty_tiers_shop ON public.loyalty_tiers(shop_id);
CREATE INDEX IF NOT EXISTS idx_ctx_user ON public.cashback_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_tables_shop ON public.tables(shop_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_rslots ON public.reservation_slots(shop_id, slot_date, slot_time);
CREATE INDEX IF NOT EXISTS idx_resv_shop_date ON public.reservations(shop_id, reserved_at);
CREATE INDEX IF NOT EXISTS idx_resv_user ON public.reservations(user_id);
CREATE INDEX IF NOT EXISTS idx_ret_shop ON public.return_requests(shop_id);
CREATE INDEX IF NOT EXISTS idx_ret_user ON public.return_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_tpi_shop ON public.third_party_integrations(shop_id);
CREATE INDEX IF NOT EXISTS idx_imap_shop ON public.integration_mappings(shop_id);
CREATE INDEX IF NOT EXISTS idx_iwh_shop ON public.integration_webhooks(shop_id);
CREATE INDEX IF NOT EXISTS idx_apik_shop ON public.api_keys(shop_id);
CREATE INDEX IF NOT EXISTS idx_apiu_shop_time ON public.api_usage(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_shop_api_keys_shop ON public.shop_api_keys(shop_id);
CREATE INDEX IF NOT EXISTS idx_dr_user ON public.data_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_sq_shop ON public.shop_skin_quiz(shop_id);
CREATE INDEX IF NOT EXISTS idx_spc_shop ON public.shop_product_claims(shop_id);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_shop ON public.email_campaigns(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_email_recipients_campaign ON public.email_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_recipients_shop ON public.email_campaign_recipients(shop_id);
CREATE UNIQUE INDEX IF NOT EXISTS uq_refprog_shop ON public.referral_programs(shop_id);
CREATE INDEX IF NOT EXISTS idx_refer_referrer ON public.referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_refer_code ON public.referrals(code);
CREATE INDEX IF NOT EXISTS notifications_recipient_active_idx ON public.notifications(recipient_user_id, created_at DESC) WHERE dismissed_at IS NULL;
CREATE INDEX IF NOT EXISTS shops_geo_idx ON public.shops(latitude, longitude) WHERE latitude IS NOT NULL AND longitude IS NOT NULL;


-- =============================================================================
-- SECTION 6 — MISSING FK CONSTRAINTS (idempotent)
-- =============================================================================

DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.ad_requests ADD CONSTRAINT ad_requests_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.booking_review_requests ADD CONSTRAINT booking_review_requests_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.booking_reviews ADD CONSTRAINT booking_reviews_booking_id_fkey FOREIGN KEY (booking_id) REFERENCES public.bookings(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.booking_reviews ADD CONSTRAINT booking_reviews_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.booking_slots ADD CONSTRAINT booking_slots_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.booking_waitlist ADD CONSTRAINT booking_waitlist_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.booking_waitlist ADD CONSTRAINT booking_waitlist_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.booking_slots(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.bookings ADD CONSTRAINT bookings_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.bookings ADD CONSTRAINT bookings_slot_id_fkey FOREIGN KEY (slot_id) REFERENCES public.booking_slots(id) ON DELETE RESTRICT'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.bulk_pricing_rules ADD CONSTRAINT bulk_pricing_rules_menu_item_id_fkey FOREIGN KEY (menu_item_id) REFERENCES public.menu_items(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.bulk_pricing_rules ADD CONSTRAINT bulk_pricing_rules_shop_id_fkey FOREIGN KEY (shop_id) REFERENCES public.shops(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.shops ADD CONSTRAINT coffee_shops_business_category_id_fkey FOREIGN KEY (business_category_id) REFERENCES public.business_categories(id)'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.shops ADD CONSTRAINT coffee_shops_owner_id_fkey FOREIGN KEY (owner_id) REFERENCES auth.users(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.loyalty_redemptions ADD CONSTRAINT loyalty_redemptions_reward_id_fkey FOREIGN KEY (reward_id) REFERENCES public.loyalty_rewards(id) ON DELETE SET NULL'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.user_preferences ADD CONSTRAINT user_preferences_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN EXECUTE 'ALTER TABLE ONLY public.user_roles ADD CONSTRAINT user_roles_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE'; EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- =============================================================================
-- SECTION 7 — RLS POLICIES (enable + drop-then-create for idempotency)
-- =============================================================================

-- ---- disputes ---------------------------------------------------------------
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_disputes" ON public.disputes;
CREATE POLICY "admin_manage_disputes" ON public.disputes FOR ALL USING (public.has_role(auth.uid(),'super_admin'::public.app_role)) WITH CHECK (public.has_role(auth.uid(),'super_admin'::public.app_role));
DROP POLICY IF EXISTS "shop_owner_view_disputes" ON public.disputes;
CREATE POLICY "shop_owner_view_disputes" ON public.disputes FOR SELECT USING (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = disputes.shop_id AND s.owner_id = auth.uid()));
DROP POLICY IF EXISTS "customer_view_own_disputes" ON public.disputes;
CREATE POLICY "customer_view_own_disputes" ON public.disputes FOR SELECT USING (auth.uid() = user_id);

-- ---- webhook_logs -----------------------------------------------------------
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_view_webhook_logs" ON public.webhook_logs;
CREATE POLICY "admin_view_webhook_logs" ON public.webhook_logs FOR SELECT USING (public.has_role(auth.uid(),'super_admin'::public.app_role));
DROP POLICY IF EXISTS "service_role_insert_webhook_logs" ON public.webhook_logs;
CREATE POLICY "service_role_insert_webhook_logs" ON public.webhook_logs FOR INSERT WITH CHECK (true);

-- ---- buyer_broadcasts -------------------------------------------------------
ALTER TABLE public.buyer_broadcasts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "buyer_broadcasts_admin_all" ON public.buyer_broadcasts;
CREATE POLICY "buyer_broadcasts_admin_all" ON public.buyer_broadcasts FOR ALL TO authenticated USING (public.has_role(auth.uid(),'super_admin')) WITH CHECK (public.has_role(auth.uid(),'super_admin'));

-- ---- shop_bank_accounts -----------------------------------------------------
ALTER TABLE public.shop_bank_accounts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shop_bank_accounts_owner_select" ON public.shop_bank_accounts;
CREATE POLICY "shop_bank_accounts_owner_select" ON public.shop_bank_accounts FOR SELECT USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'));
DROP POLICY IF EXISTS "shop_bank_accounts_owner_insert" ON public.shop_bank_accounts;
CREATE POLICY "shop_bank_accounts_owner_insert" ON public.shop_bank_accounts FOR INSERT WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'));
DROP POLICY IF EXISTS "shop_bank_accounts_owner_update" ON public.shop_bank_accounts;
CREATE POLICY "shop_bank_accounts_owner_update" ON public.shop_bank_accounts FOR UPDATE USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'));
DROP POLICY IF EXISTS "shop_bank_accounts_owner_delete" ON public.shop_bank_accounts;
CREATE POLICY "shop_bank_accounts_owner_delete" ON public.shop_bank_accounts FOR DELETE USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'));

-- ---- user_roles extra policies (owner can manage own shop staff) ------------
DROP POLICY IF EXISTS "user_roles_owner_insert" ON public.user_roles;
CREATE POLICY "user_roles_owner_insert" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (shop_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.shops s WHERE s.id = user_roles.shop_id AND s.owner_id = auth.uid()));
DROP POLICY IF EXISTS "user_roles_owner_update" ON public.user_roles;
CREATE POLICY "user_roles_owner_update" ON public.user_roles FOR UPDATE TO authenticated USING (shop_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.shops s WHERE s.id = user_roles.shop_id AND s.owner_id = auth.uid())) WITH CHECK (shop_id IS NOT NULL AND EXISTS (SELECT 1 FROM public.shops s WHERE s.id = user_roles.shop_id AND s.owner_id = auth.uid()));

-- ---- shop-scoped tables (bulk RLS via loop) ---------------------------------
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'queue_sessions','queue_entries','studio_briefs','studio_deliveries','studio_photo_reviews',
    'medical_invoices','anamnesis_forms','digital_licenses','digital_product_versions',
    'authenticity_certificates','wip_gallery','shop_lookbook','project_milestones','limited_editions',
    'happy_hour_rules','wa_broadcasts','booking_service_packages','booking_addons',
    'booking_vouchers','booking_reschedule_logs','rental_checklists','buyer_ratings',
    'shop_api_keys','email_campaigns','email_campaign_recipients','storefront_layouts'
  ] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS "%s_owner_all" ON public.%I', t, t);
    EXECUTE format($p$
      CREATE POLICY "%s_owner_all" ON public.%I FOR ALL TO authenticated
        USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role))
        WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role))
    $p$, t, t);
  END LOOP;
END $$;

-- ---- order_status_logs ------------------------------------------------------
ALTER TABLE public.order_status_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "osl_shop_all" ON public.order_status_logs;
CREATE POLICY "osl_shop_all" ON public.order_status_logs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (public.is_shop_owner(o.shop_id) OR o.customer_user_id = auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.orders o WHERE o.id = order_id AND (public.is_shop_owner(o.shop_id) OR o.customer_user_id = auth.uid())));

-- ---- digital_download_logs --------------------------------------------------
ALTER TABLE public.digital_download_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dl_logs_owner_all" ON public.digital_download_logs;
CREATE POLICY "dl_logs_owner_all" ON public.digital_download_logs FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.digital_licenses l WHERE l.id = license_id AND public.is_shop_owner(l.shop_id)))
  WITH CHECK (EXISTS (SELECT 1 FROM public.digital_licenses l WHERE l.id = license_id));

-- ---- shop_follows -----------------------------------------------------------
ALTER TABLE public.shop_follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "follows_self_write" ON public.shop_follows;
CREATE POLICY "follows_self_write" ON public.shop_follows FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS "follows_public_count" ON public.shop_follows;
CREATE POLICY "follows_public_count" ON public.shop_follows FOR SELECT TO anon, authenticated USING (true);

-- ---- public read overrides --------------------------------------------------
DROP POLICY IF EXISTS "wip_public_read" ON public.wip_gallery;
CREATE POLICY "wip_public_read" ON public.wip_gallery FOR SELECT TO anon, authenticated USING (is_published = true);
DROP POLICY IF EXISTS "lookbook_public_read" ON public.shop_lookbook;
CREATE POLICY "lookbook_public_read" ON public.shop_lookbook FOR SELECT TO anon, authenticated USING (is_published = true);
DROP POLICY IF EXISTS "studio_reviews_public_read" ON public.studio_photo_reviews;
CREATE POLICY "studio_reviews_public_read" ON public.studio_photo_reviews FOR SELECT TO anon, authenticated USING (is_hidden = false);
DROP POLICY IF EXISTS "buyer_ratings_self_read" ON public.buyer_ratings;
CREATE POLICY "buyer_ratings_self_read" ON public.buyer_ratings FOR SELECT TO authenticated USING (rated_user_id = auth.uid());
DROP POLICY IF EXISTS "limited_public_read" ON public.limited_editions;
CREATE POLICY "limited_public_read" ON public.limited_editions FOR SELECT TO anon, authenticated USING (is_active = true);
DROP POLICY IF EXISTS "cert_public_read" ON public.authenticity_certificates;
CREATE POLICY "cert_public_read" ON public.authenticity_certificates FOR SELECT TO anon, authenticated USING (true);
DROP POLICY IF EXISTS "storefront_layouts_public_read" ON public.storefront_layouts;
CREATE POLICY "storefront_layouts_public_read" ON public.storefront_layouts FOR SELECT TO anon, authenticated USING (is_published = true);

-- ---- loyalty_tiers ----------------------------------------------------------
ALTER TABLE public.loyalty_tiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lt owner" ON public.loyalty_tiers;
CREATE POLICY "lt owner" ON public.loyalty_tiers USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "lt public" ON public.loyalty_tiers;
CREATE POLICY "lt public" ON public.loyalty_tiers FOR SELECT USING (is_active);

-- ---- loyalty_rewards (update existing) -------------------------------------
DROP POLICY IF EXISTS "lr owner" ON public.loyalty_rewards;
CREATE POLICY "lr owner" ON public.loyalty_rewards USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "lr public" ON public.loyalty_rewards;
CREATE POLICY "lr public" ON public.loyalty_rewards FOR SELECT USING (is_active);
DROP POLICY IF EXISTS "lr public read" ON public.loyalty_rewards;

-- ---- loyalty_redemptions (update existing) ----------------------------------
DROP POLICY IF EXISTS "lred owner" ON public.loyalty_redemptions;
CREATE POLICY "lred owner" ON public.loyalty_redemptions USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "lred self r" ON public.loyalty_redemptions;
CREATE POLICY "lred self r" ON public.loyalty_redemptions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "lred self i" ON public.loyalty_redemptions;
CREATE POLICY "lred self i" ON public.loyalty_redemptions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- ---- loyalty_analytics ------------------------------------------------------
ALTER TABLE public.loyalty_analytics ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "la owner" ON public.loyalty_analytics;
CREATE POLICY "la owner" ON public.loyalty_analytics USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));

-- ---- referral_programs (update existing) ------------------------------------
DROP POLICY IF EXISTS "rp owner" ON public.referral_programs;
CREATE POLICY "rp owner" ON public.referral_programs USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "rp public" ON public.referral_programs;
CREATE POLICY "rp public" ON public.referral_programs FOR SELECT USING (is_active);
DROP POLICY IF EXISTS "rp public read" ON public.referral_programs;

-- ---- referrals (update existing) --------------------------------------------
DROP POLICY IF EXISTS "ref owner" ON public.referrals;
DROP POLICY IF EXISTS "ref read" ON public.referrals;
CREATE POLICY "ref read" ON public.referrals FOR SELECT USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role) OR auth.uid()=referrer_user_id OR auth.uid()=referee_user_id);
DROP POLICY IF EXISTS "ref ins" ON public.referrals;
CREATE POLICY "ref ins" ON public.referrals FOR INSERT WITH CHECK (auth.uid()=referrer_user_id);

-- ---- cashback ---------------------------------------------------------------
ALTER TABLE public.cashback_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cw self" ON public.cashback_wallets;
CREATE POLICY "cw self" ON public.cashback_wallets USING (auth.uid()=user_id OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (auth.uid()=user_id);
ALTER TABLE public.cashback_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ctx read" ON public.cashback_transactions;
CREATE POLICY "ctx read" ON public.cashback_transactions FOR SELECT USING (auth.uid()=user_id OR public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "ctx ins" ON public.cashback_transactions;
CREATE POLICY "ctx ins" ON public.cashback_transactions FOR INSERT WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));

-- ---- tables & reservations --------------------------------------------------
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "t owner" ON public.tables;
CREATE POLICY "t owner" ON public.tables USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "t public" ON public.tables;
CREATE POLICY "t public" ON public.tables FOR SELECT USING (is_active);
ALTER TABLE public.table_maps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm owner" ON public.table_maps;
CREATE POLICY "tm owner" ON public.table_maps USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
ALTER TABLE public.reservation_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rs owner" ON public.reservation_settings;
CREATE POLICY "rs owner" ON public.reservation_settings USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "rs public" ON public.reservation_settings;
CREATE POLICY "rs public" ON public.reservation_settings FOR SELECT USING (is_enabled);
ALTER TABLE public.reservation_slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rslots owner" ON public.reservation_slots;
CREATE POLICY "rslots owner" ON public.reservation_slots USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "rslots public" ON public.reservation_slots;
CREATE POLICY "rslots public" ON public.reservation_slots FOR SELECT USING (true);
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "resv owner" ON public.reservations;
CREATE POLICY "resv owner" ON public.reservations USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "resv self r" ON public.reservations;
CREATE POLICY "resv self r" ON public.reservations FOR SELECT USING (auth.uid()=user_id);
DROP POLICY IF EXISTS "resv self i" ON public.reservations;
CREATE POLICY "resv self i" ON public.reservations FOR INSERT WITH CHECK (auth.uid()=user_id OR user_id IS NULL);

-- ---- return_requests --------------------------------------------------------
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ret owner" ON public.return_requests;
CREATE POLICY "ret owner" ON public.return_requests USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "ret self r" ON public.return_requests;
CREATE POLICY "ret self r" ON public.return_requests FOR SELECT USING (auth.uid()=user_id);
DROP POLICY IF EXISTS "ret self i" ON public.return_requests;
CREATE POLICY "ret self i" ON public.return_requests FOR INSERT WITH CHECK (auth.uid()=user_id);

-- ---- third-party & API ------------------------------------------------------
ALTER TABLE public.third_party_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tpi" ON public.third_party_integrations;
CREATE POLICY "tpi" ON public.third_party_integrations USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
ALTER TABLE public.integration_mappings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "imap" ON public.integration_mappings;
CREATE POLICY "imap" ON public.integration_mappings USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
ALTER TABLE public.integration_webhooks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "iwh" ON public.integration_webhooks;
CREATE POLICY "iwh" ON public.integration_webhooks FOR SELECT USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "apik" ON public.api_keys;
CREATE POLICY "apik" ON public.api_keys USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "apiu" ON public.api_usage;
CREATE POLICY "apiu" ON public.api_usage FOR SELECT USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));

-- ---- super admin ------------------------------------------------------------
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "au sa" ON public.admin_users;
CREATE POLICY "au sa" ON public.admin_users USING (public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'super_admin'::app_role));
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "aff" ON public.affiliates;
CREATE POLICY "aff" ON public.affiliates USING (public.has_role(auth.uid(),'super_admin'::app_role) OR auth.uid()=user_id) WITH CHECK (public.has_role(auth.uid(),'super_admin'::app_role) OR auth.uid()=user_id);
ALTER TABLE public.data_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dr self" ON public.data_requests;
CREATE POLICY "dr self" ON public.data_requests USING (auth.uid()=user_id OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (auth.uid()=user_id);
DROP POLICY IF EXISTS "dr admin upd" ON public.data_requests;
CREATE POLICY "dr admin upd" ON public.data_requests FOR UPDATE USING (public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'super_admin'::app_role));
ALTER TABLE public.shop_health_score ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shs" ON public.shop_health_score;
CREATE POLICY "shs" ON public.shop_health_score USING (public.has_role(auth.uid(),'super_admin'::app_role) OR public.is_shop_owner(shop_id)) WITH CHECK (public.has_role(auth.uid(),'super_admin'::app_role));

-- ---- skin quiz & product claims ---------------------------------------------
ALTER TABLE public.shop_skin_quiz ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sq r" ON public.shop_skin_quiz;
CREATE POLICY "sq r" ON public.shop_skin_quiz FOR SELECT USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role) OR auth.uid()=user_id);
DROP POLICY IF EXISTS "sq i" ON public.shop_skin_quiz;
CREATE POLICY "sq i" ON public.shop_skin_quiz FOR INSERT WITH CHECK (true);
ALTER TABLE public.shop_product_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "spc owner" ON public.shop_product_claims;
CREATE POLICY "spc owner" ON public.shop_product_claims USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "spc pub" ON public.shop_product_claims;
CREATE POLICY "spc pub" ON public.shop_product_claims FOR SELECT USING (is_verified);

-- ---- storage policy fixes ---------------------------------------------------
DROP POLICY IF EXISTS "public read rental-inspections" ON storage.objects;
DROP POLICY IF EXISTS "public read treatment-photos" ON storage.objects;
DROP POLICY IF EXISTS "public_read_contract_signatures" ON storage.objects;

DROP POLICY IF EXISTS "owner_list_rental_inspections" ON storage.objects;
CREATE POLICY "owner_list_rental_inspections" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'rental-inspections' AND (storage.foldername(name))[1] IN (SELECT (s.id)::text FROM public.shops s WHERE s.owner_id = auth.uid()));
DROP POLICY IF EXISTS "owner_list_treatment_photos" ON storage.objects;
CREATE POLICY "owner_list_treatment_photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'treatment-photos' AND (storage.foldername(name))[1] IN (SELECT (s.id)::text FROM public.shops s WHERE s.owner_id = auth.uid()));
DROP POLICY IF EXISTS "owner_list_contract_signatures" ON storage.objects;
CREATE POLICY "owner_list_contract_signatures" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'contract-signatures' AND (storage.foldername(name))[1] IN (SELECT (s.id)::text FROM public.shops s WHERE s.owner_id = auth.uid()));


-- =============================================================================
-- SECTION 8 — VIEWS
-- =============================================================================

CREATE OR REPLACE VIEW public.shops__bootstrap_placeholder WITH (security_invoker = true) AS SELECT * FROM public.shops;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shops__bootstrap_placeholder TO authenticated, service_role;
GRANT SELECT ON public.shops__bootstrap_placeholder TO anon;

CREATE VIEW public.courier_earnings WITH (security_invoker=on) AS
SELECT o.courier_id, o.shop_id,
  date_trunc('day', COALESCE(o.delivered_at, o.created_at))::date AS earning_date,
  count(*) AS deliveries,
  COALESCE(sum(o.delivery_fee),0) AS total_fee,
  COALESCE(sum(o.tip_amount),0) AS total_tip,
  COALESCE(sum(o.delivery_fee + COALESCE(o.tip_amount,0)),0) AS total_earnings
FROM public.orders o WHERE o.courier_id IS NOT NULL
GROUP BY o.courier_id, o.shop_id, date_trunc('day', COALESCE(o.delivered_at, o.created_at));

CREATE VIEW public.menu_hpp_view WITH (security_invoker=on) AS
SELECT mi.id AS menu_item_id, mi.shop_id, mi.name, mi.price,
  COALESCE(sum(r.quantity * i.cost_per_unit), 0) AS hpp,
  CASE WHEN mi.price > 0
    THEN ROUND(((mi.price - COALESCE(sum(r.quantity * i.cost_per_unit),0)) / mi.price * 100)::numeric, 2)
    ELSE 0 END AS margin_percent
FROM public.menu_items mi
LEFT JOIN public.recipes r ON r.menu_item_id = mi.id
LEFT JOIN public.ingredients i ON i.id = r.ingredient_id
GROUP BY mi.id, mi.shop_id, mi.name, mi.price;

CREATE VIEW public.v_shop_capabilities WITH (security_invoker=on) AS
SELECT s.id AS shop_id, s.name AS shop_name,
  s.plan AS plan_code, s.business_category_id,
  bc.slug AS business_category_slug, bc.name AS business_category_name,
  p.features AS plan_features,
  s.is_active AS shop_active, s.suspended_at,
  s.plan_expires_at AS subscription_active_until
FROM public.shops s
LEFT JOIN public.plans p ON p.code = s.plan
LEFT JOIN public.business_categories bc ON bc.id = s.business_category_id;


-- =============================================================================
-- SECTION 9 — NEW / UPDATED FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_my_entitlements()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE
  v_uid uuid := auth.uid();
  v_shop_id uuid; v_theme_key text; v_plan_code text := 'basic';
  v_started timestamptz; v_expires timestamptz; v_months numeric := 0;
  v_themes jsonb; v_features jsonb;
BEGIN
  IF v_uid IS NULL THEN RETURN NULL; END IF;
  SELECT id, COALESCE(active_theme_key, theme_key), plan_started_at, plan_expires_at, COALESCE(plan,'basic')
    INTO v_shop_id, v_theme_key, v_started, v_expires, v_plan_code
    FROM public.shops WHERE owner_id = v_uid LIMIT 1;
  IF v_plan_code IS NULL OR v_plan_code = '' OR v_plan_code = 'free' THEN v_plan_code := 'basic'; END IF;
  IF v_plan_code <> 'basic' AND v_expires IS NOT NULL AND v_expires < now() THEN v_plan_code := 'basic'; END IF;
  IF v_started IS NOT NULL THEN v_months := EXTRACT(EPOCH FROM (now() - v_started)) / (60*60*24*30); END IF;
  SELECT jsonb_agg(jsonb_build_object('key',t.key,'name',t.name,'description',t.description,'preview_image_url',t.preview_image_url,'allowed',true,'reason',NULL,'component_id',t.component_id,'requires_min_months',0) ORDER BY t.sort_order)
    INTO v_themes FROM public.themes t WHERE t.is_active = true;
  SELECT jsonb_agg(jsonb_build_object('key',f.key,'name',f.name,'description',f.description,'category',f.category,'requires_min_months',COALESCE(pf.requires_min_months,0),'limit_value',pf.limit_value,'allowed',(pf.feature_key IS NOT NULL) AND (COALESCE(pf.requires_min_months,0) <= v_months),'reason',CASE WHEN pf.feature_key IS NULL THEN 'plan_not_eligible' WHEN COALESCE(pf.requires_min_months,0) > v_months THEN 'requires_min_months' ELSE NULL END) ORDER BY f.sort_order)
    INTO v_features FROM public.features f LEFT JOIN public.plan_features pf ON pf.feature_key=f.key AND pf.plan_id=(SELECT id FROM public.plans WHERE code=v_plan_code LIMIT 1) WHERE f.is_active=true;
  RETURN jsonb_build_object('plan_code',v_plan_code,'plan_started_at',v_started,'plan_expires_at',v_expires,'months_active',v_months,'active_theme_key',COALESCE(v_theme_key,'classic'),'features',COALESCE(v_features,'[]'::jsonb),'themes',COALESCE(v_themes,'[]'::jsonb));
END $function$;

CREATE OR REPLACE FUNCTION public.get_marketplace_admin_stats(_from timestamptz, _to timestamptz)
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
DECLARE v_result jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin'::public.app_role) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  SELECT jsonb_build_object('gmv',COALESCE(SUM(o.total),0),'commission',COALESCE(SUM(o.commission_amount),0),'net_to_shops',COALESCE(SUM(o.net_to_shop),0),'orders',COUNT(*),'aov',COALESCE(AVG(o.total),0),'take_rate',CASE WHEN COALESCE(SUM(o.total),0)>0 THEN ROUND((COALESCE(SUM(o.commission_amount),0)/SUM(o.total)*100)::numeric,2) ELSE 0 END,'shops_active',COUNT(DISTINCT o.shop_id),'customers',COUNT(DISTINCT o.customer_user_id)) INTO v_result FROM public.orders o WHERE o.marketplace_order=true AND o.status NOT IN ('cancelled','pending') AND o.created_at>=_from AND o.created_at<=_to;
  RETURN v_result;
END $function$;

CREATE OR REPLACE FUNCTION public.get_marketplace_admin_daily(_from timestamptz, _to timestamptz)
RETURNS TABLE(day date, gmv numeric, commission numeric, orders bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin'::public.app_role) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  RETURN QUERY SELECT (o.created_at AT TIME ZONE 'Asia/Jakarta')::date, COALESCE(SUM(o.total),0)::numeric, COALESCE(SUM(o.commission_amount),0)::numeric, COUNT(*)::bigint FROM public.orders o WHERE o.marketplace_order=true AND o.status NOT IN ('cancelled','pending') AND o.created_at>=_from AND o.created_at<=_to GROUP BY 1 ORDER BY 1;
END $function$;

CREATE OR REPLACE FUNCTION public.get_marketplace_admin_top_shops(_from timestamptz, _to timestamptz, _limit integer DEFAULT 10)
RETURNS TABLE(shop_id uuid, shop_name text, gmv numeric, commission numeric, orders bigint)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin'::public.app_role) THEN RAISE EXCEPTION 'unauthorized'; END IF;
  RETURN QUERY SELECT o.shop_id, s.name, COALESCE(SUM(o.total),0)::numeric, COALESCE(SUM(o.commission_amount),0)::numeric, COUNT(*)::bigint FROM public.orders o JOIN public.shops s ON s.id=o.shop_id WHERE o.marketplace_order=true AND o.status NOT IN ('cancelled','pending') AND o.created_at>=_from AND o.created_at<=_to GROUP BY o.shop_id, s.name ORDER BY gmv DESC LIMIT GREATEST(COALESCE(_limit,10),1);
END $function$;

CREATE OR REPLACE FUNCTION public.create_plan_invoice(_plan_code text)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_caller uuid := auth.uid(); v_shop_id uuid; v_plan plans%ROWTYPE; v_invoice_id uuid; v_invoice_no text;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  SELECT id INTO v_shop_id FROM shops WHERE owner_id=v_caller LIMIT 1;
  IF v_shop_id IS NULL THEN RAISE EXCEPTION 'no_shop'; END IF;
  SELECT * INTO v_plan FROM plans WHERE code=_plan_code AND is_active=true;
  IF NOT FOUND THEN RAISE EXCEPTION 'plan_not_found_or_inactive'; END IF;
  v_invoice_no := 'INV-'||to_char(now(),'YYYYMMDD')||'-'||upper(substr(replace(gen_random_uuid()::text,'-',''),1,6));
  INSERT INTO plan_invoices(shop_id,plan_id,invoice_no,amount_idr,status,payment_method) VALUES(v_shop_id,v_plan.id,v_invoice_no,v_plan.price_idr,'pending','manual') RETURNING id INTO v_invoice_id;
  RETURN v_invoice_id;
END $$;
GRANT EXECUTE ON FUNCTION public.create_plan_invoice(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.approve_plan_invoice(_invoice_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE v_caller uuid := auth.uid(); v_inv plan_invoices%ROWTYPE; v_plan plans%ROWTYPE; v_new_expiry timestamptz; v_base timestamptz;
BEGIN
  IF NOT public.has_role(v_caller,'super_admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  SELECT * INTO v_inv FROM plan_invoices WHERE id=_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invoice_not_found'; END IF;
  IF v_inv.status='paid' THEN RAISE EXCEPTION 'already_paid'; END IF;
  SELECT * INTO v_plan FROM plans WHERE id=v_inv.plan_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'plan_not_found'; END IF;
  SELECT GREATEST(COALESCE(plan_expires_at,now()),now()) INTO v_base FROM shops WHERE id=v_inv.shop_id;
  v_new_expiry := v_base + (v_plan.duration_days||' days')::interval;
  UPDATE plan_invoices SET status='paid',paid_at=now(),reviewed_by=v_caller,reviewed_at=now(),updated_at=now() WHERE id=_invoice_id;
  UPDATE shops SET plan=v_plan.code,plan_expires_at=v_new_expiry,updated_at=now() WHERE id=v_inv.shop_id;
  INSERT INTO plan_subscriptions(shop_id,plan_id,plan_code,status,billing_interval,next_billing_at,amount_idr,last_invoice_id,last_charge_at) VALUES(v_inv.shop_id,v_plan.id,v_plan.code,'active','monthly',v_new_expiry,v_plan.price_idr,_invoice_id,now()) ON CONFLICT(shop_id) DO UPDATE SET plan_id=EXCLUDED.plan_id,plan_code=EXCLUDED.plan_code,amount_idr=EXCLUDED.amount_idr,next_billing_at=EXCLUDED.next_billing_at,last_invoice_id=EXCLUDED.last_invoice_id,last_charge_at=EXCLUDED.last_charge_at,status='active',failure_count=0,updated_at=now();
  RETURN jsonb_build_object('shop_id',v_inv.shop_id,'plan_code',v_plan.code,'plan_expires_at',v_new_expiry);
END $$;

CREATE OR REPLACE FUNCTION public.admin_set_shop_plan(_shop_id uuid, _plan text, _expires_at timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE old_plan text; old_exp timestamptz; v_plan plans%ROWTYPE;
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin') THEN RAISE EXCEPTION 'not_authorized'; END IF;
  IF _plan <> 'free' THEN SELECT * INTO v_plan FROM plans WHERE code=_plan AND is_active=true; IF NOT FOUND THEN RAISE EXCEPTION 'invalid_plan'; END IF; END IF;
  SELECT plan,plan_expires_at INTO old_plan,old_exp FROM shops WHERE id=_shop_id;
  UPDATE shops SET plan=_plan,plan_expires_at=CASE WHEN _plan='free' THEN NULL ELSE _expires_at END,updated_at=now() WHERE id=_shop_id;
  IF _plan='free' THEN UPDATE plan_subscriptions SET status='cancelled',cancelled_at=now(),updated_at=now() WHERE shop_id=_shop_id;
  ELSE INSERT INTO plan_subscriptions(shop_id,plan_id,plan_code,status,billing_interval,next_billing_at,amount_idr) VALUES(_shop_id,v_plan.id,v_plan.code,'active','monthly',COALESCE(_expires_at,now()+(v_plan.duration_days||' days')::interval),v_plan.price_idr) ON CONFLICT(shop_id) DO UPDATE SET plan_id=EXCLUDED.plan_id,plan_code=EXCLUDED.plan_code,amount_idr=EXCLUDED.amount_idr,next_billing_at=EXCLUDED.next_billing_at,status='active',updated_at=now(); END IF;
  INSERT INTO system_audit(event_type,shop_id,actor_id,payload,notes) VALUES('plan_manual_set',_shop_id,auth.uid(),jsonb_build_object('old_plan',old_plan,'old_expires_at',old_exp,'new_plan',_plan,'new_expires_at',_expires_at),'super-admin manual override');
END $$;

CREATE OR REPLACE FUNCTION public.approve_invoice(_invoice_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_caller uuid := auth.uid(); v_inv plan_invoices%ROWTYPE; v_plan plans%ROWTYPE; v_start timestamptz; v_end timestamptz;
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT public.has_role(v_caller,'super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO v_inv FROM plan_invoices WHERE id=_invoice_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'invoice_not_found'; END IF;
  IF v_inv.status='paid' THEN RETURN; END IF;
  SELECT * INTO v_plan FROM plans WHERE id=v_inv.plan_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'plan_not_found'; END IF;
  UPDATE plan_invoices SET status='paid',paid_at=now(),reviewed_by=v_caller,reviewed_at=now(),updated_at=now() WHERE id=_invoice_id;
  SELECT GREATEST(COALESCE(plan_expires_at,now()),now()) INTO v_start FROM shops WHERE id=v_inv.shop_id;
  v_end := v_start + make_interval(days => v_plan.duration_days);
  UPDATE shops SET plan=v_plan.code,plan_started_at=COALESCE(plan_started_at,now()),plan_expires_at=v_end,suspended_at=NULL,suspended_reason=NULL,updated_at=now() WHERE id=v_inv.shop_id;
END $$;

CREATE OR REPLACE FUNCTION public.reject_invoice(_invoice_id uuid, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_caller uuid := auth.uid();
BEGIN
  IF v_caller IS NULL THEN RAISE EXCEPTION 'not_authenticated'; END IF;
  IF NOT public.has_role(v_caller,'super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE plan_invoices SET status='rejected',reviewed_by=v_caller,reviewed_at=now(),notes=COALESCE(_reason,notes),updated_at=now() WHERE id=_invoice_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'invoice_not_found'; END IF;
END $$;
GRANT EXECUTE ON FUNCTION public.approve_invoice(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_invoice(uuid, text) TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_buyer_segments()
RETURNS TABLE(total bigint, active bigint, inactive bigint, new_buyers bigint)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin') THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  WITH buyers AS (SELECT DISTINCT u.id, u.created_at FROM auth.users u WHERE EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id=u.id AND r.role='customer') OR EXISTS (SELECT 1 FROM public.orders o WHERE o.customer_user_id=u.id)),
  last_order AS (SELECT customer_user_id, max(created_at) AS last_at FROM public.orders WHERE customer_user_id IS NOT NULL GROUP BY customer_user_id)
  SELECT (SELECT count(*) FROM buyers)::bigint,(SELECT count(*) FROM last_order WHERE last_at>=now()-interval '30 days')::bigint,(SELECT count(*) FROM buyers b LEFT JOIN last_order lo ON lo.customer_user_id=b.id WHERE lo.last_at IS NULL OR lo.last_at<now()-interval '60 days')::bigint,(SELECT count(*) FROM buyers WHERE created_at>=now()-interval '7 days')::bigint;
END $$;
GRANT EXECUTE ON FUNCTION public.admin_buyer_segments() TO authenticated;

CREATE OR REPLACE FUNCTION public.ensure_owner_role_for_shop()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN RETURN NEW; END IF;
  INSERT INTO public.user_roles(user_id,role,shop_id,outlet_id,is_active) VALUES(NEW.owner_id,'owner',NEW.id,NULL,true) ON CONFLICT(user_id,role,shop_id,outlet_id) DO UPDATE SET is_active=true;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.get_public_waitlist_summary(_shop_id uuid)
RETURNS TABLE(id uuid, queue_number integer, party_size integer, status text, estimated_wait_minutes integer, created_at timestamptz, served_at timestamptz, requested_date date)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id, queue_number, party_size, status, estimated_wait_minutes, created_at, served_at, requested_date FROM public.booking_waitlist WHERE shop_id=_shop_id AND status IN ('waiting','notified') AND (requested_date=CURRENT_DATE OR requested_date IS NULL) ORDER BY created_at ASC;
$$;
GRANT EXECUTE ON FUNCTION public.get_public_waitlist_summary(uuid) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.verify_certificate(_cert_number text)
RETURNS TABLE(certificate_number text, course_title text, shop_name text, issued_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cc.certificate_number, mi.name, s.name, cc.issued_at FROM public.course_certificates cc LEFT JOIN public.menu_items mi ON mi.id=cc.course_id LEFT JOIN public.shops s ON s.id=cc.shop_id WHERE cc.certificate_number=_cert_number LIMIT 1;
$$;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.start_queue_session(_shop_id uuid, _label text DEFAULT NULL, _avg_minutes integer DEFAULT 5)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT (public.is_shop_owner(_shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.queue_sessions SET is_active=false,ended_at=now() WHERE shop_id=_shop_id AND is_active=true;
  INSERT INTO public.queue_sessions(shop_id,session_date,label,avg_service_minutes,is_active,started_at) VALUES(_shop_id,CURRENT_DATE,_label,COALESCE(_avg_minutes,5),true,now()) RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.take_queue_number(_shop_id uuid, _customer_name text DEFAULT NULL, _customer_phone text DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _session_id uuid; _num integer; _id uuid;
BEGIN
  SELECT id INTO _session_id FROM public.queue_sessions WHERE shop_id=_shop_id AND is_active=true ORDER BY started_at DESC LIMIT 1;
  IF _session_id IS NULL THEN INSERT INTO public.queue_sessions(shop_id,session_date,is_active,started_at) VALUES(_shop_id,CURRENT_DATE,true,now()) RETURNING id INTO _session_id; END IF;
  SELECT COALESCE(MAX(queue_number),0)+1 INTO _num FROM public.queue_entries WHERE session_id=_session_id;
  INSERT INTO public.queue_entries(session_id,shop_id,queue_number,customer_name,customer_phone,notes,status) VALUES(_session_id,_shop_id,_num,_customer_name,_customer_phone,_notes,'waiting') RETURNING id INTO _id;
  RETURN jsonb_build_object('id',_id,'session_id',_session_id,'queue_number',_num);
END $$;

CREATE OR REPLACE FUNCTION public.call_next_queue(_shop_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _entry public.queue_entries%ROWTYPE;
BEGIN
  IF NOT (public.is_shop_owner(_shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO _entry FROM public.queue_entries WHERE shop_id=_shop_id AND status='waiting' ORDER BY queue_number ASC LIMIT 1;
  IF _entry.id IS NULL THEN RETURN NULL; END IF;
  UPDATE public.queue_entries SET status='called',called_at=now() WHERE id=_entry.id;
  UPDATE public.queue_sessions SET current_number=_entry.queue_number WHERE id=_entry.session_id;
  RETURN to_jsonb(_entry);
END $$;

CREATE OR REPLACE FUNCTION public.skip_queue_entry(_entry_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _shop uuid;
BEGIN
  SELECT shop_id INTO _shop FROM public.queue_entries WHERE id=_entry_id;
  IF NOT (public.is_shop_owner(_shop) OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.queue_entries SET status='skipped',done_at=now() WHERE id=_entry_id;
END $$;

CREATE OR REPLACE FUNCTION public.generate_reservation_slots(_shop_id uuid, _date date, _start time, _end time, _slot_minutes integer DEFAULT 60, _capacity integer DEFAULT 10)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _t time := _start; _n integer := 0;
BEGIN
  IF NOT (public.is_shop_owner(_shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN RAISE EXCEPTION 'forbidden'; END IF;
  WHILE _t < _end LOOP
    INSERT INTO public.reservation_slots(shop_id,slot_date,slot_time,capacity) VALUES(_shop_id,_date,_t,_capacity) ON CONFLICT(shop_id,slot_date,slot_time) DO NOTHING;
    _t := _t + (_slot_minutes||' minutes')::interval; _n := _n + 1;
  END LOOP;
  RETURN _n;
END $$;

CREATE OR REPLACE FUNCTION public.check_table_availability(_shop_id uuid, _reserved_at timestamptz, _party_size integer DEFAULT 1)
RETURNS TABLE(table_id uuid, label text, capacity integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT t.id, t.label, t.capacity FROM public.tables t
  WHERE t.shop_id=_shop_id AND t.is_active AND t.capacity>=_party_size
    AND NOT EXISTS (SELECT 1 FROM public.reservations r WHERE r.table_id=t.id AND r.status IN ('pending','confirmed','seated') AND abs(extract(epoch FROM (r.reserved_at-_reserved_at)))<3600)
  ORDER BY t.capacity ASC;
$$;

CREATE OR REPLACE FUNCTION public.increment_slot_booked(_slot_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN UPDATE public.reservation_slots SET booked=booked+1 WHERE id=_slot_id AND booked<capacity; END $$;

CREATE OR REPLACE FUNCTION public.decrement_slot_booked(_slot_id uuid) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN UPDATE public.reservation_slots SET booked=GREATEST(booked-1,0) WHERE id=_slot_id; END $$;

CREATE OR REPLACE FUNCTION public.fn_use_booking_voucher(_booking_id uuid, _code text)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _v public.booking_vouchers%ROWTYPE;
BEGIN
  SELECT * INTO _v FROM public.booking_vouchers WHERE code=_code AND is_active=true LIMIT 1;
  IF _v.id IS NULL THEN RAISE EXCEPTION 'voucher tidak ditemukan'; END IF;
  RETURN jsonb_build_object('voucher_id',_v.id,'discount',COALESCE(_v.discount_value,0));
END $$;

CREATE OR REPLACE FUNCTION public.reschedule_booking(_booking_id uuid, _new_start timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _shop uuid;
BEGIN
  SELECT shop_id INTO _shop FROM public.bookings WHERE id=_booking_id;
  IF NOT (public.is_shop_owner(_shop) OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.bookings SET start_at=_new_start,updated_at=now() WHERE id=_booking_id;
END $$;

CREATE OR REPLACE FUNCTION public.award_referral_bonus(_referral_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _r public.referrals%ROWTYPE;
BEGIN
  SELECT * INTO _r FROM public.referrals WHERE id=_referral_id;
  IF _r.id IS NULL OR _r.status='rewarded' THEN RETURN; END IF;
  UPDATE public.referrals SET status='rewarded',rewarded_at=now() WHERE id=_referral_id;
  IF _r.reward_cashback>0 AND _r.referrer_user_id IS NOT NULL THEN
    INSERT INTO public.cashback_wallets(user_id,balance,total_earned) VALUES(_r.referrer_user_id,_r.reward_cashback,_r.reward_cashback) ON CONFLICT(user_id) DO UPDATE SET balance=cashback_wallets.balance+EXCLUDED.balance,total_earned=cashback_wallets.total_earned+EXCLUDED.total_earned,updated_at=now();
    INSERT INTO public.cashback_transactions(user_id,shop_id,amount,type,description) VALUES(_r.referrer_user_id,_r.shop_id,_r.reward_cashback,'earn','Bonus referral');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.record_download(_license_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.digital_licenses SET download_count=COALESCE(download_count,0)+1,last_downloaded_at=now() WHERE id=_license_id;
  INSERT INTO public.digital_download_logs(license_id,downloaded_at) VALUES(_license_id,now());
END $$;

CREATE OR REPLACE FUNCTION public.reset_download_count(_license_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _shop uuid;
BEGIN
  SELECT shop_id INTO _shop FROM public.digital_licenses WHERE id=_license_id;
  IF NOT (public.is_shop_owner(_shop) OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.digital_licenses SET download_count=0 WHERE id=_license_id;
END $$;

CREATE OR REPLACE FUNCTION public.request_customer_export(_user_id uuid DEFAULT NULL)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _uid uuid; _id uuid;
BEGIN
  _uid := COALESCE(_user_id,auth.uid());
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  INSERT INTO public.data_requests(user_id,request_type,status) VALUES(_uid,'export','pending') RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.request_shop_backup(_shop_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT (public.is_shop_owner(_shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.shop_backups(shop_id,status,requested_by,requested_at) VALUES(_shop_id,'pending',auth.uid(),now()) RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.run_plan_maintenance()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _expired integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.shops SET plan='basic' WHERE plan_expires_at IS NOT NULL AND plan_expires_at<now() AND plan<>'basic';
  GET DIAGNOSTICS _expired = ROW_COUNT;
  RETURN jsonb_build_object('expired',_expired);
END $$;

CREATE OR REPLACE FUNCTION public.admin_update_min_months(_plan_id uuid, _feature_key text, _min_months integer)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.plan_features SET min_months=_min_months WHERE plan_id=_plan_id AND feature_key=_feature_key;
END $$;

CREATE OR REPLACE FUNCTION public.admin_undo_min_months(_plan_id uuid, _feature_key text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.plan_features SET min_months=0 WHERE plan_id=_plan_id AND feature_key=_feature_key;
END $$;

CREATE OR REPLACE FUNCTION public.check_api_rate_limit(_api_key_id uuid)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _limit integer; _count integer;
BEGIN
  SELECT rate_limit_per_minute INTO _limit FROM public.api_keys WHERE id=_api_key_id AND is_active;
  IF _limit IS NULL THEN RETURN false; END IF;
  SELECT count(*) INTO _count FROM public.api_usage WHERE api_key_id=_api_key_id AND created_at>now()-interval '1 minute';
  RETURN _count < _limit;
END $$;

CREATE OR REPLACE FUNCTION public.record_api_usage(_api_key_id uuid, _shop_id uuid, _endpoint text, _method text, _status integer DEFAULT 200, _duration_ms integer DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.api_usage(shop_id,api_key_id,endpoint,method,status_code,duration_ms) VALUES(_shop_id,_api_key_id,_endpoint,_method,_status,_duration_ms);
  UPDATE public.api_keys SET last_used_at=now() WHERE id=_api_key_id;
END $$;

CREATE OR REPLACE FUNCTION public.sync_loyalty_reward_cols() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.points_required IS NULL AND NEW.cost_points IS NOT NULL THEN NEW.points_required := NEW.cost_points; END IF;
  IF NEW.cost_points IS NULL AND NEW.points_required IS NOT NULL THEN NEW.cost_points := NEW.points_required; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.sync_loyalty_redemption_cols() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.points_redeemed IS NULL AND NEW.points_used IS NOT NULL THEN NEW.points_redeemed := NEW.points_used; END IF;
  IF NEW.points_used IS NULL AND NEW.points_redeemed IS NOT NULL THEN NEW.points_used := NEW.points_redeemed; END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.shops_nearby(
  _lat double precision, _lng double precision,
  _radius_km double precision DEFAULT 10,
  _limit integer DEFAULT 50,
  _category_id uuid DEFAULT NULL
)
RETURNS TABLE(id uuid, slug text, name text, tagline text, logo_url text, address text, city text, latitude numeric, longitude numeric, business_category_id uuid, rating_avg numeric, review_count integer, distance_km double precision)
LANGUAGE sql STABLE SECURITY INVOKER SET search_path = public AS $$
  SELECT s.id, s.slug, s.name, s.tagline, s.logo_url, s.address, s.city, s.latitude, s.longitude, s.business_category_id, s.rating_avg, s.review_count,
    (6371 * acos(LEAST(1.0,GREATEST(-1.0, cos(radians(_lat))*cos(radians(s.latitude::float8))*cos(radians(s.longitude::float8)-radians(_lng))+sin(radians(_lat))*sin(radians(s.latitude::float8)))))) AS distance_km
  FROM public.shops s
  WHERE s.latitude IS NOT NULL AND s.longitude IS NOT NULL AND COALESCE(s.is_active,true)=true AND COALESCE(s.marketplace_visible,true)=true
    AND (_category_id IS NULL OR s.business_category_id=_category_id)
    AND (6371*acos(LEAST(1.0,GREATEST(-1.0,cos(radians(_lat))*cos(radians(s.latitude::float8))*cos(radians(s.longitude::float8)-radians(_lng))+sin(radians(_lat))*sin(radians(s.latitude::float8)))))) <= _radius_km
  ORDER BY distance_km ASC LIMIT GREATEST(1,LEAST(_limit,200));
$$;
GRANT EXECUTE ON FUNCTION public.shops_nearby(double precision, double precision, double precision, integer, uuid) TO anon, authenticated;


-- =============================================================================
-- SECTION 10 — TRIGGERS
-- =============================================================================

-- ensure owner role on shop insert/update
DROP TRIGGER IF EXISTS trg_shops_ensure_owner_role ON public.shops;
CREATE TRIGGER trg_shops_ensure_owner_role
  AFTER INSERT OR UPDATE OF owner_id ON public.shops
  FOR EACH ROW EXECUTE FUNCTION public.ensure_owner_role_for_shop();

-- loyalty sync triggers
DROP TRIGGER IF EXISTS trg_lr_sync ON public.loyalty_rewards;
CREATE TRIGGER trg_lr_sync BEFORE INSERT OR UPDATE ON public.loyalty_rewards FOR EACH ROW EXECUTE FUNCTION public.sync_loyalty_reward_cols();
DROP TRIGGER IF EXISTS trg_lred_sync ON public.loyalty_redemptions;
CREATE TRIGGER trg_lred_sync BEFORE INSERT OR UPDATE ON public.loyalty_redemptions FOR EACH ROW EXECUTE FUNCTION public.sync_loyalty_redemption_cols();

-- updated_at triggers for new tables (using update_updated_at_column or touch_updated_at)
DROP TRIGGER IF EXISTS update_shop_bank_accounts_updated_at ON public.shop_bank_accounts;
CREATE TRIGGER update_shop_bank_accounts_updated_at BEFORE UPDATE ON public.shop_bank_accounts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_email_campaigns_updated ON public.email_campaigns;
CREATE TRIGGER trg_email_campaigns_updated BEFORE UPDATE ON public.email_campaigns FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_storefront_layouts_updated ON public.storefront_layouts;
CREATE TRIGGER trg_storefront_layouts_updated BEFORE UPDATE ON public.storefront_layouts FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_shop_api_keys_updated ON public.shop_api_keys;
CREATE TRIGGER trg_shop_api_keys_updated BEFORE UPDATE ON public.shop_api_keys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- updated_at for tables that use touch_updated_at
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['loyalty_tiers','tables','table_maps','reservation_settings','reservations','return_requests','third_party_integrations'] LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_touch ON public.%I', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_touch BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at()', t, t);
  END LOOP;
END $$;


-- =============================================================================
-- SECTION 11 — STORAGE BUCKETS & POLICIES
-- =============================================================================

INSERT INTO storage.buckets (id, name, public) VALUES
  ('booking-documents', 'booking-documents', false),
  ('custom-deliveries', 'custom-deliveries', false),
  ('digital-products', 'digital-products', false),
  ('shop-assets', 'shop-assets', true)
ON CONFLICT (id) DO NOTHING;

-- shop-assets: public read, owner write
DROP POLICY IF EXISTS "shop-assets public read" ON storage.objects;
CREATE POLICY "shop-assets public read" ON storage.objects FOR SELECT USING (bucket_id='shop-assets');
DROP POLICY IF EXISTS "shop-assets owner write" ON storage.objects;
CREATE POLICY "shop-assets owner write" ON storage.objects FOR INSERT WITH CHECK (bucket_id='shop-assets' AND auth.uid() IS NOT NULL AND EXISTS (SELECT 1 FROM public.shops s WHERE s.id::text=(storage.foldername(name))[1] AND s.owner_id=auth.uid()));
DROP POLICY IF EXISTS "shop-assets owner update" ON storage.objects;
CREATE POLICY "shop-assets owner update" ON storage.objects FOR UPDATE USING (bucket_id='shop-assets' AND EXISTS (SELECT 1 FROM public.shops s WHERE s.id::text=(storage.foldername(name))[1] AND s.owner_id=auth.uid()));
DROP POLICY IF EXISTS "shop-assets owner delete" ON storage.objects;
CREATE POLICY "shop-assets owner delete" ON storage.objects FOR DELETE USING (bucket_id='shop-assets' AND EXISTS (SELECT 1 FROM public.shops s WHERE s.id::text=(storage.foldername(name))[1] AND s.owner_id=auth.uid()));

-- booking-documents
DROP POLICY IF EXISTS "booking-documents user read" ON storage.objects;
CREATE POLICY "booking-documents user read" ON storage.objects FOR SELECT USING (bucket_id='booking-documents' AND auth.uid()::text=(storage.foldername(name))[1]);
DROP POLICY IF EXISTS "booking-documents user write" ON storage.objects;
CREATE POLICY "booking-documents user write" ON storage.objects FOR INSERT WITH CHECK (bucket_id='booking-documents' AND auth.uid()::text=(storage.foldername(name))[1]);
DROP POLICY IF EXISTS "booking-documents user update" ON storage.objects;
CREATE POLICY "booking-documents user update" ON storage.objects FOR UPDATE USING (bucket_id='booking-documents' AND auth.uid()::text=(storage.foldername(name))[1]);
DROP POLICY IF EXISTS "booking-documents user delete" ON storage.objects;
CREATE POLICY "booking-documents user delete" ON storage.objects FOR DELETE USING (bucket_id='booking-documents' AND auth.uid()::text=(storage.foldername(name))[1]);

-- custom-deliveries
DROP POLICY IF EXISTS "custom-deliveries user read" ON storage.objects;
CREATE POLICY "custom-deliveries user read" ON storage.objects FOR SELECT USING (bucket_id='custom-deliveries' AND auth.uid()::text=(storage.foldername(name))[1]);
DROP POLICY IF EXISTS "custom-deliveries user write" ON storage.objects;
CREATE POLICY "custom-deliveries user write" ON storage.objects FOR INSERT WITH CHECK (bucket_id='custom-deliveries' AND auth.uid()::text=(storage.foldername(name))[1]);
DROP POLICY IF EXISTS "custom-deliveries user update" ON storage.objects;
CREATE POLICY "custom-deliveries user update" ON storage.objects FOR UPDATE USING (bucket_id='custom-deliveries' AND auth.uid()::text=(storage.foldername(name))[1]);
DROP POLICY IF EXISTS "custom-deliveries user delete" ON storage.objects;
CREATE POLICY "custom-deliveries user delete" ON storage.objects FOR DELETE USING (bucket_id='custom-deliveries' AND auth.uid()::text=(storage.foldername(name))[1]);

-- digital-products
DROP POLICY IF EXISTS "digital-products user read" ON storage.objects;
CREATE POLICY "digital-products user read" ON storage.objects FOR SELECT USING (bucket_id='digital-products' AND auth.uid()::text=(storage.foldername(name))[1]);
DROP POLICY IF EXISTS "digital-products user write" ON storage.objects;
CREATE POLICY "digital-products user write" ON storage.objects FOR INSERT WITH CHECK (bucket_id='digital-products' AND auth.uid()::text=(storage.foldername(name))[1]);
DROP POLICY IF EXISTS "digital-products user update" ON storage.objects;
CREATE POLICY "digital-products user update" ON storage.objects FOR UPDATE USING (bucket_id='digital-products' AND auth.uid()::text=(storage.foldername(name))[1]);
DROP POLICY IF EXISTS "digital-products user delete" ON storage.objects;
CREATE POLICY "digital-products user delete" ON storage.objects FOR DELETE USING (bucket_id='digital-products' AND auth.uid()::text=(storage.foldername(name))[1]);


-- =============================================================================
-- SECTION 12 — SEED DATA
-- =============================================================================

-- Business categories (full authoritative version with enabled_features)
INSERT INTO public.business_categories (slug, name, description, sort_order, is_active, enabled_features, flow_types, booking_enabled, booking_type, recommended_theme_key, subtypes) VALUES
('fnb','F&B','Warung, kafe, bakery, katering, dan usaha makanan minuman lainnya.',1,true,ARRAY['POS','MENU','KDS','TABLES','INVENTORY','VARIANTS','RECIPES','COMBO_BUILDER','ORDER_MODE']::text[],ARRAY['T1']::text[],false,null,'kuliner-warm','[{"slug":"warung","label":"Warung"},{"slug":"kafe","label":"Kafe"},{"slug":"bakery","label":"Bakery"},{"slug":"katering","label":"Katering"}]'::jsonb),
('retail','Retail','Toko pakaian, sembako, aksesoris, elektronik, dan penjualan produk fisik.',2,true,ARRAY['POS','MENU','INVENTORY','VARIANTS','BUNDLES','PRODUCT_RETURNS','VARIANT_MATRIX']::text[],ARRAY['T1']::text[],false,null,'retail-bold','[{"slug":"fashion","label":"Fashion"},{"slug":"sembako","label":"Sembako"},{"slug":"aksesoris","label":"Aksesoris"},{"slug":"elektronik","label":"Elektronik"}]'::jsonb),
('jasa','Jasa','Usaha jasa umum seperti servis, bengkel ringan, perbaikan, dan layanan profesional.',3,true,ARRAY['BOOKING','STAFF_PICKER','SERVICE_BUNDLES','FOLLOWUP_REMINDERS','CUSTOM_ORDER','CUSTOM_ORDER_QUOTES','MILESTONES','CONTRACTS','JOB_DELIVERABLES']::text[],ARRAY['T3','T5']::text[],true,'session','service-clean','[{"slug":"servis","label":"Servis"},{"slug":"konsultasi","label":"Konsultasi"},{"slug":"perbaikan","label":"Perbaikan"}]'::jsonb),
('rental','Rental','Sewa kendaraan, alat, perlengkapan acara, dan unit rental lainnya.',4,true,ARRAY['RENTAL','RENTAL_AVAILABILITY','RENTAL_DEPOSIT','RENTAL_FINES','RENTAL_CHECKLIST','RENTAL_TNC','RENTAL_EXTEND','RENTAL_UNIT_READY','RENTAL_KYC','RENTAL_INSPECTIONS']::text[],ARRAY['T4']::text[],true,'rental','rental-bold','[{"slug":"kendaraan","label":"Kendaraan"},{"slug":"alat","label":"Alat"},{"slug":"properti-acara","label":"Properti Acara"}]'::jsonb),
('kursus','Kursus','Kelas privat, bimbel, kursus online, dan pelatihan berjadwal.',5,true,ARRAY['BOOKING','STAFF_PICKER','SERVICE_BUNDLES','FOLLOWUP_REMINDERS','KURSUS','LESSON_PROGRESS','COURSE_CERTIFICATES','SESSION_MEMBERSHIP']::text[],ARRAY['T2','T3']::text[],true,'session','course-bright','[{"slug":"bimbel","label":"Bimbel"},{"slug":"kursus-online","label":"Kursus Online"},{"slug":"les-privat","label":"Les Privat"}]'::jsonb),
('salon','Salon & Barbershop','Salon kecantikan, barbershop, nail studio, dan treatment berjadwal.',6,true,ARRAY['BOOKING','STAFF_PICKER','SERVICE_BUNDLES','FOLLOWUP_REMINDERS','ANTRIAN','WAITLIST','CUSTOMER_TREATMENTS','SESSION_MEMBERSHIP']::text[],ARRAY['T3']::text[],true,'session','beauty-soft','[{"slug":"salon","label":"Salon"},{"slug":"barbershop","label":"Barbershop"},{"slug":"nail-art","label":"Nail Art"},{"slug":"spa","label":"Spa"}]'::jsonb),
('klinik','Klinik','Klinik umum, klinik kecantikan, praktik mandiri, dan layanan kesehatan.',7,true,ARRAY['BOOKING','STAFF_PICKER','ANTRIAN','WAITLIST','ANAMNESIS','MEDICAL_INVOICE','PATIENT_RECORDS','MEDICATIONS','PRESCRIPTIONS']::text[],ARRAY['T3']::text[],true,'session','medical-clean','[{"slug":"klinik-umum","label":"Klinik Umum"},{"slug":"klinik-kecantikan","label":"Klinik Kecantikan"},{"slug":"dokter-gigi","label":"Dokter Gigi"}]'::jsonb),
('studio-foto','Studio Foto','Studio foto keluarga, wisuda, produk, dan layanan dokumentasi.',8,true,ARRAY['BOOKING','SERVICE_BUNDLES','PORTFOLIO','STUDIO_PACKAGES','STUDIO_DELIVERY','STUDIO_BRIEF','STUDIO_ADDONS','STUDIO_GALLERY']::text[],ARRAY['T3']::text[],true,'session','studio-editorial','[{"slug":"foto-keluarga","label":"Foto Keluarga"},{"slug":"foto-produk","label":"Foto Produk"},{"slug":"wisuda","label":"Wisuda"}]'::jsonb),
('travel','Travel','Agen travel, tour, open trip, dan penjualan paket perjalanan.',9,true,ARRAY['UMROH_PACKAGES','UMROH_FACILITIES','UMROH_FAQ','FLYERS','TESTIMONIALS','LEADS','ABOUT_PAGE','TRAVEL_MANIFEST','TRAVEL_INSTALLMENTS','TRAVEL_ITINERARY','JAMAAH_DOCUMENTS']::text[],ARRAY['T1']::text[],false,null,'travel-vivid','[{"slug":"open-trip","label":"Open Trip"},{"slug":"tour","label":"Tour"},{"slug":"umroh","label":"Umroh"}]'::jsonb),
('custom-order','Custom Order','Produksi by order, jasa desain, percetakan, dan pesanan sesuai brief.',10,true,ARRAY['CUSTOM_ORDER','CUSTOM_ORDER_QUOTES','MILESTONES','CONTRACTS','JOB_DELIVERABLES','PRE_ORDERS']::text[],ARRAY['T5']::text[],false,null,'custom-craft','[{"slug":"desain","label":"Desain"},{"slug":"percetakan","label":"Percetakan"},{"slug":"produksi","label":"Produksi"}]'::jsonb),
('lainnya','Lainnya','Kategori umum untuk usaha yang belum masuk kategori khusus.',11,true,ARRAY['POS','MENU','BOOKING','CUSTOM_ORDER']::text[],ARRAY['T1','T3','T5']::text[],false,null,'generic-flex','[]'::jsonb)
ON CONFLICT (slug) DO UPDATE SET
  name=EXCLUDED.name, description=EXCLUDED.description, sort_order=EXCLUDED.sort_order,
  is_active=EXCLUDED.is_active, enabled_features=EXCLUDED.enabled_features,
  flow_types=EXCLUDED.flow_types, booking_enabled=EXCLUDED.booking_enabled,
  booking_type=EXCLUDED.booking_type, recommended_theme_key=EXCLUDED.recommended_theme_key,
  subtypes=EXCLUDED.subtypes, updated_at=now();

-- Plans
INSERT INTO public.plans (code, name, price_idr, duration_days, is_active, sort_order)
VALUES
  ('basic',    'Basic',    0,      3650, true, 1),
  ('pro',      'Pro',      99000,  30,   true, 2),
  ('business', 'Bisnis',   249000, 30,   true, 3)
ON CONFLICT (code) DO NOTHING;

-- Features
INSERT INTO public.features (key, name, description, category, is_active, sort_order)
VALUES
  ('website_builder',    'Website Builder',    'Builder halaman drag-and-drop berbasis Puck',       'appearance', true, 10),
  ('custom_css',         'Custom CSS',         'Tambah CSS sendiri untuk kustomisasi tampilan toko', 'appearance', true, 20),
  ('storefront_builder', 'Storefront Builder', 'Susun section toko (banner, produk unggulan, dll)',  'appearance', true, 30),
  ('premium_themes',     'Tema Premium',       'Akses semua tema premium',                           'appearance', true, 40),
  ('custom_domain',      'Custom Domain',      'Hubungkan domain sendiri ke toko',                   'appearance', true, 50)
ON CONFLICT (key) DO NOTHING;

-- Plan → feature mappings
INSERT INTO public.plan_features (plan_id, feature_key)
SELECT p.id, 'storefront_builder' FROM public.plans p WHERE p.code='basic' ON CONFLICT(plan_id,feature_key) DO NOTHING;
INSERT INTO public.plan_features (plan_id, feature_key)
SELECT p.id, k FROM public.plans p, unnest(ARRAY['storefront_builder','website_builder','custom_css','premium_themes']) k WHERE p.code='pro' ON CONFLICT(plan_id,feature_key) DO NOTHING;
INSERT INTO public.plan_features (plan_id, feature_key)
SELECT p.id, k FROM public.plans p, unnest(ARRAY['storefront_builder','website_builder','custom_css','premium_themes','custom_domain']) k WHERE p.code='business' ON CONFLICT(plan_id,feature_key) DO NOTHING;


-- =============================================================================
-- SECTION 13 — BACKFILL (safe to run on existing data)
-- =============================================================================

-- Backfill owner roles for existing shops
INSERT INTO public.user_roles (user_id, role, shop_id, outlet_id, is_active)
SELECT s.owner_id, 'owner', s.id, NULL, true FROM public.shops s WHERE s.owner_id IS NOT NULL
ON CONFLICT (user_id, role, shop_id, outlet_id) DO UPDATE SET is_active=true;

-- Revoke token leak from anon
REVOKE SELECT (custom_domain_verify_token) ON public.shops FROM anon;

-- Notify PostgREST to reload schema cache
NOTIFY pgrst, 'reload schema';
