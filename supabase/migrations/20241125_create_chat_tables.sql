-- =============================================
-- SISTEMA DE CHAT INTERNO
-- =============================================

-- Tabela de Conversas
CREATE TABLE IF NOT EXISTS conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  participant_1 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  participant_2 UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  subject TEXT,
  status TEXT DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'CLOSED', 'ARCHIVED')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_message_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Garantir que não haja conversas duplicadas entre os mesmos participantes para a mesma ordem
  UNIQUE(order_id, participant_1, participant_2)
);

-- Tabela de Mensagens do Chat
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  message_type TEXT DEFAULT 'TEXT' CHECK (message_type IN ('TEXT', 'IMAGE', 'SYSTEM')),
  read_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_conversations_participant_1 ON conversations(participant_1);
CREATE INDEX IF NOT EXISTS idx_conversations_participant_2 ON conversations(participant_2);
CREATE INDEX IF NOT EXISTS idx_conversations_order_id ON conversations(order_id);
CREATE INDEX IF NOT EXISTS idx_conversations_last_message ON conversations(last_message_at DESC);
CREATE INDEX IF NOT EXISTS idx_chat_messages_conversation ON chat_messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_sender ON chat_messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_created ON chat_messages(created_at DESC);

-- Função para atualizar last_message_at automaticamente
CREATE OR REPLACE FUNCTION update_conversation_last_message()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE conversations 
  SET last_message_at = NEW.created_at,
      updated_at = NOW()
  WHERE id = NEW.conversation_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger para atualizar last_message_at quando nova mensagem é inserida
DROP TRIGGER IF EXISTS trigger_update_conversation_last_message ON chat_messages;
CREATE TRIGGER trigger_update_conversation_last_message
  AFTER INSERT ON chat_messages
  FOR EACH ROW
  EXECUTE FUNCTION update_conversation_last_message();

-- =============================================
-- ROW LEVEL SECURITY (RLS)
-- =============================================

-- Habilitar RLS
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;

-- Políticas para conversations
-- Usuários podem ver conversas onde são participantes
CREATE POLICY "Users can view their conversations"
  ON conversations FOR SELECT
  USING (
    auth.uid() = participant_1 OR 
    auth.uid() = participant_2 OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Usuários podem criar conversas
CREATE POLICY "Users can create conversations"
  ON conversations FOR INSERT
  WITH CHECK (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- Usuários podem atualizar suas conversas
CREATE POLICY "Users can update their conversations"
  ON conversations FOR UPDATE
  USING (auth.uid() = participant_1 OR auth.uid() = participant_2);

-- Políticas para chat_messages
-- Usuários podem ver mensagens de suas conversas
CREATE POLICY "Users can view chat messages in their conversations"
  ON chat_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM conversations c 
      WHERE c.id = chat_messages.conversation_id 
      AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
    ) OR
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Usuários podem enviar mensagens em suas conversas
CREATE POLICY "Users can send chat messages in their conversations"
  ON chat_messages FOR INSERT
  WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (
      SELECT 1 FROM conversations c 
      WHERE c.id = conversation_id 
      AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
    )
  );

-- Usuários podem marcar mensagens como lidas
CREATE POLICY "Users can mark chat messages as read"
  ON chat_messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM conversations c 
      WHERE c.id = chat_messages.conversation_id 
      AND (c.participant_1 = auth.uid() OR c.participant_2 = auth.uid())
    )
  );

-- =============================================
-- COMENTÁRIOS
-- =============================================
COMMENT ON TABLE conversations IS 'Conversas entre usuários da plataforma';
COMMENT ON TABLE chat_messages IS 'Mensagens trocadas nas conversas';
COMMENT ON COLUMN conversations.order_id IS 'Ordem relacionada à conversa (opcional)';
COMMENT ON COLUMN conversations.status IS 'Status: ACTIVE, CLOSED, ARCHIVED';
COMMENT ON COLUMN chat_messages.message_type IS 'Tipo: TEXT, IMAGE, SYSTEM';
COMMENT ON COLUMN chat_messages.read_at IS 'Data/hora que a mensagem foi lida pelo destinatário';
