ALTER TABLE public.categories ADD COLUMN IF NOT EXISTS printer_id uuid REFERENCES public.printers(id) ON DELETE SET NULL;
NOTIFY pgrst, 'reload schema';