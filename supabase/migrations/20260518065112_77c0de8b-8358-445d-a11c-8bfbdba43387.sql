
-- Reload PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Seed default business categories (idempotent)
INSERT INTO public.business_categories (slug, name, description, is_active, sort_order)
VALUES
  ('fnb', 'Makanan & Minuman', 'Restoran, kafe, warung, kedai kopi, katering', true, 1),
  ('retail', 'Retail / Toko', 'Toko fisik, fashion, aksesoris, kelontong', true, 2),
  ('jasa', 'Jasa Umum', 'Layanan profesional dan jasa custom', true, 3),
  ('rental', 'Rental / Sewa', 'Sewa kendaraan, alat, kostum, properti', true, 4),
  ('kursus', 'Kursus / Edukasi', 'Les, pelatihan, workshop, bimbel', true, 5),
  ('salon', 'Salon & Beauty', 'Salon, barbershop, spa, nail art', true, 6),
  ('klinik', 'Klinik & Kesehatan', 'Klinik dokter, fisioterapi, konsultasi kesehatan', true, 7),
  ('studio-foto', 'Studio Foto', 'Studio foto, pas foto, dokumentasi event', true, 8),
  ('travel', 'Travel & Tour', 'Paket wisata, open trip, tiket', true, 9),
  ('custom-order', 'Custom Order', 'Pesanan custom dengan DP & brief', true, 10),
  ('lainnya', 'Lainnya', 'Kategori umum untuk usaha lain', true, 99)
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  is_active = true;

-- Reload again after seed
NOTIFY pgrst, 'reload schema';
