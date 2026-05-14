
INSERT INTO storage.buckets (id, name, public) VALUES ('staff-avatars', 'staff-avatars', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Staff avatars publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'staff-avatars');

CREATE POLICY "Authenticated users can upload staff avatars"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'staff-avatars');

CREATE POLICY "Authenticated users can update staff avatars"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'staff-avatars');

CREATE POLICY "Authenticated users can delete staff avatars"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'staff-avatars');
