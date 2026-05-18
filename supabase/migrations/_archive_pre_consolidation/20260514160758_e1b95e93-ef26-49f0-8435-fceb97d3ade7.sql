CREATE TABLE IF NOT EXISTS public.shop_vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  code text NOT NULL,
  description text,
  discount_type text NOT NULL CHECK (discount_type IN ('percent','fixed')),
  value numeric NOT NULL CHECK (value > 0),
  min_order numeric NOT NULL DEFAULT 0,
  max_discount numeric,
  usage_limit integer,
  per_user_limit integer,
  starts_at timestamptz,
  expires_at timestamptz,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, code)
);

CREATE INDEX IF NOT EXISTS idx_shop_vouchers_shop ON public.shop_vouchers(shop_id);

ALTER TABLE public.shop_vouchers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners manage own shop vouchers"
ON public.shop_vouchers FOR ALL
TO authenticated
USING (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()))
WITH CHECK (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()));

CREATE POLICY "Staff view shop vouchers"
ON public.shop_vouchers FOR SELECT
TO authenticated
USING (shop_id IN (SELECT shop_id FROM public.user_roles WHERE user_id = auth.uid()));

CREATE POLICY "Public view active vouchers"
ON public.shop_vouchers FOR SELECT
TO anon, authenticated
USING (is_active = true AND (expires_at IS NULL OR expires_at > now()) AND (starts_at IS NULL OR starts_at <= now()));

CREATE TRIGGER update_shop_vouchers_updated_at
BEFORE UPDATE ON public.shop_vouchers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();