
DROP VIEW IF EXISTS public.courier_earnings;

CREATE VIEW public.courier_earnings
WITH (security_invoker = true) AS
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
