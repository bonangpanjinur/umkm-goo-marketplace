ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS auto_disable_on_empty boolean NOT NULL DEFAULT false;
NOTIFY pgrst, 'reload schema';