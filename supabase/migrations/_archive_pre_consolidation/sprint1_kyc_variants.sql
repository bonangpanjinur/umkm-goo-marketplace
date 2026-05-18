-- ============================================================
-- Sprint 1 Migration: KYC columns + Product Variants table
-- Run this in Supabase SQL Editor (Dashboard > SQL Editor)
-- ============================================================

-- 1. KYC columns on coffee_shops
ALTER TABLE coffee_shops
  ADD COLUMN IF NOT EXISTS kyc_status        text    NOT NULL DEFAULT 'not_submitted',
  ADD COLUMN IF NOT EXISTS kyc_document_url  text,
  ADD COLUMN IF NOT EXISTS kyc_submitted_at  timestamptz,
  ADD COLUMN IF NOT EXISTS kyc_reviewed_at   timestamptz,
  ADD COLUMN IF NOT EXISTS kyc_reviewer_id   uuid    REFERENCES auth.users(id),
  ADD COLUMN IF NOT EXISTS kyc_reject_reason text,
  ADD COLUMN IF NOT EXISTS business_category text;

-- 2. Product variants table
CREATE TABLE IF NOT EXISTS menu_item_variants (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id       uuid NOT NULL REFERENCES coffee_shops(id) ON DELETE CASCADE,
  menu_item_id  uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  name          text NOT NULL,
  sku           text,
  price         numeric(12,2) NOT NULL DEFAULT 0,
  stock         integer,
  is_available  boolean NOT NULL DEFAULT true,
  sort_order    integer NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_menu_item_variants_shop   ON menu_item_variants(shop_id);
CREATE INDEX IF NOT EXISTS idx_menu_item_variants_item   ON menu_item_variants(menu_item_id);

-- 3. RLS for menu_item_variants
ALTER TABLE menu_item_variants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_all"  ON menu_item_variants;
DROP POLICY IF EXISTS "staff_read" ON menu_item_variants;
DROP POLICY IF EXISTS "public_read" ON menu_item_variants;

CREATE POLICY "owner_all" ON menu_item_variants
  USING (shop_id IN (
    SELECT id FROM coffee_shops WHERE owner_id = auth.uid()
  ))
  WITH CHECK (shop_id IN (
    SELECT id FROM coffee_shops WHERE owner_id = auth.uid()
  ));

CREATE POLICY "staff_read" ON menu_item_variants
  FOR SELECT USING (shop_id IN (
    SELECT shop_id FROM user_roles WHERE user_id = auth.uid()
  ));

CREATE POLICY "public_read" ON menu_item_variants
  FOR SELECT USING (
    is_available = true AND
    shop_id IN (
      SELECT id FROM coffee_shops WHERE suspended_at IS NULL
    )
  );

-- 4. Auto-update updated_at
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_variants_updated_at ON menu_item_variants;
CREATE TRIGGER trg_variants_updated_at
  BEFORE UPDATE ON menu_item_variants
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- 5. Wishlist table
CREATE TABLE IF NOT EXISTS wishlists (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  menu_item_id  uuid NOT NULL REFERENCES menu_items(id) ON DELETE CASCADE,
  created_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, menu_item_id)
);
ALTER TABLE wishlists ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_own" ON wishlists;
CREATE POLICY "user_own" ON wishlists USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- 6. Shop follows table
CREATE TABLE IF NOT EXISTS shop_follows (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  shop_id    uuid NOT NULL REFERENCES coffee_shops(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, shop_id)
);
ALTER TABLE shop_follows ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_own" ON shop_follows;
DROP POLICY IF EXISTS "public_count" ON shop_follows;
CREATE POLICY "user_own" ON shop_follows USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "public_count" ON shop_follows FOR SELECT USING (true);

-- 7. Platform settings table (for payment gateway, commission, branding config)
CREATE TABLE IF NOT EXISTS platform_settings (
  key        text PRIMARY KEY,
  value      jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE platform_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "admin_all" ON platform_settings;
CREATE POLICY "admin_all" ON platform_settings USING (
  EXISTS (SELECT 1 FROM user_roles WHERE user_id = auth.uid() AND role = 'super_admin')
);

-- 8. Notifications table
CREATE TABLE IF NOT EXISTS notifications (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  recipient_user_id   uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type                text NOT NULL DEFAULT 'system',
  title               text NOT NULL,
  body                text,
  link                text,
  severity            text NOT NULL DEFAULT 'info',
  read_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_notifications_recipient ON notifications(recipient_user_id, created_at DESC);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "user_own_notif" ON notifications;
CREATE POLICY "user_own_notif" ON notifications
  USING (recipient_user_id = auth.uid())
  WITH CHECK (recipient_user_id = auth.uid());

-- Helper: mark single notification read
CREATE OR REPLACE FUNCTION mark_notification_read(_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE notifications SET read_at = now()
  WHERE id = _id AND recipient_user_id = auth.uid() AND read_at IS NULL;
END;
$$;

-- Helper: mark all notifications read for current user
CREATE OR REPLACE FUNCTION mark_all_notifications_read()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE notifications SET read_at = now()
  WHERE recipient_user_id = auth.uid() AND read_at IS NULL;
END;
$$;

-- 9. Order status logs (per-step timestamps for buyer tracking timeline)
CREATE TABLE IF NOT EXISTS order_status_logs (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id   uuid NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status     text NOT NULL,
  note       text,
  actor_id   uuid REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_order_status_logs_order ON order_status_logs(order_id, created_at);

ALTER TABLE order_status_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "buyer_read_own" ON order_status_logs;
DROP POLICY IF EXISTS "owner_all"      ON order_status_logs;
CREATE POLICY "buyer_read_own" ON order_status_logs FOR SELECT USING (
  order_id IN (SELECT id FROM orders WHERE customer_user_id = auth.uid())
);
CREATE POLICY "owner_all" ON order_status_logs USING (
  order_id IN (SELECT o.id FROM orders o JOIN coffee_shops cs ON cs.id = o.shop_id WHERE cs.owner_id = auth.uid())
) WITH CHECK (
  order_id IN (SELECT o.id FROM orders o JOIN coffee_shops cs ON cs.id = o.shop_id WHERE cs.owner_id = auth.uid())
);

-- 10. Storage bucket for KYC docs (run once)
INSERT INTO storage.buckets (id, name, public)
VALUES ('shop-assets', 'shop-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to shop-assets
DROP POLICY IF EXISTS "auth_upload" ON storage.objects;
CREATE POLICY "auth_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'shop-assets');

DROP POLICY IF EXISTS "public_read_assets" ON storage.objects;
CREATE POLICY "public_read_assets" ON storage.objects
  FOR SELECT USING (bucket_id = 'shop-assets');
