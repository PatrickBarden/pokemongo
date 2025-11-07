# ✅ Checklist de Migração para Supabase

Use este checklist para garantir que todos os passos da migração foram executados corretamente.

---

## 📋 Pré-Migração

- [ ] Backup do banco de dados atual (se houver)
- [ ] Conta criada no Supabase
- [ ] Node.js e npm instalados
- [ ] Projeto clonado localmente

---

## 🔧 Configuração do Supabase

- [ ] Novo projeto criado no Supabase
- [ ] Região selecionada (mais próxima dos usuários)
- [ ] Senha do banco de dados anotada em local seguro
- [ ] Projeto totalmente provisionado (aguardar ~2 minutos)

---

## 🔑 Credenciais

- [ ] `NEXT_PUBLIC_SUPABASE_URL` copiada
- [ ] `NEXT_PUBLIC_SUPABASE_ANON_KEY` copiada
- [ ] `SUPABASE_SERVICE_ROLE_KEY` copiada
- [ ] Arquivo `.env.local` criado
- [ ] Variáveis de ambiente preenchidas
- [ ] `.env.local` adicionado ao `.gitignore`

---

## 🗄️ Migração do Banco de Dados

- [ ] Arquivo `00_complete_schema.sql` aberto
- [ ] SQL Editor do Supabase acessado
- [ ] Script SQL colado no editor
- [ ] Script executado com sucesso (sem erros)
- [ ] Queries de validação executadas (`01_validation_queries.sql`)

### Validações Específicas

- [ ] 11 tabelas criadas
- [ ] Políticas RLS criadas (32+ políticas)
- [ ] Índices criados (13+ índices)
- [ ] Foreign keys criadas (15+ FKs)
- [ ] Trigger `update_orders_updated_at` criado
- [ ] Extensões `uuid-ossp` e `pgcrypto` habilitadas

---

## 👤 Usuário Administrador

Escolha UMA das opções:

### Opção A: Via Script
- [ ] Script `scripts/create-admin.ts` executado
- [ ] Mensagem de sucesso exibida
- [ ] Usuário admin criado com role 'admin'

### Opção B: Via Dashboard
- [ ] Usuário criado no Authentication > Users
- [ ] Email: `admin@admin.com`
- [ ] Password: `123456`
- [ ] Auto Confirm marcado
- [ ] Role atualizado para 'admin' via SQL

### Opção C: Via Signup
- [ ] Página `/signup` acessada
- [ ] Cadastro com email `admin@admin.com`
- [ ] Role automaticamente definido como 'admin'

### Validação do Admin
- [ ] Query de verificação executada
- [ ] Admin existe na tabela `users`
- [ ] Role está definido como 'admin'

---

## 🚀 Aplicação

- [ ] Dependências instaladas (`npm install`)
- [ ] Servidor de desenvolvimento iniciado (`npm run dev`)
- [ ] Aplicação acessível em http://localhost:3000
- [ ] Sem erros no console do navegador
- [ ] Sem erros no terminal

---

## 🔐 Testes de Autenticação

- [ ] Login com admin funciona
  - Email: `admin@admin.com`
  - Senha: `123456`
- [ ] Redirecionamento para `/admin` funciona
- [ ] Dashboard admin carrega corretamente
- [ ] Logout funciona
- [ ] Criar novo usuário via `/signup` funciona
- [ ] Login com usuário comum funciona
- [ ] Redirecionamento para `/dashboard` funciona

---

## 🎯 Testes de Funcionalidades

### Dashboard Usuário (`/dashboard`)
- [ ] Página carrega sem erros
- [ ] Estatísticas são exibidas
- [ ] Cards de métricas aparecem
- [ ] Seção de ordens recentes aparece

### Dashboard Admin (`/admin`)
- [ ] Página carrega sem erros
- [ ] Métricas da plataforma aparecem
- [ ] Ordens abertas contabilizadas
- [ ] Taxa de conversão calculada
- [ ] Tempo médio exibido

### Marketplace (`/dashboard/market`)
- [ ] Página carrega sem erros
- [ ] Lista de produtos aparece (vazia inicialmente)
- [ ] Filtros funcionam
- [ ] Layout responsivo funciona

---

## 🔍 Testes de Segurança (RLS)

### Como Usuário Comum
- [ ] Vejo apenas meus dados em `users`
- [ ] Vejo apenas meu perfil em `profiles`
- [ ] Vejo apenas meus pedidos em `orders`
- [ ] Vejo produtos ativos em `listings`
- [ ] NÃO vejo dados de outros usuários

### Como Admin
- [ ] Vejo todos os usuários
- [ ] Vejo todos os pedidos
- [ ] Vejo todas as disputas
- [ ] Posso atualizar pedidos
- [ ] Posso criar payouts

### Testes SQL (via SQL Editor)
- [ ] SELECT em `users` retorna apenas dados permitidos
- [ ] INSERT em `users` falha (sem service_role)
- [ ] UPDATE em `orders` falha para usuário comum
- [ ] SELECT em `payment_notifications` falha para usuário comum

---

## 📊 Verificações Finais

### Performance
- [ ] Queries rápidas (< 100ms para dashboards)
- [ ] Índices funcionando corretamente
- [ ] Sem N+1 queries

### Dados
- [ ] Tipos TypeScript em `database.types.ts` corretos
- [ ] Relacionamentos funcionando
- [ ] Cascades configurados corretamente

### Logs
- [ ] Sem erros no Supabase Logs
- [ ] Sem warnings críticos
- [ ] Queries sendo executadas corretamente

---

## 🔒 Segurança em Produção

- [ ] Senha do admin alterada
- [ ] `SUPABASE_SERVICE_ROLE_KEY` nunca exposta no frontend
- [ ] Variáveis de ambiente configuradas no host
- [ ] RLS habilitado em todas as tabelas
- [ ] Políticas testadas e validadas
- [ ] Rate limiting configurado (se necessário)
- [ ] Backups automáticos configurados

---

## 📝 Documentação

- [ ] README.md atualizado
- [ ] DATABASE_ANALYSIS.md revisado
- [ ] MIGRATION_GUIDE.md seguido
- [ ] Credenciais documentadas (em local seguro)
- [ ] Diagrama ER criado (opcional)

---

## 🚀 Deploy (Opcional)

- [ ] Código commitado no Git
- [ ] Repositório no GitHub/GitLab
- [ ] Plataforma de deploy escolhida (Vercel, Netlify, etc.)
- [ ] Variáveis de ambiente configuradas no deploy
- [ ] Build executado com sucesso
- [ ] Deploy realizado
- [ ] Aplicação acessível via URL pública
- [ ] Testes em produção realizados

---

## 📞 Pós-Migração

- [ ] Equipe notificada sobre nova URL/credenciais
- [ ] Monitoramento configurado
- [ ] Alertas configurados (opcional)
- [ ] Documentação compartilhada
- [ ] Treinamento realizado (se necessário)

---

## ⚠️ Troubleshooting

Se encontrar problemas, consulte:

1. **[MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)** - Seção Troubleshooting
2. **Logs do Supabase** - Database > Logs
3. **Console do navegador** - F12 > Console
4. **Terminal** - Erros do Next.js

### Problemas Comuns

- [ ] ✅ Erro "Missing environment variable" → Verificar `.env.local`
- [ ] ✅ Erro "Invalid API key" → Verificar chaves do Supabase
- [ ] ✅ Erro "relation does not exist" → Re-executar migração
- [ ] ✅ Erro "permission denied" → Verificar políticas RLS
- [ ] ✅ Admin sem permissões → Verificar role na tabela users

---

## ✨ Conclusão

Quando todos os itens estiverem marcados:

🎉 **Parabéns! Migração concluída com sucesso!**

Seu banco de dados está:
- ✅ Totalmente migrado
- ✅ Seguro com RLS
- ✅ Otimizado com índices
- ✅ Pronto para produção

**Próximos passos:**
1. Desenvolver novas funcionalidades
2. Adicionar testes automatizados
3. Implementar CI/CD
4. Monitorar performance
5. Coletar feedback dos usuários

---

**Data da Migração:** ___/___/______

**Responsável:** _____________________

**Versão do Schema:** 00_complete_schema.sql

**Ambiente:** [ ] Desenvolvimento [ ] Staging [ ] Produção
