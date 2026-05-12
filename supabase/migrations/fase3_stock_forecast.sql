-- ============================================================
-- Fase 3-5: Estimasi Stok Habis
-- View untuk menghitung prediksi habis stok berdasarkan
-- rata-rata penjualan 7 hari terakhir.
-- ============================================================

CREATE OR REPLACE VIEW v_stock_forecast AS
SELECT
  i.id            AS ingredient_id,
  i.shop_id,
  i.name,
  i.unit,
  i.current_stock,
  i.min_stock,
  -- total terjual (via trigger deduction) 7 hari terakhir
  COALESCE(
    SUM(sm.quantity) FILTER (
      WHERE sm.type = 'sale'
        AND sm.created_at >= now() - INTERVAL '7 days'
    ), 0
  ) AS sold_7d,
  -- rata-rata pemakaian harian
  COALESCE(
    SUM(sm.quantity) FILTER (
      WHERE sm.type = 'sale'
        AND sm.created_at >= now() - INTERVAL '7 days'
    ), 0
  ) / 7.0 AS avg_daily_use,
  -- estimasi hari sampai habis (NULL jika tidak ada data penjualan)
  CASE
    WHEN COALESCE(
      SUM(sm.quantity) FILTER (
        WHERE sm.type = 'sale'
          AND sm.created_at >= now() - INTERVAL '7 days'
      ), 0
    ) = 0 THEN NULL
    ELSE i.current_stock
         / (COALESCE(
              SUM(sm.quantity) FILTER (
                WHERE sm.type = 'sale'
                  AND sm.created_at >= now() - INTERVAL '7 days'
              ), 0
            ) / 7.0)
  END AS days_remaining
FROM ingredients i
LEFT JOIN stock_movements sm ON sm.ingredient_id = i.id
WHERE i.is_active = true
GROUP BY i.id, i.shop_id, i.name, i.unit, i.current_stock, i.min_stock;

-- Index untuk performa query view di atas
CREATE INDEX IF NOT EXISTS idx_stock_movements_sale_date
  ON stock_movements(shop_id, ingredient_id, created_at)
  WHERE type = 'sale';
