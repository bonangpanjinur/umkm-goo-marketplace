ALTER TABLE public.patient_records
  ADD COLUMN IF NOT EXISTS nik text,
  ADD COLUMN IF NOT EXISTS bpjs_number text,
  ADD COLUMN IF NOT EXISTS payer_type text;

ALTER TABLE public.patient_records
  DROP CONSTRAINT IF EXISTS patient_records_payer_type_check;
ALTER TABLE public.patient_records
  ADD CONSTRAINT patient_records_payer_type_check
  CHECK (payer_type IS NULL OR payer_type IN ('umum','bpjs','asuransi'));

CREATE INDEX IF NOT EXISTS idx_patient_records_bpjs ON public.patient_records(shop_id, bpjs_number);

ALTER TABLE public.patient_visits
  ADD COLUMN IF NOT EXISTS icd10_code text,
  ADD COLUMN IF NOT EXISTS icd10_label text,
  ADD COLUMN IF NOT EXISTS icd10_secondary jsonb NOT NULL DEFAULT '[]'::jsonb;

CREATE INDEX IF NOT EXISTS idx_patient_visits_icd10 ON public.patient_visits(shop_id, icd10_code);

CREATE TABLE IF NOT EXISTS public.icd10_codes (
  code text PRIMARY KEY,
  label_id text NOT NULL,
  category text
);

ALTER TABLE public.icd10_codes ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "icd10_read_all_authenticated" ON public.icd10_codes;
CREATE POLICY "icd10_read_all_authenticated"
  ON public.icd10_codes FOR SELECT
  TO authenticated
  USING (true);

INSERT INTO public.icd10_codes(code,label_id,category) VALUES
  ('J00','Nasofaringitis akut (common cold)','Respirasi'),
  ('J02.9','Faringitis akut, tidak spesifik','Respirasi'),
  ('J03.9','Tonsilitis akut, tidak spesifik','Respirasi'),
  ('J06.9','Infeksi saluran napas atas akut','Respirasi'),
  ('J11','Influenza, virus tidak teridentifikasi','Respirasi'),
  ('J20.9','Bronkitis akut, tidak spesifik','Respirasi'),
  ('J45.9','Asma, tidak spesifik','Respirasi'),
  ('A09','Diare & gastroenteritis (dugaan infeksi)','Digestif'),
  ('K29.7','Gastritis, tidak spesifik','Digestif'),
  ('K30','Dispepsia fungsional','Digestif'),
  ('K59.0','Konstipasi','Digestif'),
  ('B34.9','Infeksi virus, tidak spesifik','Infeksi'),
  ('A01.0','Demam tifoid','Infeksi'),
  ('A91','Demam berdarah dengue (DBD)','Infeksi'),
  ('B54','Malaria, tidak spesifik','Infeksi'),
  ('A15.0','TB paru, dengan konfirmasi bakteriologis','Infeksi'),
  ('R50.9','Demam, tidak spesifik','Gejala'),
  ('R51','Sefalgia (sakit kepala)','Gejala'),
  ('R10.4','Nyeri perut, tidak spesifik','Gejala'),
  ('R11','Mual & muntah','Gejala'),
  ('R05','Batuk','Gejala'),
  ('R07.4','Nyeri dada, tidak spesifik','Gejala'),
  ('R42','Pusing & vertigo','Gejala'),
  ('I10','Hipertensi esensial','Kardiovaskular'),
  ('I20.9','Angina pektoris, tidak spesifik','Kardiovaskular'),
  ('E11.9','Diabetes melitus tipe 2, tanpa komplikasi','Endokrin'),
  ('E78.5','Hiperlipidemia, tidak spesifik','Endokrin'),
  ('E03.9','Hipotiroidisme, tidak spesifik','Endokrin'),
  ('N39.0','Infeksi saluran kemih, lokasi tidak spesifik','Urogenital'),
  ('N76.0','Vaginitis akut','Urogenital'),
  ('L20.9','Dermatitis atopik','Kulit'),
  ('L30.9','Dermatitis, tidak spesifik','Kulit'),
  ('L50.9','Urtikaria, tidak spesifik','Kulit'),
  ('L08.9','Infeksi kulit dan jaringan lunak','Kulit'),
  ('M54.5','Low back pain','Muskuloskeletal'),
  ('M25.5','Nyeri sendi','Muskuloskeletal'),
  ('M79.1','Mialgia','Muskuloskeletal'),
  ('H10.9','Konjungtivitis, tidak spesifik','THT/Mata'),
  ('H66.9','Otitis media, tidak spesifik','THT/Mata'),
  ('H81.1','Vertigo paroksismal jinak (BPPV)','THT/Mata'),
  ('Z00.0','Pemeriksaan kesehatan umum','Preventif'),
  ('Z23','Imunisasi','Preventif'),
  ('F41.1','Gangguan cemas menyeluruh','Psikiatri'),
  ('F32.9','Episode depresi, tidak spesifik','Psikiatri')
ON CONFLICT (code) DO NOTHING;
