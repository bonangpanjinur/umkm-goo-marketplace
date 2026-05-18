CREATE OR REPLACE FUNCTION public.get_customer_custom_orders(p_shop_slug text, p_contact text)
RETURNS TABLE (
  id uuid,
  shop_id uuid,
  product_id uuid,
  product_name text,
  customer_name text,
  description text,
  budget_min numeric,
  budget_max numeric,
  deadline date,
  reference_image_url text,
  status text,
  owner_note text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT cor.id, cor.shop_id, cor.product_id, mi.name AS product_name,
         cor.customer_name, cor.description, cor.budget_min, cor.budget_max,
         cor.deadline, cor.reference_image_url, cor.status, cor.owner_note,
         cor.created_at, cor.updated_at
  FROM public.custom_order_requests cor
  JOIN public.coffee_shops cs ON cs.id = cor.shop_id
  LEFT JOIN public.menu_items mi ON mi.id = cor.product_id
  WHERE cs.slug = p_shop_slug
    AND regexp_replace(cor.customer_contact, '\D', '', 'g')
        = regexp_replace(coalesce(p_contact, ''), '\D', '', 'g')
    AND length(regexp_replace(coalesce(p_contact, ''), '\D', '', 'g')) >= 6
  ORDER BY cor.created_at DESC
  LIMIT 50;
$$;

GRANT EXECUTE ON FUNCTION public.get_customer_custom_orders(text, text) TO anon, authenticated;