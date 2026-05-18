
ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS item_type TEXT NOT NULL DEFAULT 'regular';

CREATE INDEX IF NOT EXISTS idx_menu_items_item_type ON public.menu_items(item_type);

CREATE TABLE IF NOT EXISTS public.bundle_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bundle_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  component_id UUID NOT NULL REFERENCES public.menu_items(id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (bundle_id, component_id)
);

CREATE INDEX IF NOT EXISTS idx_bundle_items_bundle_id ON public.bundle_items(bundle_id);
CREATE INDEX IF NOT EXISTS idx_bundle_items_component_id ON public.bundle_items(component_id);

ALTER TABLE public.bundle_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Bundle items are viewable by everyone" ON public.bundle_items;
CREATE POLICY "Bundle items are viewable by everyone"
ON public.bundle_items FOR SELECT
USING (true);

DROP POLICY IF EXISTS "Bundle items managed by shop owner" ON public.bundle_items;
CREATE POLICY "Bundle items managed by shop owner"
ON public.bundle_items FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.menu_items mi
    JOIN public.coffee_shops s ON s.id = mi.shop_id
    WHERE mi.id = bundle_items.bundle_id AND s.owner_id = auth.uid()
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.menu_items mi
    JOIN public.coffee_shops s ON s.id = mi.shop_id
    WHERE mi.id = bundle_items.bundle_id AND s.owner_id = auth.uid()
  )
);

NOTIFY pgrst, 'reload schema';
