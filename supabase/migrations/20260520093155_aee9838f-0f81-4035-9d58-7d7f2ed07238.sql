-- Backward-compat aliases & missing tables/columns for admin pages

-- 1. orders: add generated alias columns for legacy code (total_price, total_amount, order_number, commission_fee)
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS total_price numeric(12,2) GENERATED ALWAYS AS (total) STORED,
  ADD COLUMN IF NOT EXISTS total_amount numeric(12,2) GENERATED ALWAYS AS (total) STORED,
  ADD COLUMN IF NOT EXISTS order_number text GENERATED ALWAYS AS (order_no) STORED,
  ADD COLUMN IF NOT EXISTS commission_fee numeric(14,2) GENERATED ALWAYS AS (COALESCE(commission_amount, 0)) STORED;

-- 2. product_reviews: add columns the moderation page expects
ALTER TABLE public.product_reviews
  ADD COLUMN IF NOT EXISTS is_flagged boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flag_reason text,
  ADD COLUMN IF NOT EXISTS body text GENERATED ALWAYS AS (comment) STORED;

-- 3. disputes: minimal table so the count widget works
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
ALTER TABLE public.disputes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_manage_disputes" ON public.disputes;
CREATE POLICY "admin_manage_disputes" ON public.disputes
  FOR ALL USING (public.has_role(auth.uid(), 'super_admin'::public.app_role))
  WITH CHECK (public.has_role(auth.uid(), 'super_admin'::public.app_role));
DROP POLICY IF EXISTS "shop_owner_view_disputes" ON public.disputes;
CREATE POLICY "shop_owner_view_disputes" ON public.disputes
  FOR SELECT USING (EXISTS (SELECT 1 FROM public.shops s WHERE s.id = disputes.shop_id AND s.owner_id = auth.uid()));
DROP POLICY IF EXISTS "customer_view_own_disputes" ON public.disputes;
CREATE POLICY "customer_view_own_disputes" ON public.disputes
  FOR SELECT USING (auth.uid() = user_id);

-- 4. webhook_logs: minimal table so the failure-count widget works
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
ALTER TABLE public.webhook_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_view_webhook_logs" ON public.webhook_logs;
CREATE POLICY "admin_view_webhook_logs" ON public.webhook_logs
  FOR SELECT USING (public.has_role(auth.uid(), 'super_admin'::public.app_role));
DROP POLICY IF EXISTS "service_role_insert_webhook_logs" ON public.webhook_logs;
CREATE POLICY "service_role_insert_webhook_logs" ON public.webhook_logs
  FOR INSERT WITH CHECK (true);

CREATE INDEX IF NOT EXISTS idx_disputes_status ON public.disputes(status);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_status_created ON public.webhook_logs(status, created_at DESC);
