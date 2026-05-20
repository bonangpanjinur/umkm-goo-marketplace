CREATE OR REPLACE FUNCTION public.ensure_owner_role_for_shop()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.owner_id IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO public.user_roles (user_id, role, shop_id, outlet_id, is_active)
  VALUES (NEW.owner_id, 'owner', NEW.id, NULL, true)
  ON CONFLICT (user_id, role, shop_id, outlet_id) DO UPDATE
  SET is_active = true;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_shops_ensure_owner_role ON public.shops;

CREATE TRIGGER trg_shops_ensure_owner_role
AFTER INSERT OR UPDATE OF owner_id ON public.shops
FOR EACH ROW
EXECUTE FUNCTION public.ensure_owner_role_for_shop();

INSERT INTO public.user_roles (user_id, role, shop_id, outlet_id, is_active)
SELECT s.owner_id, 'owner', s.id, NULL, true
FROM public.shops s
WHERE s.owner_id IS NOT NULL
ON CONFLICT (user_id, role, shop_id, outlet_id) DO UPDATE
SET is_active = true;
