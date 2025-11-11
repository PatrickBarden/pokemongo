-- ============================================
-- COPIE E COLE ESTE SQL NO SUPABASE AGORA!
-- ============================================
-- Acesse: https://app.supabase.com
-- Vá em: SQL Editor → + New Query
-- Cole este código e clique em RUN
-- ============================================

-- Adicionar as colunas de variantes
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS is_shiny BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_costume BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_background BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_purified BOOLEAN DEFAULT false;

-- Atualizar valores NULL para false
UPDATE public.listings 
SET 
    is_shiny = COALESCE(is_shiny, false),
    has_costume = COALESCE(has_costume, false),
    has_background = COALESCE(has_background, false),
    is_purified = COALESCE(is_purified, false);

-- Criar índices para performance
CREATE INDEX IF NOT EXISTS idx_listings_is_shiny ON public.listings(is_shiny) WHERE is_shiny = true;
CREATE INDEX IF NOT EXISTS idx_listings_has_costume ON public.listings(has_costume) WHERE has_costume = true;
CREATE INDEX IF NOT EXISTS idx_listings_has_background ON public.listings(has_background) WHERE has_background = true;
CREATE INDEX IF NOT EXISTS idx_listings_is_purified ON public.listings(is_purified) WHERE is_purified = true;

-- Verificar se as colunas foram criadas
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'listings'
AND column_name IN ('is_shiny', 'has_costume', 'has_background', 'is_purified')
ORDER BY column_name;

-- ============================================
-- RESULTADO ESPERADO:
-- Você deve ver 4 linhas mostrando as colunas:
-- - has_background | boolean | YES | false
-- - has_costume    | boolean | YES | false
-- - is_purified    | boolean | YES | false
-- - is_shiny       | boolean | YES | false
-- ============================================
