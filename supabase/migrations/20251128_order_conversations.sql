-- ============================================================
-- CONVERSAS DE PEDIDOS (3 participantes: comprador, vendedor, admin)
-- ============================================================

-- Tabela de conversas de pedidos (substitui o modelo de 2 participantes para pedidos)
CREATE TABLE IF NOT EXISTS public.order_conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  buyer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  seller_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  admin_id UUID REFERENCES public.users(id) ON DELETE SET NULL,
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED', 'DISPUTE')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_message_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Tabela de mensagens das conversas de pedidos
CREATE TABLE IF NOT EXISTS public.order_conversation_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.order_conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT NOT NULL DEFAULT 'TEXT' CHECK (message_type IN ('TEXT', 'IMAGE', 'SYSTEM', 'ADMIN_NOTE')),
  read_by_buyer BOOLEAN NOT NULL DEFAULT false,
  read_by_seller BOOLEAN NOT NULL DEFAULT false,
  read_by_admin BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_order_conversations_order ON public.order_conversations(order_id);
CREATE INDEX IF NOT EXISTS idx_order_conversations_buyer ON public.order_conversations(buyer_id);
CREATE INDEX IF NOT EXISTS idx_order_conversations_seller ON public.order_conversations(seller_id);
CREATE INDEX IF NOT EXISTS idx_order_conversations_status ON public.order_conversations(status);
CREATE INDEX IF NOT EXISTS idx_order_conversations_last_msg ON public.order_conversations(last_message_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_conv_messages_conv ON public.order_conversation_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_order_conv_messages_sender ON public.order_conversation_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_order_conv_messages_created ON public.order_conversation_messages(created_at DESC);

-- Trigger para atualizar last_message_at
CREATE OR REPLACE FUNCTION update_order_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.order_conversations 
  SET last_message_at = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_order_conv_last_message ON public.order_conversation_messages;
CREATE TRIGGER trigger_update_order_conv_last_message
  AFTER INSERT ON public.order_conversation_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_order_conversation_last_message();

-- ============================================================
-- RLS POLICIES
-- ============================================================

ALTER TABLE public.order_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_conversation_messages ENABLE ROW LEVEL SECURITY;

-- Políticas para order_conversations
-- Participantes podem ver suas conversas
CREATE POLICY "Participants can view order conversations"
  ON public.order_conversations FOR SELECT
  USING (
    auth.uid() = buyer_id OR 
    auth.uid() = seller_id OR
    auth.uid() = admin_id OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Service role pode criar conversas (usado pelo webhook)
CREATE POLICY "Service role can create order conversations"
  ON public.order_conversations FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Admins podem criar conversas
CREATE POLICY "Admins can create order conversations"
  ON public.order_conversations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Participantes podem atualizar status
CREATE POLICY "Participants can update order conversations"
  ON public.order_conversations FOR UPDATE
  USING (
    auth.uid() = buyer_id OR 
    auth.uid() = seller_id OR
    auth.uid() = admin_id OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Políticas para order_conversation_messages
-- Participantes podem ver mensagens
CREATE POLICY "Participants can view order messages"
  ON public.order_conversation_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.order_conversations c 
      WHERE c.id = conversation_id 
      AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid() OR c.admin_id = auth.uid())
    ) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Participantes podem enviar mensagens
CREATE POLICY "Participants can send order messages"
  ON public.order_conversation_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM public.order_conversations c 
      WHERE c.id = conversation_id 
      AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid() OR c.admin_id = auth.uid())
    )
  );

-- Service role pode enviar mensagens (para mensagens do sistema)
CREATE POLICY "Service role can send order messages"
  ON public.order_conversation_messages FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Participantes podem atualizar (marcar como lida)
CREATE POLICY "Participants can update order messages"
  ON public.order_conversation_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.order_conversations c 
      WHERE c.id = conversation_id 
      AND (c.buyer_id = auth.uid() OR c.seller_id = auth.uid() OR c.admin_id = auth.uid())
    ) OR
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- ============================================================
-- COMENTÁRIOS
-- ============================================================
COMMENT ON TABLE public.order_conversations IS 'Conversas de pedidos com 3 participantes: comprador, vendedor e admin';
COMMENT ON TABLE public.order_conversation_messages IS 'Mensagens das conversas de pedidos';
COMMENT ON COLUMN public.order_conversation_messages.message_type IS 'TEXT=normal, IMAGE=imagem, SYSTEM=automática, ADMIN_NOTE=nota do admin';
