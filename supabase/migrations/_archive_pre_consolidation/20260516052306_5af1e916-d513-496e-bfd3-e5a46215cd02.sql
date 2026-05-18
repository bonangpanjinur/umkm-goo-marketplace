CREATE OR REPLACE FUNCTION public.upsert_shop_customer_on_order()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.customer_user_id IS NOT NULL AND NEW.status::text IN ('completed', 'delivered') THEN
    INSERT INTO public.shop_customers (shop_id, user_id, display_name, phone, total_orders, total_spent, last_order_at, first_order_at)
    VALUES (
      NEW.shop_id,
      NEW.customer_user_id,
      COALESCE(NEW.customer_name, ''),
      NEW.customer_phone,
      1,
      NEW.total,
      NEW.created_at,
      NEW.created_at
    )
    ON CONFLICT (shop_id, user_id) DO UPDATE SET
      display_name = COALESCE(NULLIF(EXCLUDED.display_name, ''), shop_customers.display_name),
      phone = COALESCE(EXCLUDED.phone, shop_customers.phone),
      total_orders = shop_customers.total_orders + 1,
      total_spent = shop_customers.total_spent + EXCLUDED.total_spent,
      last_order_at = GREATEST(shop_customers.last_order_at, EXCLUDED.last_order_at),
      first_order_at = LEAST(shop_customers.first_order_at, EXCLUDED.first_order_at),
      updated_at = now();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE OR REPLACE FUNCTION public.auto_release_escrow_on_complete()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.escrow_status = 'holding'
     AND NEW.status::text IN ('completed','delivered')
     AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.escrow_release_order(NEW.id);
  ELSIF NEW.escrow_status IN ('holding','released')
        AND NEW.status::text IN ('voided','cancelled')
        AND (OLD.status IS DISTINCT FROM NEW.status) THEN
    PERFORM public.escrow_refund_order(NEW.id, 'Order '||NEW.status::text);
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Idempotency: unique order_no per outlet
CREATE UNIQUE INDEX IF NOT EXISTS uq_orders_outlet_order_no
  ON public.orders (outlet_id, order_no);

-- POS audit log (checkout errors, voids, cancellations)
CREATE TABLE IF NOT EXISTS public.pos_audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  outlet_id uuid,
  order_id uuid,
  order_no text,
  action text NOT NULL CHECK (action IN ('checkout_error','checkout_retry','checkout_success','void','cancel')),
  reason text,
  error_message text,
  metadata jsonb DEFAULT '{}'::jsonb,
  cashier_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pos_audit_shop_date ON public.pos_audit_log (shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pos_audit_outlet ON public.pos_audit_log (outlet_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_pos_audit_action ON public.pos_audit_log (shop_id, action, created_at DESC);

ALTER TABLE public.pos_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "pos_audit_owner_all" ON public.pos_audit_log
  FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = pos_audit_log.shop_id AND s.owner_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM coffee_shops s WHERE s.id = pos_audit_log.shop_id AND s.owner_id = auth.uid()));

CREATE POLICY "pos_audit_staff_insert" ON public.pos_audit_log
  FOR INSERT TO authenticated
  WITH CHECK (cashier_id = auth.uid());

CREATE POLICY "pos_audit_staff_read_own" ON public.pos_audit_log
  FOR SELECT TO authenticated
  USING (cashier_id = auth.uid());