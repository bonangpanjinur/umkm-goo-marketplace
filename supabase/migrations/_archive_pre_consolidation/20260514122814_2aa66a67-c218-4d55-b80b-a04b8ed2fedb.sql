ALTER TABLE public.stock_opname_items
  ADD CONSTRAINT stock_opname_items_ingredient_id_fkey
  FOREIGN KEY (ingredient_id) REFERENCES public.ingredients(id) ON DELETE CASCADE;
NOTIFY pgrst, 'reload schema';