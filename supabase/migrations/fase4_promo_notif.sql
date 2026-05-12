-- ============================================================
-- Fase 4-1: Notifikasi Promo ke Pengikut Toko
-- ============================================================

-- 1. shop_follows table (may already exist in Supabase cloud)
CREATE TABLE IF NOT EXISTS shop_follows (
  id         uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id    uuid        NOT NULL REFERENCES coffee_shops(id) ON DELETE CASCADE,
  user_id    uuid        NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_shop_follows_shop ON shop_follows(shop_id);
CREATE INDEX IF NOT EXISTS idx_shop_follows_user ON shop_follows(user_id);

-- 2. Ensure dedupe_key has a unique constraint so ON CONFLICT works
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'notifications_dedupe_key_key'
  ) THEN
    ALTER TABLE notifications
      ADD CONSTRAINT notifications_dedupe_key_key UNIQUE (dedupe_key);
  END IF;
END $$;

-- ============================================================
-- 3. Function: fan out voucher promo notification to followers
-- ============================================================
CREATE OR REPLACE FUNCTION fn_notify_promo_followers()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_shop_name  text;
  v_shop_slug  text;
  v_disc_label text;
  v_title      text;
  v_body       text;
BEGIN
  -- Only for marketplace-visible promos that are active
  IF NEW.is_active = FALSE THEN RETURN NEW; END IF;
  IF NEW.channel NOT IN ('online', 'all') THEN RETURN NEW; END IF;

  -- On UPDATE: only fire when is_active transitions FALSE → TRUE
  IF TG_OP = 'UPDATE' AND (OLD.is_active IS TRUE) THEN RETURN NEW; END IF;

  -- Fetch shop details
  SELECT name, slug INTO v_shop_name, v_shop_slug
  FROM coffee_shops WHERE id = NEW.shop_id;

  IF v_shop_name IS NULL THEN RETURN NEW; END IF;

  -- Format discount label
  IF NEW.type = 'percent' THEN
    v_disc_label := NEW.value::text || '% diskon';
  ELSE
    v_disc_label := 'hemat Rp ' || to_char(NEW.value, 'FM999,999,999');
  END IF;

  v_title := v_shop_name || ' punya promo baru!';
  v_body  := 'Kode ' || NEW.code || ' — ' || v_disc_label;
  IF NEW.description IS NOT NULL AND trim(NEW.description) <> '' THEN
    v_body := v_body || '. ' || trim(NEW.description);
  END IF;

  -- Fan out: one notification per follower; skip duplicates
  INSERT INTO notifications
    (recipient_user_id, type, title, body, link, severity, shop_id, dedupe_key)
  SELECT
    sf.user_id,
    'promo',
    v_title,
    v_body,
    '/toko/' || v_shop_slug,
    'info',
    NEW.shop_id,
    'promo_' || NEW.id::text || '_' || sf.user_id::text
  FROM shop_follows sf
  WHERE sf.shop_id = NEW.shop_id
  ON CONFLICT (dedupe_key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_promo_followers ON promos;
CREATE TRIGGER trg_notify_promo_followers
  AFTER INSERT OR UPDATE OF is_active ON promos
  FOR EACH ROW EXECUTE FUNCTION fn_notify_promo_followers();

-- ============================================================
-- 4. Function: fan out flash-sale notification to followers
-- ============================================================
CREATE OR REPLACE FUNCTION fn_notify_flash_sale_followers()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  v_shop_name text;
  v_shop_slug text;
  v_disc      int;
  v_link      text;
BEGIN
  -- Only fire when flash_price is first set (was NULL, now NOT NULL)
  IF NEW.flash_price IS NULL THEN RETURN NEW; END IF;
  IF TG_OP = 'UPDATE' AND OLD.flash_price IS NOT NULL THEN RETURN NEW; END IF;

  -- Fetch shop details
  SELECT name, slug INTO v_shop_name, v_shop_slug
  FROM coffee_shops WHERE id = NEW.shop_id;

  IF v_shop_name IS NULL THEN RETURN NEW; END IF;

  -- Compute discount %
  IF NEW.price > 0 THEN
    v_disc := round(((NEW.price - NEW.flash_price) / NEW.price::numeric) * 100);
  ELSE
    v_disc := 0;
  END IF;

  -- Build deep link (use slug if available, else generic shop page)
  v_link := '/toko/' || v_shop_slug;
  IF NEW.slug IS NOT NULL THEN
    v_link := v_link || '/produk/' || NEW.slug;
  END IF;

  INSERT INTO notifications
    (recipient_user_id, type, title, body, link, severity, shop_id, dedupe_key)
  SELECT
    sf.user_id,
    'promo',
    v_shop_name || ' ada flash sale!',
    NEW.name || ' diskon ' || v_disc || '% — penawaran terbatas',
    v_link,
    'info',
    NEW.shop_id,
    'flash_' || NEW.id::text || '_' || sf.user_id::text
  FROM shop_follows sf
  WHERE sf.shop_id = NEW.shop_id
  ON CONFLICT (dedupe_key) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_flash_sale_followers ON menu_items;
CREATE TRIGGER trg_notify_flash_sale_followers
  AFTER INSERT OR UPDATE OF flash_price ON menu_items
  FOR EACH ROW EXECUTE FUNCTION fn_notify_flash_sale_followers();
