
-- Order audit log (VOID/CANCEL with reason, per user per order)
CREATE TABLE IF NOT EXISTS public.order_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  outlet_id UUID REFERENCES public.outlets(id) ON DELETE SET NULL,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  order_no TEXT,
  action TEXT NOT NULL CHECK (action IN ('void','cancel','refund','reopen','edit')),
  reason TEXT,
  previous_status TEXT,
  new_status TEXT,
  total NUMERIC(14,2),
  actor_id UUID,
  actor_name TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_order_audit_log_shop_created ON public.order_audit_log(shop_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_audit_log_order ON public.order_audit_log(order_id);
CREATE INDEX IF NOT EXISTS idx_order_audit_log_actor ON public.order_audit_log(actor_id);

ALTER TABLE public.order_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop members read order audit"
  ON public.order_audit_log FOR SELECT TO authenticated
  USING (public.user_belongs_to_shop(auth.uid(), shop_id));

CREATE POLICY "shop members insert order audit"
  ON public.order_audit_log FOR INSERT TO authenticated
  WITH CHECK (public.user_belongs_to_shop(auth.uid(), shop_id));

-- Outlet couriers + shipping rates
CREATE TABLE IF NOT EXISTS public.outlet_couriers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id UUID NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  outlet_id UUID NOT NULL REFERENCES public.outlets(id) ON DELETE CASCADE,
  courier_name TEXT NOT NULL,
  service_type TEXT NOT NULL DEFAULT 'regular',
  logo_url TEXT,
  base_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  per_km_fee NUMERIC(12,2) NOT NULL DEFAULT 0,
  min_order NUMERIC(12,2) NOT NULL DEFAULT 0,
  free_above NUMERIC(12,2),
  max_distance_km NUMERIC(8,2),
  eta_min_minutes INTEGER NOT NULL DEFAULT 30,
  eta_max_minutes INTEGER NOT NULL DEFAULT 90,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_outlet_couriers_outlet ON public.outlet_couriers(outlet_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_outlet_couriers_shop ON public.outlet_couriers(shop_id);

ALTER TABLE public.outlet_couriers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "shop members manage outlet couriers"
  ON public.outlet_couriers FOR ALL TO authenticated
  USING (public.user_belongs_to_shop(auth.uid(), shop_id))
  WITH CHECK (public.user_belongs_to_shop(auth.uid(), shop_id));

CREATE POLICY "public read active outlet couriers"
  ON public.outlet_couriers FOR SELECT TO anon, authenticated
  USING (is_active = true);

CREATE TRIGGER trg_outlet_couriers_touch
  BEFORE UPDATE ON public.outlet_couriers
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
