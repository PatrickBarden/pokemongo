# 🔧 Solução: Erro ao Cadastrar Pokémon

## ❌ Problema Identificado

Você está recebendo erro **400 (Bad Request)** ao tentar cadastrar um Pokémon porque:

1. **Migração SQL não foi aplicada** - Os novos campos de variantes não existem no banco
2. **Erro de acessibilidade no Dialog** - Faltava DialogTitle (já corrigido)

---

## ✅ Solução Passo a Passo

### **PASSO 1: Aplicar Migração SQL no Supabase** (OBRIGATÓRIO)

#### Opção A: Via Supabase Dashboard (Recomendado)

1. Acesse: https://app.supabase.com
2. Selecione seu projeto
3. No menu lateral, clique em **SQL Editor**
4. Clique em **+ New Query**
5. Cole o seguinte código SQL:

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

6. Clique em **Run** (ou pressione Ctrl+Enter)
7. Aguarde a mensagem: **"Success. No rows returned"** ✅

#### Opção B: Via Supabase CLI

Se você tem o Supabase CLI instalado:

```bash
supabase db push
```

---

### **PASSO 2: Verificar se a Migração Foi Aplicada**

1. No Supabase, vá em **Table Editor**
2. Selecione a tabela **listings**
3. Verifique se existem as novas colunas:
   - ✅ `is_shiny`
   - ✅ `has_costume`
   - ✅ `has_background`
   - ✅ `is_purified`

---

### **PASSO 3: Reiniciar o Servidor de Desenvolvimento**

```bash
# Parar o servidor (Ctrl+C)
# Iniciar novamente
npm run dev
```

---

### **PASSO 4: Testar o Cadastro**

1. Acesse: http://localhost:3000/dashboard/wallet
2. Clique em **"Cadastrar Pokémon"**
3. Preencha os campos:
   - Nome: `Charizard`
   - Tipo: `Fire`
   - Descrição: `Pokémon de fogo poderoso`
   - Preço: `150.00`
4. Marque uma variante (ex: Brilhante)
5. Clique em **"Cadastrar Pokémon"**
6. Deve aparecer: **"Pokémon cadastrado com sucesso!"** ✅

---

## 🔍 Verificar Erros no Console

### Abrir DevTools:
- **Windows/Linux**: F12 ou Ctrl+Shift+I
- **Mac**: Cmd+Option+I

### Verificar:
1. **Console** - Não deve ter erros vermelhos
2. **Network** - A requisição POST deve retornar **201 Created**

---

## ❓ Erros Comuns e Soluções

### Erro: "column 'is_shiny' does not exist"
**Causa:** Migração não foi aplicada  
**Solução:** Execute o SQL no Passo 1

### Erro: "400 Bad Request"
**Causa:** Campos obrigatórios faltando ou migração não aplicada  
**Solução:** 
1. Aplique a migração SQL
2. Verifique se preencheu todos os campos obrigatórios (*)

### Erro: "DialogTitle missing"
**Causa:** Componente Dialog sem título para acessibilidade  
**Solução:** Já corrigido automaticamente ✅

### Erro: "Failed to load resource: 400"
**Causa:** Banco de dados não tem as colunas novas  
**Solução:** Execute a migração SQL no Supabase

---

## 📊 Checklist de Verificação

Antes de tentar cadastrar novamente, confirme:

- [ ] Migração SQL foi executada no Supabase
- [ ] Colunas novas aparecem na tabela `listings`
- [ ] Servidor foi reiniciado (`npm run dev`)
- [ ] Console do navegador não tem erros
- [ ] Todos os campos obrigatórios estão preenchidos

---

## 🎯 Teste Rápido

Execute este SQL no Supabase para verificar se as colunas existem:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'listings'
AND column_name IN ('is_shiny', 'has_costume', 'has_background', 'is_purified');
```

**Resultado esperado:** 4 linhas mostrando as colunas

---

## 🆘 Se Ainda Não Funcionar

1. **Limpar cache do navegador**:
   - Ctrl+Shift+Delete (Chrome/Edge)
   - Selecione "Cached images and files"
   - Clique em "Clear data"

2. **Verificar logs do Supabase**:
   - Vá em **Logs** no Supabase Dashboard
   - Procure por erros relacionados a `listings`

3. **Verificar variáveis de ambiente**:
   - Arquivo `.env.local` está correto?
   - `NEXT_PUBLIC_SUPABASE_URL` está preenchido?
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` está preenchido?

4. **Testar conexão com banco**:
   ```javascript
   // No console do navegador
   console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
   ```

---

## 📞 Suporte Adicional

Se o problema persistir, forneça:
1. Screenshot do erro no console
2. Screenshot da tabela `listings` no Supabase
3. Mensagem de erro completa

---

**Última atualização:** 11 de novembro de 2025  
**Status:** ✅ Solução testada e funcional
