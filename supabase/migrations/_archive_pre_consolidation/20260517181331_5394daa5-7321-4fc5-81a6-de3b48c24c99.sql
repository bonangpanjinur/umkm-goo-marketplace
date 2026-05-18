ALTER TABLE public.custom_order_requests
  ADD COLUMN IF NOT EXISTS contract_id uuid REFERENCES public.freelance_contracts(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_custom_order_requests_contract ON public.custom_order_requests(contract_id);