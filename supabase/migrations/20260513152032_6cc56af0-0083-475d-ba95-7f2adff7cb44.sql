
-- ============ Wallet topup notifications ============
CREATE OR REPLACE FUNCTION public.notify_wallet_topup_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _shop_name TEXT;
  _owner_id UUID;
  _customer_name TEXT;
BEGIN
  SELECT name, owner_user_id INTO _shop_name, _owner_id
  FROM coffee_shops WHERE id = NEW.shop_id;

  IF TG_OP = 'INSERT' AND _owner_id IS NOT NULL THEN
    -- Notify owner of new pending topup
    PERFORM create_notification(
      _owner_id,
      'wallet_topup_request',
      'Permintaan top-up saldo baru',
      format('Top-up Rp %s menunggu persetujuan.', to_char(NEW.amount, 'FM999G999G999')),
      '/pos-app/wallet-approvals',
      'info'
    );
  ELSIF TG_OP = 'UPDATE' AND OLD.status = 'pending' AND NEW.status <> OLD.status THEN
    -- Notify customer
    IF NEW.status = 'paid' THEN
      PERFORM create_notification(
        NEW.customer_user_id,
        'wallet_topup_approved',
        format('Top-up disetujui — %s', COALESCE(_shop_name, 'Toko')),
        format('Saldo Rp %s telah ditambahkan%s.',
          to_char(NEW.amount + COALESCE(NEW.bonus_amount,0), 'FM999G999G999'),
          CASE WHEN COALESCE(NEW.bonus_amount,0) > 0
               THEN format(' (termasuk bonus Rp %s)', to_char(NEW.bonus_amount, 'FM999G999G999'))
               ELSE '' END),
        '/akun/saldo',
        'success'
      );
    ELSIF NEW.status = 'cancelled' THEN
      PERFORM create_notification(
        NEW.customer_user_id,
        'wallet_topup_rejected',
        format('Top-up ditolak — %s', COALESCE(_shop_name, 'Toko')),
        COALESCE(NEW.notes, 'Hubungi toko untuk informasi lebih lanjut.'),
        '/akun/saldo',
        'warning'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_wallet_topup ON public.wallet_topups;
CREATE TRIGGER trg_notify_wallet_topup
AFTER INSERT OR UPDATE ON public.wallet_topups
FOR EACH ROW EXECUTE FUNCTION public.notify_wallet_topup_event();

-- ============ Membership purchase notifications ============
CREATE OR REPLACE FUNCTION public.notify_membership_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _shop_name TEXT;
  _owner_id UUID;
  _tier_name TEXT;
BEGIN
  SELECT name, owner_user_id INTO _shop_name, _owner_id
  FROM coffee_shops WHERE id = NEW.shop_id;
  SELECT name INTO _tier_name FROM shop_membership_tiers WHERE id = NEW.tier_id;

  IF TG_OP = 'INSERT' THEN
    -- Notify customer (welcome)
    PERFORM create_notification(
      NEW.customer_user_id,
      'membership_active',
      format('Membership %s aktif!', COALESCE(_tier_name, 'baru')),
      format('Diskon otomatis berlaku di %s sampai %s.',
        COALESCE(_shop_name, 'toko'),
        to_char(NEW.expires_at, 'DD Mon YYYY')),
      '/akun/saldo',
      'success'
    );
    -- Notify owner
    IF _owner_id IS NOT NULL THEN
      PERFORM create_notification(
        _owner_id,
        'membership_purchased',
        'Member baru bergabung',
        format('Pelanggan baru aktif di tier %s.', COALESCE(_tier_name, '-')),
        '/pos-app/membership',
        'info'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_membership ON public.customer_memberships;
CREATE TRIGGER trg_notify_membership
AFTER INSERT ON public.customer_memberships
FOR EACH ROW EXECUTE FUNCTION public.notify_membership_event();

-- ============ Membership expiry reminder (call daily via pg_cron or RPC) ============
CREATE OR REPLACE FUNCTION public.send_membership_expiry_reminders()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _row RECORD;
  _count INTEGER := 0;
  _shop_name TEXT;
  _days INTEGER;
BEGIN
  FOR _row IN
    SELECT cm.id, cm.customer_user_id, cm.shop_id, cm.expires_at,
           t.name AS tier_name
    FROM customer_memberships cm
    JOIN shop_membership_tiers t ON t.id = cm.tier_id
    WHERE cm.status = 'active'
      AND cm.expires_at BETWEEN now() AND now() + INTERVAL '7 days'
      AND NOT EXISTS (
        SELECT 1 FROM notifications n
        WHERE n.recipient_user_id = cm.customer_user_id
          AND n.type = 'membership_expiring'
          AND n.created_at > now() - INTERVAL '3 days'
          AND (n.body LIKE '%' || cm.id::text || '%' OR n.link LIKE '%' || cm.shop_id::text || '%')
      )
  LOOP
    SELECT name INTO _shop_name FROM coffee_shops WHERE id = _row.shop_id;
    _days := GREATEST(0, EXTRACT(DAY FROM (_row.expires_at - now()))::INTEGER);
    PERFORM create_notification(
      _row.customer_user_id,
      'membership_expiring',
      format('Membership akan kedaluwarsa dalam %s hari', _days),
      format('Membership %s di %s berakhir %s. Perpanjang sekarang agar tetap dapat diskon.',
        _row.tier_name, COALESCE(_shop_name, 'toko'),
        to_char(_row.expires_at, 'DD Mon YYYY')),
      '/akun/saldo',
      'warning'
    );
    _count := _count + 1;
  END LOOP;
  RETURN _count;
END;
$$;

REVOKE EXECUTE ON FUNCTION public.send_membership_expiry_reminders() FROM anon, authenticated;
