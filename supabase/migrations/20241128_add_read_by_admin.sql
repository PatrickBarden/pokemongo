-- Adicionar coluna read_by_admin na tabela order_conversation_messages
ALTER TABLE order_conversation_messages 
ADD COLUMN IF NOT EXISTS read_by_admin BOOLEAN DEFAULT FALSE;

-- Marcar mensagens existentes como lidas
UPDATE order_conversation_messages SET read_by_admin = TRUE WHERE read_by_admin IS NULL;
