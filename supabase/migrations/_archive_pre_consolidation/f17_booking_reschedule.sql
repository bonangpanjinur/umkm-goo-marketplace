-- ============================================================
-- F-17: Reschedule Mandiri Booking (Merchant)
-- Merchant dapat memindahkan booking ke slot lain tanpa
-- harus membatalkan dan membuat ulang.
-- ============================================================

-- 1. Tambah kolom pelacak reschedule di tabel bookings
ALTER TABLE public.bookings
  ADD COLUMN IF NOT EXISTS rescheduled_from_slot_id uuid REFERENCES public.booking_slots(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS rescheduled_at            timestamptz,
  ADD COLUMN IF NOT EXISTS reschedule_count          integer NOT NULL DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_bookings_rescheduled
  ON public.bookings (rescheduled_at)
  WHERE rescheduled_at IS NOT NULL;

-- 2. Tabel log histori reschedule (audit trail)
CREATE TABLE IF NOT EXISTS public.booking_reschedule_logs (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id      uuid        NOT NULL REFERENCES public.bookings(id) ON DELETE CASCADE,
  old_slot_id     uuid        NOT NULL REFERENCES public.booking_slots(id) ON DELETE CASCADE,
  new_slot_id     uuid        NOT NULL REFERENCES public.booking_slots(id) ON DELETE CASCADE,
  rescheduled_by  uuid        REFERENCES auth.users(id),
  note            text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reschedule_logs_booking
  ON public.booking_reschedule_logs (booking_id, created_at DESC);

ALTER TABLE public.booking_reschedule_logs ENABLE ROW LEVEL SECURITY;

-- Owner toko dapat membaca log reschedule booking mereka
DROP POLICY IF EXISTS "owner_read_reschedule_logs" ON public.booking_reschedule_logs;
CREATE POLICY "owner_read_reschedule_logs" ON public.booking_reschedule_logs
  FOR SELECT USING (
    booking_id IN (
      SELECT b.id FROM public.bookings b
      JOIN public.booking_slots s ON s.id = b.slot_id
      JOIN public.coffee_shops cs ON cs.id = s.shop_id
      WHERE cs.owner_id = auth.uid() OR cs.owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "owner_insert_reschedule_logs" ON public.booking_reschedule_logs;
CREATE POLICY "owner_insert_reschedule_logs" ON public.booking_reschedule_logs
  FOR INSERT WITH CHECK (
    booking_id IN (
      SELECT b.id FROM public.bookings b
      JOIN public.booking_slots s ON s.id = b.slot_id
      JOIN public.coffee_shops cs ON cs.id = s.shop_id
      WHERE cs.owner_id = auth.uid() OR cs.owner_user_id = auth.uid()
    )
  );

-- 3. Fungsi atomic reschedule: pindahkan booking ke slot baru
CREATE OR REPLACE FUNCTION public.reschedule_booking(
  p_booking_id  uuid,
  p_new_slot_id uuid,
  p_note        text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_booking     bookings%ROWTYPE;
  v_old_slot    booking_slots%ROWTYPE;
  v_new_slot    booking_slots%ROWTYPE;
  v_shop_id     uuid;
  v_is_owner    boolean;
BEGIN
  -- Ambil booking dengan lock
  SELECT * INTO v_booking FROM bookings WHERE id = p_booking_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Booking tidak ditemukan');
  END IF;

  IF v_booking.status NOT IN ('pending', 'confirmed') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Booking dengan status ' || v_booking.status || ' tidak dapat direschedule');
  END IF;

  -- Cegah reschedule ke slot yang sama
  IF v_booking.slot_id = p_new_slot_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Slot tujuan sama dengan slot saat ini');
  END IF;

  -- Ambil slot lama
  SELECT * INTO v_old_slot FROM booking_slots WHERE id = v_booking.slot_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Slot lama tidak ditemukan');
  END IF;

  v_shop_id := v_old_slot.shop_id;

  -- Verifikasi kepemilikan toko (owner_id atau owner_user_id)
  SELECT EXISTS (
    SELECT 1 FROM coffee_shops
    WHERE id = v_shop_id
      AND (owner_id = auth.uid() OR owner_user_id = auth.uid())
  ) INTO v_is_owner;

  IF NOT v_is_owner THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Tidak diizinkan melakukan reschedule booking ini');
  END IF;

  -- Ambil slot baru dengan lock
  SELECT * INTO v_new_slot FROM booking_slots WHERE id = p_new_slot_id FOR UPDATE;
  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Slot tujuan tidak ditemukan');
  END IF;

  -- Pastikan slot baru milik toko yang sama
  IF v_new_slot.shop_id <> v_shop_id THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Slot tujuan bukan milik toko ini');
  END IF;

  -- Cek kapasitas slot baru
  IF v_new_slot.booked_count + v_booking.party_size > COALESCE(v_new_slot.max_capacity, v_new_slot.capacity, 1) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Kapasitas slot tujuan tidak mencukupi');
  END IF;

  -- Kurangi booked_count slot lama
  UPDATE booking_slots
  SET booked_count = GREATEST(COALESCE(booked_count, 0) - 1, 0),
      updated_at   = now()
  WHERE id = v_old_slot.id;

  -- Tambah booked_count slot baru
  UPDATE booking_slots
  SET booked_count = COALESCE(booked_count, 0) + 1,
      updated_at   = now()
  WHERE id = v_new_slot.id;

  -- Update booking: pindahkan ke slot baru
  UPDATE bookings
  SET slot_id                   = p_new_slot_id,
      rescheduled_from_slot_id  = v_old_slot.id,
      rescheduled_at            = now(),
      reschedule_count          = COALESCE(reschedule_count, 0) + 1,
      updated_at                = now()
  WHERE id = p_booking_id;

  -- Catat log reschedule
  INSERT INTO booking_reschedule_logs (
    booking_id, old_slot_id, new_slot_id, rescheduled_by, note
  ) VALUES (
    p_booking_id, v_old_slot.id, v_new_slot.id, auth.uid(), p_note
  );

  -- Notifikasi ke owner (opsional, jika fungsi create_notification tersedia)
  BEGIN
    PERFORM create_notification(
      auth.uid(),
      'booking_rescheduled',
      'Booking berhasil dipindahkan',
      v_booking.customer_name || ' — dipindahkan ke ' || v_new_slot.service_name
        || ' ' || to_char(v_new_slot.slot_date, 'DD Mon YYYY') || ' ' || to_char(v_new_slot.slot_time, 'HH24:MI'),
      '/pos-app/booking',
      'info',
      v_shop_id,
      'reschedule:' || p_booking_id::text
    );
  EXCEPTION WHEN OTHERS THEN
    NULL; -- Abaikan jika create_notification tidak tersedia
  END;

  RETURN jsonb_build_object(
    'ok',           true,
    'booking_id',   p_booking_id,
    'old_slot_id',  v_old_slot.id,
    'new_slot_id',  v_new_slot.id,
    'old_date',     v_old_slot.slot_date,
    'new_date',     v_new_slot.slot_date,
    'old_time',     v_old_slot.slot_time,
    'new_time',     v_new_slot.slot_time
  );
END;
$$;

REVOKE EXECUTE ON FUNCTION public.reschedule_booking(uuid, uuid, text) FROM PUBLIC, anon;
GRANT  EXECUTE ON FUNCTION public.reschedule_booking(uuid, uuid, text) TO authenticated;

COMMENT ON FUNCTION public.reschedule_booking IS
  'F-17: Pindahkan booking ke slot lain secara atomic. Hanya owner toko yang dapat memanggil fungsi ini.';
