CREATE OR REPLACE FUNCTION public.reload_postgrest_schema()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  NOTIFY pgrst, 'reload schema';
END;
$$;

REVOKE ALL ON FUNCTION public.reload_postgrest_schema() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.reload_postgrest_schema() TO authenticated;