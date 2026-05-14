ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS skin_type_tags text[],
  ADD COLUMN IF NOT EXISTS restock_deadline timestamptz,
  ADD COLUMN IF NOT EXISTS nutrition_info jsonb,
  ADD COLUMN IF NOT EXISTS production_days integer,
  ADD COLUMN IF NOT EXISTS condition_grade text;