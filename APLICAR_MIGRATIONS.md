# 🔧 Como Aplicar as Migrations

## Erro: "Could not find the function public.generate_order_number"

Este erro acontece porque a função `generate_order_number` ainda não foi criada no banco de dados.

## ✅ Solução Rápida

### Opção 1: Via Supabase SQL Editor (Recomendado)

1. Acesse o **Supabase Dashboard**: https://app.supabase.com
2. Selecione seu projeto
3. Vá em **SQL Editor** (no menu lateral)
4. Clique em **New query**
5. Copie e cole o conteúdo dos arquivos de migration na ordem:

#### Migration 04 - Campos do Mercado Pago
```sql
-- Copie todo o conteúdo de: supabase/migrations/04_add_mercadopago_fields.sql
```

#### Migration 05 - Função de Número de Pedido
```sql
-- Copie todo o conteúdo de: supabase/migrations/05_create_order_number_function.sql
```

6. Clique em **Run** para executar cada migration

### Opção 2: Via Supabase CLI

Se você tem o Supabase CLI instalado:

```bash
# Navegar até a pasta do projeto
cd c:/Users/Usuario/pokemongo/pokemongo

# Aplicar todas as migrations pendentes
supabase db push
```

## 📋 Verificar se Funcionou

Após aplicar as migrations, execute no SQL Editor:

```sql
-- Testar a função
SELECT public.generate_order_number();

-- Deve retornar algo como: ORD-20251112-0001
```

## 🔄 Ordem das Migrations

Execute nesta ordem:
1. ✅ `00_complete_schema.sql` (já aplicado)
2. ✅ `01_add_pokemon_variants.sql` (já aplicado)
3. ✅ `02_fix_and_verify_variants.sql` (já aplicado)
4. ⚠️ `04_add_mercadopago_fields.sql` (APLICAR AGORA)
5. ⚠️ `05_create_order_number_function.sql` (APLICAR AGORA)

## 🚨 Se Ainda Houver Erro

Caso o erro persista, verifique:

1. **Permissões**: A função foi criada no schema `public`?
2. **Conexão**: O Supabase está conectado corretamente?
3. **Cache**: Tente fazer hard refresh (Ctrl + Shift + R)

## 📝 Conteúdo da Migration 05

Se preferir copiar diretamente:

```sql
-- Criar sequência para números de pedido
CREATE SEQUENCE IF NOT EXISTS order_number_seq START 1;

-- Criar função para gerar número de pedido
CREATE OR REPLACE FUNCTION public.generate_order_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  order_date TEXT;
  order_seq TEXT;
  order_number TEXT;
BEGIN
  -- Obter data atual no formato YYYYMMDD
  order_date := TO_CHAR(NOW(), 'YYYYMMDD');
  
  -- Obter próximo número da sequência (4 dígitos)
  order_seq := LPAD(nextval('order_number_seq')::TEXT, 4, '0');
  
  -- Montar número do pedido
  order_number := 'ORD-' || order_date || '-' || order_seq;
  
  RETURN order_number;
END;
$$;

-- Comentário na função
COMMENT ON FUNCTION public.generate_order_number() IS 'Gera um número único para pedidos no formato ORD-YYYYMMDD-XXXX';
```

## ✅ Após Aplicar

1. Recarregue a página do checkout
2. Tente fazer o pagamento novamente
3. O erro deve desaparecer! 🎉
