ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS dismissed_at timestamptz;
CREATE INDEX IF NOT EXISTS notifications_recipient_active_idx
  ON public.notifications (recipient_user_id, created_at DESC)
  WHERE dismissed_at IS NULL;