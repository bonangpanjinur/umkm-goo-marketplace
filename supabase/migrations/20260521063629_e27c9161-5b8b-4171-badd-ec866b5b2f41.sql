-- P0 Guard: pastikan is_shop_owner(uuid) 1-arg ada sebelum dipakai RLS lain
CREATE OR REPLACE FUNCTION public.is_shop_owner(_shop_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.shops s
    WHERE s.id = _shop_id AND s.owner_id = auth.uid()
  );
$$;

-- Tabel API keys per toko (idempotent)
CREATE TABLE IF NOT EXISTS public.shop_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id uuid NOT NULL REFERENCES public.shops(id) ON DELETE CASCADE,
  provider text NOT NULL,
  api_key text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(shop_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_shop_api_keys_shop ON public.shop_api_keys(shop_id);

ALTER TABLE public.shop_api_keys ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "shop_api_keys_owner_all" ON public.shop_api_keys;
CREATE POLICY "shop_api_keys_owner_all" ON public.shop_api_keys
  FOR ALL TO authenticated
  USING (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role))
  WITH CHECK (public.is_shop_owner(shop_id) OR public.has_role(auth.uid(),'super_admin'::app_role));

DROP TRIGGER IF EXISTS trg_shop_api_keys_updated ON public.shop_api_keys;
CREATE TRIGGER trg_shop_api_keys_updated
  BEFORE UPDATE ON public.shop_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
