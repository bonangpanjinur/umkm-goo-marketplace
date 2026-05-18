-- ============================================================
-- Fase 6: Balas Ulasan + Moderasi + Leaderboard
-- ============================================================

-- F6-1: shop_reply columns already exist in product_reviews
-- (shop_reply TEXT, shop_replied_at TIMESTAMPTZ)
-- No migration needed for F6-1.

-- F6-3: Moderasi ulasan — add is_flagged + flag_reason columns
ALTER TABLE product_reviews
  ADD COLUMN IF NOT EXISTS is_flagged   BOOLEAN   NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS flag_reason  TEXT;

-- Index for admin querying flagged reviews
CREATE INDEX IF NOT EXISTS idx_product_reviews_flagged
  ON product_reviews (shop_id, is_flagged) WHERE is_flagged = true;

-- F6-4: Leaderboard view — pre-aggregates rating + order + follow stats per shop
CREATE OR REPLACE VIEW public.shop_leaderboard AS
SELECT
  cs.id,
  cs.name,
  cs.slug,
  cs.logo_url,
  cs.tagline,
  cs.is_kyc_verified,
  COALESCE(rv.avg_rating, 0)::numeric(4,2)    AS avg_rating,
  COALESCE(rv.review_count, 0)::int           AS review_count,
  COALESCE(oc.order_count, 0)::int            AS order_count,
  COALESCE(fc.follower_count, 0)::int         AS follower_count,
  -- Score: 40% weighted rating × reviews, 40% orders (capped 1000), 20% followers (capped 500)
  ROUND(
    (COALESCE(rv.avg_rating, 0) * LEAST(COALESCE(rv.review_count, 0), 100)) * 0.4
    + LEAST(COALESCE(oc.order_count, 0), 1000) * 0.4
    + LEAST(COALESCE(fc.follower_count, 0), 500) * 0.2
  )::int                                       AS score
FROM coffee_shops cs
LEFT JOIN (
  SELECT shop_id,
         ROUND(AVG(rating)::numeric, 2) AS avg_rating,
         COUNT(*)                        AS review_count
  FROM product_reviews
  WHERE is_hidden = false
  GROUP BY shop_id
) rv ON rv.shop_id = cs.id
LEFT JOIN (
  SELECT shop_id, COUNT(*) AS order_count
  FROM orders
  WHERE status = 'completed'
  GROUP BY shop_id
) oc ON oc.shop_id = cs.id
LEFT JOIN (
  SELECT shop_id, COUNT(*) AS follower_count
  FROM shop_follows
  GROUP BY shop_id
) fc ON fc.shop_id = cs.id
WHERE cs.is_active = true;

-- Public can read the leaderboard view
GRANT SELECT ON public.shop_leaderboard TO anon, authenticated;
