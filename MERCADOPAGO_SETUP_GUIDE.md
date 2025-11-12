# 🛒 Guia de Configuração - Checkout Mercado Pago

## 📋 Pré-requisitos

1. Conta no Mercado Pago (modo teste)
2. Credenciais de teste configuradas
3. Cartões de teste criados

## 🔧 Passo a Passo de Configuração

### 1. Obter Credenciais de Teste

1. Acesse: https://www.mercadopago.com.br/developers/panel/credentials
2. Selecione **"Credenciais de teste"**
3. Copie:
   - **Access Token de teste** (começa com `TEST-`)
   - **Public Key de teste** (começa com `TEST-`)

### 2. Configurar Variáveis de Ambiente

Copie o arquivo `.env.example` para `.env.local`:

```bash
cp .env.example .env.local
```

Edite `.env.local` e adicione suas credenciais:

```bash
# Mercado Pago - Credenciais de TESTE
MERCADO_PAGO_ACCESS_TOKEN=TEST-1234567890-abcdef-xyz123
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=TEST-abc123-def456-ghi789
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. Aplicar Migration do Banco de Dados

Execute a migration para adicionar os campos necessários:

```sql
-- No Supabase SQL Editor, execute:
-- supabase/migrations/04_add_mercadopago_fields.sql
```

Ou via CLI do Supabase:

```bash
supabase db push
```

### 4. Instalar Dependências

```bash
npm install
```

### 5. Iniciar o Servidor

```bash
npm run dev
```

## 🧪 Testando o Checkout

### Cartões de Teste

Use estes cartões para testar diferentes cenários:

#### ✅ Pagamento Aprovado
- **Número:** 5031 4332 1540 6351
- **CVV:** 123
- **Validade:** Qualquer data futura
- **Nome:** APRO

#### ❌ Pagamento Rejeitado
- **Número:** 5031 4332 1540 6351
- **CVV:** 123
- **Validade:** Qualquer data futura
- **Nome:** OTHE

#### ⏳ Pagamento Pendente
- **Número:** 5031 4332 1540 6351
- **CVV:** 123
- **Validade:** Qualquer data futura
- **Nome:** CONT

### Fluxo de Teste

1. **Adicionar Pokémon ao Carrinho**
   - Navegue para `/dashboard/market`
   - Clique em "Adicionar ao Carrinho" em um Pokémon

2. **Ir para o Carrinho**
   - Clique no ícone do carrinho no menu
   - Ou acesse `/dashboard/cart`

3. **Finalizar Compra**
   - Clique em "Finalizar Compra"
   - Você será redirecionado para o checkout do Mercado Pago

4. **Preencher Dados de Pagamento**
   - Use um dos cartões de teste acima
   - Complete o pagamento

5. **Verificar Resultado**
   - Você será redirecionado de volta para `/dashboard/orders`
   - O status do pedido será atualizado automaticamente

## 🔔 Webhook (Notificações)

O webhook está configurado em:
```
/api/mercadopago/webhook
```

### Testando Webhook Localmente

Para testar webhooks localmente, use **ngrok** ou **localtunnel**:

```bash
# Instalar ngrok
npm install -g ngrok

# Expor porta 3000
ngrok http 3000
```

Depois, configure a URL do webhook no Mercado Pago:
```
https://seu-dominio.ngrok.io/api/mercadopago/webhook
```

## 📊 Estrutura do Banco de Dados

### Tabela: `orders`

Novos campos adicionados:
- `payment_preference_id` - ID da preferência do Mercado Pago
- `payment_id` - ID do pagamento
- `payment_status` - Status do pagamento (approved, pending, rejected, etc.)
- `payment_type` - Tipo de pagamento (credit_card, debit_card, etc.)
- `payment_method` - Método de pagamento (visa, master, etc.)
- `paid_at` - Data/hora do pagamento

### Tabela: `mercadopago_notifications`

Armazena todas as notificações recebidas do Mercado Pago:
- `id` - UUID
- `order_id` - Referência ao pedido
- `payment_id` - ID do pagamento
- `notification_type` - Tipo de notificação
- `notification_data` - Dados completos da notificação (JSONB)
- `processed` - Se a notificação foi processada
- `processed_at` - Quando foi processada

## 🔐 Segurança

### ⚠️ IMPORTANTE

1. **NUNCA** exponha o `MERCADO_PAGO_ACCESS_TOKEN` no frontend
2. Use apenas credenciais de **TESTE** durante desenvolvimento
3. O `SUPABASE_SERVICE_ROLE_KEY` deve ficar apenas no backend
4. Adicione `.env.local` ao `.gitignore`

## 🚀 Próximos Passos

### Para Produção

1. Obter credenciais de **PRODUÇÃO** no Mercado Pago
2. Atualizar variáveis de ambiente
3. Configurar webhook em servidor público
4. Testar com pagamentos reais (valores baixos)
5. Implementar certificado SSL (HTTPS obrigatório)

## 📝 Status dos Pagamentos

| Status MP | Status Order | Descrição |
|-----------|--------------|-----------|
| `approved` | `confirmed` | Pagamento aprovado |
| `pending` | `pending` | Aguardando pagamento |
| `in_process` | `pending` | Processando pagamento |
| `rejected` | `cancelled` | Pagamento rejeitado |
| `cancelled` | `cancelled` | Pagamento cancelado |

## 🐛 Troubleshooting

### Erro: "Public key não configurada"
- Verifique se `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY` está no `.env.local`
- Reinicie o servidor (`npm run dev`)

### Erro: "Erro ao criar preferência"
- Verifique se `MERCADO_PAGO_ACCESS_TOKEN` está correto
- Confirme que é um token de **TESTE**
- Verifique logs do servidor

### Webhook não está funcionando
- Use ngrok para expor localhost
- Configure URL do webhook no painel do Mercado Pago
- Verifique logs em `/api/mercadopago/webhook`

## 📚 Documentação Adicional

- [Mercado Pago - Documentação](https://www.mercadopago.com.br/developers/pt/docs)
- [Checkout Pro](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/landing)
- [Webhooks](https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks)
- [Cartões de Teste](https://www.mercadopago.com.br/developers/pt/docs/checkout-pro/additional-content/test-cards)

## ✅ Checklist de Implementação

- [x] SDK do Mercado Pago instalado
- [x] Migration SQL criada
- [x] API route para criar preferência
- [x] API route para webhook
- [x] Página do carrinho atualizada
- [x] Variáveis de ambiente configuradas
- [ ] Credenciais de teste adicionadas ao `.env.local`
- [ ] Migration aplicada no Supabase
- [ ] Teste de checkout realizado
- [ ] Webhook testado

## 🎯 Próximas Melhorias

1. Adicionar opção de PIX
2. Implementar parcelamento
3. Adicionar cupons de desconto
4. Melhorar página de confirmação
5. Enviar emails de confirmação
