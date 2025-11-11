# 🎮 Instruções: Variantes de Pokémon

## 📋 O que foi implementado?

Adicionamos campos para registrar variantes especiais dos Pokémon:
- ✨ **Brilhante (Shiny)** - Pokémon com coloração especial
- 👔 **Com Traje** - Pokémon com roupas/acessórios especiais
- 🖼️ **Com Fundo** - Pokémon com fundo especial
- 💖 **Purificado** - Pokémon que foi purificado

## 🔧 Como aplicar as mudanças no banco de dados

### Opção 1: Via Supabase Dashboard (Recomendado)

1. Acesse seu projeto no Supabase: https://app.supabase.com
2. No menu lateral, clique em **SQL Editor**
3. Clique em **+ New Query**
4. Cole o seguinte código SQL:

```sql
-- Adicionar campos de variantes do Pokémon na tabela listings
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
```

5. Clique em **Run** (ou pressione Ctrl+Enter)
6. Aguarde a mensagem de sucesso ✅

### Opção 2: Via Supabase CLI (Para desenvolvedores)

Se você tem o Supabase CLI instalado:

```bash
# Aplicar a migração
supabase db push

# Ou executar o arquivo de migração específico
supabase db execute --file supabase/migrations/01_add_pokemon_variants.sql
```

## 🎯 Como usar no sistema

### 1. Cadastrar Pokémon com Variantes

1. Acesse **Carteira** no menu lateral
2. Clique em **Cadastrar Pokémon**
3. Preencha os dados básicos do Pokémon
4. Na seção **"Variantes do Pokémon"**, selecione as características:
   - ✨ **Brilhante** - Para Pokémon shiny
   - 👔 **Com Traje** - Para Pokémon com fantasias
   - 🖼️ **Com Fundo** - Para Pokémon com fundo especial
   - 💖 **Purificado** - Para Pokémon purificados
5. Clique em **Cadastrar Pokémon**

### 2. Visualizar no Mercado

Os Pokémon cadastrados com variantes aparecerão com badges coloridos:
- 🟡 **Badge Dourado** - Brilhante
- 🟣 **Badge Roxo** - Com Traje
- 🔵 **Badge Azul** - Com Fundo
- 🩷 **Badge Rosa** - Purificado

### 3. Buscar por Variantes (Futuro)

Em breve será possível filtrar Pokémon por variantes específicas no mercado.

## 📊 Estrutura do Banco de Dados

### Campos Adicionados na Tabela `listings`

| Campo | Tipo | Padrão | Descrição |
|-------|------|--------|-----------|
| `is_shiny` | BOOLEAN | false | Pokémon brilhante/shiny |
| `has_costume` | BOOLEAN | false | Possui traje especial |
| `has_background` | BOOLEAN | false | Possui fundo especial |
| `is_purified` | BOOLEAN | false | Foi purificado |

### Índices Criados

Para otimizar buscas, foram criados índices parciais:
- `idx_listings_is_shiny` - Apenas para Pokémon brilhantes
- `idx_listings_has_costume` - Apenas para Pokémon com traje
- `idx_listings_has_background` - Apenas para Pokémon com fundo
- `idx_listings_is_purified` - Apenas para Pokémon purificados

## 🧪 Testar a Implementação

1. **Aplicar a migração** no Supabase
2. **Reiniciar o servidor** de desenvolvimento:
   ```bash
   npm run dev
   ```
3. **Cadastrar um Pokémon** com variantes
4. **Verificar no mercado** se os badges aparecem corretamente

## ❓ Problemas Comuns

### Erro: "column already exists"
Se você já executou a migração antes, os campos já existem. Isso é normal e pode ignorar.

### Badges não aparecem no mercado
1. Verifique se aplicou a migração no Supabase
2. Certifique-se de que marcou as variantes ao cadastrar
3. Recarregue a página do mercado (F5)

### Erro ao cadastrar Pokémon
1. Verifique se a migração foi aplicada com sucesso
2. Confira os logs do console do navegador (F12)
3. Verifique as permissões RLS no Supabase

## 🚀 Próximos Passos

Possíveis melhorias futuras:
- [ ] Filtros de busca por variantes no mercado
- [ ] Ordenação por raridade (priorizar brilhantes)
- [ ] Estatísticas de variantes no dashboard
- [ ] Notificações para Pokémon raros

---

**Desenvolvido com ❤️ para a comunidade Pokémon GO**
