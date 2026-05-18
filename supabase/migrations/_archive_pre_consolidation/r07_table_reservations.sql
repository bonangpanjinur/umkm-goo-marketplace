-- ============================================================
-- R-07: Reservasi Meja Customer-Facing
-- Pembeli dapat memesan meja langsung dari halaman /toko/:slug
-- tanpa perlu menghubungi merchant manual.
-- ============================================================

-- Tabel utama reservasi meja
CREATE TABLE IF NOT EXISTS public.table_reservations (
  id                uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id           uuid        NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  table_id          uuid        REFERENCES public.tables(id)    ON DELETE SET NULL,
  table_name        text,
  customer_name     text        NOT NULL,
  customer_phone    text        NOT NULL,
  customer_email    text,
  party_size        int         NOT NULL DEFAULT 1 CHECK (party_size >= 1),
  reservation_date  date        NOT NULL,
  reservation_time  time        NOT NULL,
  duration_minutes  int         NOT NULL DEFAULT 90 CHECK (duration_minutes > 0),
  status            text        NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','confirmed','seated','completed','cancelled','no_show')),
  notes             text,
  cancel_token      uuid        NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  cancelled_at      timestamptz,
  cancelled_reason  text,
  confirmed_at      timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_table_res_shop_date
  ON public.table_reservations (shop_id, reservation_date, status);
CREATE INDEX IF NOT EXISTS idx_table_res_table_date
  ON public.table_reservations (table_id, reservation_date)
  WHERE table_id IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS idx_table_res_cancel_token
  ON public.table_reservations (cancel_token);

-- Auto-update updated_at
DROP TRIGGER IF EXISTS trg_table_reservations_updated ON public.table_reservations;
CREATE TRIGGER trg_table_reservations_updated
  BEFORE UPDATE ON public.table_reservations
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

ALTER TABLE public.table_reservations ENABLE ROW LEVEL SECURITY;

-- Publik: siapa pun bisa membuat reservasi
DROP POLICY IF EXISTS "res_public_insert" ON public.table_reservations;
CREATE POLICY "res_public_insert" ON public.table_reservations
  FOR INSERT WITH CHECK (true);

-- Publik: baca via cancel_token (untuk halaman status)
DROP POLICY IF EXISTS "res_public_select_token" ON public.table_reservations;
CREATE POLICY "res_public_select_token" ON public.table_reservations
  FOR SELECT USING (true);

-- Owner toko: full CRUD
DROP POLICY IF EXISTS "res_owner_all" ON public.table_reservations;
CREATE POLICY "res_owner_all" ON public.table_reservations
  FOR ALL
  USING  (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid() OR owner_user_id = auth.uid()))
  WITH CHECK (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid() OR owner_user_id = auth.uid()));

-- Pengaturan reservasi per toko
ALTER TABLE public.coffee_shops
  ADD COLUMN IF NOT EXISTS reservation_enabled     boolean     NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS reservation_open_days   int[]       NOT NULL DEFAULT '{0,1,2,3,4,5,6}',
  ADD COLUMN IF NOT EXISTS reservation_open_time   time        NOT NULL DEFAULT '09:00',
  ADD COLUMN IF NOT EXISTS reservation_close_time  time        NOT NULL DEFAULT '21:00',
  ADD COLUMN IF NOT EXISTS reservation_duration    int         NOT NULL DEFAULT 90,
  ADD COLUMN IF NOT EXISTS reservation_max_party   int         NOT NULL DEFAULT 20,
  ADD COLUMN IF NOT EXISTS reservation_notes       text;

-- RPC: cek ketersediaan meja untuk slot waktu tertentu
CREATE OR REPLACE FUNCTION public.get_available_tables(
  p_shop_id        uuid,
  p_date           date,
  p_time           time,
  p_duration_min   int DEFAULT 90,
  p_party_size     int DEFAULT 1
)
RETURNS TABLE (
  id          uuid,
  name        text,
  capacity    int,
  shape       text,
  status      text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT t.id, t.name, t.capacity, t.shape, t.status
  FROM public.tables t
  WHERE t.shop_id = p_shop_id
    AND t.capacity >= p_party_size
    AND t.status NOT IN ('occupied', 'dirty')
    -- Tidak sedang dipesan pada rentang waktu yang overlap
    AND NOT EXISTS (
      SELECT 1
      FROM public.table_reservations r
      WHERE r.table_id = t.id
        AND r.reservation_date = p_date
        AND r.status NOT IN ('cancelled', 'no_show', 'completed')
        AND r.reservation_time < (p_time + (p_duration_min || ' minutes')::interval)::time
        AND (r.reservation_time + (r.duration_minutes || ' minutes')::interval)::time > p_time
    )
  ORDER BY t.capacity, t.name;
$$;

GRANT EXECUTE ON FUNCTION public.get_available_tables(uuid, date, time, int, int) TO anon, authenticated;

-- RPC: batalkan reservasi via token (customer self-cancel)
CREATE OR REPLACE FUNCTION public.cancel_table_reservation(
  _token  uuid,
  _reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_res table_reservations%ROWTYPE;
BEGIN
  SELECT * INTO v_res FROM table_reservations WHERE cancel_token = _token FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Reservasi tidak ditemukan');
  END IF;
  IF v_res.status IN ('cancelled', 'completed', 'no_show') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Reservasi sudah ' || v_res.status);
  END IF;

  UPDATE table_reservations
  SET status           = 'cancelled',
      cancelled_at     = now(),
      cancelled_reason = _reason,
      updated_at       = now()
  WHERE id = v_res.id;

  RETURN jsonb_build_object('ok', true, 'reservation_id', v_res.id);
END;
$$;

GRANT EXECUTE ON FUNCTION public.cancel_table_reservation(uuid, text) TO anon, authenticated;
