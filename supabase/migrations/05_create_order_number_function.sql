/*
  # Criar função para gerar número de pedido
  
  Cria uma função que gera números de pedido únicos no formato:
  ORD-YYYYMMDD-XXXX (ex: ORD-20251112-0001)
*/

-- Criar sequência para números de pedido
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- Criar função para gerar número de pedido
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  order_date TEXT;
  order_seq TEXT;
  order_number TEXT;
BEGIN
  -- Obter data atual no formato YYYYMMDD
  order_date := TO_CHAR(NOW(), 'YYYYMMDD');
  
  -- Obter próximo número da sequência (4 dígitos)
  order_seq := LPAD(nextval('order_number_seq')::TEXT, 4, '0');
  
  -- Montar número do pedido
  order_number := 'ORD-' || order_date || '-' || order_seq;
  
  RETURN order_number;
END;
$$;

-- Comentário na função
COMMENT ON FUNCTION public.generate_order_number() IS 'Gera um número único para pedidos no formato ORD-YYYYMMDD-XXXX';
