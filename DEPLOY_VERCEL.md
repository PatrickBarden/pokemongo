# 🚀 Deploy no Vercel - Passo a Passo

## ✅ Pré-requisitos
- Conta no GitHub (para conectar o repositório)
- OU Vercel CLI instalado

---

## 🎯 OPÇÃO 1: Deploy via GitHub (RECOMENDADO - Mais Fácil)

### **Passo 1: Criar repositório no GitHub**

1. Acesse: https://github.com/new
2. Nome: `pokemongo-marketplace`
3. Deixe público ou privado
4. Clique em "Create repository"

### **Passo 2: Fazer push do código**

No terminal do seu projeto:

```bash
git init
git add .
git commit -m "Initial commit - Pokemon GO Marketplace"
git branch -M main
git remote add origin https://github.com/SEU_USUARIO/pokemongo-marketplace.git
git push -u origin main
```

### **Passo 3: Deploy no Vercel**

1. Acesse: https://vercel.com/signup
2. Faça login com GitHub
3. Clique em "Add New..." > "Project"
4. Selecione o repositório `pokemongo-marketplace`
5. Clique em "Import"

### **Passo 4: Configurar Variáveis de Ambiente**

Na página de configuração do projeto, adicione:

```
NEXT_PUBLIC_SUPABASE_URL=https://dzpgumyavckfqznxgckn.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6cGd1bXlhdmNrZnF6bnhnY2tuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjI0NTkyOTUsImV4cCI6MjA3ODAzNTI5NX0.H_5xMJMpXajN2Jh94VEL4vNqPjZQMp-upuOC5S6yYVk
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImR6cGd1bXlhdmNrZnF6bnhnY2tuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MjQ1OTI5NSwiZXhwIjoyMDc4MDM1Mjk1fQ.05HkWVi2jrj86fnoeEZpOSBzMEcInBwJvouIq4PxBKI
MERCADO_PAGO_ACCESS_TOKEN=TEST-7552711626997536-111115-145ebfef83a9445abf40ba89093582fd-614073269
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=TEST-4577d7f9-d350-415a-9ea8-24cba50406e5
NEXT_PUBLIC_APP_URL=https://seu-app.vercel.app
```

**⚠️ IMPORTANTE:** Deixe `NEXT_PUBLIC_APP_URL` vazio por enquanto!

### **Passo 5: Deploy**

1. Clique em "Deploy"
2. Aguarde o build (2-3 minutos)
3. Copie a URL do deploy (ex: `https://pokemongo-marketplace.vercel.app`)

### **Passo 6: Atualizar NEXT_PUBLIC_APP_URL**

1. Vá em "Settings" > "Environment Variables"
2. Edite `NEXT_PUBLIC_APP_URL`
3. Cole a URL do seu app: `https://pokemongo-marketplace.vercel.app`
4. Clique em "Save"
5. Vá em "Deployments" > Clique nos 3 pontinhos > "Redeploy"

### **Passo 7: Testar!**

1. Acesse sua URL: `https://pokemongo-marketplace.vercel.app`
2. Faça login
3. Vá para o checkout
4. **AGORA VAI FUNCIONAR!** 🎉

---

## 🎯 OPÇÃO 2: Deploy via CLI

### **Passo 1: Instalar Vercel CLI**

```bash
npm install -g vercel
```

### **Passo 2: Login**

```bash
vercel login
```

### **Passo 3: Deploy**

```bash
vercel
```

Siga as instruções:
- Set up and deploy? **Y**
- Which scope? **Sua conta**
- Link to existing project? **N**
- Project name? **pokemongo-marketplace**
- Directory? **./** (Enter)
- Override settings? **N**

### **Passo 4: Adicionar Variáveis de Ambiente**

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
# Cole o valor e pressione Enter
# Repita para todas as variáveis
```

Ou adicione via dashboard: https://vercel.com/dashboard

### **Passo 5: Deploy em Produção**

```bash
vercel --prod
```

---

## 📋 Checklist Final

- [ ] Código no GitHub
- [ ] Projeto importado no Vercel
- [ ] Variáveis de ambiente configuradas
- [ ] `NEXT_PUBLIC_APP_URL` atualizado com URL do Vercel
- [ ] Redeploy após atualizar variáveis
- [ ] Testado checkout e pagamento

---

## 🎉 Após Deploy

Seu app estará disponível em:
- **Produção:** `https://pokemongo-marketplace.vercel.app`
- **Preview:** URLs automáticas para cada commit

**O Mercado Pago vai funcionar perfeitamente!** ✅

---

## 🆘 Problemas?

Se der erro no build:
1. Verifique os logs no Vercel
2. Certifique-se de que todas as variáveis estão configuradas
3. Tente fazer build local: `npm run build`

**Boa sorte com o deploy!** 🚀
