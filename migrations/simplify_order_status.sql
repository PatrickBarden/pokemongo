-- Simplificar enum de status para facilitar gestão do admin
DROP TYPE IF EXISTS order_status CASCADE;

CREATE TYPE order_status AS ENUM (
  'pending',              -- Aguardando pagamento
  'payment_confirmed',    -- Pagamento confirmado, admin vai processar
  'completed',            -- Troca concluída
  'cancelled',            -- Cancelado
  'refunded'              -- Reembolsado
);

-- Comentários atualizados
COMMENT ON TYPE order_status IS 'Status simplificado: pending → payment_confirmed → completed';
