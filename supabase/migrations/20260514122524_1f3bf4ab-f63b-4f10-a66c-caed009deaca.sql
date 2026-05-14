-- Remove duplicates first if any
DELETE FROM public.owner_notifications a USING public.owner_notifications b
WHERE a.id < b.id AND a.shop_id = b.shop_id AND a.dedupe_key = b.dedupe_key AND a.dedupe_key IS NOT NULL;

ALTER TABLE public.owner_notifications
  ADD CONSTRAINT owner_notifications_shop_dedupe_unique UNIQUE (shop_id, dedupe_key);