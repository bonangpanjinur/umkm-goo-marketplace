REVOKE EXECUTE ON FUNCTION public.ensure_shop_wallet(UUID) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.escrow_hold_order(UUID) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.escrow_release_order(UUID) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.escrow_refund_order(UUID, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.request_withdrawal(UUID, NUMERIC, TEXT, TEXT, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.approve_withdrawal(UUID, TEXT) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.reject_withdrawal(UUID, TEXT) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.escrow_hold_order(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.escrow_release_order(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.escrow_refund_order(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.request_withdrawal(UUID, NUMERIC, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_withdrawal(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_withdrawal(UUID, TEXT) TO authenticated;