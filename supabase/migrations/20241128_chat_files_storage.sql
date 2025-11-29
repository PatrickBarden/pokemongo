-- Criar bucket para arquivos do chat
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-files',
  'chat-files',
  true,
  52428800, -- 50MB
  ARRAY[
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'video/mp4',
    'video/webm',
    'video/quicktime',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/plain',
    'application/zip',
    'application/x-rar-compressed'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = true,
  file_size_limit = 52428800;

-- Política para permitir upload autenticado
CREATE POLICY "Authenticated users can upload chat files"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'chat-files');

-- Política para permitir leitura pública
CREATE POLICY "Public can view chat files"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'chat-files');

-- Política para permitir delete pelo dono
CREATE POLICY "Users can delete own chat files"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'chat-files');

-- Adicionar colunas de arquivo nas tabelas de mensagens (se não existirem)
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_type TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT;

ALTER TABLE order_conversation_messages 
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_name TEXT,
ADD COLUMN IF NOT EXISTS file_type TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT;

-- Atualizar o tipo message_type para incluir VIDEO e FILE
ALTER TABLE chat_messages 
DROP CONSTRAINT IF EXISTS chat_messages_message_type_check;

ALTER TABLE chat_messages 
ADD CONSTRAINT chat_messages_message_type_check 
CHECK (message_type IN ('TEXT', 'IMAGE', 'VIDEO', 'FILE', 'SYSTEM'));

ALTER TABLE order_conversation_messages 
DROP CONSTRAINT IF EXISTS order_conversation_messages_message_type_check;

ALTER TABLE order_conversation_messages 
ADD CONSTRAINT order_conversation_messages_message_type_check 
CHECK (message_type IN ('TEXT', 'IMAGE', 'VIDEO', 'FILE', 'SYSTEM'));
