
ALTER TABLE public.business_categories
  ADD COLUMN IF NOT EXISTS subtypes jsonb NOT NULL DEFAULT '[]'::jsonb;

-- Seed default subtypes per category
UPDATE public.business_categories SET subtypes = '[
  {"slug":"kafe","label":"Kafe / Coffee Shop","icon":"☕"},
  {"slug":"restoran","label":"Restoran","icon":"🍽️"},
  {"slug":"bakery","label":"Bakery / Roti","icon":"🥐"},
  {"slug":"warung","label":"Warung Makan","icon":"🍛"},
  {"slug":"cloud-kitchen","label":"Cloud Kitchen","icon":"🍱"},
  {"slug":"catering","label":"Catering","icon":"🥡"}
]'::jsonb WHERE slug='fnb';

UPDATE public.business_categories SET subtypes = '[
  {"slug":"minimarket","label":"Minimarket","icon":"🛒"},
  {"slug":"fashion","label":"Fashion","icon":"👕"},
  {"slug":"elektronik","label":"Elektronik","icon":"📱"},
  {"slug":"kosmetik","label":"Kosmetik","icon":"💄"},
  {"slug":"buku","label":"Buku & Stationery","icon":"📚"},
  {"slug":"olahraga","label":"Olahraga","icon":"⚽"},
  {"slug":"otomotif","label":"Sparepart Otomotif","icon":"🔧"}
]'::jsonb WHERE slug='retail';

UPDATE public.business_categories SET subtypes = '[
  {"slug":"laundry","label":"Laundry","icon":"🧺"},
  {"slug":"servis-elektronik","label":"Servis Elektronik","icon":"🔌"},
  {"slug":"bengkel","label":"Bengkel","icon":"🛠️"},
  {"slug":"cleaning","label":"Cleaning Service","icon":"🧹"},
  {"slug":"event-organizer","label":"Event Organizer","icon":"🎉"}
]'::jsonb WHERE slug='jasa';

UPDATE public.business_categories SET subtypes = '[
  {"slug":"rental-mobil","label":"Rental Mobil","icon":"🚗"},
  {"slug":"rental-motor","label":"Rental Motor","icon":"🏍️"},
  {"slug":"sewa-alat","label":"Sewa Alat","icon":"⚙️"},
  {"slug":"sewa-kostum","label":"Sewa Kostum","icon":"👗"},
  {"slug":"sewa-villa","label":"Sewa Villa / Properti","icon":"🏠"}
]'::jsonb WHERE slug='rental';

UPDATE public.business_categories SET subtypes = '[
  {"slug":"bimbel","label":"Bimbel / Les","icon":"📖"},
  {"slug":"kursus-musik","label":"Kursus Musik","icon":"🎵"},
  {"slug":"kursus-bahasa","label":"Kursus Bahasa","icon":"🗣️"},
  {"slug":"kursus-online","label":"Kursus Online","icon":"💻"},
  {"slug":"sekolah-non-formal","label":"Sekolah Non-Formal","icon":"🎓"}
]'::jsonb WHERE slug='kursus';

UPDATE public.business_categories SET subtypes = '[
  {"slug":"barbershop","label":"Barbershop","icon":"💈"},
  {"slug":"salon-wanita","label":"Salon Wanita","icon":"💇"},
  {"slug":"spa","label":"Spa & Pijat","icon":"💆"},
  {"slug":"nail-art","label":"Nail Art","icon":"💅"},
  {"slug":"skincare-clinic","label":"Skincare Clinic","icon":"✨"}
]'::jsonb WHERE slug='salon';

UPDATE public.business_categories SET subtypes = '[
  {"slug":"klinik-umum","label":"Klinik Umum","icon":"🏥"},
  {"slug":"klinik-gigi","label":"Klinik Gigi","icon":"🦷"},
  {"slug":"klinik-kecantikan","label":"Klinik Kecantikan","icon":"💎"},
  {"slug":"apotek","label":"Apotek","icon":"💊"},
  {"slug":"fisioterapi","label":"Fisioterapi","icon":"🩺"}
]'::jsonb WHERE slug='klinik';

UPDATE public.business_categories SET subtypes = '[
  {"slug":"studio-foto","label":"Studio Foto","icon":"📸"},
  {"slug":"prewedding","label":"Prewedding","icon":"💍"},
  {"slug":"wedding-photo","label":"Wedding Photo","icon":"👰"},
  {"slug":"product-photo","label":"Product Photography","icon":"📦"},
  {"slug":"video-shooting","label":"Video Shooting","icon":"🎬"}
]'::jsonb WHERE slug='studio-foto';

UPDATE public.business_categories SET subtypes = '[
  {"slug":"umroh","label":"Umroh","icon":"🕋"},
  {"slug":"haji-plus","label":"Haji Plus","icon":"☪️"},
  {"slug":"wisata-domestik","label":"Wisata Domestik","icon":"🏝️"},
  {"slug":"wisata-luar-negeri","label":"Wisata Luar Negeri","icon":"✈️"},
  {"slug":"open-trip","label":"Open Trip","icon":"🧳"},
  {"slug":"tiket-tour","label":"Tiket & Tour","icon":"🎫"}
]'::jsonb WHERE slug='travel';

UPDATE public.business_categories SET subtypes = '[
  {"slug":"konveksi","label":"Konveksi","icon":"🧵"},
  {"slug":"percetakan","label":"Percetakan","icon":"🖨️"},
  {"slug":"furniture","label":"Furniture Custom","icon":"🪑"},
  {"slug":"merchandise","label":"Merchandise","icon":"🎁"},
  {"slug":"jasa-desain","label":"Jasa Desain","icon":"🎨"}
]'::jsonb WHERE slug='custom-order';

UPDATE public.business_categories SET subtypes = '[
  {"slug":"lainnya","label":"Lainnya","icon":"📦"}
]'::jsonb WHERE slug='lainnya';
