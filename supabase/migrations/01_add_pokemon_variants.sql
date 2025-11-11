-- Adicionar campos de variantes do Pokémon na tabela listings
-- Criado em: 2025-11-11

-- Adicionar colunas para variantes do Pokémon
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS is_shiny BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_costume BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_background BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_purified BOOLEAN DEFAULT false;

-- Adicionar comentários para documentação
COMMENT ON COLUMN public.listings.is_shiny IS 'Indica se o Pokémon é brilhante/shiny';
COMMENT ON COLUMN public.listings.has_costume IS 'Indica se o Pokémon possui traje especial';
COMMENT ON COLUMN public.listings.has_background IS 'Indica se o Pokémon possui fundo especial';
COMMENT ON COLUMN public.listings.is_purified IS 'Indica se o Pokémon foi purificado';

-- Criar índices para melhorar performance nas buscas por variantes
CREATE INDEX IF NOT EXISTS idx_listings_is_shiny ON public.listings(is_shiny) WHERE is_shiny = true;
CREATE INDEX IF NOT EXISTS idx_listings_has_costume ON public.listings(has_costume) WHERE has_costume = true;
CREATE INDEX IF NOT EXISTS idx_listings_has_background ON public.listings(has_background) WHERE has_background = true;
CREATE INDEX IF NOT EXISTS idx_listings_is_purified ON public.listings(is_purified) WHERE is_purified = true;
