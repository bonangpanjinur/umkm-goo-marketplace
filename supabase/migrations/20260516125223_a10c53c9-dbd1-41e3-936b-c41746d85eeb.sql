
-- Chat antara buyer dan toko
CREATE TABLE IF NOT EXISTS public.shop_chats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  shop_id UUID NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  buyer_user_id UUID NOT NULL,
  last_message_at TIMESTAMPTZ,
  buyer_archived BOOLEAN NOT NULL DEFAULT false,
  seller_archived BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (shop_id, buyer_user_id)
);

CREATE INDEX IF NOT EXISTS idx_shop_chats_buyer ON public.shop_chats(buyer_user_id, last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_shop_chats_shop ON public.shop_chats(shop_id, last_message_at DESC);

ALTER TABLE public.shop_chats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buyer_select_own_chat" ON public.shop_chats FOR SELECT
  USING (auth.uid() = buyer_user_id);
CREATE POLICY "buyer_insert_own_chat" ON public.shop_chats FOR INSERT
  WITH CHECK (auth.uid() = buyer_user_id);
CREATE POLICY "buyer_update_own_chat" ON public.shop_chats FOR UPDATE
  USING (auth.uid() = buyer_user_id);
CREATE POLICY "owner_select_shop_chat" ON public.shop_chats FOR SELECT
  USING (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()));
CREATE POLICY "owner_update_shop_chat" ON public.shop_chats FOR UPDATE
  USING (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()));

-- Pesan chat
CREATE TABLE IF NOT EXISTS public.shop_chat_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  chat_id UUID NOT NULL REFERENCES public.shop_chats(id) ON DELETE CASCADE,
  shop_id UUID NOT NULL REFERENCES public.coffee_shops(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('buyer','seller')),
  body TEXT NOT NULL,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_shop_chat_messages_chat ON public.shop_chat_messages(chat_id, created_at);
CREATE INDEX IF NOT EXISTS idx_shop_chat_messages_unread_buyer ON public.shop_chat_messages(chat_id) WHERE read_at IS NULL AND sender_role = 'seller';

ALTER TABLE public.shop_chat_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "buyer_select_own_messages" ON public.shop_chat_messages FOR SELECT
  USING (chat_id IN (SELECT id FROM public.shop_chats WHERE buyer_user_id = auth.uid()));
CREATE POLICY "buyer_insert_messages" ON public.shop_chat_messages FOR INSERT
  WITH CHECK (
    sender_role = 'buyer'
    AND sender_id = auth.uid()
    AND chat_id IN (SELECT id FROM public.shop_chats WHERE buyer_user_id = auth.uid())
  );
CREATE POLICY "buyer_update_own_msg_read" ON public.shop_chat_messages FOR UPDATE
  USING (chat_id IN (SELECT id FROM public.shop_chats WHERE buyer_user_id = auth.uid()));

CREATE POLICY "owner_select_messages" ON public.shop_chat_messages FOR SELECT
  USING (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()));
CREATE POLICY "owner_insert_messages" ON public.shop_chat_messages FOR INSERT
  WITH CHECK (
    sender_role = 'seller'
    AND sender_id = auth.uid()
    AND shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid())
  );
CREATE POLICY "owner_update_messages_read" ON public.shop_chat_messages FOR UPDATE
  USING (shop_id IN (SELECT id FROM public.coffee_shops WHERE owner_id = auth.uid()));

-- Trigger maintain last_message_at
CREATE OR REPLACE FUNCTION public.shop_chat_set_last_message_at()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.shop_chats SET last_message_at = NEW.created_at, updated_at = now()
  WHERE id = NEW.chat_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_shop_chat_last_msg ON public.shop_chat_messages;
CREATE TRIGGER trg_shop_chat_last_msg
AFTER INSERT ON public.shop_chat_messages
FOR EACH ROW EXECUTE FUNCTION public.shop_chat_set_last_message_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.shop_chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.shop_chats;

-- Tambah user_id ke custom_order_requests untuk hub akun
ALTER TABLE public.custom_order_requests ADD COLUMN IF NOT EXISTS user_id UUID;
CREATE INDEX IF NOT EXISTS idx_custom_orders_user ON public.custom_order_requests(user_id, created_at DESC);

CREATE POLICY "buyer_insert_custom_order" ON public.custom_order_requests FOR INSERT
  WITH CHECK (user_id IS NULL OR user_id = auth.uid());
CREATE POLICY "buyer_select_own_custom_order" ON public.custom_order_requests FOR SELECT
  USING (user_id = auth.uid());
