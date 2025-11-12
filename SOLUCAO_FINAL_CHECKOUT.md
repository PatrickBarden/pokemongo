# 🎯 SOLUÇÃO FINAL - Checkout Mercado Pago

## ❌ Erro Atual:
```
Erro do Mercado Pago: auto_return invalid. back_url.success must be defined
```

## ✅ SOLUÇÃO DEFINITIVA

### **Passo 1: Editar `.env.local`**

Abra o arquivo `.env.local` na raiz do projeto e certifique-se de que está EXATAMENTE assim:

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=https://dzpgumyavckfqznxgckn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-anon-key-aqui
SUPABASE_SERVICE_ROLE_KEY=sua-service-role-key-aqui

# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=TEST-7552711626997536-111115-145ebfef83a9445abf40ba89093582fd-614073269
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=TEST-4577d7f9-d350-415a-9ea8-24cba50406e5
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

**⚠️ ATENÇÃO:**
- Não pode ter espaços antes ou depois do `=`
- Deve ser exatamente `NEXT_PUBLIC_APP_URL` (com underscores)
- Não pode ter aspas ao redor da URL

### **Passo 2: Parar o Servidor**

No terminal, pressione **Ctrl + C** para parar o servidor.

### **Passo 3: Limpar Cache (Opcional mas Recomendado)**

```bash
rm -rf .next
# ou no Windows:
rmdir /s /q .next
```

### **Passo 4: Reinstalar Dependências (Opcional)**

```bash
npm install
```

### **Passo 5: Iniciar o Servidor Novamente**

```bash
npm run dev
```

### **Passo 6: Verificar Logs**

Quando você clicar em "Ir para Pagamento", deve ver no terminal:

```
🌐 URL da aplicação: http://localhost:3000
🔍 NEXT_PUBLIC_APP_URL: http://localhost:3000
🔍 APP_URL: undefined
📋 Preferência a ser criada: {
  "back_urls": {
    "success": "http://localhost:3000/dashboard/orders?status=success&order_id=...",
    "failure": "http://localhost:3000/dashboard/orders?status=failure&order_id=...",
    "pending": "http://localhost:3000/dashboard/orders?status=pending&order_id=..."
  }
}
```

### **Passo 7: Testar**

1. Recarregue a página (F5)
2. Vá para o checkout
3. Clique em "Ir para Pagamento"
4. Deve redirecionar para o Mercado Pago! 🎉

## 🔍 Se Ainda Não Funcionar

### Verificar se `.env.local` existe:

```bash
# No terminal do projeto
ls -la .env.local
# ou no Windows:
dir .env.local
```

Se não existir, crie o arquivo manualmente.

### Verificar conteúdo do `.env.local`:

```bash
# No terminal
cat .env.local
# ou no Windows:
type .env.local
```

### Copiar arquivo de exemplo:

Se você não tem o `.env.local`, copie do exemplo:

```bash
cp .env.local.example .env.local
# ou no Windows:
copy .env.local.example .env.local
```

Depois edite e adicione suas credenciais reais do Supabase.

## 📋 Checklist Final

- [ ] Arquivo `.env.local` existe na raiz do projeto
- [ ] Variável `NEXT_PUBLIC_APP_URL=http://localhost:3000` está presente
- [ ] Não há espaços extras ou aspas
- [ ] Servidor foi reiniciado após editar `.env.local`
- [ ] Cache foi limpo (`.next` deletado)
- [ ] Página foi recarregada (F5)

## 🎯 Após Funcionar

Quando o checkout funcionar, você será redirecionado para o Mercado Pago.

**Use este cartão de teste:**

```
Número: 5031 4332 1540 6351
CVV: 123
Validade: 12/25
Nome: APRO
```

Após pagar, você será redirecionado de volta para `/dashboard/orders`.

## 🆘 Última Opção

Se NADA funcionar, me envie:

1. Conteúdo completo do `.env.local` (sem as keys sensíveis)
2. Logs completos do terminal quando clicar em "Ir para Pagamento"
3. Logs completos do console do browser (F12 > Console)

## 💡 Dica

O problema é 100% relacionado à variável de ambiente `NEXT_PUBLIC_APP_URL` não estar sendo lida. Certifique-se de que:

1. O arquivo existe
2. A variável está escrita corretamente
3. O servidor foi reiniciado

**Boa sorte! Você está a um passo de finalizar! 🚀**
