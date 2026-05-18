ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS barcode TEXT;
ALTER TABLE public.menu_item_variants ADD COLUMN IF NOT EXISTS barcode TEXT;
CREATE INDEX IF NOT EXISTS idx_menu_items_barcode_shop ON public.menu_items(shop_id, barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_menu_item_variants_barcode_shop ON public.menu_item_variants(shop_id, barcode) WHERE barcode IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_menu_items_sku_shop ON public.menu_items(shop_id, sku) WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_menu_item_variants_sku_shop ON public.menu_item_variants(shop_id, sku) WHERE sku IS NOT NULL;