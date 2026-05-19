
-- 1. booking_waitlist
DROP POLICY IF EXISTS "waitlist_public_read_anon" ON public.booking_waitlist;

CREATE OR REPLACE FUNCTION public.get_public_waitlist_summary(_shop_id uuid)
RETURNS TABLE (
  id uuid,
  queue_number integer,
  party_size integer,
  status text,
  estimated_wait_minutes integer,
  created_at timestamptz,
  served_at timestamptz,
  requested_date date
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT id, queue_number, party_size, status, estimated_wait_minutes,
         created_at, served_at, requested_date
  FROM public.booking_waitlist
  WHERE shop_id = _shop_id
    AND status IN ('waiting','notified')
    AND (requested_date = CURRENT_DATE OR requested_date IS NULL)
  ORDER BY created_at ASC
$$;
GRANT EXECUTE ON FUNCTION public.get_public_waitlist_summary(uuid) TO anon, authenticated;

-- 2. booking_review_requests
DROP POLICY IF EXISTS "rrq_read" ON public.booking_review_requests;

CREATE POLICY "rrq_customer_self_read"
  ON public.booking_review_requests FOR SELECT
  TO authenticated
  USING (customer_user_id = auth.uid());

CREATE POLICY "rrq_owner_read"
  ON public.booking_review_requests FOR SELECT
  TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.bookings b
    JOIN public.shops s ON s.id = b.shop_id
    WHERE b.id = booking_review_requests.id
      AND s.owner_id = auth.uid()
  ));

-- 3. course_certificates (course = menu_items row)
DROP POLICY IF EXISTS "public verify cert" ON public.course_certificates;

CREATE OR REPLACE FUNCTION public.verify_certificate(_cert_number text)
RETURNS TABLE (
  certificate_number text,
  course_title text,
  shop_name text,
  issued_at timestamptz
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT
    cc.certificate_number,
    mi.name AS course_title,
    s.name AS shop_name,
    cc.issued_at
  FROM public.course_certificates cc
  LEFT JOIN public.menu_items mi ON mi.id = cc.course_id
  LEFT JOIN public.shops s ON s.id = cc.shop_id
  WHERE cc.certificate_number = _cert_number
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.verify_certificate(text) TO anon, authenticated;

-- 4. shops.custom_domain_verify_token
REVOKE SELECT (custom_domain_verify_token) ON public.shops FROM anon;
