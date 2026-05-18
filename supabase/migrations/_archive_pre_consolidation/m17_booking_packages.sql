-- ============================================================
-- M-17: Paket Layanan + Add-on saat Booking
-- Service packages (Basic/Standard/Premium) and optional
-- add-ons that buyers can select during the booking wizard.
-- ============================================================

-- ── Service packages ─────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_service_packages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     uuid        NOT NULL REFERENCES coffee_shops(id) ON DELETE CASCADE,
  name        text        NOT NULL CHECK (trim(name) <> ''),
  description text,
  price       numeric(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  is_active   boolean     NOT NULL DEFAULT true,
  sort_order  int         NOT NULL DEFAULT 0,
  color       text        NOT NULL DEFAULT 'blue'
                            CHECK (color IN ('blue','green','purple','amber','rose')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bk_svc_pkg_shop
  ON booking_service_packages(shop_id, sort_order, created_at);

-- ── Add-ons ──────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS booking_addons (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id     uuid        NOT NULL REFERENCES coffee_shops(id) ON DELETE CASCADE,
  name        text        NOT NULL CHECK (trim(name) <> ''),
  description text,
  price       numeric(12,2) NOT NULL DEFAULT 0 CHECK (price >= 0),
  is_active   boolean     NOT NULL DEFAULT true,
  sort_order  int         NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bk_addons_shop
  ON booking_addons(shop_id, sort_order, created_at);

-- ── Extend bookings table ─────────────────────────────────────
ALTER TABLE bookings
  ADD COLUMN IF NOT EXISTS package_id            uuid
    REFERENCES booking_service_packages(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS package_name          text,
  ADD COLUMN IF NOT EXISTS package_price         numeric(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS addon_ids             jsonb         NOT NULL DEFAULT '[]',
  ADD COLUMN IF NOT EXISTS addon_names_snapshot  text,
  ADD COLUMN IF NOT EXISTS addon_total_price     numeric(12,2) NOT NULL DEFAULT 0;

-- ── Row-Level Security ────────────────────────────────────────
ALTER TABLE booking_service_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE booking_addons           ENABLE ROW LEVEL SECURITY;

-- Public: buyers can read active packages/add-ons to display during wizard
DROP POLICY IF EXISTS bk_pkg_public_read  ON booking_service_packages;
CREATE POLICY bk_pkg_public_read ON booking_service_packages
  FOR SELECT USING (is_active = true);

DROP POLICY IF EXISTS bk_addon_public_read ON booking_addons;
CREATE POLICY bk_addon_public_read ON booking_addons
  FOR SELECT USING (is_active = true);

-- Owner: full CRUD on their own shop's packages / add-ons
DROP POLICY IF EXISTS bk_pkg_owner_all ON booking_service_packages;
CREATE POLICY bk_pkg_owner_all ON booking_service_packages
  FOR ALL USING (
    shop_id IN (SELECT id FROM coffee_shops WHERE owner_user_id = auth.uid())
  );

DROP POLICY IF EXISTS bk_addon_owner_all ON booking_addons;
CREATE POLICY bk_addon_owner_all ON booking_addons
  FOR ALL USING (
    shop_id IN (SELECT id FROM coffee_shops WHERE owner_user_id = auth.uid())
  );

-- ── Sample seed data (uncomment to seed) ──────────────────────
-- INSERT INTO booking_service_packages (shop_id, name, description, price, sort_order, color)
-- SELECT id, 'Basic',    'Layanan standar',          0,       0, 'blue'
-- FROM coffee_shops WHERE is_active = true LIMIT 1;
