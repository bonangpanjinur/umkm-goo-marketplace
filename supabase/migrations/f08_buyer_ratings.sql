-- F-08: Rating Pembeli 2-Way
-- Merchant dapat menilai pembeli setelah transaksi marketplace selesai

CREATE TABLE IF NOT EXISTS buyer_ratings (
  id              UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id        UUID NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  shop_id         UUID NOT NULL REFERENCES coffee_shops(id) ON DELETE CASCADE,
  rated_user_id   UUID,                    -- buyer's auth.uid() (null = guest order)
  customer_name   TEXT,                    -- nama pembeli dari order
  rating          SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment         TEXT     CHECK (char_length(comment) <= 500),
  created_at      TIMESTAMPTZ DEFAULT now() NOT NULL,
  UNIQUE(order_id, shop_id)                -- 1 penilaian per order per toko
);

CREATE INDEX IF NOT EXISTS buyer_ratings_user_idx  ON buyer_ratings(rated_user_id);
CREATE INDEX IF NOT EXISTS buyer_ratings_shop_idx  ON buyer_ratings(shop_id);
CREATE INDEX IF NOT EXISTS buyer_ratings_order_idx ON buyer_ratings(order_id);

ALTER TABLE buyer_ratings ENABLE ROW LEVEL SECURITY;

-- Merchant: bisa baca + insert + update penilaian milik tokonya sendiri
CREATE POLICY "merchant_manage_buyer_ratings" ON buyer_ratings
  FOR ALL
  USING (
    shop_id IN (
      SELECT id FROM coffee_shops WHERE owner_id = auth.uid()
    )
  );

-- Pembeli: hanya bisa baca penilaian yang ditujukan ke dirinya
CREATE POLICY "buyer_read_own_ratings" ON buyer_ratings
  FOR SELECT
  USING (rated_user_id = auth.uid());
