ALTER TABLE public.staff_members REPLICA IDENTITY FULL;
ALTER TABLE public.shifts REPLICA IDENTITY FULL;
ALTER TABLE public.user_roles REPLICA IDENTITY FULL;
DO $$ BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.staff_members; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.shifts; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.user_roles; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;