-- M-18b: Notif Score — batas 3 ulang notif, tandai "tidak responsif"
-- Jalankan di Supabase SQL Editor

-- Kolom pelacak jumlah pengiriman ulang (0 = hanya auto H+1)
ALTER TABLE public.booking_review_requests
  ADD COLUMN IF NOT EXISTS resend_count   integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_unresponsive boolean NOT NULL DEFAULT false;

-- Index supaya query filter cepat
CREATE INDEX IF NOT EXISTS idx_brr_unresponsive
  ON public.booking_review_requests (is_unresponsive)
  WHERE is_unresponsive = true;

-- Fungsi helper: tandai booking sebagai tidak responsif setelah 3 ulang notif
-- Dipanggil dari aplikasi via RPC setelah resend ke-3
CREATE OR REPLACE FUNCTION public.fn_mark_booking_unresponsive(p_booking_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE public.booking_review_requests
  SET    is_unresponsive = true
  WHERE  booking_id = p_booking_id;
END;
$$;
