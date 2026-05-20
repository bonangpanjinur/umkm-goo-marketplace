-- Create missing storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES
  ('booking-documents', 'booking-documents', false),
  ('custom-deliveries', 'custom-deliveries', false),
  ('digital-products', 'digital-products', false),
  ('shop-assets', 'shop-assets', true)
ON CONFLICT (id) DO NOTHING;

-- shop-assets: public read, owner write (folder = shop_id, owner determined via shops.owner_id)
CREATE POLICY "shop-assets public read" ON storage.objects FOR SELECT
  USING (bucket_id = 'shop-assets');

CREATE POLICY "shop-assets owner write" ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'shop-assets'
    AND auth.uid() IS NOT NULL
    AND EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "shop-assets owner update" ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'shop-assets'
    AND EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND s.owner_id = auth.uid()
    )
  );

CREATE POLICY "shop-assets owner delete" ON storage.objects FOR DELETE
  USING (
    bucket_id = 'shop-assets'
    AND EXISTS (
      SELECT 1 FROM public.shops s
      WHERE s.id::text = (storage.foldername(name))[1]
        AND s.owner_id = auth.uid()
    )
  );

-- Private buckets: user folder = auth.uid()
CREATE POLICY "booking-documents user read" ON storage.objects FOR SELECT
  USING (bucket_id = 'booking-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "booking-documents user write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'booking-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "booking-documents user update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'booking-documents' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "booking-documents user delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'booking-documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "custom-deliveries user read" ON storage.objects FOR SELECT
  USING (bucket_id = 'custom-deliveries' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "custom-deliveries user write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'custom-deliveries' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "custom-deliveries user update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'custom-deliveries' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "custom-deliveries user delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'custom-deliveries' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "digital-products user read" ON storage.objects FOR SELECT
  USING (bucket_id = 'digital-products' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "digital-products user write" ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'digital-products' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "digital-products user update" ON storage.objects FOR UPDATE
  USING (bucket_id = 'digital-products' AND auth.uid()::text = (storage.foldername(name))[1]);
CREATE POLICY "digital-products user delete" ON storage.objects FOR DELETE
  USING (bucket_id = 'digital-products' AND auth.uid()::text = (storage.foldername(name))[1]);