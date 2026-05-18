-- ============================================================
-- Fase 6: Sertifikat Toko Terpercaya
-- ============================================================
-- Criteria: avg_rating >= 4.5, review_count >= 50, reply_rate > 80%

-- 1. Add has_trust_cert column to coffee_shops
ALTER TABLE coffee_shops
  ADD COLUMN IF NOT EXISTS has_trust_cert BOOLEAN NOT NULL DEFAULT false;

-- 2. Function to compute and update trust cert for a single shop
CREATE OR REPLACE FUNCTION compute_shop_trust_cert(p_shop_id UUID)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_avg        NUMERIC;
  v_count      INTEGER;
  v_replied    INTEGER;
  v_reply_rate NUMERIC;
  v_eligible   BOOLEAN;
BEGIN
  SELECT
    COALESCE(AVG(rating), 0),
    COUNT(*),
    COUNT(*) FILTER (WHERE shop_reply IS NOT NULL AND shop_reply <> '')
  INTO v_avg, v_count, v_replied
  FROM product_reviews
  WHERE shop_id = p_shop_id
    AND is_hidden = false;

  v_reply_rate := CASE WHEN v_count > 0 THEN v_replied::numeric / v_count ELSE 0 END;
  v_eligible   := v_avg >= 4.5 AND v_count >= 50 AND v_reply_rate > 0.80;

  UPDATE coffee_shops
  SET has_trust_cert = v_eligible
  WHERE id = p_shop_id;

  RETURN v_eligible;
END;
$$;

-- 3. Trigger function — auto-recompute cert when reviews change
CREATE OR REPLACE FUNCTION trg_recompute_trust_cert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Determine which shop to recompute
  IF TG_OP = 'DELETE' THEN
    PERFORM compute_shop_trust_cert(OLD.shop_id);
    RETURN OLD;
  ELSE
    PERFORM compute_shop_trust_cert(NEW.shop_id);
    RETURN NEW;
  END IF;
END;
$$;

-- 4. Attach trigger to product_reviews
DROP TRIGGER IF EXISTS trg_product_reviews_trust_cert ON product_reviews;
CREATE TRIGGER trg_product_reviews_trust_cert
  AFTER INSERT OR UPDATE OF rating, shop_reply, is_hidden OR DELETE
  ON product_reviews
  FOR EACH ROW
  EXECUTE FUNCTION trg_recompute_trust_cert();

-- 5. Bulk-update existing shops (backfill)
DO $$
DECLARE
  r RECORD;
BEGIN
  FOR r IN SELECT id FROM coffee_shops WHERE is_active = true LOOP
    PERFORM compute_shop_trust_cert(r.id);
  END LOOP;
END;
$$;

-- 6. Grant read access to the new column (already inherited from table grants)
-- Index for leaderboard queries filtering on cert
CREATE INDEX IF NOT EXISTS idx_coffee_shops_trust_cert
  ON coffee_shops (has_trust_cert) WHERE has_trust_cert = true;
