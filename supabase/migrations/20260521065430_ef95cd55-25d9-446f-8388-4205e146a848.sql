
DROP VIEW IF EXISTS public.shop_health_score CASCADE;
DROP VIEW IF EXISTS public.courier_earnings CASCADE;
DROP VIEW IF EXISTS public.menu_hpp_view CASCADE;
DROP VIEW IF EXISTS public.v_shop_capabilities CASCADE;

-- LOYALTY
CREATE TABLE IF NOT EXISTS public.loyalty_tiers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL, min_points integer NOT NULL DEFAULT 0,
  multiplier numeric NOT NULL DEFAULT 1, color text,
  perks jsonb NOT NULL DEFAULT '[]'::jsonb, sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_loyalty_tiers_shop ON public.loyalty_tiers(shop_id);
ALTER TABLE public.loyalty_tiers ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lt owner" ON public.loyalty_tiers;
CREATE POLICY "lt owner" ON public.loyalty_tiers USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "lt public" ON public.loyalty_tiers;
CREATE POLICY "lt public" ON public.loyalty_tiers FOR SELECT USING (is_active);

CREATE TABLE IF NOT EXISTS public.loyalty_rewards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL, description text, cost_points integer NOT NULL,
  reward_type text NOT NULL DEFAULT 'discount', reward_value numeric,
  image_url text, stock integer, is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_loyalty_rewards_shop ON public.loyalty_rewards(shop_id);
ALTER TABLE public.loyalty_rewards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lr owner" ON public.loyalty_rewards;
CREATE POLICY "lr owner" ON public.loyalty_rewards USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "lr public" ON public.loyalty_rewards;
CREATE POLICY "lr public" ON public.loyalty_rewards FOR SELECT USING (is_active);

CREATE TABLE IF NOT EXISTS public.loyalty_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  reward_id uuid REFERENCES public.loyalty_rewards(id) ON DELETE SET NULL,
  points_used integer NOT NULL, status text NOT NULL DEFAULT 'pending',
  redeemed_at timestamptz NOT NULL DEFAULT now(), fulfilled_at timestamptz, notes text,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_lred_shop ON public.loyalty_redemptions(shop_id);
CREATE INDEX IF NOT EXISTS idx_lred_user ON public.loyalty_redemptions(user_id);
ALTER TABLE public.loyalty_redemptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "lred owner" ON public.loyalty_redemptions;
CREATE POLICY "lred owner" ON public.loyalty_redemptions USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "lred self r" ON public.loyalty_redemptions;
CREATE POLICY "lred self r" ON public.loyalty_redemptions FOR SELECT USING (auth.uid() = user_id);
DROP POLICY IF EXISTS "lred self i" ON public.loyalty_redemptions;
CREATE POLICY "lred self i" ON public.loyalty_redemptions FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.referral_programs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL DEFAULT 'Referral',
  reward_referrer_points integer NOT NULL DEFAULT 0,
  reward_referrer_cashback numeric NOT NULL DEFAULT 0,
  reward_referee_points integer NOT NULL DEFAULT 0,
  reward_referee_cashback numeric NOT NULL DEFAULT 0,
  min_referee_spend numeric NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX IF NOT EXISTS uq_refprog_shop ON public.referral_programs(shop_id);
ALTER TABLE public.referral_programs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rp owner" ON public.referral_programs;
CREATE POLICY "rp owner" ON public.referral_programs USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "rp public" ON public.referral_programs;
CREATE POLICY "rp public" ON public.referral_programs FOR SELECT USING (is_active);

CREATE TABLE IF NOT EXISTS public.referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES public.shops(id) ON DELETE CASCADE,
  referrer_user_id uuid NOT NULL, referee_user_id uuid, referee_email text,
  code text NOT NULL, status text NOT NULL DEFAULT 'pending',
  reward_points integer NOT NULL DEFAULT 0, reward_cashback numeric NOT NULL DEFAULT 0,
  first_order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  qualified_at timestamptz, rewarded_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_refer_referrer ON public.referrals(referrer_user_id);
CREATE INDEX IF NOT EXISTS idx_refer_code ON public.referrals(code);
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ref read" ON public.referrals;
CREATE POLICY "ref read" ON public.referrals FOR SELECT USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role) OR auth.uid()=referrer_user_id OR auth.uid()=referee_user_id);
DROP POLICY IF EXISTS "ref ins" ON public.referrals;
CREATE POLICY "ref ins" ON public.referrals FOR INSERT WITH CHECK (auth.uid()=referrer_user_id);

-- CASHBACK
CREATE TABLE IF NOT EXISTS public.cashback_wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE, balance numeric NOT NULL DEFAULT 0,
  total_earned numeric NOT NULL DEFAULT 0, total_redeemed numeric NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.cashback_wallets ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cw self" ON public.cashback_wallets;
CREATE POLICY "cw self" ON public.cashback_wallets USING (auth.uid()=user_id OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (auth.uid()=user_id);

CREATE TABLE IF NOT EXISTS public.cashback_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, shop_id uuid REFERENCES public.shops(id) ON DELETE SET NULL,
  order_id uuid REFERENCES public.orders(id) ON DELETE SET NULL,
  amount numeric NOT NULL, type text NOT NULL, description text,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_ctx_user ON public.cashback_transactions(user_id);
ALTER TABLE public.cashback_transactions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ctx read" ON public.cashback_transactions;
CREATE POLICY "ctx read" ON public.cashback_transactions FOR SELECT USING (auth.uid()=user_id OR public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "ctx ins" ON public.cashback_transactions;
CREATE POLICY "ctx ins" ON public.cashback_transactions FOR INSERT WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));

-- TABLES
CREATE TABLE IF NOT EXISTS public.tables (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  outlet_id uuid REFERENCES public.outlets(id) ON DELETE SET NULL,
  label text NOT NULL, capacity integer NOT NULL DEFAULT 2, zone text,
  is_active boolean NOT NULL DEFAULT true, qr_token text UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_tables_shop ON public.tables(shop_id);
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "t owner" ON public.tables;
CREATE POLICY "t owner" ON public.tables USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "t public" ON public.tables;
CREATE POLICY "t public" ON public.tables FOR SELECT USING (is_active);

CREATE TABLE IF NOT EXISTS public.table_maps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  outlet_id uuid REFERENCES public.outlets(id) ON DELETE SET NULL,
  name text NOT NULL, layout jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.table_maps ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tm owner" ON public.table_maps;
CREATE POLICY "tm owner" ON public.table_maps USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));

CREATE TABLE IF NOT EXISTS public.reservation_settings (
  shop_id uuid PRIMARY KEY REFERENCES public.shops(id) ON DELETE CASCADE,
  is_enabled boolean NOT NULL DEFAULT false, slot_minutes integer NOT NULL DEFAULT 60,
  min_party_size integer NOT NULL DEFAULT 1, max_party_size integer NOT NULL DEFAULT 10,
  buffer_minutes integer NOT NULL DEFAULT 15, deposit_required boolean NOT NULL DEFAULT false,
  deposit_amount numeric NOT NULL DEFAULT 0, advance_days integer NOT NULL DEFAULT 30,
  open_hours jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.reservation_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rs owner" ON public.reservation_settings;
CREATE POLICY "rs owner" ON public.reservation_settings USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "rs public" ON public.reservation_settings;
CREATE POLICY "rs public" ON public.reservation_settings FOR SELECT USING (is_enabled);

CREATE TABLE IF NOT EXISTS public.reservation_slots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  slot_date date NOT NULL, slot_time time NOT NULL,
  capacity integer NOT NULL DEFAULT 10, booked integer NOT NULL DEFAULT 0,
  is_blocked boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE UNIQUE INDEX IF NOT EXISTS uq_rslots ON public.reservation_slots(shop_id, slot_date, slot_time);
ALTER TABLE public.reservation_slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "rslots owner" ON public.reservation_slots;
CREATE POLICY "rslots owner" ON public.reservation_slots USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "rslots public" ON public.reservation_slots;
CREATE POLICY "rslots public" ON public.reservation_slots FOR SELECT USING (true);

CREATE TABLE IF NOT EXISTS public.reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  outlet_id uuid REFERENCES public.outlets(id) ON DELETE SET NULL,
  table_id uuid REFERENCES public.tables(id) ON DELETE SET NULL,
  slot_id uuid REFERENCES public.reservation_slots(id) ON DELETE SET NULL,
  user_id uuid, customer_name text NOT NULL, customer_phone text, customer_email text,
  party_size integer NOT NULL DEFAULT 1, reserved_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  deposit_amount numeric NOT NULL DEFAULT 0, deposit_paid boolean NOT NULL DEFAULT false,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_resv_shop_date ON public.reservations(shop_id, reserved_at);
CREATE INDEX IF NOT EXISTS idx_resv_user ON public.reservations(user_id);
ALTER TABLE public.reservations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "resv owner" ON public.reservations;
CREATE POLICY "resv owner" ON public.reservations USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "resv self r" ON public.reservations;
CREATE POLICY "resv self r" ON public.reservations FOR SELECT USING (auth.uid()=user_id);
DROP POLICY IF EXISTS "resv self i" ON public.reservations;
CREATE POLICY "resv self i" ON public.reservations FOR INSERT WITH CHECK (auth.uid()=user_id OR user_id IS NULL);

-- RETURN
CREATE TABLE IF NOT EXISTS public.return_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  order_id uuid NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  order_item_id uuid REFERENCES public.order_items(id) ON DELETE SET NULL,
  user_id uuid NOT NULL, reason text NOT NULL, description text,
  photos jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending', resolution text, refund_amount numeric,
  resolved_by uuid, resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_ret_shop ON public.return_requests(shop_id);
CREATE INDEX IF NOT EXISTS idx_ret_user ON public.return_requests(user_id);
ALTER TABLE public.return_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "ret owner" ON public.return_requests;
CREATE POLICY "ret owner" ON public.return_requests USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "ret self r" ON public.return_requests;
CREATE POLICY "ret self r" ON public.return_requests FOR SELECT USING (auth.uid()=user_id);
DROP POLICY IF EXISTS "ret self i" ON public.return_requests;
CREATE POLICY "ret self i" ON public.return_requests FOR INSERT WITH CHECK (auth.uid()=user_id);

-- THIRD PARTY
CREATE TABLE IF NOT EXISTS public.third_party_integrations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  provider text NOT NULL, name text, config jsonb NOT NULL DEFAULT '{}'::jsonb,
  credentials_encrypted text, status text NOT NULL DEFAULT 'inactive',
  last_sync_at timestamptz, last_error text,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_tpi_shop ON public.third_party_integrations(shop_id);
ALTER TABLE public.third_party_integrations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "tpi" ON public.third_party_integrations;
CREATE POLICY "tpi" ON public.third_party_integrations USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));

CREATE TABLE IF NOT EXISTS public.integration_mappings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.third_party_integrations(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  local_type text NOT NULL, local_id uuid, remote_id text NOT NULL, data jsonb,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_imap_shop ON public.integration_mappings(shop_id);
ALTER TABLE public.integration_mappings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "imap" ON public.integration_mappings;
CREATE POLICY "imap" ON public.integration_mappings USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));

CREATE TABLE IF NOT EXISTS public.integration_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  integration_id uuid NOT NULL REFERENCES public.third_party_integrations(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  event text NOT NULL, payload jsonb, signature text,
  status text NOT NULL DEFAULT 'received', error text,
  received_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_iwh_shop ON public.integration_webhooks(shop_id);
ALTER TABLE public.integration_webhooks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "iwh" ON public.integration_webhooks;
CREATE POLICY "iwh" ON public.integration_webhooks FOR SELECT USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));

CREATE TABLE IF NOT EXISTS public.api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL, key_prefix text NOT NULL, key_hash text NOT NULL,
  scopes text[] NOT NULL DEFAULT '{}', rate_limit_per_minute integer NOT NULL DEFAULT 60,
  is_active boolean NOT NULL DEFAULT true, last_used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_apik_shop ON public.api_keys(shop_id);
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "apik" ON public.api_keys;
CREATE POLICY "apik" ON public.api_keys USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));

CREATE TABLE IF NOT EXISTS public.api_usage (
  id bigserial PRIMARY KEY,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  api_key_id uuid REFERENCES public.api_keys(id) ON DELETE SET NULL,
  endpoint text NOT NULL, method text NOT NULL,
  status_code integer, duration_ms integer,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_apiu_shop_time ON public.api_usage(shop_id, created_at DESC);
ALTER TABLE public.api_usage ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "apiu" ON public.api_usage;
CREATE POLICY "apiu" ON public.api_usage FOR SELECT USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));

-- SUPER ADMIN
CREATE TABLE IF NOT EXISTS public.admin_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE, display_name text,
  permissions jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active boolean NOT NULL DEFAULT true, invited_by uuid,
  created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "au sa" ON public.admin_users;
CREATE POLICY "au sa" ON public.admin_users USING (public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'super_admin'::app_role));

CREATE TABLE IF NOT EXISTS public.affiliates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE, code text NOT NULL UNIQUE,
  display_name text, email text, commission_rate numeric NOT NULL DEFAULT 0.05,
  total_clicks integer NOT NULL DEFAULT 0, total_signups integer NOT NULL DEFAULT 0,
  total_commission numeric NOT NULL DEFAULT 0, paid_commission numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'active',
  created_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.affiliates ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "aff" ON public.affiliates;
CREATE POLICY "aff" ON public.affiliates USING (public.has_role(auth.uid(),'super_admin'::app_role) OR auth.uid()=user_id) WITH CHECK (public.has_role(auth.uid(),'super_admin'::app_role) OR auth.uid()=user_id);

CREATE TABLE IF NOT EXISTS public.data_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL, request_type text NOT NULL, status text NOT NULL DEFAULT 'pending',
  notes text, result_url text, processed_by uuid, processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_dr_user ON public.data_requests(user_id);
ALTER TABLE public.data_requests ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "dr self" ON public.data_requests;
CREATE POLICY "dr self" ON public.data_requests USING (auth.uid()=user_id OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (auth.uid()=user_id);
DROP POLICY IF EXISTS "dr admin upd" ON public.data_requests;
CREATE POLICY "dr admin upd" ON public.data_requests FOR UPDATE USING (public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.has_role(auth.uid(),'super_admin'::app_role));

CREATE TABLE IF NOT EXISTS public.shop_health_score (
  shop_id uuid PRIMARY KEY REFERENCES public.shops(id) ON DELETE CASCADE,
  overall_score integer NOT NULL DEFAULT 0, sla_score integer NOT NULL DEFAULT 0,
  fulfillment_score integer NOT NULL DEFAULT 0, rating_score integer NOT NULL DEFAULT 0,
  complaint_score integer NOT NULL DEFAULT 0,
  metrics jsonb NOT NULL DEFAULT '{}'::jsonb,
  computed_at timestamptz NOT NULL DEFAULT now());
ALTER TABLE public.shop_health_score ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "shs" ON public.shop_health_score;
CREATE POLICY "shs" ON public.shop_health_score USING (public.has_role(auth.uid(),'super_admin'::app_role) OR public.is_shop_owner(shop_id)) WITH CHECK (public.has_role(auth.uid(),'super_admin'::app_role));

-- CLINIC
CREATE TABLE IF NOT EXISTS public.shop_skin_quiz (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  user_id uuid, customer_name text, customer_phone text,
  answers jsonb NOT NULL DEFAULT '{}'::jsonb,
  skin_type text, concerns text[], recommended_products jsonb,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_sq_shop ON public.shop_skin_quiz(shop_id);
ALTER TABLE public.shop_skin_quiz ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "sq r" ON public.shop_skin_quiz;
CREATE POLICY "sq r" ON public.shop_skin_quiz FOR SELECT USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role) OR auth.uid()=user_id);
DROP POLICY IF EXISTS "sq i" ON public.shop_skin_quiz;
CREATE POLICY "sq i" ON public.shop_skin_quiz FOR INSERT WITH CHECK (true);

CREATE TABLE IF NOT EXISTS public.shop_product_claims (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  menu_item_id uuid REFERENCES public.menu_items(id) ON DELETE CASCADE,
  claim_type text NOT NULL, claim_value text, certificate_url text, expires_at date,
  is_verified boolean NOT NULL DEFAULT false, verified_by uuid, verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now());
CREATE INDEX IF NOT EXISTS idx_spc_shop ON public.shop_product_claims(shop_id);
ALTER TABLE public.shop_product_claims ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "spc owner" ON public.shop_product_claims;
CREATE POLICY "spc owner" ON public.shop_product_claims USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));
DROP POLICY IF EXISTS "spc pub" ON public.shop_product_claims;
CREATE POLICY "spc pub" ON public.shop_product_claims FOR SELECT USING (is_verified);

-- VIEWS
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

-- RPCs
CREATE OR REPLACE FUNCTION public.start_queue_session(_shop_id uuid, _label text DEFAULT NULL, _avg_minutes integer DEFAULT 5)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT (public.is_shop_owner(_shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.queue_sessions SET is_active=false, ended_at=now() WHERE shop_id=_shop_id AND is_active=true;
  INSERT INTO public.queue_sessions(shop_id, session_date, label, avg_service_minutes, is_active, started_at)
  VALUES (_shop_id, CURRENT_DATE, _label, COALESCE(_avg_minutes,5), true, now()) RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.take_queue_number(_shop_id uuid, _customer_name text DEFAULT NULL, _customer_phone text DEFAULT NULL, _notes text DEFAULT NULL)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _session_id uuid; _num integer; _id uuid;
BEGIN
  SELECT id INTO _session_id FROM public.queue_sessions WHERE shop_id=_shop_id AND is_active=true ORDER BY started_at DESC LIMIT 1;
  IF _session_id IS NULL THEN
    INSERT INTO public.queue_sessions(shop_id, session_date, is_active, started_at) VALUES (_shop_id, CURRENT_DATE, true, now()) RETURNING id INTO _session_id;
  END IF;
  SELECT COALESCE(MAX(queue_number),0)+1 INTO _num FROM public.queue_entries WHERE session_id=_session_id;
  INSERT INTO public.queue_entries(session_id, shop_id, queue_number, customer_name, customer_phone, notes, status)
  VALUES (_session_id, _shop_id, _num, _customer_name, _customer_phone, _notes, 'waiting') RETURNING id INTO _id;
  RETURN jsonb_build_object('id', _id, 'session_id', _session_id, 'queue_number', _num);
END $$;

CREATE OR REPLACE FUNCTION public.call_next_queue(_shop_id uuid)
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _entry public.queue_entries%ROWTYPE;
BEGIN
  IF NOT (public.is_shop_owner(_shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO _entry FROM public.queue_entries WHERE shop_id=_shop_id AND status='waiting' ORDER BY queue_number ASC LIMIT 1;
  IF _entry.id IS NULL THEN RETURN NULL; END IF;
  UPDATE public.queue_entries SET status='called', called_at=now() WHERE id=_entry.id;
  UPDATE public.queue_sessions SET current_number=_entry.queue_number WHERE id=_entry.session_id;
  RETURN to_jsonb(_entry);
END $$;

CREATE OR REPLACE FUNCTION public.skip_queue_entry(_entry_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _shop uuid;
BEGIN
  SELECT shop_id INTO _shop FROM public.queue_entries WHERE id=_entry_id;
  IF NOT (public.is_shop_owner(_shop) OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.queue_entries SET status='skipped', done_at=now() WHERE id=_entry_id;
END $$;

CREATE OR REPLACE FUNCTION public.generate_reservation_slots(_shop_id uuid, _date date, _start time, _end time, _slot_minutes integer DEFAULT 60, _capacity integer DEFAULT 10)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _t time := _start; _n integer := 0;
BEGIN
  IF NOT (public.is_shop_owner(_shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN RAISE EXCEPTION 'forbidden'; END IF;
  WHILE _t < _end LOOP
    INSERT INTO public.reservation_slots(shop_id, slot_date, slot_time, capacity) VALUES (_shop_id, _date, _t, _capacity)
    ON CONFLICT (shop_id, slot_date, slot_time) DO NOTHING;
    _t := _t + (_slot_minutes || ' minutes')::interval; _n := _n + 1;
  END LOOP;
  RETURN _n;
END $$;

CREATE OR REPLACE FUNCTION public.check_table_availability(_shop_id uuid, _reserved_at timestamptz, _party_size integer DEFAULT 1)
RETURNS TABLE(table_id uuid, label text, capacity integer) LANGUAGE sql STABLE SECURITY DEFINER SET search_path=public AS $$
  SELECT t.id, t.label, t.capacity FROM public.tables t
  WHERE t.shop_id=_shop_id AND t.is_active AND t.capacity >= _party_size
    AND NOT EXISTS (SELECT 1 FROM public.reservations r WHERE r.table_id=t.id AND r.status IN ('pending','confirmed','seated') AND abs(extract(epoch FROM (r.reserved_at - _reserved_at))) < 3600)
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
  RETURN jsonb_build_object('voucher_id', _v.id, 'discount', COALESCE(_v.discount_amount, 0));
END $$;

CREATE OR REPLACE FUNCTION public.reschedule_booking(_booking_id uuid, _new_start timestamptz)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _shop uuid;
BEGIN
  SELECT shop_id INTO _shop FROM public.bookings WHERE id=_booking_id;
  IF NOT (public.is_shop_owner(_shop) OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.bookings SET start_at=_new_start, updated_at=now() WHERE id=_booking_id;
END $$;

CREATE OR REPLACE FUNCTION public.award_referral_bonus(_referral_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _r public.referrals%ROWTYPE;
BEGIN
  SELECT * INTO _r FROM public.referrals WHERE id=_referral_id;
  IF _r.id IS NULL OR _r.status='rewarded' THEN RETURN; END IF;
  UPDATE public.referrals SET status='rewarded', rewarded_at=now() WHERE id=_referral_id;
  IF _r.reward_cashback>0 AND _r.referrer_user_id IS NOT NULL THEN
    INSERT INTO public.cashback_wallets(user_id, balance, total_earned)
    VALUES (_r.referrer_user_id, _r.reward_cashback, _r.reward_cashback)
    ON CONFLICT (user_id) DO UPDATE SET balance=cashback_wallets.balance+EXCLUDED.balance, total_earned=cashback_wallets.total_earned+EXCLUDED.total_earned, updated_at=now();
    INSERT INTO public.cashback_transactions(user_id, shop_id, amount, type, description)
    VALUES (_r.referrer_user_id, _r.shop_id, _r.reward_cashback, 'earn', 'Bonus referral');
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.record_download(_license_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  UPDATE public.digital_licenses SET download_count=COALESCE(download_count,0)+1, last_downloaded_at=now() WHERE id=_license_id;
  INSERT INTO public.digital_download_logs(license_id, downloaded_at) VALUES (_license_id, now());
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
  _uid := COALESCE(_user_id, auth.uid());
  IF _uid IS NULL THEN RAISE EXCEPTION 'auth required'; END IF;
  INSERT INTO public.data_requests(user_id, request_type, status) VALUES (_uid, 'export', 'pending') RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.request_shop_backup(_shop_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _id uuid;
BEGIN
  IF NOT (public.is_shop_owner(_shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role)) THEN RAISE EXCEPTION 'forbidden'; END IF;
  INSERT INTO public.shop_backups(shop_id, status, requested_by, requested_at) VALUES (_shop_id, 'pending', auth.uid(), now()) RETURNING id INTO _id;
  RETURN _id;
END $$;

CREATE OR REPLACE FUNCTION public.run_plan_maintenance()
RETURNS jsonb LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE _expired integer := 0;
BEGIN
  IF NOT public.has_role(auth.uid(),'super_admin'::app_role) THEN RAISE EXCEPTION 'forbidden'; END IF;
  UPDATE public.shops SET plan='basic'
   WHERE plan_expires_at IS NOT NULL AND plan_expires_at < now() AND plan <> 'basic';
  GET DIAGNOSTICS _expired = ROW_COUNT;
  RETURN jsonb_build_object('expired', _expired);
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
  SELECT count(*) INTO _count FROM public.api_usage WHERE api_key_id=_api_key_id AND created_at > now() - interval '1 minute';
  RETURN _count < _limit;
END $$;

CREATE OR REPLACE FUNCTION public.record_api_usage(_api_key_id uuid, _shop_id uuid, _endpoint text, _method text, _status integer DEFAULT 200, _duration_ms integer DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
BEGIN
  INSERT INTO public.api_usage(shop_id, api_key_id, endpoint, method, status_code, duration_ms) VALUES (_shop_id, _api_key_id, _endpoint, _method, _status, _duration_ms);
  UPDATE public.api_keys SET last_used_at=now() WHERE id=_api_key_id;
END $$;

DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT unnest(ARRAY['loyalty_tiers','loyalty_rewards','referral_programs','tables','table_maps','reservation_settings','reservations','return_requests','third_party_integrations']) LOOP
    EXECUTE format('DROP TRIGGER IF EXISTS trg_%I_touch ON public.%I;', t, t);
    EXECUTE format('CREATE TRIGGER trg_%I_touch BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();', t, t);
  END LOOP;
END $$;
