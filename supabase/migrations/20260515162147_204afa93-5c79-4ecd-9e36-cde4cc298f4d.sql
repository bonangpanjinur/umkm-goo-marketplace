
-- 1. Service Bundles untuk booking jasa
CREATE TABLE IF NOT EXISTS public.service_bundles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  total_price_idr integer NOT NULL DEFAULT 0,
  original_price_idr integer NOT NULL DEFAULT 0,
  duration_min integer NOT NULL DEFAULT 60,
  max_uses integer,
  validity_days integer DEFAULT 30,
  is_active boolean NOT NULL DEFAULT true,
  cover_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.service_bundle_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id uuid NOT NULL REFERENCES public.service_bundles(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  qty integer NOT NULL DEFAULT 1,
  unit_price_idr integer NOT NULL DEFAULT 0,
  sort_order integer NOT NULL DEFAULT 0
);

ALTER TABLE public.service_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.service_bundle_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "service_bundles_public_read" ON public.service_bundles;
CREATE POLICY "service_bundles_public_read" ON public.service_bundles
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS "service_bundles_owner_all" ON public.service_bundles;
CREATE POLICY "service_bundles_owner_all" ON public.service_bundles
  FOR ALL TO authenticated
  USING (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()))
  WITH CHECK (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "service_bundle_items_public_read" ON public.service_bundle_items;
CREATE POLICY "service_bundle_items_public_read" ON public.service_bundle_items
  FOR SELECT USING (
    bundle_id IN (SELECT id FROM public.service_bundles WHERE is_active = true)
  );

DROP POLICY IF EXISTS "service_bundle_items_owner_all" ON public.service_bundle_items;
CREATE POLICY "service_bundle_items_owner_all" ON public.service_bundle_items
  FOR ALL TO authenticated
  USING (bundle_id IN (SELECT id FROM public.service_bundles WHERE shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid())))
  WITH CHECK (bundle_id IN (SELECT id FROM public.service_bundles WHERE shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid())));

CREATE INDEX IF NOT EXISTS idx_service_bundles_shop ON public.service_bundles(shop_id, is_active, sort_order);
CREATE INDEX IF NOT EXISTS idx_service_bundle_items_bundle ON public.service_bundle_items(bundle_id, sort_order);

-- 2. Reschedule token untuk booking
CREATE TABLE IF NOT EXISTS public.booking_reschedule_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id uuid NOT NULL,
  token text NOT NULL UNIQUE,
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '14 days'),
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.booking_reschedule_tokens ENABLE ROW LEVEL SECURITY;

-- Public read by token (no PII directly leaked; booking lookup happens server-side)
DROP POLICY IF EXISTS "reschedule_tokens_public_read" ON public.booking_reschedule_tokens;
CREATE POLICY "reschedule_tokens_public_read" ON public.booking_reschedule_tokens
  FOR SELECT USING (used_at IS NULL AND expires_at > now());

CREATE INDEX IF NOT EXISTS idx_reschedule_tokens_token ON public.booking_reschedule_tokens(token);

-- 3. Plan subscriptions (recurring billing)
CREATE TABLE IF NOT EXISTS public.plan_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  plan_id uuid REFERENCES public.plans(id),
  plan_code text NOT NULL,
  status text NOT NULL DEFAULT 'active', -- active, paused, cancelled, past_due
  billing_interval text NOT NULL DEFAULT 'monthly', -- monthly, yearly
  next_billing_at timestamptz NOT NULL,
  payment_provider text, -- midtrans, xendit, manual
  provider_subscription_id text,
  provider_token text, -- saved card token / VA reference
  amount_idr integer NOT NULL DEFAULT 0,
  last_invoice_id uuid,
  last_charge_at timestamptz,
  failure_count integer NOT NULL DEFAULT 0,
  cancelled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_id)
);

ALTER TABLE public.plan_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "plan_subs_owner_read" ON public.plan_subscriptions;
CREATE POLICY "plan_subs_owner_read" ON public.plan_subscriptions
  FOR SELECT TO authenticated
  USING (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()));

DROP POLICY IF EXISTS "plan_subs_owner_modify" ON public.plan_subscriptions;
CREATE POLICY "plan_subs_owner_modify" ON public.plan_subscriptions
  FOR ALL TO authenticated
  USING (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()))
  WITH CHECK (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()));

CREATE INDEX IF NOT EXISTS idx_plan_subs_next_billing ON public.plan_subscriptions(next_billing_at) WHERE status = 'active';

-- triggers updated_at
CREATE TRIGGER update_service_bundles_updated_at BEFORE UPDATE ON public.service_bundles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_plan_subscriptions_updated_at BEFORE UPDATE ON public.plan_subscriptions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 4. Tambah kolom payment_method & provider_ref ke plan_invoices kalau belum ada
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='plan_invoices' AND column_name='payment_method') THEN
    ALTER TABLE public.plan_invoices ADD COLUMN payment_method text DEFAULT 'manual_transfer';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='plan_invoices' AND column_name='provider_ref') THEN
    ALTER TABLE public.plan_invoices ADD COLUMN provider_ref text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='plan_invoices' AND column_name='checkout_url') THEN
    ALTER TABLE public.plan_invoices ADD COLUMN checkout_url text;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='plan_invoices' AND column_name='subscription_id') THEN
    ALTER TABLE public.plan_invoices ADD COLUMN subscription_id uuid;
  END IF;
END $$;
