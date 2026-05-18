-- =============================================================================
-- F-16 Phase 5: Hardening
-- =============================================================================

-- 1) Fix touch_updated_at search_path
ALTER FUNCTION public.touch_updated_at() SET search_path = public;

-- 2) Tighten booking_reviews INSERT: must be authenticated and own the row
DROP POLICY IF EXISTS review_insert_any ON public.booking_reviews;
CREATE POLICY review_insert_owner
  ON public.booking_reviews
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL AND user_id = auth.uid());

-- 3) Tighten booking_review_requests UPDATE: only the customer or the shop owner
DROP POLICY IF EXISTS rrq_update ON public.booking_review_requests;
CREATE POLICY rrq_update_scoped
  ON public.booking_review_requests
  FOR UPDATE
  TO authenticated
  USING (
    customer_user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id = (
        SELECT b.shop_id FROM public.bookings b WHERE b.id = booking_review_requests.id
      )
      AND s.owner_id = auth.uid()
    )
    OR public.has_role(auth.uid(), 'super_admin'::app_role)
  );

-- 4) Document intentional public-form policies
COMMENT ON POLICY "public_insert_custom_order" ON public.custom_order_requests IS 'Public-by-design lead form (intentional WITH CHECK true). Rate-limit at app layer.';
COMMENT ON POLICY "leads public insert" ON public.leads IS 'Public-by-design lead form (intentional WITH CHECK true).';
COMMENT ON POLICY "public_insert_rental_booking" ON public.rental_bookings IS 'Public-by-design rental booking form (intentional WITH CHECK true).';
COMMENT ON POLICY "restock_sub_insert_anyone" ON public.restock_subscribers IS 'Public-by-design restock notification subscribe (intentional WITH CHECK true).';
COMMENT ON POLICY "rrq_insert" ON public.booking_review_requests IS 'Intentional: shop triggers insert via SECURITY DEFINER function path.';

-- 5) Close LIST enumeration on public asset buckets
--    Direct file access via getPublicUrl() still works because buckets remain `public`
--    (Supabase CDN bypasses RLS for public buckets on file GET).
--    Removing the SELECT policy here only blocks the `.list()` API.
DROP POLICY IF EXISTS "menu_images_public_read" ON storage.objects;
DROP POLICY IF EXISTS "shop_logos_public_read" ON storage.objects;
DROP POLICY IF EXISTS "Staff avatars publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Builder assets are publicly readable" ON storage.objects;
DROP POLICY IF EXISTS "Chat attachments are publicly viewable" ON storage.objects;
DROP POLICY IF EXISTS "flyers public read" ON storage.objects;
DROP POLICY IF EXISTS "brochures public read" ON storage.objects;
DROP POLICY IF EXISTS "delivery_proofs_public_read" ON storage.objects;
DROP POLICY IF EXISTS "review_photos_public_read" ON storage.objects;
DROP POLICY IF EXISTS "custom_order_attach_read" ON storage.objects;