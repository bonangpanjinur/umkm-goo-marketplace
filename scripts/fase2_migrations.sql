-- ============================================================================
-- FASE 2 MIGRATIONS — UMKMgo Marketplace
-- Jalankan di Supabase SQL Editor atau psql
-- Aman dijalankan berulang kali (IF NOT EXISTS / DO NOTHING)
-- ============================================================================

-- ── F2-1: marketing_campaigns + campaign_recipients ──────────────────────────
CREATE TABLE IF NOT EXISTS public.marketing_campaigns (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name            TEXT,
  subject         TEXT NOT NULL,
  body_html       TEXT,
  body_text       TEXT,
  segment         TEXT DEFAULT 'all',
  status          TEXT NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft','scheduled','sending','sent','failed')),
  recipient_count INT,
  scheduled_at    TIMESTAMPTZ,
  sent_at         TIMESTAMPTZ,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_mc_shop_id    ON public.marketing_campaigns (shop_id);
CREATE INDEX IF NOT EXISTS idx_mc_status     ON public.marketing_campaigns (status);
CREATE INDEX IF NOT EXISTS idx_mc_created_at ON public.marketing_campaigns (created_at DESC);

CREATE TABLE IF NOT EXISTS public.campaign_recipients (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id UUID NOT NULL REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  shop_id     UUID NOT NULL,
  email       TEXT NOT NULL,
  customer_id UUID,
  status      TEXT NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending','sent','failed','bounced','unsubscribed')),
  sent_at     TIMESTAMPTZ,
  error       TEXT,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_cr_campaign_id ON public.campaign_recipients (campaign_id);
CREATE INDEX IF NOT EXISTS idx_cr_shop_id     ON public.campaign_recipients (shop_id);
CREATE INDEX IF NOT EXISTS idx_cr_email       ON public.campaign_recipients (email);

-- RLS
ALTER TABLE public.marketing_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS mc_shop_owner ON public.marketing_campaigns;
CREATE POLICY mc_shop_owner ON public.marketing_campaigns
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

ALTER TABLE public.campaign_recipients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS cr_shop_owner ON public.campaign_recipients;
CREATE POLICY cr_shop_owner ON public.campaign_recipients
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

-- Backward compat: buat VIEW email_campaigns → marketing_campaigns agar kode lama tidak error
CREATE OR REPLACE VIEW public.email_campaigns AS
  SELECT
    id, shop_id, name, subject, body_html AS body_html, segment,
    status, recipient_count, scheduled_at, sent_at, created_at, updated_at
  FROM public.marketing_campaigns;


-- ── F2-2: storefront_layouts ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.storefront_layouts (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id      UUID NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  blocks       JSONB NOT NULL DEFAULT '[]'::jsonb,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  theme        TEXT DEFAULT 'default',
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_sl_shop_id ON public.storefront_layouts (shop_id);
CREATE INDEX IF NOT EXISTS idx_sl_published ON public.storefront_layouts (is_published) WHERE is_published = TRUE;

ALTER TABLE public.storefront_layouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS sl_shop_owner_write ON public.storefront_layouts;
CREATE POLICY sl_shop_owner_write ON public.storefront_layouts
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS sl_public_read ON public.storefront_layouts;
CREATE POLICY sl_public_read ON public.storefront_layouts
  FOR SELECT TO anon, authenticated
  USING (is_published = TRUE);


-- ── F2-3: digital_product_versions ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.digital_product_versions (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id      UUID NOT NULL,
  product_id   UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  product_name TEXT NOT NULL,
  version      TEXT NOT NULL,
  changelog    TEXT,
  file_url     TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dpv_shop_id    ON public.digital_product_versions (shop_id);
CREATE INDEX IF NOT EXISTS idx_dpv_product_id ON public.digital_product_versions (product_id);
CREATE INDEX IF NOT EXISTS idx_dpv_created_at ON public.digital_product_versions (created_at DESC);

ALTER TABLE public.digital_product_versions ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS dpv_shop_owner ON public.digital_product_versions;
CREATE POLICY dpv_shop_owner ON public.digital_product_versions
  USING (shop_id IN (SELECT id FROM public.shops WHERE owner_id = auth.uid()));


-- ── F2-5: Flash Sale + Happy Hour columns on menu_items ───────────────────────
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS flash_price      NUMERIC(14,2) DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS flash_starts_at  TIMESTAMPTZ   DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS flash_ends_at    TIMESTAMPTZ   DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_mi_flash_active
  ON public.menu_items (flash_ends_at)
  WHERE flash_price IS NOT NULL AND flash_ends_at IS NOT NULL;


-- ── Helpful function: auto-update updated_at ─────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_mc_updated_at ON public.marketing_campaigns;
CREATE TRIGGER trg_mc_updated_at
  BEFORE UPDATE ON public.marketing_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

DROP TRIGGER IF EXISTS trg_sl_updated_at ON public.storefront_layouts;
CREATE TRIGGER trg_sl_updated_at
  BEFORE UPDATE ON public.storefront_layouts
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
