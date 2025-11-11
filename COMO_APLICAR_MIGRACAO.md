# 🎯 Como Aplicar a Migração - 3 Opções

## ❓ Por que não posso executar diretamente?

Eu (IA) não tenho:
- ❌ Acesso às suas credenciais do Supabase
- ❌ Permissão para fazer conexões externas
- ❌ Ferramentas de banco de dados instaladas

**MAS** posso te guiar para fazer isso em **1 minuto**! 🚀

---

## ✅ OPÇÃO 1: Supabase Dashboard (MAIS FÁCIL)

### Passo a passo:

1. **Abra seu navegador**
   - Acesse: https://app.supabase.com
   - Faça login

2. **Selecione seu projeto**
   - Clique no projeto "pokemongo"

3. **Abra o SQL Editor**
   - Menu lateral esquerdo
   - Clique em "SQL Editor"
   - Clique em "+ New Query"

4. **Cole o SQL**
   - Abra o arquivo: `EXECUTAR_AGORA.sql`
   - Copie todo o conteúdo (Ctrl+A, Ctrl+C)
   - Cole no editor SQL (Ctrl+V)

5. **Execute**
   - Clique no botão "RUN" (canto inferior direito)
   - OU pressione: Ctrl+Enter

6. **Confirme o sucesso**
   - Você verá: "Success. 4 rows returned"
   - Isso significa que as 4 colunas foram criadas! ✅

**Tempo: 1 minuto** ⏱️

---

## ✅ OPÇÃO 2: Script Automático (Verificação)

Execute este comando no terminal:

```bash
node scripts/apply-migration.js
```

**O que ele faz:**
- ✅ Verifica se as colunas já existem
- ✅ Mostra o SQL que você precisa executar
- ✅ Te guia para o próximo passo

**Nota:** Este script NÃO executa o SQL automaticamente (limitação do Supabase JS), mas te ajuda a verificar o status.

---

## ✅ OPÇÃO 3: Supabase CLI (Para Desenvolvedores)

Se você tem o Supabase CLI instalado:

```bash
# Instalar CLI (se não tiver)
npm install -g supabase

# Fazer login
supabase login

# Linkar projeto
supabase link --project-ref SEU_PROJECT_REF

# Aplicar migrações
supabase db push
```

---

## 📋 SQL Completo (Copie e Cole)

```sql
-- Adicionar as colunas de variantes
ALTER TABLE public.listings 
ADD COLUMN IF NOT EXISTS is_shiny BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_costume BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS has_background BOOLEAN DEFAULT false,
ADD COLUMN IF NOT EXISTS is_purified BOOLEAN DEFAULT false;

-- Criar índices
CREATE INDEX IF NOT EXISTS idx_listings_is_shiny ON public.listings(is_shiny) WHERE is_shiny = true;
CREATE INDEX IF NOT EXISTS idx_listings_has_costume ON public.listings(has_costume) WHERE has_costume = true;
CREATE INDEX IF NOT EXISTS idx_listings_has_background ON public.listings(has_background) WHERE has_background = true;
CREATE INDEX IF NOT EXISTS idx_listings_is_purified ON public.listings(is_purified) WHERE is_purified = true;

-- Verificar
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'listings' AND column_name IN ('is_shiny', 'has_costume', 'has_background', 'is_purified');
```

---

## 🎯 Depois de Executar

1. **Reinicie o servidor**
   ```bash
   # Ctrl+C para parar
   npm run dev
   ```

2. **Recarregue a página**
   - Pressione F5 no navegador

3. **Teste o cadastro**
   - Vá para Carteira
   - Cadastre um Pokémon
   - Deve funcionar! ✅

---

## ❓ Por que preciso fazer isso manualmente?

### Limitações da IA:

1. **Segurança** - Não posso acessar bancos de dados externos
2. **Credenciais** - Não tenho suas senhas/chaves
3. **Arquitetura** - Só posso modificar arquivos locais
4. **Supabase JS** - A biblioteca não permite executar DDL (ALTER TABLE)

### Mas eu posso:

- ✅ Criar os scripts SQL
- ✅ Criar scripts de verificação
- ✅ Te guiar passo a passo
- ✅ Corrigir o código da aplicação
- ✅ Adicionar validações e logs

---

## 🆘 Se Tiver Dúvidas

Execute o script de verificação:

```bash
node scripts/apply-migration.js
```

Ele te dirá exatamente o que fazer! 🎯

---

**Tempo total: 1-2 minutos**  
**Dificuldade: ⭐☆☆☆☆ (Muito fácil)**

Basta copiar e colar o SQL no Supabase Dashboard! 🚀
