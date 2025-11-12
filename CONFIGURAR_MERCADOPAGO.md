# 🔑 Configurar Credenciais do Mercado Pago

## ❌ Erro Atual

```
Failed to load resource: the server responded with a status of 404 (Not Found)
Erro ao processar checkout
```

**Causa:** As credenciais do Mercado Pago não estão configuradas no arquivo `.env.local`

## ✅ Solução em 3 Passos

### 1️⃣ Obter Credenciais de Teste

1. Acesse: https://www.mercadopago.com.br/developers/panel/credentials
2. Faça login na sua conta Mercado Pago
3. Clique em **"Credenciais de teste"** (não use as de produção!)
4. Copie:
   - **Access Token** (começa com `TEST-`)
   - **Public Key** (começa com `TEST-`)

### 2️⃣ Configurar .env.local

Abra o arquivo `.env.local` na raiz do projeto e adicione:

```bash
# Mercado Pago - Credenciais de TESTE
MERCADO_PAGO_ACCESS_TOKEN=TEST-1234567890123456-112233-abcdef1234567890abcdef1234567890-123456789
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=TEST-abc12345-6789-0123-4567-890abcdef123
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**⚠️ IMPORTANTE:**
- Substitua os valores acima pelas suas credenciais REAIS de teste
- As credenciais devem começar com `TEST-`
- Não compartilhe essas credenciais publicamente

### 3️⃣ Reiniciar o Servidor

```bash
# Parar o servidor (Ctrl + C)
# Iniciar novamente
npm run dev
```

## 🧪 Testar

1. Vá para `/dashboard/market`
2. Clique em **"Comprar"** em um Pokémon
3. Na página de checkout, clique em **"Ir para Pagamento"**
4. Agora deve funcionar! ✅

## 📋 Checklist

- [ ] Obtive as credenciais de TESTE do Mercado Pago
- [ ] Adicionei `MERCADO_PAGO_ACCESS_TOKEN` no `.env.local`
- [ ] Adicionei `NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY` no `.env.local`
- [ ] Adicionei `NEXT_PUBLIC_APP_URL=http://localhost:3000` no `.env.local`
- [ ] Reiniciei o servidor (`npm run dev`)
- [ ] Testei o checkout

## 🔍 Verificar se Está Funcionando

Após configurar, você deve ver no console do servidor:

```
📥 Recebendo requisição: { orderId: '...', userId: '...' }
🔍 Buscando pedido: ...
✅ Pedido encontrado: ...
```

Se ver:
```
❌ MERCADO_PAGO_ACCESS_TOKEN não configurado
```

Significa que o `.env.local` não foi configurado corretamente.

## 🆘 Ainda com Problemas?

### Problema: "MERCADO_PAGO_ACCESS_TOKEN não configurado"

**Solução:**
1. Verifique se o arquivo `.env.local` existe na raiz do projeto
2. Verifique se não há espaços antes ou depois do `=`
3. Reinicie o servidor completamente

### Problema: "Invalid credentials"

**Solução:**
1. Verifique se copiou as credenciais de **TESTE** (não produção)
2. Verifique se as credenciais começam com `TEST-`
3. Tente gerar novas credenciais no painel do Mercado Pago

### Problema: Página em branco após clicar em "Ir para Pagamento"

**Solução:**
1. Abra o Console do navegador (F12)
2. Veja os erros
3. Verifique se aplicou as migrations do banco de dados

## 📚 Próximos Passos

Após configurar as credenciais de teste e tudo funcionar:

1. ✅ Teste com cartões de teste
2. ✅ Verifique o webhook
3. ✅ Teste o fluxo completo de compra
4. 🚀 Quando estiver pronto para produção, troque para credenciais de produção

## 🎯 Cartões de Teste

Após configurar, use estes cartões para testar:

### ✅ Aprovado
```
Número: 5031 4332 1540 6351
CVV: 123
Validade: 12/25
Nome: APRO
```

### ❌ Rejeitado
```
Número: 5031 4332 1540 6351
CVV: 123
Validade: 12/25
Nome: OTHE
```

### ⏳ Pendente
```
Número: 5031 4332 1540 6351
CVV: 123
Validade: 12/25
Nome: CONT
```
