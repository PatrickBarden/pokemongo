# 🔍 AUDITORIA PROFISSIONAL - Pokémon GO Marketplace

**Projeto:** TGP Pokémon GO - Marketplace de Pokémon  
**Data:** 22/03/2026  
**Auditor:** Cascade AI  
**Escopo:** Full-stack (Frontend, Backend, Banco de Dados, Integrações, Mobile)

---

## 📊 RESUMO EXECUTIVO

| Área | Score | Status |
|------|-------|--------|
| Banco de Dados (Supabase) | 6/10 | ⚠️ Melhorias necessárias |
| Infraestrutura (Vercel) | 8/10 | ✅ Bom |
| Backend (Server Actions/API) | 5/10 | 🔴 Crítico |
| Frontend (UI/UX) | 7/10 | ✅ Bom |
| Segurança | 4/10 | 🔴 Crítico |
| Pagamentos (Mercado Pago) | 7/10 | ⚠️ Atenção |
| Mobile (Capacitor) | 6/10 | ⚠️ Melhorias necessárias |
| Qualidade de Código | 5/10 | 🔴 Atenção |

**Score Geral: 6.0/10** — Projeto funcional mas com problemas críticos de segurança e arquitetura que devem ser resolvidos antes de produção.

---

## 🔴 1. PROBLEMAS CRÍTICOS (Resolver Imediatamente)

### 1.1 Server Actions SEM autenticação/autorização
**Severidade:** 🔴 CRÍTICA  
**Arquivos afetados:**
- `server/actions/orders.ts` — Usa `supabase` (anon key) em vez de admin client, e **não valida quem está chamando**
- `server/actions/disputes.ts` — Mesma vulnerabilidade

**Problema:** As server actions `requestReview()`, `completeOrder()`, `cancelAndRefund()`, `openDispute()` recebem `actorId` como parâmetro mas **nunca verificam se o chamador é realmente esse usuário**. Qualquer usuário pode chamar essas actions passando qualquer ID.

**Correção necessária:**
```typescript
// ANTES (vulnerável):
export async function completeOrder(orderId: string, payoutData: {...}, actorId: string) {
  // Confia cegamente no actorId fornecido
}

// DEPOIS (seguro):
export async function completeOrder(orderId: string, payoutData: {...}) {
  const supabase = createServerComponentClient({ cookies });
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error('Não autorizado');
  
  // Verificar se user é admin
  const { data: userData } = await supabase.from('users').select('role').eq('id', user.id).single();
  if (userData?.role !== 'admin') throw new Error('Sem permissão');
  
  // Usar user.id como actorId em vez de receber como parâmetro
}
```

### 1.2 Rota de teste exposta em produção
**Severidade:** 🔴 CRÍTICA  
**Arquivo:** `app/api/test-payment-system/route.ts`

**Problema:** Essa rota GET é acessível publicamente sem autenticação. Ela:
- Expõe parte do token do Mercado Pago (`token.substring(0, 15)...`)
- Cria preferências de pagamento de teste
- Cria notificações no banco de dados
- Expõe informações internas do sistema (contagens de tabelas, variáveis de ambiente)
- Pode ser usada para gerar lixo no banco

**Correção:** Remover essa rota ou protegê-la com autenticação admin + flag de ambiente.

### 1.3 Webhook HMAC bypass em produção
**Severidade:** 🔴 CRÍTICA  
**Arquivo:** `lib/mercadopago-server.ts`

**Problema:** Se `MERCADOPAGO_WEBHOOK_SECRET` não estiver configurado, a verificação retorna `true` (permitindo qualquer request):
```typescript
if (!secret) {
  console.warn('⚠️ MERCADOPAGO_WEBHOOK_SECRET não configurado.');
  return true; // ← PERIGOSO: aceita qualquer webhook em produção!
}
```

**Correção:** Em produção, deve retornar `false` quando o secret não está configurado.

### 1.4 Auth guards apenas client-side
**Severidade:** 🔴 CRÍTICA  
**Arquivos:** `app/admin/layout.tsx`, `app/dashboard/layout.tsx`, `app/moderator/layout.tsx`

**Problema:** Todos os layouts fazem verificação de autenticação/autorização no **client-side**. Isso significa:
- O código HTML/JS da página admin é enviado ao navegador ANTES da verificação
- Um atacante pode ver o código-fonte das páginas admin
- Server components dentro desses layouts executam sem qualquer verificação server-side
- A verificação pode ser facilmente contornada

**Correção:** Implementar middleware server-side ou usar `cookies()` em server components para verificar auth antes de renderizar.

### 1.5 `as any` massivo (248 ocorrências em 62 arquivos)
**Severidade:** 🔴 ALTA  
**Impacto:** Perda total de type safety do TypeScript

**Problema:** O código usa `as any` extensivamente para contornar erros de tipagem do Supabase. Isso esconde bugs reais e elimina a principal vantagem do TypeScript.

**Principais ofensores:**
- `server/actions/chat.ts` — 37 ocorrências
- `app/dashboard/profile/page.tsx` — 18 ocorrências  
- `server/actions/orders.ts` — 16 ocorrências

**Correção:** Regenerar tipos com `supabase gen types typescript` e usar tipagem adequada.

---

## ⚠️ 2. PROBLEMAS DE PERFORMANCE (Banco de Dados)

### 2.1 Índices duplicados (16 pares)
**Severidade:** ⚠️ MÉDIA  
**Impacto:** Desperdício de storage e overhead em escrita

Tabelas com índices duplicados que devem ser removidos:
| Tabela | Índices duplicados |
|--------|-------------------|
| `orders` | `idx_orders_buyer` = `idx_orders_buyer_id`, `idx_orders_seller` = `idx_orders_seller_id`, `idx_orders_created` = `idx_orders_created_at` |
| `reviews` | `idx_reviews_order` = `idx_reviews_order_id`, `idx_reviews_reviewed` = `idx_reviews_reviewed_id`, `idx_reviews_reviewer` = `idx_reviews_reviewer_id` |
| `order_conversations` | `idx_order_conversations_buyer` = `idx_order_conversations_buyer_id`, `idx_order_conversations_order` = `idx_order_conversations_order_id`, `idx_order_conversations_seller` = `idx_order_conversations_seller_id` |
| `order_conversation_messages` | `idx_order_conv_messages_conv` = `idx_order_conversation_messages_conversation_id`, `idx_order_conv_messages_sender` = `idx_order_conversation_messages_sender_id` |
| `order_events` | `idx_order_events_order` = `idx_order_events_order_id` |
| `user_notifications` | `idx_user_notifications_user` = `idx_user_notifications_user_id` |
| `moderator_permissions` | `idx_mod_perm_user` = `idx_moderator_permissions_user_id` |
| `mercadopago_notifications` | `idx_mercadopago_notifications_order_id` = `idx_mp_notifications_order_id` |

### 2.2 Foreign keys sem índice (12 ocorrências)
**Severidade:** ⚠️ MÉDIA  

| Tabela | Foreign Key sem índice |
|--------|----------------------|
| `complaints` | `complaints_listing_id_fkey`, `complaints_order_id_fkey`, `complaints_resolved_by_fkey` |
| `payouts` | `payouts_order_id_fkey`, `payouts_seller_id_fkey` |
| `platform_settings` | `platform_settings_updated_by_fkey` |
| `push_campaigns` | `push_campaigns_created_by_fkey` |
| `push_notification_logs` | `push_notification_logs_device_token_id_fkey` |
| `suggestion_votes` | `suggestion_votes_user_id_fkey` |
| `suggestions` | `suggestions_responded_by_fkey` |
| `wallet_withdrawals` | `wallet_withdrawals_processed_by_fkey`, `wallet_withdrawals_wallet_id_fkey` |

### 2.3 RLS policies com re-avaliação desnecessária (auth_rls_initplan)
**Severidade:** ⚠️ MÉDIA  
**Impacto:** Degradação de performance em queries com muitas linhas

**Problema:** Diversas RLS policies usam `auth.uid()` diretamente em vez de `(select auth.uid())`, causando re-avaliação para cada linha.

**Correção SQL:**
```sql
-- ANTES (lento):
CREATE POLICY "Users can update own data" ON users
  USING (auth.uid() = id);

-- DEPOIS (otimizado):
CREATE POLICY "Users can update own data" ON users  
  USING ((select auth.uid()) = id);
```

---

## ⚠️ 3. PROBLEMAS DE SEGURANÇA

### 3.1 Leaked Password Protection desabilitada
**Severidade:** ⚠️ MÉDIA  
**Fonte:** Supabase Security Advisor

O Supabase Auth tem um recurso que verifica senhas contra o banco do HaveIBeenPwned. Está desabilitado.

**Correção:** Habilitar no Supabase Dashboard → Auth → Settings → Password Protection.

### 3.2 console.log extensivo em produção (441 ocorrências em 86 arquivos)
**Severidade:** ⚠️ MÉDIA  

**Principais ofensores:**
- `app/auth/callback/page.tsx` — 27 console.logs
- `scripts/create-admin.ts` — 27
- `hooks/use-deep-links.ts` — 24
- `app/dashboard/layout.tsx` — 10 (inclui logs de dados sensíveis de autenticação)

**Problema:** Logs de debug em produção podem expor informações sensíveis e poluir os logs.

**Correção:** Criar sistema de logging com níveis (já existe `secureLog` em `lib/security.ts` mas não é usado).

### 3.3 Credenciais padrão documentadas no README
**Severidade:** ⚠️ MÉDIA  

O README documenta `admin@admin.com / 123456` como credenciais padrão. Em produção, essas credenciais devem ser alteradas e removidas da documentação.

### 3.4 Repositório GitHub público
**Severidade:** ⚠️ ALTA  

O repositório `PatrickBarden/pokemongo` está configurado como **público** (visível nos metadados do Vercel: `githubRepoVisibility: "public"`). Isso significa que todo o código-fonte está acessível publicamente.

**Correção:** Tornar o repositório privado no GitHub, especialmente considerando que o projeto lida com transações financeiras.

---

## 📦 4. INFRAESTRUTURA (Vercel)

### 4.1 Status geral
- **Projeto ativo:** `pokemongo-app` (prj_gn4qrlNsInxr8gdkO1v8x0o3V8O5)
- **Último deploy:** READY ✅ (commit: "Atualização: integração de meio de pagamento")
- **Histórico:** 16 deployments, 5 com ERROR nos primeiros deploys (corrigidos)
- **Runtime logs (24h):** Nenhum erro de runtime ✅

### 4.2 Build warnings
- **7 vulnerabilidades npm** (1 moderate, 6 high) — Executar `npm audit fix`
- **Metadata viewport/themeColor** — Mover para `viewport` export separado conforme Next.js 14
- **Tailwind class ambígua** — `ease-[cubic-bezier(0.32,0.72,0,1)]`
- **Linting desabilitado** no build — Habilitar para capturar erros

### 4.3 Projeto duplicado no Vercel
Existem dois projetos: `pokemongo` (prj_N9nPKsk3) e `pokemongo-app` (prj_gn4qrlNs). O primeiro parece ser legado.

**Correção:** Remover o projeto antigo `pokemongo` se não está em uso.

---

## 🎨 5. FRONTEND

### 5.1 Pontos positivos
- ✅ Design consistente com TailwindCSS + shadcn/ui
- ✅ Tema dark/light implementado
- ✅ Layout responsivo com bottom nav mobile
- ✅ Animações suaves com framer-motion
- ✅ Sistema de busca com autocomplete
- ✅ FAB para criação rápida de anúncios

### 5.2 Melhorias necessárias
- **Dashboard faz 6+ queries client-side** (`app/dashboard/page.tsx`) — Migrar para server component ou usar React Query com cache
- **Componentes de layout muito grandes** — `app/dashboard/layout.tsx` tem 758 linhas
- **Estado de autenticação com retry manual** — Implementar retry com exponential backoff
- **Missing `useCallback` em handlers** — Funções como `checkUser`, `loadProfile` deveriam usar `useCallback`
- **Sem Error Boundaries** — Erros em componentes derrubam toda a app
- **Sem loading states granulares** — Apenas loading global na verificação de auth

---

## ⚙️ 6. BACKEND

### 6.1 Server Actions — Problemas de arquitetura

| Arquivo | Client usado | Problema |
|---------|-------------|----------|
| `server/actions/orders.ts` | `supabase` (anon) | Bypassa RLS → vulnerável |
| `server/actions/disputes.ts` | `supabase` (anon) | Sem auth guard |
| `server/actions/listings.ts` | `getSupabaseAdminSingleton()` | OK, mas sem auth guard |
| `server/actions/chat.ts` | Misto | 37 `as any` casts |
| `lib/order-status.ts` | `getSupabaseAdminSingleton()` | Singleton global → OK |

### 6.2 API Routes
- ✅ Webhook Mercado Pago com validação Zod + HMAC (quando configurado)
- ✅ Idempotência implementada no webhook (verifica duplicatas)
- 🔴 Rota de teste exposta sem auth (`/api/test-payment-system`)
- ⚠️ Tratamento de erro inconsistente entre rotas

### 6.3 Supabase Clients — Inconsistência
O projeto tem 3 clients Supabase diferentes usados de forma inconsistente:
- `lib/supabase.ts` — Client genérico com anon key (usado em server actions que precisariam de admin)
- `lib/supabase-client.ts` — Client para browser
- `lib/supabase-admin.ts` — Client admin com service role key (correto para server-side)
- `lib/supabase-server.ts` — Client SSR com cookies

**Padronização necessária:** Server actions devem SEMPRE usar admin client ou server client com cookies.

---

## 💰 7. PAGAMENTOS (Mercado Pago)

### 7.1 Pontos positivos
- ✅ Validação HMAC implementada
- ✅ Idempotência de webhooks (verifica `processed`)
- ✅ Notificações admin, buyer e seller em cada estado
- ✅ Criação automática de conversa após pagamento
- ✅ Schema Zod para validar payload do webhook

### 7.2 Melhorias necessárias
- 🔴 **HMAC bypass quando secret não configurado** (ver seção 1.3)
- ⚠️ **Sem retry em caso de falha** no processamento do webhook
- ⚠️ **Sem dead letter queue** para webhooks falhos
- ⚠️ **Sem verificação de valor** — O webhook atualiza o status sem verificar se `transaction_amount` bate com o valor do pedido
- ⚠️ **Race condition potencial** — Dois webhooks simultâneos para o mesmo pagamento podem causar inconsistência

---

## 📱 8. MOBILE (Capacitor)

### 8.1 Configuração
- ✅ App ID configurado: `com.tgppokemon.app`
- ✅ Plugins configurados: SplashScreen, StatusBar, Keyboard, PushNotifications
- ⚠️ URL de dev aponta para `localhost:3000` — OK para dev, mas deve ser validada
- ⚠️ URL de prod aponta para `https://pokemongo-xi.vercel.app` — Verificar se este é o domínio correto (existe `pokemongo-app` no Vercel)

### 8.2 Deep Links
- ✅ Handler implementado (`hooks/use-deep-links.ts`)
- ⚠️ 24 console.logs no handler de deep links — Remover para produção

---

## 🗄️ 9. BANCO DE DADOS

### 9.1 Schema
- **40 tabelas** no schema `public` com RLS habilitado em todas ✅
- **72 migrations** aplicadas
- **1 Edge Function** (`update-admin-passwords`)
- **Extensões ativas:** pgcrypto, uuid-ossp, pg_stat_statements, pg_graphql, supabase_vault, plpgsql

### 9.2 RLS Coverage
Todas as 40 tabelas têm RLS habilitado com policies (mínimo 1, média ~3). Tabelas com apenas 1 policy podem precisar de revisão:
- `availabilities` — 1 policy
- `platform_fee_tiers` — 1 policy
- `platform_settings` — 1 policy
- `push_campaigns` — 1 policy
- `push_notification_logs` — 1 policy

### 9.3 Migrations "SOGI" órfãs
Há migrations com prefixo `sogi_` (20260109-20260110) que criam e depois revertem tabelas. Isso polui o histórico de migrations sem efeito prático.

---

## 📋 10. PLANO DE AÇÃO PRIORIZADO

### 🔴 Fase 1 — Segurança Crítica (Semana 1)
| # | Ação | Esforço |
|---|------|---------|
| 1 | Adicionar auth guards em TODAS as server actions | Alto |
| 2 | Remover ou proteger `/api/test-payment-system` | Baixo |
| 3 | Fix HMAC bypass — retornar `false` quando secret ausente em produção | Baixo |
| 4 | Tornar repositório GitHub privado | Baixo |
| 5 | Trocar credenciais padrão admin | Baixo |
| 6 | Habilitar Leaked Password Protection no Supabase | Baixo |

### ⚠️ Fase 2 — Performance & Estabilidade (Semana 2)
| # | Ação | Esforço |
|---|------|---------|
| 7 | Remover 16 pares de índices duplicados | Baixo |
| 8 | Criar índices para 12 foreign keys descobertas | Baixo |
| 9 | Otimizar RLS policies com `(select auth.uid())` | Médio |
| 10 | Executar `npm audit fix` para resolver vulnerabilidades | Baixo |
| 11 | Mover auth check dos layouts para middleware/server-side | Alto |
| 12 | Verificar valor do pagamento no webhook | Médio |

### 🔧 Fase 3 — Qualidade de Código (Semana 3-4)
| # | Ação | Esforço |
|---|------|---------|
| 13 | Eliminar `as any` — regenerar tipos Supabase e tipar corretamente | Alto |
| 14 | Padronizar clients Supabase (admin para server, client para browser) | Médio |
| 15 | Remover console.logs de produção ou substituir por `secureLog` | Médio |
| 16 | Mover viewport/themeColor para export separado | Baixo |
| 17 | Implementar Error Boundaries globais | Médio |
| 18 | Quebrar componentes grandes (layout 758 linhas) | Médio |

### 📈 Fase 4 — Otimização Contínua (Mês 2+)
| # | Ação | Esforço |
|---|------|---------|
| 19 | Migrar dashboard para server components com streaming | Alto |
| 20 | Implementar React Query para cache client-side | Médio |
| 21 | Adicionar testes automatizados (API + componentes) | Alto |
| 22 | Implementar dead letter queue para webhooks | Médio |
| 23 | Configurar monitoramento (Sentry ou similar) | Médio |
| 24 | Limpar projeto Vercel legado | Baixo |
| 25 | Habilitar ESLint no build | Baixo |
| 26 | Implementar rate limiting robusto (Redis/Upstash) | Médio |

---

## ✅ PONTOS FORTES DO PROJETO

1. **Schema de banco bem estruturado** — 40 tabelas com relacionamentos corretos, RLS em todas
2. **UI/UX consistente** — Design profissional com shadcn/ui e TailwindCSS
3. **Sistema de notificações completo** — Push, in-app e admin notifications
4. **Webhook idempotente** — Previne processamento duplicado
5. **Validação Zod** — Usado em criação de anúncios e webhook
6. **Sistema de moderação** — Permissões granulares por moderador
7. **Segurança de dados** — Funções de mascaramento e sanitização implementadas
8. **Builds estáveis** — Últimos deploys todos com sucesso
9. **Sistema de reputação** — Níveis de vendedor e reviews
10. **Mobile-first** — Bottom navigation e layouts responsivos

---

*Relatório gerado automaticamente pela auditoria Cascade AI.*  
*Para dúvidas sobre implementação de qualquer item, consulte a equipe de desenvolvimento.*
