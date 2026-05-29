-- =============================================================================
-- FASE 8 & 9 MIGRATIONS — UMKMgo
-- Dijalankan setelah fase6_fase7_migrations.sql
-- Dibuat: 29 Mei 2026
-- =============================================================================

-- ─────────────────────────────────────────────────────────────────────────────
-- F8-2  bulk_pricing_rules
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bulk_pricing_rules (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  menu_item_id  UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  min_qty       INT  NOT NULL CHECK (min_qty >= 1),
  max_qty       INT  DEFAULT NULL CHECK (max_qty IS NULL OR max_qty >= min_qty),
  price         NUMERIC(12,2) NOT NULL,
  label         TEXT DEFAULT NULL,
  sort_order    INT  NOT NULL DEFAULT 0,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bulk_pricing_shop   ON public.bulk_pricing_rules (shop_id);
CREATE INDEX IF NOT EXISTS idx_bulk_pricing_item   ON public.bulk_pricing_rules (menu_item_id);

ALTER TABLE public.bulk_pricing_rules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS bulk_pricing_shop_access ON public.bulk_pricing_rules;
CREATE POLICY bulk_pricing_shop_access ON public.bulk_pricing_rules
  USING (public.user_belongs_to_shop(auth.uid(), shop_id))
  WITH CHECK (public.user_belongs_to_shop(auth.uid(), shop_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- F8-3  restock_subscribers  (table may already exist — keep safe)
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.restock_subscribers (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  menu_item_id  UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  user_id       UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  email         TEXT,
  phone         TEXT,
  notified_at   TIMESTAMPTZ DEFAULT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT restock_sub_contact CHECK (user_id IS NOT NULL OR email IS NOT NULL OR phone IS NOT NULL)
);

CREATE INDEX IF NOT EXISTS idx_restock_item ON public.restock_subscribers (menu_item_id);

ALTER TABLE public.restock_subscribers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS restock_sub_owner ON public.restock_subscribers;
CREATE POLICY restock_sub_owner ON public.restock_subscribers
  FOR SELECT TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS restock_sub_insert ON public.restock_subscribers;
CREATE POLICY restock_sub_insert ON public.restock_subscribers
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────────────
-- F8-3  fn_notify_restock — dipanggil setelah stok diisi ulang
-- ─────────────────────────────────────────────────────────────────────────────
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
    -- Insert in-app notification
    IF _sub.user_id IS NOT NULL THEN
      INSERT INTO public.notifications (recipient_user_id, type, title, body)
      VALUES (
        _sub.user_id,
        'restock',
        'Stok tersedia!',
        _item_name || ' sudah tersedia kembali. Pesan sekarang sebelum habis!'
      ) ON CONFLICT DO NOTHING;
    END IF;

    -- Mark as notified
    UPDATE public.restock_subscribers SET notified_at = now() WHERE id = _sub.id;
    _count := _count + 1;
  END LOOP;

  RETURN _count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_notify_restock TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- F8-5  Flash Sale — pastikan kolom ada di menu_items
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS flash_price       NUMERIC(12,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS flash_starts_at   TIMESTAMPTZ   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS flash_ends_at     TIMESTAMPTZ   DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_menu_flash_ends
  ON public.menu_items (flash_ends_at)
  WHERE flash_ends_at IS NOT NULL;

-- View helper: menu items currently in active flash sale
CREATE OR REPLACE VIEW public.menu_items_flash_active AS
SELECT *
FROM public.menu_items
WHERE flash_price IS NOT NULL
  AND flash_starts_at <= now()
  AND flash_ends_at   >= now()
  AND is_active = TRUE;

-- ─────────────────────────────────────────────────────────────────────────────
-- F8-6  Happy Hour — kolom di menu_items
-- ─────────────────────────────────────────────────────────────────────────────
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS happy_hour_start  TIME          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS happy_hour_end    TIME          DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS happy_hour_discount_pct SMALLINT DEFAULT NULL
    CHECK (happy_hour_discount_pct IS NULL OR (happy_hour_discount_pct BETWEEN 1 AND 99));

-- ─────────────────────────────────────────────────────────────────────────────
-- F9-1  Commission at Checkout — fn_apply_commission
-- ─────────────────────────────────────────────────────────────────────────────
-- Reads commission_config from platform_settings and writes commission_fee to orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS commission_fee    NUMERIC(12,2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS commission_rate   NUMERIC(6,4)  DEFAULT 0;

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

  _enabled   := COALESCE((_cfg->>'enabled')::BOOLEAN, FALSE);
  IF NOT _enabled THEN RETURN 0; END IF;

  _min_order := COALESCE((_cfg->>'min_order_value')::NUMERIC, 10000);
  _mp_only   := COALESCE((_cfg->>'apply_to_marketplace_only')::BOOLEAN, TRUE);

  IF _mp_only AND _order.channel NOT IN ('marketplace', 'online') THEN RETURN 0; END IF;
  IF _order.total < _min_order THEN RETURN 0; END IF;

  -- Default rate by plan
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

  -- Category override (match by business_category_id slug in category_overrides array)
  _cat_override := NULL;
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

  -- Apply min/max fee from category override
  IF _cat_override IS NOT NULL THEN
    IF (_cat_override->>'min_fee') IS NOT NULL THEN
      _fee := GREATEST(_fee, (_cat_override->>'min_fee')::NUMERIC);
    END IF;
    IF (_cat_override->>'max_fee') IS NOT NULL THEN
      _fee := LEAST(_fee, (_cat_override->>'max_fee')::NUMERIC);
    END IF;
  END IF;

  -- Write back to order
  UPDATE public.orders SET commission_fee = _fee, commission_rate = _rate WHERE id = _order_id;

  -- Deduct from shop wallet
  UPDATE public.shop_wallets
  SET pending_balance = GREATEST(0, pending_balance - _fee)
  WHERE shop_id = _order.shop_id;

  RETURN _fee;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_apply_commission TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- F9-2  Auto-cancel expired orders — fn_auto_cancel_expired
-- ─────────────────────────────────────────────────────────────────────────────
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

  -- Log to cron_runs
  INSERT INTO public.cron_runs (job_name, started_at, finished_at, result)
  VALUES ('auto_cancel_expired', now(), now(), jsonb_build_object('cancelled', _cnt));

  RETURN _cnt;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_auto_cancel_expired TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- F9-3  data_requests (GDPR/UU PDP) — create if not exists
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.data_requests (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL,
  email         TEXT NOT NULL,
  type          TEXT NOT NULL CHECK (type IN ('export', 'erasure')),
  status        TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'processing', 'completed', 'rejected')),
  notes         TEXT DEFAULT NULL,
  requested_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at  TIMESTAMPTZ DEFAULT NULL
);

CREATE INDEX IF NOT EXISTS idx_data_requests_status ON public.data_requests (status);
CREATE INDEX IF NOT EXISTS idx_data_requests_user   ON public.data_requests (user_id);

ALTER TABLE public.data_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS data_requests_service ON public.data_requests;
CREATE POLICY data_requests_service ON public.data_requests
  USING (auth.role() = 'service_role');

-- GDPR erasure function — removes personal data, keeps aggregates
CREATE OR REPLACE FUNCTION public.fn_gdpr_erase_user(_user_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _result JSONB := '{}';
  _orders_anon INT := 0;
  _profile_del INT := 0;
BEGIN
  -- Anonymise orders (keep transaction records for accounting)
  UPDATE public.orders
  SET customer_name  = 'Pengguna Dihapus',
      customer_phone = NULL,
      customer_email = NULL,
      user_id        = NULL
  WHERE user_id = _user_id;
  GET DIAGNOSTICS _orders_anon = ROW_COUNT;

  -- Anonymise bookings
  UPDATE public.bookings
  SET customer_name  = 'Pengguna Dihapus',
      customer_phone = NULL,
      customer_email = NULL
  WHERE user_id = _user_id;

  -- Delete customer profile
  DELETE FROM public.customer_profiles WHERE user_id = _user_id;
  GET DIAGNOSTICS _profile_del = ROW_COUNT;

  -- Delete push subscriptions
  DELETE FROM public.push_subscriptions WHERE user_id = _user_id;

  -- Delete notifications
  DELETE FROM public.notifications WHERE recipient_user_id = _user_id;

  -- Delete marketplace cart
  DELETE FROM public.marketplace_carts WHERE user_id = _user_id;

  _result := jsonb_build_object(
    'user_id',      _user_id,
    'erased_at',    now(),
    'orders_anonymised', _orders_anon,
    'profile_deleted',   _profile_del
  );

  RETURN _result;
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_gdpr_erase_user TO service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- F9-5  Churn cron helper — fn_churn_metrics_snapshot
-- ─────────────────────────────────────────────────────────────────────────────
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
    'snapshot_at',    now(),
    'expiring_7d',    (SELECT COUNT(*) FROM public.shops WHERE plan_expires_at BETWEEN now() AND now() + INTERVAL '7 days'),
    'expiring_30d',   (SELECT COUNT(*) FROM public.shops WHERE plan_expires_at BETWEEN now() AND now() + INTERVAL '30 days'),
    'expired',        (SELECT COUNT(*) FROM public.shops WHERE plan_expires_at < now() AND plan_expires_at IS NOT NULL),
    'inactive_14d',   (
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

-- ─────────────────────────────────────────────────────────────────────────────
-- F9-6  wallet_topup_presets
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.wallet_topup_presets (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  amount     NUMERIC(12,2) NOT NULL,
  label      TEXT DEFAULT NULL,
  is_popular BOOLEAN NOT NULL DEFAULT FALSE,
  sort_order INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

INSERT INTO public.wallet_topup_presets (amount, label, is_popular, sort_order)
VALUES
  (50000,   'Rp 50.000',   FALSE, 1),
  (100000,  'Rp 100.000',  TRUE,  2),
  (200000,  'Rp 200.000',  TRUE,  3),
  (500000,  'Rp 500.000',  FALSE, 4),
  (1000000, 'Rp 1.000.000', FALSE, 5)
ON CONFLICT DO NOTHING;

-- ─────────────────────────────────────────────────────────────────────────────
-- F9-7  webhook_events — outbound delivery log per merchant
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID REFERENCES public.shops(id) ON DELETE CASCADE,
  webhook_id      UUID REFERENCES public.merchant_webhooks(id) ON DELETE SET NULL,
  event_type      TEXT NOT NULL,
  payload         JSONB NOT NULL DEFAULT '{}',
  delivery_url    TEXT NOT NULL,
  status_code     INT  DEFAULT NULL,
  response_body   TEXT DEFAULT NULL,
  attempt_count   INT  NOT NULL DEFAULT 1,
  delivered_at    TIMESTAMPTZ DEFAULT NULL,
  failed_at       TIMESTAMPTZ DEFAULT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_shop    ON public.webhook_events (shop_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_created ON public.webhook_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status  ON public.webhook_events (status_code);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS webhook_events_admin ON public.webhook_events;
CREATE POLICY webhook_events_admin ON public.webhook_events
  USING (public.has_role(auth.uid(), 'super_admin'));

-- ─────────────────────────────────────────────────────────────────────────────
-- F9-8  api_keys — merchant integration API keys
-- ─────────────────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.api_keys (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name        TEXT NOT NULL,
  key_prefix  TEXT NOT NULL,            -- e.g. "umkm_live_"
  key_hash    TEXT NOT NULL,            -- bcrypt hash of full key
  scopes      TEXT[] NOT NULL DEFAULT ARRAY['read'],
  last_used_at TIMESTAMPTZ DEFAULT NULL,
  expires_at  TIMESTAMPTZ DEFAULT NULL,
  is_active   BOOLEAN NOT NULL DEFAULT TRUE,
  created_by  UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_shop   ON public.api_keys (shop_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON public.api_keys (key_prefix);

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS api_keys_owner ON public.api_keys;
CREATE POLICY api_keys_owner ON public.api_keys
  USING (public.user_belongs_to_shop(auth.uid(), shop_id))
  WITH CHECK (public.user_belongs_to_shop(auth.uid(), shop_id));

-- ─────────────────────────────────────────────────────────────────────────────
-- Helper: fn_generate_api_key
-- Returns {key_id, full_key} — full_key shown once to merchant
-- ─────────────────────────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.fn_generate_api_key(
  _shop_id  UUID,
  _name     TEXT,
  _scopes   TEXT[] DEFAULT ARRAY['read'],
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
  -- Generate 32-char random suffix
  SELECT encode(gen_random_bytes(24), 'hex') INTO _rand;
  _full_key := _prefix || _rand;

  -- Store only a hash (use MD5 here as bcrypt isn't available in pure PG without extension)
  _hash := md5(_full_key);

  INSERT INTO public.api_keys (shop_id, name, key_prefix, key_hash, scopes, expires_at, created_by)
  VALUES (_shop_id, _name, _prefix, _hash, _scopes, _expires_at, auth.uid())
  RETURNING id INTO _key_id;

  RETURN jsonb_build_object('key_id', _key_id, 'full_key', _full_key, 'prefix', _prefix);
END;
$$;

GRANT EXECUTE ON FUNCTION public.fn_generate_api_key TO authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- Ensure merchant_webhooks table has the expected name (alias safety)
-- ─────────────────────────────────────────────────────────────────────────────
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='merchant_webhooks') THEN
    -- If table is named shop_webhooks or similar, create a view alias
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='shop_webhooks') THEN
      CREATE OR REPLACE VIEW public.merchant_webhooks AS SELECT * FROM public.shop_webhooks;
    END IF;
  END IF;
END;
$$;
