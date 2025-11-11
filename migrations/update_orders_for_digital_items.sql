-- Atualizar enum de status para refletir processo de itens digitais
DROP TYPE IF EXISTS order_status CASCADE;

CREATE TYPE order_status AS ENUM (
  'pending',              -- Aguardando pagamento
  'payment_confirmed',    -- Pagamento confirmado, aguardando coordenação
  'coordinating_trade',   -- Admin coordenando a troca no Pokémon GO
  'in_trade',            -- Troca em andamento no jogo
  'completed',           -- Troca concluída
  'cancelled',           -- Cancelado
  'refunded'             -- Reembolsado
);

-- Adicionar campos específicos para itens digitais
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS buyer_friend_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS buyer_trainer_name VARCHAR(50),
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(50),
  ADD COLUMN IF NOT EXISTS payment_proof_url TEXT,
  ADD COLUMN IF NOT EXISTS trade_scheduled_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS trade_completed_at TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS admin_notes TEXT,
  ADD COLUMN IF NOT EXISTS trade_screenshot_url TEXT;

-- Adicionar campos para coordenação de troca nos itens
ALTER TABLE public.order_items
  ADD COLUMN IF NOT EXISTS seller_friend_code VARCHAR(20),
  ADD COLUMN IF NOT EXISTS seller_trainer_name VARCHAR(50),
  ADD COLUMN IF NOT EXISTS trade_status VARCHAR(20) DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS trade_notes TEXT;

-- Índices adicionais
CREATE INDEX IF NOT EXISTS idx_orders_trade_scheduled ON public.orders(trade_scheduled_at) WHERE trade_scheduled_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_trade_status ON public.order_items(trade_status);

-- Comentários atualizados
COMMENT ON COLUMN public.orders.buyer_friend_code IS 'Código de amigo do comprador no Pokémon GO';
COMMENT ON COLUMN public.orders.buyer_trainer_name IS 'Nome do treinador do comprador no Pokémon GO';
COMMENT ON COLUMN public.orders.payment_method IS 'Método de pagamento utilizado (PIX, Cartão, etc)';
COMMENT ON COLUMN public.orders.payment_proof_url IS 'URL do comprovante de pagamento';
COMMENT ON COLUMN public.orders.trade_scheduled_at IS 'Data/hora agendada para realizar a troca no jogo';
COMMENT ON COLUMN public.orders.admin_notes IS 'Notas do administrador sobre a coordenação da troca';
COMMENT ON COLUMN public.orders.trade_screenshot_url IS 'Screenshot da troca concluída no jogo';

COMMENT ON COLUMN public.order_items.seller_friend_code IS 'Código de amigo do vendedor no Pokémon GO';
COMMENT ON COLUMN public.order_items.seller_trainer_name IS 'Nome do treinador do vendedor no Pokémon GO';
COMMENT ON COLUMN public.order_items.trade_status IS 'Status individual da troca deste item (pending, ready, completed)';
