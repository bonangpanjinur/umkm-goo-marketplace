CREATE OR REPLACE FUNCTION public.approve_wallet_topup(_topup_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _topup RECORD;
  _wallet_id UUID;
  _new_balance NUMERIC(14,2);
  _is_owner BOOLEAN;
BEGIN
  SELECT * INTO _topup FROM public.wallet_topups WHERE id = _topup_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Top-up tidak ditemukan'; END IF;
  IF _topup.status <> 'pending' THEN RAISE EXCEPTION 'Top-up sudah diproses (status: %)', _topup.status; END IF;

  SELECT EXISTS (SELECT 1 FROM public.coffee_shops WHERE id = _topup.shop_id AND owner_id = auth.uid()) INTO _is_owner;
  IF NOT _is_owner AND NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Tidak diizinkan';
  END IF;

  -- Get or create wallet
  SELECT id INTO _wallet_id FROM public.customer_wallets
    WHERE customer_user_id = _topup.customer_user_id AND shop_id = _topup.shop_id FOR UPDATE;
  IF _wallet_id IS NULL THEN
    INSERT INTO public.customer_wallets (customer_user_id, shop_id, balance, total_topped_up)
      VALUES (_topup.customer_user_id, _topup.shop_id, 0, 0)
      RETURNING id INTO _wallet_id;
  END IF;

  -- Credit topup amount
  UPDATE public.customer_wallets
    SET balance = balance + _topup.amount,
        total_topped_up = total_topped_up + _topup.amount
    WHERE id = _wallet_id
    RETURNING balance INTO _new_balance;

  INSERT INTO public.customer_wallet_transactions
    (wallet_id, customer_user_id, shop_id, type, amount, balance_after, ref_topup_id, note)
    VALUES (_wallet_id, _topup.customer_user_id, _topup.shop_id, 'topup', _topup.amount, _new_balance, _topup.id, 'Top-up disetujui');

  -- Credit bonus if any
  IF _topup.bonus_amount > 0 THEN
    UPDATE public.customer_wallets
      SET balance = balance + _topup.bonus_amount
      WHERE id = _wallet_id
      RETURNING balance INTO _new_balance;
    INSERT INTO public.customer_wallet_transactions
      (wallet_id, customer_user_id, shop_id, type, amount, balance_after, ref_topup_id, note)
      VALUES (_wallet_id, _topup.customer_user_id, _topup.shop_id, 'bonus', _topup.bonus_amount, _new_balance, _topup.id, 'Bonus top-up');
  END IF;

  UPDATE public.wallet_topups SET status = 'paid', paid_at = now() WHERE id = _topup.id;
  RETURN _wallet_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.reject_wallet_topup(_topup_id UUID, _reason TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _topup RECORD;
  _is_owner BOOLEAN;
BEGIN
  SELECT * INTO _topup FROM public.wallet_topups WHERE id = _topup_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Top-up tidak ditemukan'; END IF;
  IF _topup.status <> 'pending' THEN RAISE EXCEPTION 'Top-up sudah diproses'; END IF;
  SELECT EXISTS (SELECT 1 FROM public.coffee_shops WHERE id = _topup.shop_id AND owner_id = auth.uid()) INTO _is_owner;
  IF NOT _is_owner AND NOT public.has_role(auth.uid(), 'super_admin'::app_role) THEN
    RAISE EXCEPTION 'Tidak diizinkan';
  END IF;
  UPDATE public.wallet_topups SET status = 'cancelled', note = COALESCE(_reason, note) WHERE id = _topup.id;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.approve_wallet_topup(UUID) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_wallet_topup(UUID, TEXT) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.approve_wallet_topup(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_wallet_topup(UUID, TEXT) TO authenticated;