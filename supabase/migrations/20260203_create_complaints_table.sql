-- =====================================================
-- MIGRATION: create_complaints_table
-- Execute this SQL in your Supabase SQL Editor
-- =====================================================

-- Tabela de denúncias
CREATE TABLE IF NOT EXISTS complaints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reporter_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  reported_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  listing_id UUID REFERENCES listings(id) ON DELETE SET NULL,
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  type TEXT NOT NULL CHECK (type IN ('user', 'listing', 'order', 'other')),
  reason TEXT NOT NULL CHECK (reason IN ('fraud', 'inappropriate_content', 'spam', 'harassment', 'fake_pokemon', 'non_delivery', 'scam', 'other')),
  description TEXT NOT NULL,
  evidence_urls TEXT[],
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'investigating', 'resolved', 'dismissed')),
  admin_notes TEXT,
  resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_reporter ON complaints(reporter_id);
CREATE INDEX IF NOT EXISTS idx_complaints_reported ON complaints(reported_user_id);
CREATE INDEX IF NOT EXISTS idx_complaints_created ON complaints(created_at DESC);

-- Habilitar RLS
ALTER TABLE complaints ENABLE ROW LEVEL SECURITY;

-- Políticas RLS

-- Usuários podem criar denúncias
CREATE POLICY "Users can create complaints" ON complaints
  FOR INSERT WITH CHECK (auth.uid() = reporter_id);

-- Usuários podem ver suas próprias denúncias
CREATE POLICY "Users can view own complaints" ON complaints
  FOR SELECT USING (auth.uid() = reporter_id);

-- Admins podem gerenciar todas as denúncias
CREATE POLICY "Admins can manage all complaints" ON complaints
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Moderadores podem ver e atualizar denúncias
CREATE POLICY "Moderators can view and update complaints" ON complaints
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role IN ('admin', 'moderator'))
  );

-- =====================================================
-- IMPORTANTE: Após executar este script, regenere os 
-- tipos TypeScript do Supabase com:
-- npx supabase gen types typescript --project-id <project-id> > lib/database.types.ts
-- =====================================================
