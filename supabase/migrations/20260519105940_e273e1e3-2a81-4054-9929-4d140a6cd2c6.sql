
DROP POLICY IF EXISTS "public read rental-inspections" ON storage.objects;
DROP POLICY IF EXISTS "public read treatment-photos" ON storage.objects;
DROP POLICY IF EXISTS "public_read_contract_signatures" ON storage.objects;

CREATE POLICY "owner_list_rental_inspections"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'rental-inspections'
    AND (storage.foldername(name))[1] IN (
      SELECT (s.id)::text FROM public.shops s WHERE s.owner_id = auth.uid()
    )
  );

CREATE POLICY "owner_list_treatment_photos"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'treatment-photos'
    AND (storage.foldername(name))[1] IN (
      SELECT (s.id)::text FROM public.shops s WHERE s.owner_id = auth.uid()
    )
  );

CREATE POLICY "owner_list_contract_signatures"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'contract-signatures'
    AND (storage.foldername(name))[1] IN (
      SELECT (s.id)::text FROM public.shops s WHERE s.owner_id = auth.uid()
    )
  );
