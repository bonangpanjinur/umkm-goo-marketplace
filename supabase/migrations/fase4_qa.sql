-- ============================================================
-- Fase 4-5: Q&A Produk
-- Pembeli tanya di halaman produk; owner jawab;
-- tampil publik untuk calon pembeli lain.
-- ============================================================

CREATE TABLE IF NOT EXISTS product_qa (
  id           uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id   uuid        NOT NULL REFERENCES menu_items(id)    ON DELETE CASCADE,
  shop_id      uuid        NOT NULL REFERENCES coffee_shops(id)  ON DELETE CASCADE,
  user_id      uuid        REFERENCES auth.users(id)             ON DELETE SET NULL,
  question     text        NOT NULL CHECK (trim(question) <> ''),
  answer       text,
  answered_by  uuid        REFERENCES auth.users(id),
  answered_at  timestamptz,
  is_hidden    boolean     NOT NULL DEFAULT false,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_product_qa_product ON product_qa(product_id, is_hidden, answered_at DESC);
CREATE INDEX IF NOT EXISTS idx_product_qa_shop    ON product_qa(shop_id, answered_at DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_product_qa_user    ON product_qa(user_id);

ALTER TABLE product_qa ENABLE ROW LEVEL SECURITY;

-- Public: read answered, non-hidden Q&As
DROP POLICY IF EXISTS "public_read_answered" ON product_qa;
CREATE POLICY "public_read_answered" ON product_qa
  FOR SELECT USING (is_hidden = false AND answer IS NOT NULL);

-- Authenticated users: read their own questions (including unanswered)
DROP POLICY IF EXISTS "user_own_read" ON product_qa;
CREATE POLICY "user_own_read" ON product_qa
  FOR SELECT USING (user_id = auth.uid());

-- Authenticated users: submit questions
DROP POLICY IF EXISTS "auth_insert" ON product_qa;
CREATE POLICY "auth_insert" ON product_qa
  FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Shop owners: update (answer / hide) their own product Q&As
DROP POLICY IF EXISTS "owner_update" ON product_qa;
CREATE POLICY "owner_update" ON product_qa
  FOR UPDATE USING (
    shop_id IN (SELECT id FROM coffee_shops WHERE owner_id = auth.uid())
  );

-- Auto-update updated_at
CREATE OR REPLACE FUNCTION update_product_qa_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END;
$$;

DROP TRIGGER IF EXISTS trg_product_qa_updated_at ON product_qa;
CREATE TRIGGER trg_product_qa_updated_at
  BEFORE UPDATE ON product_qa
  FOR EACH ROW EXECUTE FUNCTION update_product_qa_updated_at();
