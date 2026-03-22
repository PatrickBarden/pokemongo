---
description: Fluxo de hardening de segurança e performance do projeto
---

# Fluxo de Hardening — Segurança e Performance

## Fase 1: Segurança Crítica (Concluída ✅)

1. **Fix HMAC bypass** — `lib/mercadopago-server.ts`
   - Rejeita webhooks em produção quando `MERCADOPAGO_WEBHOOK_SECRET` não está configurado
   - Em dev, permite bypass com warning

2. **Proteger rota de teste** — `app/api/test-payment-system/route.ts`
   - Exige autenticação admin em produção
   - Removido vazamento parcial do token do MP

3. **Auth guards em server actions** — `server/actions/orders.ts`, `server/actions/disputes.ts`
   - Criado `lib/auth-guard.ts` com helpers: `requireAuth`, `requireRole`, `requireAdmin`, `requireAdminOrMod`, `requireOwnerOrAdmin`
   - Removido parâmetro `actorId` — agora obtido via sessão do servidor
   - Substituído `supabase` (anon) por `getSupabaseAdminSingleton()` (service role)

4. **Middleware server-side** — `middleware.ts`
   - Adicionada verificação de sessão Supabase para `/dashboard`, `/admin`, `/moderator`
   - `/admin` → apenas role `admin`
   - `/moderator` → role `admin` ou `mod`
   - `/dashboard` → qualquer usuário autenticado
   - Redireciona para `/login?redirect=...` se não autenticado

5. **Verificação de valor no webhook** — `app/api/mercadopago/webhook/route.ts`
   - Compara `transaction_amount` do MP com `total_amount` do pedido
   - Cria notificação admin `critical` se divergência > R$0.01
   - Não bloqueia o fluxo, mas alerta para análise manual

## Fase 2: Performance do Banco (Concluída ✅)

6. **Remover 15 índices duplicados** — Migration: `remove_duplicate_indexes`
   - Tabelas: orders, reviews, order_conversations, order_conversation_messages, order_events, user_notifications, moderator_permissions, mercadopago_notifications

7. **Criar 12 índices para FKs sem índice** — Migration: `add_missing_fk_indexes`
   - Tabelas: complaints, payouts, platform_settings, push_campaigns, push_notification_logs, suggestion_votes, suggestions, wallet_withdrawals

8. **Otimizar 23 RLS policies** — Migration: `optimize_rls_policies_auth_uid`
   - Substituído `auth.uid()` por `(select auth.uid())` para evitar re-avaliação por linha
   - Tabelas: availabilities, cart_items, complaints, conversations, device_tokens, favorites, listings, profiles, push_notification_logs, suggestion_votes, suggestions, user_notifications, users, wishlists

## Fase 3: Qualidade (Concluída ✅)

9. **Fix viewport/themeColor** — `app/layout.tsx` ✅
   - Movido `viewport` e `themeColor` de `metadata` para `export const viewport`

10. **npm audit fix** ✅
    - Corrigido `tar` vulnerability
    - Restam: Next.js (requer upgrade p/ v16, breaking), @typescript-eslint (dev only)

## Fase 4: Auth Guards Completo (Concluída ✅)

11. **Auth guards em `server/actions/chat.ts`** ✅
    - 12 funções protegidas: `sendMessage`, `closeConversation`, `reopenConversation`, `getAllConversations`, `getUserConversations`, `getOrCreateConversation`, `markMessagesAsRead`, `markMessagesAsReadByAdmin`, `getUnreadCount`, `getAdminUnreadCounts`, `submitConversationRating`, `isConversationClosed` (read-only, sem guard)
    - `verifyCallerIdentity()` valida que o userId/senderId corresponde à sessão autenticada
    - Funções admin exigem `requireAdmin()`

12. **Auth guards em todas as server actions** ✅
    - `wallet.ts` — 8 funções protegidas (getWallet, getWalletTransactions, createCreditPurchase, useWalletBalance, requestWithdrawal, getCreditPurchaseHistory, getWithdrawalHistory)
    - `reviews.ts` — 2 funções protegidas (createReview, canReviewOrder)
    - `notifications.ts` — 6 funções protegidas (getUserNotifications, getUnreadNotificationCount, getUnreadMessageCount, markAllNotificationsAsRead, deleteReadNotifications, getNotificationSummary)
    - `favorites.ts` — 7 funções protegidas (addToFavorites, removeFromFavorites, isFavorite, getUserFavorites, addToWishlist, getUserWishlist, getMatchingListingsForWishlist)
    - `suggestions.ts` — 8 funções protegidas (createSuggestion, getUserSuggestions, getAllSuggestions, respondToSuggestion, voteSuggestion, updateSuggestionStatus, deleteSuggestion, getSuggestionStats)
    - `moderators.ts` — 8 funções protegidas (listModerators, findUserByEmail, createModerator, updateModeratorPermissions, removeModerator, getMyPermissions, listModeratorActions, logModeratorAction)
    - `seller-dashboard.ts` — 7 funções protegidas (getSellerStats, getMonthlySales, getTopListings, getRecentSales, getPendingSellerOrders, getCategoryPerformance)

13. **Remover console.logs sensíveis** ✅
    - `auth.ts` — removidos logs que expunham userId, email, displayName
    - `api/auth/google/route.ts` — removidos logs de origin/redirect URL
    - `api/mercadopago/create-preference/route.ts` — removidos logs de cálculo financeiro
    - `api/mercadopago/credit-webhook/route.ts` — removido log de userId e créditos

14. **Build verificado** ✅ — Compilação sem erros após todas as mudanças

## Fase 5: Pendente (Próximos Passos)

15. **Eliminar `as any` casts** (~248 ocorrências em 62 arquivos)
    - Gerar tipos corretos via `supabase gen types`
    - Substituir casts progressivamente

16. **Upgrade Next.js 14 → 15+**
    - Resolver breaking changes
    - Corrigir vulnerabilidades de segurança do Next.js

17. **Adicionar testes automatizados**
    - Unit tests para auth-guard, security utils
    - Integration tests para webhook processing

18. **Logger estruturado**
    - Substituir console.error restantes por logger com níveis e contexto
