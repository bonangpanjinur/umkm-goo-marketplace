ALTER TABLE public.custom_order_requests REPLICA IDENTITY FULL;
ALTER TABLE public.custom_order_status_history REPLICA IDENTITY FULL;

DO $$ BEGIN
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_order_requests;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.custom_order_status_history;
  EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;