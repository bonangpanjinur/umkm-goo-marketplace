CREATE TABLE IF NOT EXISTS public.menu_item_variants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  menu_item_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sku TEXT,
  price NUMERIC NOT NULL DEFAULT 0,
  stock INTEGER,
  is_available BOOLEAN NOT NULL DEFAULT true,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_item_variants_shop ON public.menu_item_variants(shop_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_variants_item ON public.menu_item_variants(menu_item_id);

ALTER TABLE public.menu_item_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "variants_owner_all" ON public.menu_item_variants
FOR ALL
USING (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = menu_item_variants.shop_id AND s.owner_id = auth.uid()))
WITH CHECK (EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = menu_item_variants.shop_id AND s.owner_id = auth.uid()));

CREATE POLICY "variants_staff_read" ON public.menu_item_variants
FOR SELECT
USING (EXISTS (SELECT 1 FROM public.user_roles r WHERE r.user_id = auth.uid() AND r.role = ANY (ARRAY['cashier'::app_role, 'barista'::app_role]) AND r.shop_id = menu_item_variants.shop_id));

CREATE POLICY "variants_public_read" ON public.menu_item_variants
FOR SELECT
USING (is_available = true AND EXISTS (SELECT 1 FROM public.coffee_shops s WHERE s.id = menu_item_variants.shop_id AND s.is_active = true));

CREATE TRIGGER update_menu_item_variants_updated_at
BEFORE UPDATE ON public.menu_item_variants
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();