-- ============================================
-- SCRIPT DE VERIFICAÇÃO E CORREÇÃO COMPLETO
-- Variantes de Pokémon - Diagnóstico e Fix
-- ============================================

-- PASSO 1: Verificar se as colunas existem
DO $$ 
DECLARE
    column_exists INTEGER;
BEGIN
    -- Verificar is_shiny
    SELECT COUNT(*) INTO column_exists
    FROM information_schema.columns 
    WHERE table_name = 'listings' AND column_name = 'is_shiny';
    
    IF column_exists = 0 THEN
        RAISE NOTICE 'ERRO: Coluna is_shiny NÃO existe. Criando...';
        ALTER TABLE public.listings ADD COLUMN is_shiny BOOLEAN DEFAULT false;
    ELSE
        RAISE NOTICE 'OK: Coluna is_shiny existe';
    END IF;

    -- Verificar has_costume
    SELECT COUNT(*) INTO column_exists
    FROM information_schema.columns 
    WHERE table_name = 'listings' AND column_name = 'has_costume';
    
    IF column_exists = 0 THEN
        RAISE NOTICE 'ERRO: Coluna has_costume NÃO existe. Criando...';
        ALTER TABLE public.listings ADD COLUMN has_costume BOOLEAN DEFAULT false;
    ELSE
        RAISE NOTICE 'OK: Coluna has_costume existe';
    END IF;

    -- Verificar has_background
    SELECT COUNT(*) INTO column_exists
    FROM information_schema.columns 
    WHERE table_name = 'listings' AND column_name = 'has_background';
    
    IF column_exists = 0 THEN
        RAISE NOTICE 'ERRO: Coluna has_background NÃO existe. Criando...';
        ALTER TABLE public.listings ADD COLUMN has_background BOOLEAN DEFAULT false;
    ELSE
        RAISE NOTICE 'OK: Coluna has_background existe';
    END IF;

    -- Verificar is_purified
    SELECT COUNT(*) INTO column_exists
    FROM information_schema.columns 
    WHERE table_name = 'listings' AND column_name = 'is_purified';
    
    IF column_exists = 0 THEN
        RAISE NOTICE 'ERRO: Coluna is_purified NÃO existe. Criando...';
        ALTER TABLE public.listings ADD COLUMN is_purified BOOLEAN DEFAULT false;
    ELSE
        RAISE NOTICE 'OK: Coluna is_purified existe';
    END IF;
END $$;

-- PASSO 2: Garantir que as colunas existem (redundância segura)
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS is_shiny BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_costume BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_background BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_purified BOOLEAN DEFAULT false;

-- PASSO 3: Atualizar valores NULL para false (caso existam)
UPDATE public.listings 
SET 
    is_shiny = COALESCE(is_shiny, false),
    has_costume = COALESCE(has_costume, false),
    has_background = COALESCE(has_background, false),
    is_purified = COALESCE(is_purified, false)
WHERE 
    is_shiny IS NULL 
    OR has_costume IS NULL 
    OR has_background IS NULL 
    OR is_purified IS NULL;

-- PASSO 4: Adicionar NOT NULL constraints
ALTER TABLE public.listings 
ALTER COLUMN is_shiny SET DEFAULT false,
ALTER COLUMN has_costume SET DEFAULT false,
ALTER COLUMN has_background SET DEFAULT false,
ALTER COLUMN is_purified SET DEFAULT false;

-- PASSO 5: Adicionar comentários para documentação
COMMENT ON COLUMN public.listings.is_shiny IS 'Indica se o Pokémon é brilhante/shiny';
COMMENT ON COLUMN public.listings.has_costume IS 'Indica se o Pokémon possui traje especial';
COMMENT ON COLUMN public.listings.has_background IS 'Indica se o Pokémon possui fundo especial';
COMMENT ON COLUMN public.listings.is_purified IS 'Indica se o Pokémon foi purificado';

-- PASSO 6: Criar índices para melhorar performance
CREATE INDEX IF NOT EXISTS idx_listings_is_shiny 
ON public.listings(is_shiny) 
WHERE is_shiny = true;

CREATE INDEX IF NOT EXISTS idx_listings_has_costume 
ON public.listings(has_costume) 
WHERE has_costume = true;

CREATE INDEX IF NOT EXISTS idx_listings_has_background 
ON public.listings(has_background) 
WHERE has_background = true;

CREATE INDEX IF NOT EXISTS idx_listings_is_purified 
ON public.listings(is_purified) 
WHERE is_purified = true;

-- PASSO 7: Criar índice composto para buscas de variantes
CREATE INDEX IF NOT EXISTS idx_listings_variants 
ON public.listings(is_shiny, has_costume, has_background, is_purified)
WHERE is_shiny = true OR has_costume = true OR has_background = true OR is_purified = true;

-- PASSO 8: Verificação final - Mostrar estrutura da tabela
SELECT 
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_name = 'listings'
AND column_name IN ('is_shiny', 'has_costume', 'has_background', 'is_purified')
ORDER BY column_name;

-- PASSO 9: Contar registros existentes com variantes
SELECT 
    COUNT(*) as total_listings,
    SUM(CASE WHEN is_shiny THEN 1 ELSE 0 END) as shiny_count,
    SUM(CASE WHEN has_costume THEN 1 ELSE 0 END) as costume_count,
    SUM(CASE WHEN has_background THEN 1 ELSE 0 END) as background_count,
    SUM(CASE WHEN is_purified THEN 1 ELSE 0 END) as purified_count
FROM public.listings;

-- MENSAGEM FINAL
DO $$ 
BEGIN
    RAISE NOTICE '============================================';
    RAISE NOTICE 'MIGRAÇÃO CONCLUÍDA COM SUCESSO!';
    RAISE NOTICE '============================================';
    RAISE NOTICE 'Todas as colunas de variantes foram criadas e verificadas.';
    RAISE NOTICE 'Você pode agora cadastrar Pokémon com variantes.';
    RAISE NOTICE '============================================';
END $$;
