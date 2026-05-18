CREATE TABLE IF NOT EXISTS public.webhook_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider text NOT NULL,
  event_id text NOT NULL,
  payload_summary jsonb,
  status text NOT NULL DEFAULT 'received',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT webhook_events_unique UNIQUE (provider, event_id)
);

CREATE INDEX IF NOT EXISTS idx_webhook_events_created
  ON public.webhook_events (created_at DESC);

ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- No policies = service role only (which bypasses RLS).
-- Block authenticated/anon access explicitly.
CREATE POLICY "webhook_events_no_client_read"
  ON public.webhook_events FOR SELECT
  TO authenticated, anon
  USING (false);