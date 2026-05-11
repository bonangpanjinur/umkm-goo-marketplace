ALTER TABLE public.coffee_shops ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false;
CREATE INDEX IF NOT EXISTS idx_coffee_shops_is_featured ON public.coffee_shops(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_menu_items_is_featured ON public.menu_items(is_featured) WHERE is_featured = true;