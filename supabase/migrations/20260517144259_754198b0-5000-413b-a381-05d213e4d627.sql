ALTER TABLE public.shops
  ADD COLUMN IF NOT EXISTS onboarded_at timestamptz;