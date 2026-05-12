-- ============================================================
-- Fase 5: Q&A Pin (FAQ) + Auto-reply di luar jam buka
-- ============================================================

-- 1. Tambah kolom is_pinned ke product_qa
ALTER TABLE product_qa
  ADD COLUMN IF NOT EXISTS is_pinned BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_product_qa_pinned
  ON product_qa(product_id, is_pinned, answered_at DESC);

-- 2. Tambah auto-reply ke coffee_shops
ALTER TABLE coffee_shops
  ADD COLUMN IF NOT EXISTS auto_reply_enabled  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS auto_reply_message  TEXT;

-- 3. Tabel flash_sale_schedules untuk Flash Sale Terjadwal (F5-2)
CREATE TABLE IF NOT EXISTS flash_sale_schedules (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         UUID NOT NULL REFERENCES coffee_shops(id) ON DELETE CASCADE,
  menu_item_id    UUID NOT NULL REFERENCES menu_items(id)   ON DELETE CASCADE,
  flash_price     NUMERIC(12,2) NOT NULL,
  starts_at       TIMESTAMPTZ   NOT NULL,
  ends_at         TIMESTAMPTZ   NOT NULL,
  is_applied      BOOLEAN       NOT NULL DEFAULT false,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT now(),
  CHECK (ends_at > starts_at)
);

CREATE INDEX IF NOT EXISTS idx_flash_schedules_shop    ON flash_sale_schedules(shop_id, starts_at);
CREATE INDEX IF NOT EXISTS idx_flash_schedules_item    ON flash_sale_schedules(menu_item_id);
CREATE INDEX IF NOT EXISTS idx_flash_schedules_active  ON flash_sale_schedules(starts_at, ends_at) WHERE NOT is_applied;

ALTER TABLE flash_sale_schedules ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "owner_all_flash_schedules" ON flash_sale_schedules;
CREATE POLICY "owner_all_flash_schedules" ON flash_sale_schedules
  USING  (shop_id IN (SELECT id FROM coffee_shops WHERE owner_id = auth.uid()))
  WITH CHECK (shop_id IN (SELECT id FROM coffee_shops WHERE owner_id = auth.uid()));
