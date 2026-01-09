/*
  # Sistema de Moderadores
  
  Cria estrutura para gestão de moderadores com permissões granulares
  
  - Tabela moderator_permissions: define o que cada moderador pode fazer
  - Tabela moderator_actions: log de ações dos moderadores
  - Índices e políticas RLS
*/

-- ============================================================================
-- TABELA DE PERMISSÕES DE MODERADORES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.moderator_permissions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  
  -- Permissões de Pedidos
  can_view_orders BOOLEAN DEFAULT true,
  can_manage_orders BOOLEAN DEFAULT false,
  can_resolve_disputes BOOLEAN DEFAULT false,
  
  -- Permissões de Usuários
  can_view_users BOOLEAN DEFAULT true,
  can_ban_users BOOLEAN DEFAULT false,
  can_warn_users BOOLEAN DEFAULT true,
  
  -- Permissões de Anúncios
  can_view_listings BOOLEAN DEFAULT true,
  can_moderate_listings BOOLEAN DEFAULT true,
  can_delete_listings BOOLEAN DEFAULT false,
  
  -- Permissões de Chat
  can_view_chats BOOLEAN DEFAULT true,
  can_respond_chats BOOLEAN DEFAULT true,
  
  -- Permissões de Finanças
  can_view_finances BOOLEAN DEFAULT false,
  can_process_payouts BOOLEAN DEFAULT false,
  
  -- Metadados
  notes TEXT,
  created_by UUID REFERENCES public.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id)
);

-- ============================================================================
-- TABELA DE LOG DE AÇÕES DOS MODERADORES
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.moderator_actions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  moderator_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL,
  target_type TEXT NOT NULL, -- 'user', 'order', 'listing', 'chat', etc.
  target_id UUID,
  description TEXT NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ÍNDICES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_moderator_permissions_user_id ON public.moderator_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_moderator_actions_moderator_id ON public.moderator_actions(moderator_id);
CREATE INDEX IF NOT EXISTS idx_moderator_actions_created_at ON public.moderator_actions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_moderator_actions_target ON public.moderator_actions(target_type, target_id);

-- ============================================================================
-- RLS POLICIES
-- ============================================================================

ALTER TABLE public.moderator_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.moderator_actions ENABLE ROW LEVEL SECURITY;

-- Apenas admins podem gerenciar permissões de moderadores
CREATE POLICY "Admins can manage moderator permissions"
  ON public.moderator_permissions
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Moderadores podem ver suas próprias permissões
CREATE POLICY "Moderators can view own permissions"
  ON public.moderator_permissions
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

-- Admins podem ver todas as ações de moderadores
CREATE POLICY "Admins can view all moderator actions"
  ON public.moderator_actions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role = 'admin'
    )
  );

-- Moderadores podem ver e criar suas próprias ações
CREATE POLICY "Moderators can view own actions"
  ON public.moderator_actions
  FOR SELECT
  TO authenticated
  USING (moderator_id = auth.uid());

CREATE POLICY "Moderators can create own actions"
  ON public.moderator_actions
  FOR INSERT
  TO authenticated
  WITH CHECK (moderator_id = auth.uid());

-- ============================================================================
-- FUNÇÃO PARA VERIFICAR PERMISSÃO DE MODERADOR
-- ============================================================================

CREATE OR REPLACE FUNCTION check_moderator_permission(
  p_user_id UUID,
  p_permission TEXT
) RETURNS BOOLEAN AS $$
DECLARE
  v_has_permission BOOLEAN := false;
  v_user_role TEXT;
BEGIN
  -- Verificar role do usuário
  SELECT role INTO v_user_role FROM public.users WHERE id = p_user_id;
  
  -- Admin tem todas as permissões
  IF v_user_role = 'admin' THEN
    RETURN true;
  END IF;
  
  -- Verificar se é moderador
  IF v_user_role != 'mod' THEN
    RETURN false;
  END IF;
  
  -- Verificar permissão específica
  EXECUTE format(
    'SELECT %I FROM public.moderator_permissions WHERE user_id = $1',
    p_permission
  ) INTO v_has_permission USING p_user_id;
  
  RETURN COALESCE(v_has_permission, false);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- FUNÇÃO PARA REGISTRAR AÇÃO DE MODERADOR
-- ============================================================================

CREATE OR REPLACE FUNCTION log_moderator_action(
  p_moderator_id UUID,
  p_action_type TEXT,
  p_target_type TEXT,
  p_target_id UUID,
  p_description TEXT,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID AS $$
DECLARE
  v_action_id UUID;
BEGIN
  INSERT INTO public.moderator_actions (
    moderator_id,
    action_type,
    target_type,
    target_id,
    description,
    metadata
  ) VALUES (
    p_moderator_id,
    p_action_type,
    p_target_type,
    p_target_id,
    p_description,
    p_metadata
  ) RETURNING id INTO v_action_id;
  
  RETURN v_action_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- TRIGGER PARA ATUALIZAR UPDATED_AT
-- ============================================================================

CREATE OR REPLACE FUNCTION update_moderator_permissions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_moderator_permissions_updated_at
  BEFORE UPDATE ON public.moderator_permissions
  FOR EACH ROW
  EXECUTE FUNCTION update_moderator_permissions_updated_at();
