-- ============================================================
-- Fase 4-2: Live Chat Sebelum Beli
-- Pre-sale chat between buyer and shop owner
-- ============================================================

-- One conversation thread per shop-buyer pair
CREATE TABLE IF NOT EXISTS shop_chats (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  shop_id         uuid        NOT NULL REFERENCES coffee_shops(id) ON DELETE CASCADE,
  buyer_user_id   uuid        NOT NULL REFERENCES auth.users(id)   ON DELETE CASCADE,
  last_message_at timestamptz NOT NULL DEFAULT now(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (shop_id, buyer_user_id)
);

CREATE INDEX IF NOT EXISTS idx_shop_chats_shop   ON shop_chats(shop_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_shop_chats_buyer  ON shop_chats(buyer_user_id);

-- Individual messages within a thread
CREATE TABLE IF NOT EXISTS shop_chat_messages (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id     uuid        NOT NULL REFERENCES shop_chats(id) ON DELETE CASCADE,
  shop_id     uuid        NOT NULL,   -- denormalised for RLS / filtering
  sender_id   uuid        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_role text        NOT NULL CHECK (sender_role IN ('buyer', 'seller')),
  body        text        NOT NULL CHECK (trim(body) <> ''),
  read_at     timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_chat_messages_chat ON shop_chat_messages(chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_shop_chat_messages_unread
  ON shop_chat_messages(chat_id, read_at)
  WHERE read_at IS NULL;

-- ============================================================
-- Row-Level Security
-- ============================================================

ALTER TABLE shop_chats         ENABLE ROW LEVEL SECURITY;
ALTER TABLE shop_chat_messages ENABLE ROW LEVEL SECURITY;

-- Buyers: see only their own threads
DROP POLICY IF EXISTS shop_chats_buyer_select ON shop_chats;
CREATE POLICY shop_chats_buyer_select ON shop_chats
  FOR SELECT USING (buyer_user_id = auth.uid());

DROP POLICY IF EXISTS shop_chats_buyer_insert ON shop_chats;
CREATE POLICY shop_chats_buyer_insert ON shop_chats
  FOR INSERT WITH CHECK (buyer_user_id = auth.uid());

DROP POLICY IF EXISTS shop_chats_buyer_update ON shop_chats;
CREATE POLICY shop_chats_buyer_update ON shop_chats
  FOR UPDATE USING (buyer_user_id = auth.uid());

-- Sellers (shop owners / staff): see threads for their shop
DROP POLICY IF EXISTS shop_chats_seller_select ON shop_chats;
CREATE POLICY shop_chats_seller_select ON shop_chats
  FOR SELECT USING (
    shop_id IN (
      SELECT id FROM coffee_shops WHERE owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS shop_chats_seller_update ON shop_chats;
CREATE POLICY shop_chats_seller_update ON shop_chats
  FOR UPDATE USING (
    shop_id IN (
      SELECT id FROM coffee_shops WHERE owner_user_id = auth.uid()
    )
  );

-- Messages: buyers see messages in their threads, sellers see messages in their shop
DROP POLICY IF EXISTS shop_chat_messages_buyer_select ON shop_chat_messages;
CREATE POLICY shop_chat_messages_buyer_select ON shop_chat_messages
  FOR SELECT USING (
    chat_id IN (
      SELECT id FROM shop_chats WHERE buyer_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS shop_chat_messages_buyer_insert ON shop_chat_messages;
CREATE POLICY shop_chat_messages_buyer_insert ON shop_chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND sender_role = 'buyer'
    AND chat_id IN (
      SELECT id FROM shop_chats WHERE buyer_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS shop_chat_messages_seller_select ON shop_chat_messages;
CREATE POLICY shop_chat_messages_seller_select ON shop_chat_messages
  FOR SELECT USING (
    shop_id IN (
      SELECT id FROM coffee_shops WHERE owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS shop_chat_messages_seller_insert ON shop_chat_messages;
CREATE POLICY shop_chat_messages_seller_insert ON shop_chat_messages
  FOR INSERT WITH CHECK (
    sender_id = auth.uid()
    AND sender_role = 'seller'
    AND shop_id IN (
      SELECT id FROM coffee_shops WHERE owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS shop_chat_messages_seller_update ON shop_chat_messages;
CREATE POLICY shop_chat_messages_seller_update ON shop_chat_messages
  FOR UPDATE USING (
    shop_id IN (
      SELECT id FROM coffee_shops WHERE owner_user_id = auth.uid()
    )
  );

-- Enable realtime for live chat
ALTER PUBLICATION supabase_realtime ADD TABLE shop_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE shop_chats;
