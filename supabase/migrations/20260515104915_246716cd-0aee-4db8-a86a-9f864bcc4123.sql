
ALTER TABLE public.delivery_zones
  ADD COLUMN IF NOT EXISTS min_eta_minutes int NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS max_eta_minutes int NOT NULL DEFAULT 60;

ALTER TABLE public.delivery_settings
  ADD COLUMN IF NOT EXISTS min_eta_minutes int NOT NULL DEFAULT 30,
  ADD COLUMN IF NOT EXISTS max_eta_minutes int NOT NULL DEFAULT 60;

ALTER TABLE public.couriers
  ADD COLUMN IF NOT EXISTS email text;

CREATE UNIQUE INDEX IF NOT EXISTS couriers_email_unique
  ON public.couriers (lower(email)) WHERE email IS NOT NULL;

CREATE OR REPLACE FUNCTION public.link_courier_account()
RETURNS int
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _email text;
  _updated int;
BEGIN
  SELECT email INTO _email FROM auth.users WHERE id = auth.uid();
  IF _email IS NULL THEN RETURN 0; END IF;

  UPDATE public.couriers
     SET user_id = auth.uid()
   WHERE lower(email) = lower(_email)
     AND user_id IS NULL;
  GET DIAGNOSTICS _updated = ROW_COUNT;
  RETURN _updated;
END;
$$;

GRANT EXECUTE ON FUNCTION public.link_courier_account() TO authenticated;

CREATE TABLE IF NOT EXISTS public.restock_subscribers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  product_id    uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  product_name  text NOT NULL,
  customer_wa   text NOT NULL,
  customer_name text,
  subscribed_at timestamptz NOT NULL DEFAULT now(),
  notified_at   timestamptz,
  UNIQUE (product_id, customer_wa)
);
CREATE INDEX IF NOT EXISTS idx_restock_sub_shop ON public.restock_subscribers(shop_id);
ALTER TABLE public.restock_subscribers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "restock_sub_insert_anyone" ON public.restock_subscribers
  FOR INSERT WITH CHECK (true);
CREATE POLICY "restock_sub_owner_select" ON public.restock_subscribers
  FOR SELECT USING (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()));
CREATE POLICY "restock_sub_owner_update" ON public.restock_subscribers
  FOR UPDATE USING (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()));
CREATE POLICY "restock_sub_owner_delete" ON public.restock_subscribers
  FOR DELETE USING (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()));

CREATE TABLE IF NOT EXISTS public.ad_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  ad_type text CHECK (ad_type IN ('product','shop')) DEFAULT 'product',
  target_id uuid,
  target_name text,
  target_image text,
  position text CHECK (position IN ('hero_carousel','homepage_middle','search_top','category_top','product_sidebar')),
  budget_idr numeric DEFAULT 0,
  duration_days int DEFAULT 7,
  starts_at timestamptz,
  ends_at timestamptz,
  status text CHECK (status IN ('payment_pending','pending','active','rejected','expired','paused')) DEFAULT 'payment_pending',
  reject_reason text,
  payment_method text,
  payment_tx_id text,
  impressions int DEFAULT 0,
  clicks int DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_ad_requests_shop ON public.ad_requests(shop_id);
CREATE INDEX IF NOT EXISTS idx_ad_requests_status ON public.ad_requests(status);
ALTER TABLE public.ad_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ad_owner_insert" ON public.ad_requests
  FOR INSERT WITH CHECK (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()));
CREATE POLICY "ad_owner_select" ON public.ad_requests
  FOR SELECT USING (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()));
CREATE POLICY "ad_owner_update" ON public.ad_requests
  FOR UPDATE USING (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()));
CREATE POLICY "ad_public_active" ON public.ad_requests
  FOR SELECT USING (status = 'active');
CREATE POLICY "ad_admin_all" ON public.ad_requests
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'));

CREATE TABLE IF NOT EXISTS public.product_qa (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  product_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  question text NOT NULL,
  answer text,
  answered_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  answered_at timestamptz,
  is_hidden boolean NOT NULL DEFAULT false,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_qa_shop ON public.product_qa(shop_id);
CREATE INDEX IF NOT EXISTS idx_qa_product ON public.product_qa(product_id);
ALTER TABLE public.product_qa ENABLE ROW LEVEL SECURITY;

CREATE POLICY "qa_public_read" ON public.product_qa
  FOR SELECT USING (is_hidden = false);
CREATE POLICY "qa_user_read_own" ON public.product_qa
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "qa_owner_read" ON public.product_qa
  FOR SELECT USING (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()));
CREATE POLICY "qa_user_insert" ON public.product_qa
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "qa_owner_update" ON public.product_qa
  FOR UPDATE USING (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()));
CREATE POLICY "qa_owner_delete" ON public.product_qa
  FOR DELETE USING (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()));

CREATE TRIGGER trg_restock_sub_updated BEFORE UPDATE ON public.restock_subscribers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_ad_requests_updated BEFORE UPDATE ON public.ad_requests
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER trg_product_qa_updated BEFORE UPDATE ON public.product_qa
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
