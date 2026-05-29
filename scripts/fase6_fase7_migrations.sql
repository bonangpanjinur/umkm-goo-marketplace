-- ============================================================================
-- FASE 6 + FASE 7 MIGRATIONS — UMKMgo Marketplace
-- Jalankan di Supabase SQL Editor
-- Aman dijalankan berulang kali (IF NOT EXISTS / DO NOTHING)
-- ============================================================================

-- ── F6-4: group_buys + group_buy_participants ─────────────────────────────
CREATE TABLE IF NOT EXISTS public.group_buys (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id              UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  menu_item_id         UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  title                TEXT NOT NULL,
  description          TEXT,
  original_price       NUMERIC(12,2) NOT NULL DEFAULT 0,
  group_price          NUMERIC(12,2) NOT NULL DEFAULT 0,
  min_participants     INT NOT NULL DEFAULT 5,
  max_participants     INT,
  current_participants INT NOT NULL DEFAULT 0,
  status               TEXT NOT NULL DEFAULT 'open'
                         CHECK (status IN ('draft','open','success','failed','cancelled')),
  deadline_at          TIMESTAMPTZ NOT NULL,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at           TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_gb_shop_id  ON public.group_buys (shop_id);
CREATE INDEX IF NOT EXISTS idx_gb_status   ON public.group_buys (status);
CREATE INDEX IF NOT EXISTS idx_gb_deadline ON public.group_buys (deadline_at);

CREATE TABLE IF NOT EXISTS public.group_buy_participants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_buy_id  UUID NOT NULL REFERENCES public.group_buys(id) ON DELETE CASCADE,
  shop_id       UUID NOT NULL,
  user_id       UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  joined_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(group_buy_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_gbp_group_buy_id ON public.group_buy_participants (group_buy_id);
CREATE INDEX IF NOT EXISTS idx_gbp_user_id      ON public.group_buy_participants (user_id);

ALTER TABLE public.group_buys ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gb_shop_owner ON public.group_buys;
CREATE POLICY gb_shop_owner ON public.group_buys
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));
DROP POLICY IF EXISTS gb_public_read ON public.group_buys;
CREATE POLICY gb_public_read ON public.group_buys FOR SELECT USING (true);

ALTER TABLE public.group_buy_participants ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS gbp_owner ON public.group_buy_participants;
CREATE POLICY gbp_owner ON public.group_buy_participants
  USING (user_id = auth.uid() OR shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));
DROP POLICY IF EXISTS gbp_insert ON public.group_buy_participants;
CREATE POLICY gbp_insert ON public.group_buy_participants FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── F6-5: product_subscription_plans + product_subscriptions ─────────────
CREATE TABLE IF NOT EXISTS public.product_subscription_plans (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id          UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  menu_item_id     UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name             TEXT NOT NULL,
  description      TEXT,
  interval         TEXT NOT NULL DEFAULT 'monthly'
                     CHECK (interval IN ('weekly','biweekly','monthly')),
  price            NUMERIC(12,2) NOT NULL DEFAULT 0,
  original_price   NUMERIC(12,2) NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  subscriber_count INT NOT NULL DEFAULT 0,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_psp_shop_id   ON public.product_subscription_plans (shop_id);
CREATE INDEX IF NOT EXISTS idx_psp_is_active ON public.product_subscription_plans (is_active);

CREATE TABLE IF NOT EXISTS public.product_subscriptions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id            UUID NOT NULL REFERENCES public.product_subscription_plans(id) ON DELETE CASCADE,
  shop_id            UUID NOT NULL,
  user_id            UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status             TEXT NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active','paused','cancelled')),
  started_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  next_delivery_at   TIMESTAMPTZ,
  address            TEXT,
  notes              TEXT,
  customer_name      TEXT,
  customer_phone     TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ps_plan_id  ON public.product_subscriptions (plan_id);
CREATE INDEX IF NOT EXISTS idx_ps_shop_id  ON public.product_subscriptions (shop_id);
CREATE INDEX IF NOT EXISTS idx_ps_user_id  ON public.product_subscriptions (user_id);
CREATE INDEX IF NOT EXISTS idx_ps_status   ON public.product_subscriptions (status);

ALTER TABLE public.product_subscription_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS psp_shop_owner ON public.product_subscription_plans;
CREATE POLICY psp_shop_owner ON public.product_subscription_plans
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));
DROP POLICY IF EXISTS psp_public_read ON public.product_subscription_plans;
CREATE POLICY psp_public_read ON public.product_subscription_plans FOR SELECT USING (true);

ALTER TABLE public.product_subscriptions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ps_user_or_shop ON public.product_subscriptions;
CREATE POLICY ps_user_or_shop ON public.product_subscriptions
  USING (user_id = auth.uid() OR shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));
DROP POLICY IF EXISTS ps_insert ON public.product_subscriptions;
CREATE POLICY ps_insert ON public.product_subscriptions FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── F6-6: bnpl_applications ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.bnpl_applications (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id        UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  shop_id         UUID NOT NULL,
  provider        TEXT NOT NULL CHECK (provider IN ('kredivo','akulaku','cicilan_toko','others')),
  total_amount    NUMERIC(12,2) NOT NULL,
  tenure_months   INT NOT NULL DEFAULT 3,
  monthly_amount  NUMERIC(12,2),
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','approved','rejected','disbursed','repaid','defaulted')),
  provider_ref    TEXT,
  applied_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  approved_at     TIMESTAMPTZ,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_bnpl_user_id  ON public.bnpl_applications (user_id);
CREATE INDEX IF NOT EXISTS idx_bnpl_shop_id  ON public.bnpl_applications (shop_id);
CREATE INDEX IF NOT EXISTS idx_bnpl_order_id ON public.bnpl_applications (order_id);
CREATE INDEX IF NOT EXISTS idx_bnpl_status   ON public.bnpl_applications (status);

ALTER TABLE public.bnpl_applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bnpl_user_or_shop ON public.bnpl_applications;
CREATE POLICY bnpl_user_or_shop ON public.bnpl_applications
  USING (user_id = auth.uid() OR shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));
DROP POLICY IF EXISTS bnpl_insert ON public.bnpl_applications;
CREATE POLICY bnpl_insert ON public.bnpl_applications FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ── F6-8: consultation_slots + consultation_sessions ─────────────────────
CREATE TABLE IF NOT EXISTS public.consultation_slots (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id          UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  doctor_name      TEXT NOT NULL,
  specialty        TEXT,
  slot_date        DATE NOT NULL,
  slot_time        TIME NOT NULL,
  duration_minutes INT NOT NULL DEFAULT 30,
  price            NUMERIC(12,2) NOT NULL DEFAULT 0,
  platform         TEXT NOT NULL DEFAULT 'Google Meet',
  meeting_link     TEXT,
  max_patients     INT NOT NULL DEFAULT 1,
  booked_count     INT NOT NULL DEFAULT 0,
  is_active        BOOLEAN NOT NULL DEFAULT true,
  notes            TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cs_shop_id    ON public.consultation_slots (shop_id);
CREATE INDEX IF NOT EXISTS idx_cs_slot_date  ON public.consultation_slots (slot_date);
CREATE INDEX IF NOT EXISTS idx_cs_is_active  ON public.consultation_slots (is_active);

CREATE TABLE IF NOT EXISTS public.consultation_sessions (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slot_id         UUID NOT NULL REFERENCES public.consultation_slots(id) ON DELETE CASCADE,
  shop_id         UUID NOT NULL,
  user_id         UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  patient_name    TEXT NOT NULL,
  patient_phone   TEXT,
  patient_email   TEXT,
  complaint       TEXT,
  status          TEXT NOT NULL DEFAULT 'pending'
                    CHECK (status IN ('pending','confirmed','ongoing','completed','cancelled')),
  meeting_link    TEXT,
  notes           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_cses_slot_id  ON public.consultation_sessions (slot_id);
CREATE INDEX IF NOT EXISTS idx_cses_shop_id  ON public.consultation_sessions (shop_id);
CREATE INDEX IF NOT EXISTS idx_cses_user_id  ON public.consultation_sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_cses_status   ON public.consultation_sessions (status);

ALTER TABLE public.consultation_slots ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS csl_shop_owner ON public.consultation_slots;
CREATE POLICY csl_shop_owner ON public.consultation_slots
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));
DROP POLICY IF EXISTS csl_public_read ON public.consultation_slots;
CREATE POLICY csl_public_read ON public.consultation_slots FOR SELECT USING (true);

ALTER TABLE public.consultation_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cse_user_or_shop ON public.consultation_sessions;
CREATE POLICY cse_user_or_shop ON public.consultation_sessions
  USING (user_id = auth.uid() OR shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));
DROP POLICY IF EXISTS cse_insert ON public.consultation_sessions;
CREATE POLICY cse_insert ON public.consultation_sessions FOR INSERT WITH CHECK (true);

-- ── F6-9: live_sessions + live_chat_messages ───────────────────────────────
CREATE TABLE IF NOT EXISTS public.live_sessions (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  title         TEXT NOT NULL,
  description   TEXT,
  status        TEXT NOT NULL DEFAULT 'scheduled'
                  CHECK (status IN ('scheduled','live','ended')),
  scheduled_at  TIMESTAMPTZ,
  started_at    TIMESTAMPTZ,
  ended_at      TIMESTAMPTZ,
  stream_url    TEXT,
  viewer_count  INT NOT NULL DEFAULT 0,
  order_count   INT NOT NULL DEFAULT 0,
  total_sales   NUMERIC(12,2) NOT NULL DEFAULT 0,
  products      UUID[] DEFAULT '{}',
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ls_shop_id ON public.live_sessions (shop_id);
CREATE INDEX IF NOT EXISTS idx_ls_status  ON public.live_sessions (status);

CREATE TABLE IF NOT EXISTS public.live_chat_messages (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id  UUID NOT NULL REFERENCES public.live_sessions(id) ON DELETE CASCADE,
  user_id     UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  user_name   TEXT NOT NULL,
  message     TEXT NOT NULL,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_lcm_session_id ON public.live_chat_messages (session_id);
CREATE INDEX IF NOT EXISTS idx_lcm_created_at ON public.live_chat_messages (created_at DESC);

ALTER TABLE public.live_sessions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS ls_shop_owner ON public.live_sessions;
CREATE POLICY ls_shop_owner ON public.live_sessions
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));
DROP POLICY IF EXISTS ls_public_read ON public.live_sessions;
CREATE POLICY ls_public_read ON public.live_sessions FOR SELECT USING (true);

ALTER TABLE public.live_chat_messages ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS lcm_public_read ON public.live_chat_messages;
CREATE POLICY lcm_public_read ON public.live_chat_messages FOR SELECT USING (true);
DROP POLICY IF EXISTS lcm_insert ON public.live_chat_messages;
CREATE POLICY lcm_insert ON public.live_chat_messages FOR INSERT WITH CHECK (true);

-- Enable Realtime for live chat
ALTER PUBLICATION supabase_realtime ADD TABLE public.live_chat_messages;

-- ============================================================================
-- FASE 7 — Lokasi & Wilayah (DB Changes)
-- ============================================================================

-- F7-1: Tambah kolom lokasi ke tabel shops
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS latitude       DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS longitude      DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS city           TEXT,
  ADD COLUMN IF NOT EXISTS province       TEXT,
  ADD COLUMN IF NOT EXISTS postal_code    TEXT,
  ADD COLUMN IF NOT EXISTS google_maps_url TEXT;

CREATE INDEX IF NOT EXISTS idx_shops_lat  ON public.shops (latitude);
CREATE INDEX IF NOT EXISTS idx_shops_lng  ON public.shops (longitude);
CREATE INDEX IF NOT EXISTS idx_shops_city ON public.shops (city);

-- F7-2: RPC shops_nearby — mencari toko terdekat berdasarkan koordinat + radius
CREATE OR REPLACE FUNCTION public.shops_nearby(
  lat        DOUBLE PRECISION,
  lng        DOUBLE PRECISION,
  radius_km  DOUBLE PRECISION DEFAULT 10,
  lim        INT DEFAULT 20
)
RETURNS TABLE (
  id           UUID,
  slug         TEXT,
  name         TEXT,
  logo_url     TEXT,
  category     TEXT,
  subtype      TEXT,
  address      TEXT,
  latitude     DOUBLE PRECISION,
  longitude    DOUBLE PRECISION,
  distance_km  DOUBLE PRECISION,
  rating_avg   NUMERIC,
  city         TEXT,
  province     TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT
    s.id, s.slug, s.name, s.logo_url, s.category, s.subtype,
    s.address, s.latitude, s.longitude,
    ROUND(
      CAST(
        6371 * acos(
          LEAST(1, cos(radians(lat)) * cos(radians(s.latitude))
            * cos(radians(s.longitude) - radians(lng))
            + sin(radians(lat)) * sin(radians(s.latitude))
          )
        ) AS NUMERIC
      ), 2
    ) AS distance_km,
    s.rating_avg,
    s.city, s.province
  FROM public.shops s
  WHERE
    s.latitude IS NOT NULL
    AND s.longitude IS NOT NULL
    AND s.suspended_at IS NULL
    AND (
      6371 * acos(
        LEAST(1, cos(radians(lat)) * cos(radians(s.latitude))
          * cos(radians(s.longitude) - radians(lng))
          + sin(radians(lat)) * sin(radians(s.latitude))
        )
      )
    ) <= radius_km
  ORDER BY distance_km ASC
  LIMIT lim;
$$;

-- F7-5: product_combos (rename alias — VIEW untuk backward compat)
-- Catatan: Jika tabel asli masih bernama fnb_combos, jalankan:
-- ALTER TABLE public.fnb_combos RENAME TO product_combos;
-- Jika sudah ada product_combos, skip baris di atas.
DO $$
BEGIN
  IF EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'fnb_combos'
  ) AND NOT EXISTS (
    SELECT FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'product_combos'
  ) THEN
    ALTER TABLE public.fnb_combos RENAME TO product_combos;
  END IF;
END $$;
