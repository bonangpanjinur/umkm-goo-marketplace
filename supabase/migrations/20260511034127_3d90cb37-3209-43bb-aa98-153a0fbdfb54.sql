REVOKE EXECUTE ON FUNCTION public.open_dispute(uuid, text, text, jsonb) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.resolve_dispute(uuid, text, text, numeric) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.send_order_message(uuid, text, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.auto_release_escrow() FROM anon, public;
GRANT EXECUTE ON FUNCTION public.open_dispute(uuid, text, text, jsonb) TO authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_dispute(uuid, text, text, numeric) TO authenticated;
GRANT EXECUTE ON FUNCTION public.send_order_message(uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.auto_release_escrow() TO service_role;