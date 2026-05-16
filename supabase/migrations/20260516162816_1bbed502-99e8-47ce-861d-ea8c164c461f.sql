CREATE TABLE IF NOT EXISTS public.wishlists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  menu_item_id uuid NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, menu_item_id)
);

CREATE INDEX IF NOT EXISTS idx_wishlists_user ON public.wishlists(user_id);
CREATE INDEX IF NOT EXISTS idx_wishlists_menu_item ON public.wishlists(menu_item_id);

ALTER TABLE public.wishlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own wishlist" ON public.wishlists
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users insert own wishlist" ON public.wishlists
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own wishlist" ON public.wishlists
  FOR DELETE USING (auth.uid() = user_id);

CREATE POLICY "Shop owners view wishlists of their products" ON public.wishlists
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.menu_items mi
      JOIN public.coffee_shops cs ON cs.id = mi.shop_id
      WHERE mi.id = wishlists.menu_item_id AND cs.owner_id = auth.uid()
    )
  );