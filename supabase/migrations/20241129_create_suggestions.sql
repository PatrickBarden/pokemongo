-- Tabela de sugestões dos usuários
CREATE TABLE IF NOT EXISTS suggestions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(200) NOT NULL,
  description TEXT NOT NULL,
  category VARCHAR(50) NOT NULL DEFAULT 'geral',
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  admin_response TEXT,
  responded_at TIMESTAMPTZ,
  responded_by UUID REFERENCES users(id),
  priority VARCHAR(20) DEFAULT 'normal',
  votes_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_suggestions_user_id ON suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_suggestions_status ON suggestions(status);
CREATE INDEX IF NOT EXISTS idx_suggestions_category ON suggestions(category);
CREATE INDEX IF NOT EXISTS idx_suggestions_created_at ON suggestions(created_at DESC);

-- Tabela de votos em sugestões (para evitar votos duplicados)
CREATE TABLE IF NOT EXISTS suggestion_votes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  suggestion_id UUID NOT NULL REFERENCES suggestions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(suggestion_id, user_id)
);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_suggestions_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_suggestions_updated_at
  BEFORE UPDATE ON suggestions
  FOR EACH ROW
  EXECUTE FUNCTION update_suggestions_updated_at();

-- Trigger para atualizar contagem de votos
CREATE OR REPLACE FUNCTION update_suggestion_votes_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE suggestions SET votes_count = votes_count + 1 WHERE id = NEW.suggestion_id;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE suggestions SET votes_count = votes_count - 1 WHERE id = OLD.suggestion_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_suggestion_votes_count
  AFTER INSERT OR DELETE ON suggestion_votes
  FOR EACH ROW
  EXECUTE FUNCTION update_suggestion_votes_count();

-- RLS Policies
ALTER TABLE suggestions ENABLE ROW LEVEL SECURITY;
ALTER TABLE suggestion_votes ENABLE ROW LEVEL SECURITY;

-- Usuários podem ver todas as sugestões
CREATE POLICY "Users can view all suggestions" ON suggestions
  FOR SELECT USING (true);

-- Usuários podem criar suas próprias sugestões
CREATE POLICY "Users can create own suggestions" ON suggestions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Usuários podem atualizar apenas suas próprias sugestões (antes de serem respondidas)
CREATE POLICY "Users can update own pending suggestions" ON suggestions
  FOR UPDATE USING (auth.uid() = user_id AND status = 'pending');

-- Admins podem fazer tudo
CREATE POLICY "Admins can do everything on suggestions" ON suggestions
  FOR ALL USING (
    EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
  );

-- Votos
CREATE POLICY "Users can view all votes" ON suggestion_votes
  FOR SELECT USING (true);

CREATE POLICY "Users can vote" ON suggestion_votes
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can remove own vote" ON suggestion_votes
  FOR DELETE USING (auth.uid() = user_id);

-- Habilitar realtime
ALTER PUBLICATION supabase_realtime ADD TABLE suggestions;

-- Comentários
COMMENT ON TABLE suggestions IS 'Sugestões dos usuários para melhorias no aplicativo';
COMMENT ON COLUMN suggestions.status IS 'pending, reviewing, approved, implemented, rejected';
COMMENT ON COLUMN suggestions.category IS 'geral, interface, funcionalidade, bug, outro';
COMMENT ON COLUMN suggestions.priority IS 'low, normal, high, urgent';
