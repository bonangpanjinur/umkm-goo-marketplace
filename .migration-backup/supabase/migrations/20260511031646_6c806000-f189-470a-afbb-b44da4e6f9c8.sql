
DROP FUNCTION IF EXISTS public.get_order_tracking(uuid);

CREATE OR REPLACE FUNCTION public.get_order_tracking(_order_id uuid)
RETURNS TABLE(
  id uuid, order_no text, status order_status, fulfillment fulfillment_type,
  channel order_channel, total numeric, delivery_fee numeric, delivery_address text,
  customer_name text, created_at timestamptz, updated_at timestamptz,
  shop_name text, shop_slug text,
  courier_name text, courier_phone text, courier_plate text,
  delivery_proof_url text, delivered_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    o.id, o.order_no, o.status, o.fulfillment, o.channel,
    o.total, o.delivery_fee, o.delivery_address, o.customer_name,
    o.created_at, o.updated_at,
    s.name, s.slug,
    c.name, c.phone, c.plate_number,
    o.delivery_proof_url, o.delivered_at
  FROM public.orders o
  JOIN public.coffee_shops s ON s.id = o.shop_id
  LEFT JOIN public.couriers c ON c.id = o.courier_id
  WHERE o.id = _order_id
    AND o.channel = 'online'
$$;
