
-- 1. has_role SECURITY DEFINER (single source of truth for role checks)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated, anon;

-- 2. is_courier_of_shop: cek apakah user adalah kurir aktif di toko tsb
CREATE OR REPLACE FUNCTION public.is_courier_of_shop(_user_id uuid, _shop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.couriers
    WHERE user_id = _user_id AND shop_id = _shop_id AND is_active = true
  )
$$;

GRANT EXECUTE ON FUNCTION public.is_courier_of_shop(uuid, uuid) TO authenticated, anon;

-- 3. Tambah kolom proof of delivery + assignment timestamps di orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS assigned_at timestamptz,
  ADD COLUMN IF NOT EXISTS picked_up_at timestamptz,
  ADD COLUMN IF NOT EXISTS customer_signature_url text;

-- 4. RLS: kurir bisa lihat & update order miliknya
DROP POLICY IF EXISTS "Couriers can view assigned orders" ON public.orders;
CREATE POLICY "Couriers can view assigned orders"
ON public.orders
FOR SELECT
TO authenticated
USING (
  courier_id IN (SELECT id FROM public.couriers WHERE user_id = auth.uid())
  OR (
    courier_id IS NULL
    AND status IN ('ready','preparing')
    AND fulfillment = 'delivery'
    AND public.is_courier_of_shop(auth.uid(), shop_id)
  )
);

DROP POLICY IF EXISTS "Couriers can claim and update assigned orders" ON public.orders;
CREATE POLICY "Couriers can claim and update assigned orders"
ON public.orders
FOR UPDATE
TO authenticated
USING (
  (courier_id IN (SELECT id FROM public.couriers WHERE user_id = auth.uid()))
  OR (courier_id IS NULL AND public.is_courier_of_shop(auth.uid(), shop_id))
)
WITH CHECK (
  courier_id IN (SELECT id FROM public.couriers WHERE user_id = auth.uid())
);

-- 5. Helper: tampung courier earning (komputasi dari delivery_fee)
CREATE OR REPLACE VIEW public.courier_earnings AS
SELECT
  c.id AS courier_id,
  c.user_id,
  c.shop_id,
  date_trunc('day', o.delivered_at) AS day,
  COUNT(*) AS deliveries,
  COALESCE(SUM(o.delivery_fee), 0) AS gross_fee
FROM public.couriers c
JOIN public.orders o ON o.courier_id = c.id
WHERE o.status = 'completed' AND o.delivered_at IS NOT NULL
GROUP BY c.id, c.user_id, c.shop_id, date_trunc('day', o.delivered_at);

GRANT SELECT ON public.courier_earnings TO authenticated;
