-- Adicionar campo pix_key na tabela users para recebimento de pagamentos
-- Os vendedores cadastram sua chave PIX para receber o valor das vendas

-- Adicionar coluna pix_key
ALTER TABLE users ADD COLUMN IF NOT EXISTS pix_key TEXT;

-- Comentário explicativo
COMMENT ON COLUMN users.pix_key IS 'Chave PIX do vendedor para receber pagamentos das vendas';

-- Criar índice para busca (opcional, mas útil para relatórios)
CREATE INDEX IF NOT EXISTS idx_users_pix_key ON users(pix_key) WHERE pix_key IS NOT NULL;
