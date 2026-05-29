-- =========================================================
-- Fase 10 — Kurir & Staff Lengkap
-- Jalankan sekali di Supabase SQL Editor
-- =========================================================

-- F10-4: courier_ratings — penilaian bintang dari pembeli ke kurir
CREATE TABLE IF NOT EXISTS public.courier_ratings (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id      UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  courier_id    UUID NOT NULL REFERENCES public.couriers(id) ON DELETE CASCADE,
  user_id       UUID NOT NULL,
  shop_id       UUID REFERENCES public.shops(id) ON DELETE SET NULL,
  rating        SMALLINT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment       TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (order_id, user_id)
);

CREATE INDEX IF NOT EXISTS courier_ratings_courier_idx ON public.courier_ratings(courier_id);
CREATE INDEX IF NOT EXISTS courier_ratings_order_idx   ON public.courier_ratings(order_id);

-- Enable RLS
ALTER TABLE public.courier_ratings ENABLE ROW LEVEL SECURITY;

-- Buyer dapat insert & select ratings miliknya
CREATE POLICY "courier_ratings_insert" ON public.courier_ratings
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "courier_ratings_select" ON public.courier_ratings
  FOR SELECT USING (
    auth.uid() = user_id
    OR EXISTS (
      SELECT 1 FROM public.couriers c
      WHERE c.id = courier_id AND c.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.shop_staff ss
      WHERE ss.shop_id = courier_ratings.shop_id AND ss.user_id = auth.uid()
    )
  );

-- View: rata-rata rating per kurir
CREATE OR REPLACE VIEW public.courier_rating_summary AS
SELECT
  courier_id,
  COUNT(*)::INT              AS total_ratings,
  ROUND(AVG(rating)::NUMERIC, 2) AS avg_rating
FROM public.courier_ratings
GROUP BY courier_id;

-- F10-2: kolom saldo kurir (penghasilan yang bisa ditarik)
ALTER TABLE public.couriers
  ADD COLUMN IF NOT EXISTS balance NUMERIC(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_earned NUMERIC(15,2) NOT NULL DEFAULT 0;

-- F10-2: tabel withdrawal_requests untuk kurir (kolom courier_id jika belum ada)
ALTER TABLE public.withdrawal_requests
  ADD COLUMN IF NOT EXISTS courier_id UUID REFERENCES public.couriers(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS withdrawal_requests_courier_idx
  ON public.withdrawal_requests(courier_id)
  WHERE courier_id IS NOT NULL;
