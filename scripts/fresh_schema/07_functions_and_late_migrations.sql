-- =============================================================================
-- FRESH SCHEMA — PART 7: Business Logic Functions & Late Migrations
-- Konsolidasi dari: fase2, fase3_fase4, fase6_fase7, fase8_fase9, fase10
-- Semua statement idempoten (IF NOT EXISTS / OR REPLACE / ON CONFLICT DO NOTHING)
-- Jalankan SETELAH 01–06
-- =============================================================================

-- =============================================================================
-- SECTION 1 — EXTENSIONS
-- =============================================================================
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============================================================================
-- SECTION 2 — HELPER FUNCTION: set_updated_at
-- =============================================================================
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Triggers updated_at untuk tabel yang tidak punya trigger di 01-06
DO $$
DECLARE
  tbl TEXT;
BEGIN
  FOREACH tbl IN ARRAY ARRAY[
    'marketing_campaigns', 'storefront_layouts', 'group_buys',
    'product_subscription_plans', 'product_subscriptions',
    'consultation_sessions', 'live_sessions'
  ]
  LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = tbl AND column_name = 'updated_at'
    ) THEN
      EXECUTE format('
        DROP TRIGGER IF EXISTS trg_%1$s_updated_at ON public.%1$s;
        CREATE TRIGGER trg_%1$s_updated_at
          BEFORE UPDATE ON public.%1$s
          FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
      ', tbl);
    END IF;
  END LOOP;
END $$;

-- =============================================================================
-- SECTION 3 — GIN / FULL-TEXT SEARCH INDEXES
-- =============================================================================
-- menu_items FTS (name + description, indonesian)
CREATE INDEX IF NOT EXISTS idx_menu_items_fts
  ON public.menu_items
  USING GIN (to_tsvector('indonesian', coalesce(name,'') || ' ' || coalesce(description,'')));

-- shops FTS (name + description + city)
CREATE INDEX IF NOT EXISTS idx_shops_fts
  ON public.shops
  USING GIN (to_tsvector('indonesian', coalesce(name,'') || ' ' || coalesce(description,'') || ' ' || coalesce(city,'')));

-- Trigram indexes untuk ILIKE cepat
CREATE INDEX IF NOT EXISTS idx_menu_items_name_trgm
  ON public.menu_items USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_shops_name_trgm
  ON public.shops USING GIN (name gin_trgm_ops);

-- =============================================================================
-- SECTION 4 — KEYSET PAGINATION INDEXES
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_shop_customers_keyset
  ON public.shop_customers (shop_id, total_spent DESC, id);

CREATE INDEX IF NOT EXISTS idx_product_reviews_keyset
  ON public.product_reviews (shop_id, created_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_menu_reviews_keyset
  ON public.menu_reviews (shop_id, created_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_notifications_keyset
  ON public.notifications (recipient_user_id, created_at DESC, id)
  WHERE dismissed_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_orders_keyset
  ON public.orders (shop_id, created_at DESC, id);

-- =============================================================================
-- SECTION 5 — LATE ALTER TABLE ADDITIONS
-- =============================================================================

-- menu_items: Flash Sale columns
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS flash_price         NUMERIC(14,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS flash_starts_at     TIMESTAMPTZ   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS flash_ends_at       TIMESTAMPTZ   DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_mi_flash_active
  ON public.menu_items (flash_ends_at)
  WHERE flash_price IS NOT NULL AND flash_ends_at IS NOT NULL;

-- menu_items: Happy Hour columns
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS happy_hour_start         TIME      DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS happy_hour_end           TIME      DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS happy_hour_discount_pct  SMALLINT  DEFAULT NULL
    CHECK (happy_hour_discount_pct IS NULL OR happy_hour_discount_pct BETWEEN 1 AND 99);

-- orders: commission tracking (commission_fee adalah GENERATED column di 06 dari commission_amount)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS commission_rate NUMERIC(6,4) DEFAULT 0;

-- couriers: saldo penghasilan (fase10)
ALTER TABLE public.couriers
  ADD COLUMN IF NOT EXISTS balance       NUMERIC(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_earned  NUMERIC(15,2) NOT NULL DEFAULT 0;

-- withdrawal_requests: kurir (fase10)
ALTER TABLE public.withdrawal_requests
  ADD COLUMN IF NOT EXISTS courier_id UUID REFERENCES public.couriers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_courier
  ON public.withdrawal_requests (courier_id)
  WHERE courier_id IS NOT NULL;

-- =============================================================================
-- SECTION 6 — VIEWS
-- =============================================================================

-- Flash sale aktif (view helper)
CREATE OR REPLACE VIEW public.menu_items_flash_active AS
SELECT *
FROM public.menu_items
WHERE flash_price IS NOT NULL
  AND flash_starts_at <= now()
  AND flash_ends_at   >= now()
  AND is_active = TRUE;

-- Rata-rata rating per kurir
CREATE OR REPLACE VIEW public.courier_rating_summary AS
SELECT
  courier_id,
  COUNT(*)::INT                    AS total_ratings,
  ROUND(AVG(rating)::NUMERIC, 2)  AS avg_rating
FROM public.courier_ratings
GROUP BY courier_id;

-- Backward-compat alias: email_campaigns → marketing_campaigns
CREATE OR REPLACE VIEW public.email_campaigns AS
SELECT
  id, shop_id, name, subject, body_html, segment,
  status, recipient_count, scheduled_at, sent_at, created_at, updated_at
FROM public.marketing_campaigns;

-- =============================================================================
-- SECTION 7 — BUSINESS LOGIC FUNCTIONS
-- =============================================================================

-- ─── fn_notify_restock ───────────────────────────────────────────────────────
-- Dipanggil setelah stok item diisi ulang; notifikasi semua subscriber
CREATE OR REPLACE FUNCTION public.fn_notify_restock(_menu_item_id UUID)
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _item_name TEXT;
  _count     INT := 0;
  _sub       RECORD;
BEGIN
  SELECT name INTO _item_name FROM public.menu_items WHERE id = _menu_item_id;
  IF NOT FOUND THEN RETURN 0; END IF;

  FOR _sub IN
    SELECT id, user_id, email
    FROM public.restock_subscribers
    WHERE menu_item_id = _menu_item_id AND notified_at IS NULL
  LOOP
    IF _sub.user_id IS NOT NULL THEN
      INSERT INTO public.notifications (recipient_user_id, type, title, body)
      VALUES (
        _sub.user_id,
        'restock',
        'Stok tersedia!',
        _item_name || ' sudah tersedia kembali. Pesan sekarang sebelum habis!'
      ) ON CONFLICT DO NOTHING;
    END IF;

    UPDATE public.restock_subscribers SET notified_at = now() WHERE id = _sub.id;
    _count := _count + 1;
  END LOOP;

  RETURN _count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_notify_restock TO service_role;

-- ─── fn_apply_commission ──────────────────────────────────────────────────────
-- Hitung dan catat komisi platform untuk sebuah order.
-- Menulis ke commission_amount (lalu commission_fee digenerate otomatis di 06).
CREATE OR REPLACE FUNCTION public.fn_apply_commission(_order_id UUID)
RETURNS NUMERIC
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _order        RECORD;
  _shop         RECORD;
  _cfg          JSONB;
  _enabled      BOOLEAN;
  _rate         NUMERIC;
  _min_order    NUMERIC;
  _mp_only      BOOLEAN;
  _fee          NUMERIC := 0;
  _cat_override JSONB;
BEGIN
  SELECT o.id, o.shop_id, o.total, o.channel, s.business_category_id, s.plan_id
  INTO _order
  FROM public.orders o
  JOIN public.shops  s ON s.id = o.shop_id
  WHERE o.id = _order_id;

  IF NOT FOUND THEN RETURN 0; END IF;

  SELECT value INTO _cfg
  FROM public.platform_settings
  WHERE key = 'commission_config';

  _enabled := COALESCE((_cfg->>'enabled')::BOOLEAN, FALSE);
  IF NOT _enabled THEN RETURN 0; END IF;

  _min_order := COALESCE((_cfg->>'min_order_value')::NUMERIC, 10000);
  _mp_only   := COALESCE((_cfg->>'apply_to_marketplace_only')::BOOLEAN, TRUE);

  IF _mp_only AND _order.channel NOT IN ('marketplace', 'online') THEN RETURN 0; END IF;
  IF _order.total < _min_order THEN RETURN 0; END IF;

  -- Rate berdasarkan plan
  IF _order.plan_id IS NOT NULL THEN
    SELECT name INTO _shop FROM public.plans WHERE id = _order.plan_id;
    IF _shop.name ILIKE '%pro%' THEN
      _rate := COALESCE((_cfg->>'pro_plan_rate')::NUMERIC, 3) / 100.0;
    ELSIF _shop.name ILIKE '%free%' THEN
      _rate := COALESCE((_cfg->>'free_plan_rate')::NUMERIC, 5) / 100.0;
    ELSE
      _rate := COALESCE((_cfg->>'default_rate')::NUMERIC, 4) / 100.0;
    END IF;
  ELSE
    _rate := COALESCE((_cfg->>'default_rate')::NUMERIC, 4) / 100.0;
  END IF;

  -- Override per kategori bisnis
  IF _cfg->'category_overrides' IS NOT NULL THEN
    SELECT elem INTO _cat_override
    FROM jsonb_array_elements(_cfg->'category_overrides') elem
    WHERE elem->>'id' = (
      SELECT slug FROM public.business_categories WHERE id = _order.business_category_id
    )
    LIMIT 1;
    IF FOUND AND _cat_override IS NOT NULL THEN
      _rate := COALESCE((_cat_override->>'rate')::NUMERIC, _rate * 100) / 100.0;
    END IF;
  END IF;

  _fee := ROUND(_order.total * _rate, 0);

  IF _cat_override IS NOT NULL THEN
    IF (_cat_override->>'min_fee') IS NOT NULL THEN
      _fee := GREATEST(_fee, (_cat_override->>'min_fee')::NUMERIC);
    END IF;
    IF (_cat_override->>'max_fee') IS NOT NULL THEN
      _fee := LEAST(_fee, (_cat_override->>'max_fee')::NUMERIC);
    END IF;
  END IF;

  -- Tulis ke commission_amount (commission_fee di-generate otomatis dari kolom ini)
  UPDATE public.orders
  SET commission_amount = _fee, commission_rate = _rate
  WHERE id = _order_id;

  -- Kurangi dari saldo toko
  UPDATE public.shop_wallets
  SET pending_balance = GREATEST(0, pending_balance - _fee)
  WHERE shop_id = _order.shop_id;

  RETURN _fee;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_apply_commission TO service_role;

-- ─── fn_auto_cancel_expired ───────────────────────────────────────────────────
-- Auto-cancel pesanan pending yang sudah melewati batas waktu.
-- Dikonfigurasi via platform_settings: auto_cancel_hours, auto_cancel_enabled.
CREATE OR REPLACE FUNCTION public.fn_auto_cancel_expired()
RETURNS INT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _hours    INT;
  _enabled  BOOLEAN;
  _cnt      INT := 0;
  _cutoff   TIMESTAMPTZ;
BEGIN
  SELECT (value::TEXT)::INT INTO _hours
  FROM public.platform_settings WHERE key = 'auto_cancel_hours';
  _hours := COALESCE(_hours, 24);

  SELECT (value::TEXT) = 'true' INTO _enabled
  FROM public.platform_settings WHERE key = 'auto_cancel_enabled';
  IF NOT COALESCE(_enabled, TRUE) THEN RETURN 0; END IF;

  _cutoff := now() - (_hours || ' hours')::INTERVAL;

  WITH cancelled AS (
    UPDATE public.orders
    SET status = 'cancelled', updated_at = now()
    WHERE status IN ('pending', 'awaiting_payment')
      AND created_at < _cutoff
    RETURNING id
  )
  SELECT COUNT(*) INTO _cnt FROM cancelled;

  INSERT INTO public.cron_runs (job_name, started_at, finished_at, result)
  VALUES ('auto_cancel_expired', now(), now(), jsonb_build_object('cancelled', _cnt));

  RETURN _cnt;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_auto_cancel_expired TO service_role;

-- ─── fn_gdpr_erase_user ───────────────────────────────────────────────────────
-- Anonimisasi data pengguna (UU PDP / GDPR). Data agregat tetap ada.
CREATE OR REPLACE FUNCTION public.fn_gdpr_erase_user(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result      JSONB := '{}';
  _orders_anon INT   := 0;
  _profile_del INT   := 0;
BEGIN
  UPDATE public.orders
  SET customer_name  = 'Pengguna Dihapus',
      customer_phone = NULL,
      customer_email = NULL,
      user_id        = NULL
  WHERE user_id = _user_id;
  GET DIAGNOSTICS _orders_anon = ROW_COUNT;

  UPDATE public.bookings
  SET customer_name  = 'Pengguna Dihapus',
      customer_phone = NULL,
      customer_email = NULL
  WHERE user_id = _user_id;

  DELETE FROM public.customer_profiles   WHERE user_id = _user_id;
  GET DIAGNOSTICS _profile_del = ROW_COUNT;

  DELETE FROM public.push_subscriptions  WHERE user_id = _user_id;
  DELETE FROM public.notifications       WHERE recipient_user_id = _user_id;
  DELETE FROM public.marketplace_carts   WHERE user_id = _user_id;

  _result := jsonb_build_object(
    'user_id',           _user_id,
    'erased_at',         now(),
    'orders_anonymised', _orders_anon,
    'profile_deleted',   _profile_del
  );

  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_gdpr_erase_user TO service_role;

-- ─── fn_churn_metrics_snapshot ────────────────────────────────────────────────
-- Snapshot metrik churn toko ke cron_runs. Dipanggil berkala oleh cron/pg_cron.
CREATE OR REPLACE FUNCTION public.fn_churn_metrics_snapshot()
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result JSONB;
BEGIN
  SELECT jsonb_build_object(
    'snapshot_at',  now(),
    'expiring_7d',  (SELECT COUNT(*) FROM public.shops WHERE plan_expires_at BETWEEN now() AND now() + INTERVAL '7 days'),
    'expiring_30d', (SELECT COUNT(*) FROM public.shops WHERE plan_expires_at BETWEEN now() AND now() + INTERVAL '30 days'),
    'expired',      (SELECT COUNT(*) FROM public.shops WHERE plan_expires_at < now() AND plan_expires_at IS NOT NULL),
    'inactive_14d', (
      SELECT COUNT(DISTINCT s.id) FROM public.shops s
      LEFT JOIN public.orders o ON o.shop_id = s.id AND o.created_at > now() - INTERVAL '14 days'
      WHERE o.id IS NULL AND s.is_active = TRUE
    )
  ) INTO _result;

  INSERT INTO public.cron_runs (job_name, started_at, finished_at, result)
  VALUES ('churn_metrics_snapshot', now(), now(), _result);

  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_churn_metrics_snapshot TO service_role;

-- ─── fn_generate_api_key ──────────────────────────────────────────────────────
-- Generate API key baru untuk merchant. Mengembalikan {key_id, full_key, prefix}.
-- full_key hanya ditampilkan sekali ke merchant.
CREATE OR REPLACE FUNCTION public.fn_generate_api_key(
  _shop_id    UUID,
  _name       TEXT,
  _scopes     TEXT[]    DEFAULT ARRAY['read'],
  _expires_at TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _prefix   TEXT := 'umkm_live_';
  _rand     TEXT;
  _full_key TEXT;
  _hash     TEXT;
  _key_id   UUID;
BEGIN
  SELECT encode(gen_random_bytes(24), 'hex') INTO _rand;
  _full_key := _prefix || _rand;
  _hash     := md5(_full_key);

  INSERT INTO public.api_keys (shop_id, name, key_prefix, key_hash, scopes, expires_at, created_by)
  VALUES (_shop_id, _name, _prefix, _hash, _scopes, _expires_at, auth.uid())
  RETURNING id INTO _key_id;

  RETURN jsonb_build_object(
    'key_id',   _key_id,
    'full_key', _full_key,
    'prefix',   _prefix
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_generate_api_key TO authenticated;

-- =============================================================================
-- SECTION 8 — PLATFORM SETTINGS SEED (gateway & email defaults)
-- =============================================================================
-- Baris ini membuat entry platform_settings untuk konfigurasi payment gateway
-- dan email. Nilai awal NULL / default; diisi via Super Admin UI.
INSERT INTO public.platform_settings (key, value, is_encrypted, category, description)
VALUES
  -- Midtrans
  ('gateway_midtrans_enabled',     'false',   FALSE, 'payment', 'Aktifkan Midtrans'),
  ('gateway_midtrans_server_key',  NULL,      TRUE,  'payment', 'Midtrans Server Key'),
  ('gateway_midtrans_client_key',  NULL,      TRUE,  'payment', 'Midtrans Client Key'),
  ('gateway_midtrans_mode',        'sandbox', FALSE, 'payment', 'Mode Midtrans (sandbox/production)'),
  -- Xendit
  ('gateway_xendit_enabled',       'false',   FALSE, 'payment', 'Aktifkan Xendit'),
  ('gateway_xendit_secret_key',    NULL,      TRUE,  'payment', 'Xendit Secret Key'),
  ('gateway_xendit_webhook_token', NULL,      FALSE, 'payment', 'Xendit Webhook Verification Token'),
  ('gateway_xendit_mode',          'test',    FALSE, 'payment', 'Mode Xendit (test/live)'),
  -- Email / Resend
  ('email_resend_api_key',         NULL,      TRUE,  'email',   'Resend API Key'),
  ('email_from',       'UMKMgo <noreply@umkmgo.id>', FALSE, 'email', 'Pengirim Email Default'),
  ('email_enabled',                'false',   FALSE, 'email',   'Aktifkan Pengiriman Email'),
  -- System behaviour
  ('auto_cancel_enabled', 'true',  FALSE, 'system', 'Auto-cancel pesanan kedaluwarsa'),
  ('auto_cancel_hours',   '24',    FALSE, 'system', 'Jam sebelum pesanan otomatis dibatalkan'),
  ('commission_config',
    '{"enabled":false,"default_rate":4,"free_plan_rate":5,"pro_plan_rate":3,"apply_to_marketplace_only":true,"min_order_value":10000}',
    FALSE, 'payment', 'Konfigurasi komisi platform')
ON CONFLICT (key) DO NOTHING;

-- =============================================================================
-- SECTION 9 — RLS POLICIES (tabel yang dibuat di 06_post_consolidation)
-- =============================================================================

-- ── group_buys ────────────────────────────────────────────────────────────────
ALTER TABLE public.group_buys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gb_public_read  ON public.group_buys;
DROP POLICY IF EXISTS gb_shop_owner   ON public.group_buys;
CREATE POLICY gb_public_read ON public.group_buys
  FOR SELECT USING (true);
CREATE POLICY gb_shop_owner  ON public.group_buys
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- ── group_buy_participants ────────────────────────────────────────────────────
ALTER TABLE public.group_buy_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gbp_owner  ON public.group_buy_participants;
DROP POLICY IF EXISTS gbp_insert ON public.group_buy_participants;
CREATE POLICY gbp_owner ON public.group_buy_participants
  USING (user_id = auth.uid()
    OR shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));
CREATE POLICY gbp_insert ON public.group_buy_participants
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── product_subscription_plans ───────────────────────────────────────────────
ALTER TABLE public.product_subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS psp_public_read  ON public.product_subscription_plans;
DROP POLICY IF EXISTS psp_shop_owner   ON public.product_subscription_plans;
CREATE POLICY psp_public_read ON public.product_subscription_plans
  FOR SELECT USING (true);
CREATE POLICY psp_shop_owner  ON public.product_subscription_plans
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- ── product_subscriptions ────────────────────────────────────────────────────
ALTER TABLE public.product_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ps_user_or_shop ON public.product_subscriptions;
DROP POLICY IF EXISTS ps_insert       ON public.product_subscriptions;
CREATE POLICY ps_user_or_shop ON public.product_subscriptions
  USING (user_id = auth.uid()
    OR shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));
CREATE POLICY ps_insert ON public.product_subscriptions
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── bnpl_applications ────────────────────────────────────────────────────────
ALTER TABLE public.bnpl_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bnpl_user_or_shop ON public.bnpl_applications;
DROP POLICY IF EXISTS bnpl_insert       ON public.bnpl_applications;
CREATE POLICY bnpl_user_or_shop ON public.bnpl_applications
  USING (user_id = auth.uid()
    OR shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));
CREATE POLICY bnpl_insert ON public.bnpl_applications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── consultation_slots ────────────────────────────────────────────────────────
ALTER TABLE public.consultation_slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS csl_public_read ON public.consultation_slots;
DROP POLICY IF EXISTS csl_shop_owner  ON public.consultation_slots;
CREATE POLICY csl_public_read ON public.consultation_slots
  FOR SELECT USING (true);
CREATE POLICY csl_shop_owner  ON public.consultation_slots
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- ── consultation_sessions ────────────────────────────────────────────────────
ALTER TABLE public.consultation_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cse_user_or_shop ON public.consultation_sessions;
DROP POLICY IF EXISTS cse_insert       ON public.consultation_sessions;
CREATE POLICY cse_user_or_shop ON public.consultation_sessions
  USING (user_id = auth.uid()
    OR shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));
CREATE POLICY cse_insert ON public.consultation_sessions
  FOR INSERT WITH CHECK (true);

-- ── live_sessions ─────────────────────────────────────────────────────────────
ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ls_public_read ON public.live_sessions;
DROP POLICY IF EXISTS ls_shop_owner  ON public.live_sessions;
CREATE POLICY ls_public_read ON public.live_sessions
  FOR SELECT USING (true);
CREATE POLICY ls_shop_owner  ON public.live_sessions
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- ── live_chat_messages ────────────────────────────────────────────────────────
ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lcm_public_read ON public.live_chat_messages;
DROP POLICY IF EXISTS lcm_insert      ON public.live_chat_messages;
CREATE POLICY lcm_public_read ON public.live_chat_messages
  FOR SELECT USING (true);
CREATE POLICY lcm_insert ON public.live_chat_messages
  FOR INSERT WITH CHECK (true);

-- ── courier_ratings ───────────────────────────────────────────────────────────
ALTER TABLE public.courier_ratings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS courier_ratings_insert ON public.courier_ratings;
DROP POLICY IF EXISTS courier_ratings_select ON public.courier_ratings;
CREATE POLICY courier_ratings_insert ON public.courier_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY courier_ratings_select ON public.courier_ratings
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.couriers c WHERE c.id = courier_id AND c.user_id = auth.uid())
    OR EXISTS (SELECT 1 FROM public.staff_members sm WHERE sm.shop_id = courier_ratings.shop_id AND sm.user_id = auth.uid())
  );

-- ── platform_settings RLS ─────────────────────────────────────────────────────
-- Super admin bisa baca/tulis semua, user biasa tidak bisa akses
ALTER TABLE public.platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS platform_settings_admin   ON public.platform_settings;
DROP POLICY IF EXISTS platform_settings_service ON public.platform_settings;
CREATE POLICY platform_settings_admin ON public.platform_settings
  USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));
CREATE POLICY platform_settings_service ON public.platform_settings
  TO service_role USING (true) WITH CHECK (true);

-- =============================================================================
-- SECTION 10 — SUPABASE REALTIME
-- =============================================================================
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'live_chat_messages'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_messages;
  END IF;
EXCEPTION WHEN OTHERS THEN
  -- publication mungkin sudah ada atau tidak tersedia; skip
  NULL;
END $$;

-- =============================================================================
-- SELESAI — 07_functions_and_late_migrations.sql
-- =============================================================================
