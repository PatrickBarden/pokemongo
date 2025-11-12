# 🔧 Corrigir Erro do Mercado Pago

## ❌ Erro Atual:
```
Erro do Mercado Pago: auto_return invalid. back_url.success must be defined
```

## ✅ Solução:

### **Passo 1: Verificar `.env.local`**

Abra o arquivo `.env.local` e certifique-se de que tem esta linha:

```bash
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### **Passo 2: Arquivo `.env.local` Completo**

Seu arquivo `.env.local` deve estar assim:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://sua-url.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-key-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui

# Mercado Pago - Credenciais de TESTE
MERCADO_PAGO_ACCESS_TOKEN=TEST-7552711626997536-111115-145ebfef83a9445abf40ba89093582fd-614073269
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=TEST-4577d7f9-d350-415a-9ea8-24cba50406e5

# URL da aplicação (IMPORTANTE!)
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### **Passo 3: Reiniciar o Servidor**

Após adicionar/verificar a variável, **REINICIE o servidor**:

1. Pare o servidor (Ctrl + C no terminal)
2. Inicie novamente:
   ```bash
   npm run dev
   ```

### **Passo 4: Testar Novamente**

1. Recarregue a página (F5)
2. Clique em "Ir para Pagamento"
3. Deve funcionar! 🎉

## 🔍 Como Verificar se Funcionou

No terminal do servidor, você deve ver:

```
🌐 URL da aplicação: http://localhost:3000
📋 Preferência a ser criada: {
  "items": [...],
  "payer": {...},
  "back_urls": {
    "success": "http://localhost:3000/dashboard/orders?status=success&order_id=...",
    "failure": "http://localhost:3000/dashboard/orders?status=failure&order_id=...",
    "pending": "http://localhost:3000/dashboard/orders?status=pending&order_id=..."
  },
  ...
}
```

## ⚠️ Importante

- A variável **DEVE** começar com `NEXT_PUBLIC_` para ser acessível no frontend
- Sempre **REINICIE** o servidor após alterar `.env.local`
- Use `http://localhost:3000` para desenvolvimento local
- Em produção, use a URL real do seu site (ex: `https://seusite.com`)

## 📝 Checklist

- [ ] Adicionei `NEXT_PUBLIC_APP_URL=http://localhost:3000` no `.env.local`
- [ ] Reiniciei o servidor (`npm run dev`)
- [ ] Recarreguei a página (F5)
- [ ] Testei o checkout novamente

## 🎯 Próximos Passos

Após corrigir:
1. Teste o checkout
2. Você será redirecionado para o Mercado Pago
3. Use o cartão de teste:
   ```
   Número: 5031 4332 1540 6351
   CVV: 123
   Validade: 12/25
   Nome: APRO
   ```
4. Após pagar, você será redirecionado de volta para `/dashboard/orders`

## 🚀 Está Quase Lá!

Este era o último erro! Depois de adicionar a variável e reiniciar, o checkout deve funcionar perfeitamente! 🎉
