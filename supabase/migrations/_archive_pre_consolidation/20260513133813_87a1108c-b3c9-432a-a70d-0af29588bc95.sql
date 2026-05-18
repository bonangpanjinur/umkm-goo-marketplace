ALTER TABLE public.menu_items
  ADD COLUMN IF NOT EXISTS pre_order_open_at           timestamptz,
  ADD COLUMN IF NOT EXISTS pre_order_close_at          timestamptz,
  ADD COLUMN IF NOT EXISTS pre_order_estimated_ship_at date,
  ADD COLUMN IF NOT EXISTS pre_order_min_qty           integer,
  ADD COLUMN IF NOT EXISTS pre_order_current_qty       integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_menu_items_preorder_window
  ON public.menu_items (is_pre_order, pre_order_close_at)
  WHERE is_pre_order = true;