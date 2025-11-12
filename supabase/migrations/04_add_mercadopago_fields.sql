/*
  # Adicionar campos do Mercado Pago
  
  Adiciona campos necessários para rastrear pagamentos do Mercado Pago
*/

-- Adicionar campos de pagamento na tabela orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_preference_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_id TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_type TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_method TEXT;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS paid_at TIMESTAMPTZ;

-- Criar tabela para armazenar notificações do Mercado Pago
CREATE TABLE IF NOT EXISTS public.mercadopago_notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  order_id UUID REFERENCES public.orders(id) ON DELETE CASCADE,
  payment_id TEXT,
  notification_type TEXT NOT NULL,
  notification_data JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  processed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Índices para melhor performance
CREATE INDEX IF NOT EXISTS idx_orders_payment_preference ON public.orders(payment_preference_id);
CREATE INDEX IF NOT EXISTS idx_orders_payment_id ON public.orders(payment_id);
CREATE INDEX IF NOT EXISTS idx_mp_notifications_payment_id ON public.mercadopago_notifications(payment_id);
CREATE INDEX IF NOT EXISTS idx_mp_notifications_processed ON public.mercadopago_notifications(processed);

-- Políticas RLS para mercadopago_notifications
ALTER TABLE public.mercadopago_notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role can manage notifications"
  ON public.mercadopago_notifications
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Users can view own order notifications"
  ON public.mercadopago_notifications
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.orders 
      WHERE orders.id = mercadopago_notifications.order_id 
      AND orders.buyer_id = auth.uid()
    )
  );
