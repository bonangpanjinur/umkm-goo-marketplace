
ALTER TABLE public.freelance_contracts
  ADD COLUMN IF NOT EXISTS signature_url text,
  ADD COLUMN IF NOT EXISTS signed_by_name text,
  ADD COLUMN IF NOT EXISTS signed_ip text,
  ADD COLUMN IF NOT EXISTS sign_token text UNIQUE DEFAULT encode(gen_random_bytes(18), 'hex');

CREATE INDEX IF NOT EXISTS idx_freelance_contracts_sign_token ON public.freelance_contracts(sign_token);

-- Allow public read of contracts by sign_token (for the signing page)
DROP POLICY IF EXISTS "public_read_contract_by_token" ON public.freelance_contracts;
CREATE POLICY "public_read_contract_by_token"
  ON public.freelance_contracts FOR SELECT
  TO anon, authenticated
  USING (sign_token IS NOT NULL);

-- Allow public update only for signing (signature fields) via sign_token presence
DROP POLICY IF EXISTS "public_sign_contract" ON public.freelance_contracts;
CREATE POLICY "public_sign_contract"
  ON public.freelance_contracts FOR UPDATE
  TO anon, authenticated
  USING (sign_token IS NOT NULL AND status IN ('draft','sent'))
  WITH CHECK (status = 'signed');

-- Storage bucket
INSERT INTO storage.buckets (id, name, public)
VALUES ('contract-signatures', 'contract-signatures', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "public_read_contract_signatures" ON storage.objects;
CREATE POLICY "public_read_contract_signatures"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'contract-signatures');

DROP POLICY IF EXISTS "public_upload_contract_signatures" ON storage.objects;
CREATE POLICY "public_upload_contract_signatures"
  ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'contract-signatures');
