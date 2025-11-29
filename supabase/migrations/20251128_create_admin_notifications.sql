/*
  # Criar tabela de notificações do admin
  
  Esta tabela armazena notificações persistentes para o painel administrativo,
  incluindo pagamentos aprovados, novos pedidos, etc.
*/

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
