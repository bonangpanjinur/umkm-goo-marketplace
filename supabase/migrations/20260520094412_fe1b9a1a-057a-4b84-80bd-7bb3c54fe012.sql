CREATE OR REPLACE FUNCTION public.admin_buyer_segments()
RETURNS TABLE(total bigint, active bigint, inactive bigint, new_buyers bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'super_admin') THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  RETURN QUERY
  WITH buyers AS (
    SELECT DISTINCT u.id, u.created_at
    FROM auth.users u
    WHERE EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = u.id AND r.role = 'customer')
       OR EXISTS (SELECT 1 FROM public.orders o WHERE o.customer_user_id = u.id)
  ),
  last_order AS (
    SELECT customer_user_id, max(created_at) AS last_at
    FROM public.orders
    WHERE customer_user_id IS NOT NULL
    GROUP BY customer_user_id
  )
  SELECT
    (SELECT count(*) FROM buyers)::bigint,
    (SELECT count(*) FROM last_order WHERE last_at >= now() - interval '30 days')::bigint,
    (SELECT count(*) FROM buyers b LEFT JOIN last_order lo ON lo.customer_user_id = b.id
       WHERE lo.last_at IS NULL OR lo.last_at < now() - interval '60 days')::bigint,
    (SELECT count(*) FROM buyers WHERE created_at >= now() - interval '7 days')::bigint;
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_buyer_segments() TO authenticated;