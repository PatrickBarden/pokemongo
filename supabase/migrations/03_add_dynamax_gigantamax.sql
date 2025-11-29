-- Adicionar colunas is_dynamax e is_gigantamax na tabela listings
-- Nota: Os nomes das colunas permanecem is_dynamax e is_gigantamax no banco
-- mas a UI exibe como "Dinamax" e "Gigamax"
ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_dynamax BOOLEAN DEFAULT false;
ALTER TABLE listings ADD COLUMN IF NOT EXISTS is_gigantamax BOOLEAN DEFAULT false;

-- Comentários para documentação
COMMENT ON COLUMN listings.is_dynamax IS 'Indica se o Pokémon é Dinamax';
COMMENT ON COLUMN listings.is_gigantamax IS 'Indica se o Pokémon é Gigamax';
