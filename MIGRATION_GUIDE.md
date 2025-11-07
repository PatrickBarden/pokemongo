# 🚀 Guia de Migração para Novo Projeto Supabase

Este guia detalha o processo completo para migrar o banco de dados para um novo projeto Supabase.

---

## 📋 Pré-requisitos

- [ ] Conta no Supabase (https://app.supabase.com)
- [ ] Node.js instalado
- [ ] Supabase CLI instalado (opcional, mas recomendado)

---

## 🔧 Passo 1: Criar Novo Projeto no Supabase

1. Acesse https://app.supabase.com
2. Clique em **"New Project"**
3. Preencha os dados:
   - **Name**: `pokemongo-marketplace` (ou nome de sua preferência)
   - **Database Password**: Escolha uma senha forte (guarde-a!)
   - **Region**: Escolha a região mais próxima dos seus usuários
   - **Pricing Plan**: Free (ou pago conforme necessidade)
4. Clique em **"Create new project"**
5. Aguarde alguns minutos até o projeto ser provisionado

---

## 🔑 Passo 2: Obter Credenciais do Projeto

1. No painel do Supabase, vá em **Settings** > **API**
2. Copie as seguintes informações:
   - **Project URL** (ex: `https://xxxxx.supabase.co`)
   - **anon/public key** (chave pública)
   - **service_role key** (chave privada - NUNCA exponha no frontend!)

---

## ⚙️ Passo 3: Configurar Variáveis de Ambiente

1. Na raiz do projeto, copie o arquivo `.env.example`:
   ```bash
   cp .env.example .env.local
   ```

2. Edite o arquivo `.env.local` e preencha com suas credenciais:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-chave-anonima-aqui
   SUPABASE_SERVICE_ROLE_KEY=sua-chave-service-role-aqui
   ```

3. **IMPORTANTE**: Nunca commite o arquivo `.env.local` no Git!

---

## 🗄️ Passo 4: Executar Migração do Banco de Dados

### Opção A: Via SQL Editor do Supabase (Recomendado)

1. No painel do Supabase, vá em **SQL Editor**
2. Clique em **"New query"**
3. Abra o arquivo `supabase/migrations/00_complete_schema.sql`
4. Copie todo o conteúdo do arquivo
5. Cole no SQL Editor do Supabase
6. Clique em **"Run"** (ou pressione Ctrl+Enter)
7. Aguarde a execução (pode levar alguns segundos)
8. Verifique se não há erros na saída

### Opção B: Via Supabase CLI

1. Instale o Supabase CLI (se ainda não tiver):
   ```bash
   npm install -g supabase
   ```

2. Faça login no Supabase:
   ```bash
   supabase login
   ```

3. Link o projeto local ao projeto remoto:
   ```bash
   supabase link --project-ref seu-project-id
   ```

4. Execute as migrações:
   ```bash
   supabase db push
   ```

---

## 👤 Passo 5: Criar Usuário Administrador

### Opção A: Via Código (Recomendado)

1. Certifique-se de que as variáveis de ambiente estão configuradas
2. Execute o script de criação do admin:
   ```bash
   npx tsx scripts/create-admin.ts
   ```

3. Ou acesse a página `/signup` e crie um usuário com o email `admin@admin.com`

### Opção B: Via Supabase Dashboard

1. No painel do Supabase, vá em **Authentication** > **Users**
2. Clique em **"Add user"** > **"Create new user"**
3. Preencha:
   - **Email**: `admin@admin.com`
   - **Password**: `123456`
   - **Auto Confirm User**: ✅ Marque esta opção
4. Clique em **"Create user"**
5. Após criar, execute no SQL Editor:
   ```sql
   -- Atualizar role para admin
   UPDATE public.users 
   SET role = 'admin' 
   WHERE email = 'admin@admin.com';
   ```

---

## ✅ Passo 6: Verificar a Migração

### 6.1 Verificar Tabelas

No SQL Editor, execute:
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
ORDER BY table_name;
```

Você deve ver 11 tabelas:
- `availabilities`
- `deliveries`
- `disputes`
- `listings`
- `messages`
- `order_events`
- `orders`
- `payment_notifications`
- `payouts`
- `profiles`
- `users`

### 6.2 Verificar Políticas RLS

```sql
SELECT schemaname, tablename, policyname 
FROM pg_policies 
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 6.3 Verificar Usuário Admin

```sql
SELECT id, email, display_name, role 
FROM public.users 
WHERE email = 'admin@admin.com';
```

---

## 🚀 Passo 7: Iniciar a Aplicação

1. Instale as dependências (se ainda não instalou):
   ```bash
   npm install
   ```

2. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```

3. Acesse http://localhost:3000

4. Faça login com as credenciais do admin:
   - **Email**: `admin@admin.com`
   - **Password**: `123456`

5. Você deve ser redirecionado para `/admin` (painel administrativo)

---

## 🔍 Passo 8: Testar Funcionalidades

### Testar Autenticação
- [ ] Login com admin funciona
- [ ] Criar novo usuário via `/signup`
- [ ] Login com usuário comum funciona
- [ ] Logout funciona

### Testar Dashboard
- [ ] Dashboard do usuário (`/dashboard`) carrega
- [ ] Dashboard do admin (`/admin`) carrega
- [ ] Estatísticas são exibidas corretamente

### Testar Marketplace
- [ ] Página de mercado (`/dashboard/market`) carrega
- [ ] Criar novo produto (se implementado)
- [ ] Visualizar produtos

---

## 🐛 Troubleshooting

### Erro: "Missing environment variable"
- Verifique se o arquivo `.env.local` existe e está preenchido corretamente
- Reinicie o servidor de desenvolvimento após criar/editar o `.env.local`

### Erro: "Invalid API key"
- Verifique se copiou as chaves corretas do painel do Supabase
- Certifique-se de que não há espaços extras nas chaves

### Erro: "relation does not exist"
- A migração não foi executada corretamente
- Execute novamente o script SQL no SQL Editor
- Verifique se há erros na saída do SQL Editor

### Erro: "permission denied for table"
- As políticas RLS não foram criadas corretamente
- Execute novamente a migração completa
- Verifique se o usuário está autenticado

### Usuário admin não tem permissões
- Verifique se o role está definido como 'admin':
  ```sql
  SELECT role FROM public.users WHERE email = 'admin@admin.com';
  ```
- Se não estiver, atualize:
  ```sql
  UPDATE public.users SET role = 'admin' WHERE email = 'admin@admin.com';
  ```

---

## 📊 Estrutura do Banco de Dados

### Tabelas Principais

```
users (11 colunas)
├── id (UUID, PK)
├── email (TEXT, UNIQUE)
├── display_name (TEXT)
├── role (TEXT: user|admin|mod)
├── reputation_score (INTEGER)
└── ...

orders (10 colunas)
├── id (UUID, PK)
├── buyer_id (UUID, FK → users)
├── seller_id (UUID, FK → users)
├── listing_id (UUID, FK → listings)
├── status (TEXT: PAYMENT_PENDING|AWAITING_SELLER|...)
└── ...

listings (9 colunas)
├── id (UUID, PK)
├── owner_id (UUID, FK → users)
├── title (TEXT)
├── price_suggested (DECIMAL)
└── ...
```

### Fluxo de Status de Pedidos

```
PAYMENT_PENDING
    ↓
AWAITING_SELLER
    ↓
SELLER_ACCEPTED
    ↓
DELIVERY_SUBMITTED
    ↓
IN_REVIEW
    ↓
COMPLETED
```

---

## 🔒 Segurança

### Políticas RLS Implementadas

✅ **Users**: Usuários veem apenas seus dados (admins veem tudo)
✅ **Orders**: Visível apenas para comprador, vendedor e admins
✅ **Listings**: Produtos ativos visíveis para todos
✅ **Messages**: Mensagens visíveis apenas para participantes do pedido
✅ **Payouts**: Vendedores veem apenas seus pagamentos

### Boas Práticas

- ✅ Nunca exponha `SUPABASE_SERVICE_ROLE_KEY` no frontend
- ✅ Use `service_role` apenas em Server Actions
- ✅ Sempre valide dados no backend
- ✅ Implemente rate limiting em produção
- ✅ Habilite 2FA para admins em produção

---

## 📝 Próximos Passos

Após a migração bem-sucedida:

1. [ ] Alterar senha do admin padrão
2. [ ] Configurar Storage para upload de imagens
3. [ ] Configurar webhooks do Mercado Pago (se aplicável)
4. [ ] Configurar domínio customizado
5. [ ] Configurar backups automáticos
6. [ ] Implementar monitoramento e logs
7. [ ] Configurar CI/CD

---

## 📞 Suporte

Se encontrar problemas durante a migração:

1. Verifique os logs do Supabase (Database > Logs)
2. Consulte a documentação oficial: https://supabase.com/docs
3. Verifique o arquivo `database.types.ts` para tipos TypeScript atualizados

---

## ✨ Conclusão

Após seguir todos os passos, seu banco de dados estará completamente migrado e pronto para uso!

**Credenciais padrão:**
- Admin: `admin@admin.com` / `123456`

**Lembre-se de alterar essas credenciais em produção!**
