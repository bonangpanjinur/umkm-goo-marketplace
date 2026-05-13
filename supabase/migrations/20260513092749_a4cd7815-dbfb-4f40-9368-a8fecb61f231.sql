ALTER TABLE public.coffee_shops
  ADD COLUMN IF NOT EXISTS kyc_status text,
  ADD COLUMN IF NOT EXISTS kyc_document_url text,
  ADD COLUMN IF NOT EXISTS kyc_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS kyc_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS kyc_reviewer_id uuid,
  ADD COLUMN IF NOT EXISTS kyc_reject_reason text;

ALTER TABLE public.coffee_shops
  DROP CONSTRAINT IF EXISTS coffee_shops_kyc_status_check;
ALTER TABLE public.coffee_shops
  ADD CONSTRAINT coffee_shops_kyc_status_check
  CHECK (kyc_status IS NULL OR kyc_status IN ('pending','in_review','approved','rejected'));

CREATE INDEX IF NOT EXISTS idx_coffee_shops_kyc_status ON public.coffee_shops(kyc_status);