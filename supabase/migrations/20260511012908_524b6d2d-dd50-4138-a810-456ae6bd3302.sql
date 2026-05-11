
ALTER TABLE public.customer_profiles
  ADD COLUMN IF NOT EXISTS default_address text,
  ADD COLUMN IF NOT EXISTS default_city text,
  ADD COLUMN IF NOT EXISTS default_postal_code text;

INSERT INTO storage.buckets (id, name, public)
VALUES ('review-photos', 'review-photos', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "review_photos_public_read" ON storage.objects;
CREATE POLICY "review_photos_public_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'review-photos');

DROP POLICY IF EXISTS "review_photos_user_upload" ON storage.objects;
CREATE POLICY "review_photos_user_upload" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'review-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "review_photos_user_update" ON storage.objects;
CREATE POLICY "review_photos_user_update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id = 'review-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

DROP POLICY IF EXISTS "review_photos_user_delete" ON storage.objects;
CREATE POLICY "review_photos_user_delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id = 'review-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
