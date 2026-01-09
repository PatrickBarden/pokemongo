-- ============================================================================
-- SISTEMA DE CARTEIRA DIGITAL - Pokémon GO Marketplace
-- Migração: 20251231_create_wallet_system.sql
-- ============================================================================

-- 1. TABELA: wallets (Carteira do usuário)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.wallets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE UNIQUE,
  balance DECIMAL(12,2) NOT NULL DEFAULT 0.00 CHECK (balance >= 0),
  pending_balance DECIMAL(12,2) NOT NULL DEFAULT 0.00 CHECK (pending_balance >= 0),
  total_deposited DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_withdrawn DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_earned DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  total_spent DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.wallets IS 'Carteira digital dos usuários para armazenar créditos';
COMMENT ON COLUMN public.wallets.balance IS 'Saldo disponível para uso';
COMMENT ON COLUMN public.wallets.pending_balance IS 'Saldo pendente (vendas aguardando confirmação)';
COMMENT ON COLUMN public.wallets.total_deposited IS 'Total de créditos adicionados via compra de planos';
COMMENT ON COLUMN public.wallets.total_withdrawn IS 'Total de saques realizados (PIX)';
COMMENT ON COLUMN public.wallets.total_earned IS 'Total ganho com vendas';
COMMENT ON COLUMN public.wallets.total_spent IS 'Total gasto em compras';

-- 2. TABELA: credit_packages (Planos de créditos disponíveis)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.credit_packages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  credits DECIMAL(12,2) NOT NULL CHECK (credits > 0),
  price DECIMAL(12,2) NOT NULL CHECK (price > 0),
  bonus_credits DECIMAL(12,2) NOT NULL DEFAULT 0,
  bonus_percentage DECIMAL(5,2) NOT NULL DEFAULT 0,
  is_popular BOOLEAN NOT NULL DEFAULT false,
  is_best_value BOOLEAN NOT NULL DEFAULT false,
  display_order INTEGER NOT NULL DEFAULT 0,
  icon VARCHAR(50) DEFAULT 'coins',
  color VARCHAR(50) DEFAULT 'blue',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.credit_packages IS 'Pacotes de créditos disponíveis para compra';
COMMENT ON COLUMN public.credit_packages.credits IS 'Quantidade base de créditos';
COMMENT ON COLUMN public.credit_packages.bonus_credits IS 'Créditos de bônus extras';
COMMENT ON COLUMN public.credit_packages.bonus_percentage IS 'Porcentagem de bônus sobre o valor base';

-- 3. TABELA: wallet_transactions (Histórico de transações da carteira)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  type VARCHAR(50) NOT NULL CHECK (type IN (
    'DEPOSIT',           -- Compra de créditos
    'WITHDRAWAL',        -- Saque PIX
    'SALE_CREDIT',       -- Crédito de venda
    'PURCHASE_DEBIT',    -- Débito de compra
    'REFUND_CREDIT',     -- Reembolso recebido
    'REFUND_DEBIT',      -- Reembolso dado
    'BONUS_CREDIT',      -- Bônus recebido
    'ADJUSTMENT',        -- Ajuste manual (admin)
    'PLATFORM_FEE'       -- Taxa da plataforma
  )),
  amount DECIMAL(12,2) NOT NULL,
  balance_before DECIMAL(12,2) NOT NULL,
  balance_after DECIMAL(12,2) NOT NULL,
  description TEXT,
  reference_type VARCHAR(50),  -- 'order', 'credit_purchase', 'payout', etc.
  reference_id UUID,           -- ID da referência (order_id, etc.)
  metadata JSONB DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'COMPLETED' CHECK (status IN ('PENDING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.wallet_transactions IS 'Histórico completo de transações da carteira';

-- 4. TABELA: credit_purchases (Compras de pacotes de créditos)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.credit_purchases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES public.credit_packages(id) ON DELETE RESTRICT,
  credits_amount DECIMAL(12,2) NOT NULL,
  bonus_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_credits DECIMAL(12,2) NOT NULL,
  price_paid DECIMAL(12,2) NOT NULL,
  payment_method VARCHAR(50),
  payment_id VARCHAR(255),
  payment_status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (payment_status IN ('PENDING', 'PROCESSING', 'APPROVED', 'REJECTED', 'CANCELLED', 'REFUNDED')),
  payment_provider VARCHAR(50) DEFAULT 'mercadopago',
  preference_id VARCHAR(255),
  paid_at TIMESTAMPTZ,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.credit_purchases IS 'Registro de compras de pacotes de créditos';

-- 5. TABELA: wallet_withdrawals (Solicitações de saque)
-- ============================================================================
CREATE TABLE IF NOT EXISTS public.wallet_withdrawals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  amount DECIMAL(12,2) NOT NULL CHECK (amount > 0),
  fee DECIMAL(12,2) NOT NULL DEFAULT 0,
  net_amount DECIMAL(12,2) NOT NULL,
  pix_key VARCHAR(255) NOT NULL,
  pix_key_type VARCHAR(20) NOT NULL CHECK (pix_key_type IN ('cpf', 'cnpj', 'email', 'phone', 'random')),
  status VARCHAR(30) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  processed_by UUID REFERENCES public.users(id),
  processed_at TIMESTAMPTZ,
  failure_reason TEXT,
  transaction_id VARCHAR(255),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.wallet_withdrawals IS 'Solicitações de saque da carteira';

-- ============================================================================
-- ÍNDICES
-- ============================================================================
CREATE INDEX IF NOT EXISTS idx_wallets_user_id ON public.wallets(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_wallet_id ON public.wallet_transactions(wallet_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_user_id ON public.wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_type ON public.wallet_transactions(type);
CREATE INDEX IF NOT EXISTS idx_wallet_transactions_created ON public.wallet_transactions(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_user_id ON public.credit_purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_credit_purchases_status ON public.credit_purchases(payment_status);
CREATE INDEX IF NOT EXISTS idx_credit_packages_active ON public.credit_packages(active);
CREATE INDEX IF NOT EXISTS idx_wallet_withdrawals_user_id ON public.wallet_withdrawals(user_id);
CREATE INDEX IF NOT EXISTS idx_wallet_withdrawals_status ON public.wallet_withdrawals(status);

-- ============================================================================
-- RLS (ROW LEVEL SECURITY)
-- ============================================================================
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_packages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.credit_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wallet_withdrawals ENABLE ROW LEVEL SECURITY;

-- Políticas para WALLETS
CREATE POLICY "Users can view own wallet"
  ON public.wallets FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role can manage wallets"
  ON public.wallets FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Políticas para CREDIT_PACKAGES (público para visualização)
CREATE POLICY "Anyone can view active credit packages"
  ON public.credit_packages FOR SELECT
  TO authenticated
  USING (active = true OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Admins can manage credit packages"
  ON public.credit_packages FOR ALL
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- Políticas para WALLET_TRANSACTIONS
CREATE POLICY "Users can view own transactions"
  ON public.wallet_transactions FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Service role can manage transactions"
  ON public.wallet_transactions FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Políticas para CREDIT_PURCHASES
CREATE POLICY "Users can view own credit purchases"
  ON public.credit_purchases FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can create credit purchases"
  ON public.credit_purchases FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Service role can manage credit purchases"
  ON public.credit_purchases FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Políticas para WALLET_WITHDRAWALS
CREATE POLICY "Users can view own withdrawals"
  ON public.wallet_withdrawals FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

CREATE POLICY "Users can create withdrawals"
  ON public.wallet_withdrawals FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can update withdrawals"
  ON public.wallet_withdrawals FOR UPDATE
  TO authenticated
  USING (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'))
  WITH CHECK (EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND role = 'admin'));

-- ============================================================================
-- FUNÇÕES
-- ============================================================================

-- Função para criar carteira automaticamente quando usuário é criado
CREATE OR REPLACE FUNCTION public.create_wallet_for_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.wallets (user_id)
  VALUES (NEW.id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Trigger para criar carteira automaticamente
DROP TRIGGER IF EXISTS create_wallet_on_user_insert ON public.users;
CREATE TRIGGER create_wallet_on_user_insert
  AFTER INSERT ON public.users
  FOR EACH ROW
  EXECUTE FUNCTION public.create_wallet_for_user();

-- Função para atualizar saldo da carteira
CREATE OR REPLACE FUNCTION public.update_wallet_balance(
  p_user_id UUID,
  p_amount DECIMAL(12,2),
  p_type VARCHAR(50),
  p_description TEXT DEFAULT NULL,
  p_reference_type VARCHAR(50) DEFAULT NULL,
  p_reference_id UUID DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
)
RETURNS public.wallet_transactions AS $$
DECLARE
  v_wallet public.wallets;
  v_transaction public.wallet_transactions;
  v_balance_before DECIMAL(12,2);
  v_balance_after DECIMAL(12,2);
BEGIN
  -- Buscar carteira do usuário (criar se não existir)
  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id FOR UPDATE;
  
  IF v_wallet IS NULL THEN
    INSERT INTO public.wallets (user_id) VALUES (p_user_id) RETURNING * INTO v_wallet;
  END IF;
  
  v_balance_before := v_wallet.balance;
  v_balance_after := v_balance_before + p_amount;
  
  -- Verificar se saldo ficará negativo
  IF v_balance_after < 0 THEN
    RAISE EXCEPTION 'Saldo insuficiente. Saldo atual: %, Valor: %', v_balance_before, p_amount;
  END IF;
  
  -- Atualizar saldo
  UPDATE public.wallets
  SET 
    balance = v_balance_after,
    total_deposited = CASE WHEN p_type = 'DEPOSIT' THEN total_deposited + p_amount ELSE total_deposited END,
    total_withdrawn = CASE WHEN p_type = 'WITHDRAWAL' THEN total_withdrawn + ABS(p_amount) ELSE total_withdrawn END,
    total_earned = CASE WHEN p_type = 'SALE_CREDIT' THEN total_earned + p_amount ELSE total_earned END,
    total_spent = CASE WHEN p_type = 'PURCHASE_DEBIT' THEN total_spent + ABS(p_amount) ELSE total_spent END,
    updated_at = NOW()
  WHERE id = v_wallet.id;
  
  -- Criar registro de transação
  INSERT INTO public.wallet_transactions (
    wallet_id,
    user_id,
    type,
    amount,
    balance_before,
    balance_after,
    description,
    reference_type,
    reference_id,
    metadata,
    status
  ) VALUES (
    v_wallet.id,
    p_user_id,
    p_type,
    p_amount,
    v_balance_before,
    v_balance_after,
    p_description,
    p_reference_type,
    p_reference_id,
    p_metadata,
    'COMPLETED'
  ) RETURNING * INTO v_transaction;
  
  RETURN v_transaction;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função para processar compra de créditos aprovada
CREATE OR REPLACE FUNCTION public.process_credit_purchase(
  p_purchase_id UUID
)
RETURNS BOOLEAN AS $$
DECLARE
  v_purchase public.credit_purchases;
  v_package public.credit_packages;
BEGIN
  -- Buscar compra
  SELECT * INTO v_purchase FROM public.credit_purchases WHERE id = p_purchase_id FOR UPDATE;
  
  IF v_purchase IS NULL THEN
    RAISE EXCEPTION 'Compra não encontrada: %', p_purchase_id;
  END IF;
  
  IF v_purchase.payment_status = 'APPROVED' THEN
    RETURN TRUE; -- Já processada
  END IF;
  
  -- Atualizar status da compra
  UPDATE public.credit_purchases
  SET 
    payment_status = 'APPROVED',
    paid_at = NOW(),
    updated_at = NOW()
  WHERE id = p_purchase_id;
  
  -- Adicionar créditos na carteira
  PERFORM public.update_wallet_balance(
    v_purchase.user_id,
    v_purchase.total_credits,
    'DEPOSIT',
    'Compra de pacote de créditos',
    'credit_purchase',
    p_purchase_id,
    jsonb_build_object(
      'package_id', v_purchase.package_id,
      'credits', v_purchase.credits_amount,
      'bonus', v_purchase.bonus_amount
    )
  );
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Função para obter ou criar carteira do usuário
CREATE OR REPLACE FUNCTION public.get_or_create_wallet(p_user_id UUID)
RETURNS public.wallets AS $$
DECLARE
  v_wallet public.wallets;
BEGIN
  SELECT * INTO v_wallet FROM public.wallets WHERE user_id = p_user_id;
  
  IF v_wallet IS NULL THEN
    INSERT INTO public.wallets (user_id)
    VALUES (p_user_id)
    RETURNING * INTO v_wallet;
  END IF;
  
  RETURN v_wallet;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ============================================================================
-- DADOS INICIAIS - Pacotes de Créditos
-- ============================================================================
INSERT INTO public.credit_packages (name, slug, description, credits, price, bonus_credits, bonus_percentage, is_popular, is_best_value, display_order, icon, color) VALUES
  ('Inicial', 'starter', 'Ideal para começar a explorar o marketplace', 10.00, 10.00, 0.00, 0.00, false, false, 1, 'zap', 'blue'),
  ('Básico', 'basic', 'Perfeito para compradores ocasionais', 25.00, 25.00, 2.50, 10.00, false, false, 2, 'coins', 'green'),
  ('Popular', 'popular', 'O favorito dos treinadores', 50.00, 50.00, 10.00, 20.00, true, false, 3, 'star', 'purple'),
  ('Premium', 'premium', 'Para treinadores sérios', 100.00, 100.00, 30.00, 30.00, false, false, 4, 'crown', 'amber'),
  ('Ultra', 'ultra', 'Máximo de bônus e benefícios', 200.00, 200.00, 80.00, 40.00, false, true, 5, 'gem', 'pink')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  credits = EXCLUDED.credits,
  price = EXCLUDED.price,
  bonus_credits = EXCLUDED.bonus_credits,
  bonus_percentage = EXCLUDED.bonus_percentage,
  is_popular = EXCLUDED.is_popular,
  is_best_value = EXCLUDED.is_best_value,
  display_order = EXCLUDED.display_order,
  icon = EXCLUDED.icon,
  color = EXCLUDED.color,
  updated_at = NOW();

-- Criar carteiras para usuários existentes
INSERT INTO public.wallets (user_id)
SELECT id FROM public.users
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- GRANT PERMISSIONS
-- ============================================================================
GRANT ALL ON public.wallets TO service_role;
GRANT ALL ON public.credit_packages TO service_role;
GRANT ALL ON public.wallet_transactions TO service_role;
GRANT ALL ON public.credit_purchases TO service_role;
GRANT ALL ON public.wallet_withdrawals TO service_role;

GRANT SELECT ON public.wallets TO authenticated;
GRANT SELECT ON public.credit_packages TO authenticated;
GRANT SELECT ON public.wallet_transactions TO authenticated;
GRANT SELECT, INSERT ON public.credit_purchases TO authenticated;
GRANT SELECT, INSERT ON public.wallet_withdrawals TO authenticated;
