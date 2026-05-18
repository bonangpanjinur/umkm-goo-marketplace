
ALTER TABLE public.page_layouts
  ADD COLUMN IF NOT EXISTS scheduled_publish_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_page_layouts_scheduled
  ON public.page_layouts(scheduled_publish_at)
  WHERE scheduled_publish_at IS NOT NULL AND is_published = false;

CREATE OR REPLACE FUNCTION public.run_scheduled_publishes()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_count int := 0;
  rec RECORD;
BEGIN
  FOR rec IN
    SELECT id, shop_id, puck_data, title, is_published
    FROM public.page_layouts
    WHERE scheduled_publish_at IS NOT NULL
      AND scheduled_publish_at <= now()
      AND is_published = false
    FOR UPDATE SKIP LOCKED
  LOOP
    INSERT INTO public.page_layout_versions
      (layout_id, shop_id, puck_data, title, is_published_snapshot, reason)
    VALUES (rec.id, rec.shop_id, rec.puck_data, rec.title, true, 'scheduled-publish');

    UPDATE public.page_layouts
      SET is_published = true,
          published_at = now(),
          scheduled_publish_at = NULL
      WHERE id = rec.id;
    v_count := v_count + 1;
  END LOOP;
  RETURN jsonb_build_object('published', v_count, 'ran_at', now());
END $$;

-- Schedule via pg_cron (idempotent)
DO $$ BEGIN
  PERFORM cron.unschedule('run-scheduled-publishes');
EXCEPTION WHEN OTHERS THEN NULL; END $$;

SELECT cron.schedule(
  'run-scheduled-publishes',
  '*/5 * * * *',
  $cron$ SELECT public.run_scheduled_publishes(); $cron$
);
