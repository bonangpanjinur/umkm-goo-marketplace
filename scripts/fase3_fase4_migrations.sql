-- ============================================================
-- Fase 3 & 4 Migrations — UMKMgo Marketplace
-- Jalankan di Supabase SQL Editor
-- ============================================================

-- ── F4-2: Full-text Search — GIN indexes ─────────────────────

-- GIN index untuk menu_items (nama + deskripsi produk)
CREATE INDEX IF NOT EXISTS idx_menu_items_fts
  ON public.menu_items
  USING GIN (to_tsvector('indonesian', coalesce(name, '') || ' ' || coalesce(description, '')));

-- GIN index untuk shops (nama toko + deskripsi + kota)
CREATE INDEX IF NOT EXISTS idx_shops_fts
  ON public.shops
  USING GIN (to_tsvector('indonesian', coalesce(name, '') || ' ' || coalesce(description, '') || ' ' || coalesce(city, '')));

-- GIN index untuk kategori di menu_items
CREATE INDEX IF NOT EXISTS idx_menu_items_category_gin
  ON public.menu_items USING GIN (category gin_trgm_ops);

-- Trigram extension (dibutuhkan untuk ILIKE cepat)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram index untuk pencarian partial name (mendukung ilike/ilike)
CREATE INDEX IF NOT EXISTS idx_menu_items_name_trgm
  ON public.menu_items USING GIN (name gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_shops_name_trgm
  ON public.shops USING GIN (name gin_trgm_ops);

-- ── F4-3: customer_addresses — pastikan kolom ada ────────────
-- (Tabel sudah ada dari migration awal; hanya menambahkan indeks jika belum ada)

CREATE INDEX IF NOT EXISTS idx_customer_addresses_user_id
  ON public.customer_addresses (user_id);

CREATE INDEX IF NOT EXISTS idx_customer_addresses_default
  ON public.customer_addresses (user_id, is_default DESC);

-- ── F4-4: push_subscriptions — tabel untuk VAPID push ────────
CREATE TABLE IF NOT EXISTS public.push_subscriptions (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  endpoint    text NOT NULL,
  p256dh      text NOT NULL,
  auth_key    text NOT NULL,
  user_agent  text,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, endpoint)
);

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own push subscriptions"
  ON public.push_subscriptions
  FOR ALL TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ── F3-6: Keyset pagination helpers ──────────────────────────
-- Index untuk keyset pagination pada shop_customers
CREATE INDEX IF NOT EXISTS idx_shop_customers_keyset
  ON public.shop_customers (shop_id, total_spent DESC, id);

-- Index untuk keyset pagination pada product_reviews
CREATE INDEX IF NOT EXISTS idx_product_reviews_keyset
  ON public.product_reviews (shop_id, created_at DESC, id);

-- Index untuk keyset pagination pada menu_reviews
CREATE INDEX IF NOT EXISTS idx_menu_reviews_keyset
  ON public.menu_reviews (shop_id, created_at DESC, id);

-- Index untuk keyset pagination pada notifications
CREATE INDEX IF NOT EXISTS idx_notifications_keyset
  ON public.notifications (recipient_user_id, created_at DESC, id)
  WHERE dismissed_at IS NULL;
