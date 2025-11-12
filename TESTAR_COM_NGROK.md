# 🌐 Testar Mercado Pago com ngrok

## Problema:
O Mercado Pago sandbox tem problemas de CORS em `localhost`. A solução é expor seu app localmente via túnel público.

## ✅ Solução: ngrok

### **Passo 1: Instalar ngrok**

1. Acesse: https://ngrok.com/download
2. Baixe e instale o ngrok
3. Crie uma conta grátis em https://dashboard.ngrok.com/signup
4. Copie seu token de autenticação

### **Passo 2: Configurar ngrok**

```bash
ngrok config add-authtoken SEU_TOKEN_AQUI
```

### **Passo 3: Iniciar túnel**

Com seu servidor Next.js rodando em `localhost:3000`:

```bash
ngrok http 3000
```

Você verá algo como:
```
Forwarding  https://abc123.ngrok.io -> http://localhost:3000
```

### **Passo 4: Atualizar .env.local**

Copie a URL do ngrok e atualize:

```bash
NEXT_PUBLIC_APP_URL=https://abc123.ngrok.io
```

### **Passo 5: Reiniciar servidor**

```bash
# Parar servidor (Ctrl + C)
npm run dev
```

### **Passo 6: Testar**

1. Acesse: `https://abc123.ngrok.io`
2. Faça login
3. Vá para o checkout
4. **AGORA VAI FUNCIONAR!** 🎉

---

## 🎯 Por que funciona?

- ngrok cria um domínio público (https://abc123.ngrok.io)
- Mercado Pago aceita esse domínio
- CORS não bloqueia mais
- Pagamento processa normalmente

## ⚠️ Importante:

- A URL do ngrok muda toda vez que você reinicia
- Você precisa atualizar `NEXT_PUBLIC_APP_URL` cada vez
- Para URL fixa, use plano pago do ngrok ou faça deploy

---

## 🚀 Alternativa: Deploy em Vercel

Se não quiser usar ngrok, faça deploy:

```bash
npm install -g vercel
vercel login
vercel
```

Depois atualize `NEXT_PUBLIC_APP_URL` com a URL do Vercel.

---

**Escolha uma opção e teste!** 🎯
