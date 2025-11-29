-- ============================================================
-- EXECUTAR NO SUPABASE SQL EDITOR
-- PARTE 1: Criar tabela de notificações do admin
-- ============================================================

-- Tabela de notificações do admin
CREATE TABLE IF NOT EXISTS public.admin_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  type TEXT NOT NULL CHECK (type IN ('payment_approved', 'payment_pending', 'payment_rejected', 'new_order', 'dispute', 'payout_request', 'new_user', 'delivery_submitted')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  link TEXT,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('critical', 'high', 'medium', 'low')),
  read BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_admin_notifications_type ON public.admin_notifications(type);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_read ON public.admin_notifications(read);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_created ON public.admin_notifications(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_notifications_severity ON public.admin_notifications(severity);

-- Habilitar RLS
ALTER TABLE public.admin_notifications ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem ver notificações
CREATE POLICY "Admins can view notifications"
  ON public.admin_notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Apenas admins podem atualizar (marcar como lida)
CREATE POLICY "Admins can update notifications"
  ON public.admin_notifications
  FOR UPDATE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  )
  WITH CHECK (
    EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin')
  );

-- Service role pode inserir (usado pelo webhook)
CREATE POLICY "Service role can insert notifications"
  ON public.admin_notifications
  FOR INSERT
  TO service_role
  WITH CHECK (true);

-- Service role pode deletar (limpeza)
CREATE POLICY "Service role can delete notifications"
  ON public.admin_notifications
  FOR DELETE
  TO service_role
  USING (true);

-- ============================================================
-- PARTE 2: Criar tabelas de conversas de pedidos
-- (Comprador + Vendedor + Admin como intermediário)
-- ============================================================

-- Tabela de conversas de pedidos
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
-- RLS POLICIES PARA CONVERSAS
-- ============================================================

ALTER TABLE public.order_conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_conversation_messages ENABLE ROW LEVEL SECURITY;

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
COMMENT ON TABLE public.admin_notifications IS 'Notificações para o painel administrativo';
COMMENT ON TABLE public.order_conversations IS 'Conversas de pedidos com 3 participantes: comprador, vendedor e admin';
COMMENT ON TABLE public.order_conversation_messages IS 'Mensagens das conversas de pedidos';
COMMENT ON COLUMN public.order_conversation_messages.message_type IS 'TEXT=normal, IMAGE=imagem, SYSTEM=automática, ADMIN_NOTE=nota do admin';

-- ============================================================
-- VERIFICAR SE FOI CRIADA
-- ============================================================
-- SELECT * FROM public.admin_notifications ORDER BY created_at DESC LIMIT 10;
-- SELECT * FROM public.order_conversations ORDER BY created_at DESC LIMIT 10;
-- SELECT * FROM public.order_conversation_messages ORDER BY created_at DESC LIMIT 10;
