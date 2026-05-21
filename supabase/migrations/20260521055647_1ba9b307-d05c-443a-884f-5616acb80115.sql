
ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS custom_css text,
  ADD COLUMN IF NOT EXISTS shipping_origin_province_id integer,
  ADD COLUMN IF NOT EXISTS shipping_origin_city_id integer,
  ADD COLUMN IF NOT EXISTS shipping_couriers text[] NOT NULL DEFAULT '{}';

-- email_campaigns
CREATE TABLE IF NOT EXISTS public.email_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  subject text NOT NULL,
  body_html text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','scheduled','sending','sent','failed')),
  scheduled_at timestamptz,
  sent_at timestamptz,
  recipient_count integer NOT NULL DEFAULT 0,
  segment text,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_campaigns_shop ON public.email_campaigns(shop_id, created_at DESC);
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_campaigns_owner_all" ON public.email_campaigns;
CREATE POLICY "email_campaigns_owner_all" ON public.email_campaigns
  FOR ALL TO authenticated
  USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));

CREATE TRIGGER trg_email_campaigns_updated
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- email_campaign_recipients
CREATE TABLE IF NOT EXISTS public.email_campaign_recipients (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES public.email_campaigns(id) ON DELETE CASCADE,
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  customer_id uuid,
  email text NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','sent','failed','bounced')),
  sent_at timestamptz,
  error text,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_email_recipients_campaign ON public.email_campaign_recipients(campaign_id);
CREATE INDEX IF NOT EXISTS idx_email_recipients_shop ON public.email_campaign_recipients(shop_id);
ALTER TABLE public.email_campaign_recipients ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "email_recipients_owner_all" ON public.email_campaign_recipients;
CREATE POLICY "email_recipients_owner_all" ON public.email_campaign_recipients
  FOR ALL TO authenticated
  USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));

-- storefront_layouts
CREATE TABLE IF NOT EXISTS public.storefront_layouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL UNIQUE REFERENCES public.shops(id) ON DELETE CASCADE,
  blocks jsonb NOT NULL DEFAULT '[]'::jsonb,
  theme jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_published boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.storefront_layouts ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "storefront_layouts_owner_all" ON public.storefront_layouts;
CREATE POLICY "storefront_layouts_owner_all" ON public.storefront_layouts
  FOR ALL TO authenticated
  USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));

DROP POLICY IF EXISTS "storefront_layouts_public_read" ON public.storefront_layouts;
CREATE POLICY "storefront_layouts_public_read" ON public.storefront_layouts
  FOR SELECT TO anon, authenticated
  USING (is_published = true);

CREATE TRIGGER trg_storefront_layouts_updated
  BEFORE UPDATE ON public.storefront_layouts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
