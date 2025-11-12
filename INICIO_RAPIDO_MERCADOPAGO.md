# 🚀 Início Rápido - Mercado Pago Checkout

## ⚡ Configuração em 5 Minutos

### 1️⃣ Obter Credenciais de Teste

Acesse: https://www.mercadopago.com.br/developers/panel/credentials

Copie suas credenciais de **TESTE**:
- Access Token (começa com `TEST-`)
- Public Key (começa com `TEST-`)

### 2️⃣ Configurar Variáveis de Ambiente

Abra o arquivo `.env.local` e adicione:

```bash
MERCADO_PAGO_ACCESS_TOKEN=TEST-seu-access-token-aqui
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=TEST-sua-public-key-aqui
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3️⃣ Aplicar Migration no Supabase

No **Supabase SQL Editor**, execute o arquivo:
```
supabase/migrations/04_add_mercadopago_fields.sql
```

Ou copie e cole o conteúdo do arquivo no SQL Editor.

### 4️⃣ Reiniciar o Servidor

```bash
npm run dev
```

## 🧪 Testar Agora!

### Cartão de Teste - Pagamento Aprovado

```
Número: 5031 4332 1540 6351
CVV: 123
Validade: 12/25 (qualquer data futura)
Nome: APRO
CPF: 12345678909
```

### Fluxo de Teste

1. Vá para `/dashboard/market`
2. Adicione um Pokémon ao carrinho
3. Clique no carrinho no menu
4. Clique em "Finalizar Compra"
5. Use o cartão de teste acima
6. Complete o pagamento
7. Você será redirecionado para `/dashboard/orders`

## ✅ Pronto!

Seu checkout está funcionando! 🎉

Para mais detalhes, veja: `MERCADOPAGO_SETUP_GUIDE.md`
