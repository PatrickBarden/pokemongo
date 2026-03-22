# 🔒 Auditoria de Segurança - TGP Pokemon (Produção)
> **Data**: 21/03/2026 | **Auditor**: AI Security Assistant | **Versão**: 1.0.0

---

## Resumo Executivo

| Categoria | Itens | Status |
|-----------|-------|--------|
| **Críticos** | 1 | 🔴 Resolver antes do deploy |
| **Altos** | 2 | 🟠 Resolver antes do deploy |
| **Médios** | 3 | 🟡 Resolver antes da loja |
| **OK** | 12 | ✅ Aprovado |

---

## 🔴 CRÍTICO

### 1. Credenciais de Admin Padrão
- **Risco**: Admin usa `admin@admin.com` / `123456`
- **Impacto**: Qualquer pessoa pode acessar o painel administrativo
- **Ação**: Trocar imediatamente via Supabase Dashboard > Authentication > Users

---

## 🟠 ALTO

### 2. Leaked Password Protection Desabilitada
- **Risco**: Usuários podem cadastrar senhas já vazadas em data breaches
- **Impacto**: Contas vulneráveis a credential stuffing
- **Ação**: Habilitar em Supabase Dashboard > Authentication > Settings > Password Protection
- **Status**: ⚠️ Requer ação manual (configuração do Dashboard)

### 3. Webhook Secret do Mercado Pago Ausente
- **Risco**: `MERCADOPAGO_WEBHOOK_SECRET` não configurado — webhooks não são verificados
- **Impacto**: Possível fraude via webhooks falsificados
- **Código Atual**: `lib/mercadopago-server.ts` tem fallback em dev mode (aceita sem verificar)
- **Ação**: Configurar secret no painel do MP e adicionar ao `.env` + Vercel

---

## 🟡 MÉDIO

### 4. Google OAuth Provider
- **Risco**: Login com Google pode não funcionar sem configuração no Supabase
- **Ação**: Configurar provider Google no Supabase Dashboard + Google Cloud Console

### 5. Variáveis de Ambiente na Vercel
- **Risco**: Se env vars não estiverem na Vercel, o app não funciona em produção
- **Ação**: Configurar todas as 8+ env vars no painel da Vercel

### 6. CSP Header Faltando
- **Risco**: `Content-Security-Policy` está no `SECURITY.md` mas não implementado no middleware
- **Impacto**: Baixo (outros headers XSS estão ativos), mas recomendado para compliance
- **Ação**: Considerar adicionar CSP header ao `next.config.js`

---

## ✅ APROVADO

| # | Área | Detalhe |
|---|------|---------|
| 1 | **Headers de Segurança** | HSTS, X-Frame-Options (DENY), X-Content-Type-Options, X-XSS-Protection, Referrer-Policy, Permissions-Policy ✅ |
| 2 | **Rate Limiting** | 100 req/min por IP em `/api/*` routes ✅ |
| 3 | **RLS (Row Level Security)** | 40 tabelas com RLS habilitado ✅ (policy permissiva corrigida) |
| 4 | **Funções do Banco** | `search_path` fixado em `public` para 3 funções ✅ |
| 5 | **HTTPS** | Forçado via HSTS + redirect HTTP→HTTPS ✅ |
| 6 | **Sanitização** | XSS e SQL Injection detection em `lib/security.ts` ✅ |
| 7 | **Validação de Input** | Zod schemas nos webhooks ✅ |
| 8 | **Mascaramento de Dados** | PIX, CPF, email, tokens mascarados em logs ✅ |
| 9 | **Autenticação** | Supabase Auth com JWT + refresh tokens automáticos ✅ |
| 10 | **Política de Privacidade** | Página `/politica-privacidade` implementada ✅ |
| 11 | **Termos de Uso** | Página `/termos-de-uso` implementada ✅ |
| 12 | **`.gitignore`** | `.env`, `.jks`, `google-services.json` excluídos do repositório ✅ |

---

## Supabase Security Advisor — Pós-correções

| Antes | Depois | Status |
|-------|--------|--------|
| 5 warnings | 1 warning | Melhoria de 80% |

**Warning restante**: Leaked Password Protection (requer ação manual no Dashboard)

---

## Recomendações para App Stores

### Google Play Store
1. ✅ Política de Privacidade publicada
2. ✅ Termos de Uso publicados
3. ✅ Ícone personalizado (Pokéball TGP)
4. ✅ Splash screen configurada
5. ✅ Network security config para release
6. ⚠️ Gerar keystore de assinatura
7. ⚠️ Gerar AAB (Android App Bundle) assinado
8. ⚠️ Preencher ficha da Play Store (descrição, screenshots, classificação IARC)

### Apple App Store (futuro)
1. ⚠️ Configurar iOS target
2. ⚠️ Apple Developer Account (US$99/ano)
3. ⚠️ App Review Guidelines compliance

---

## Conclusão

O app tem uma base sólida de segurança. As 3 ações prioritárias são:
1. **Trocar senha do admin** (CRÍTICO)
2. **Habilitar Leaked Password Protection** no Supabase (ALTO)
3. **Configurar MERCADOPAGO_WEBHOOK_SECRET** (ALTO)

Após essas correções, o app está pronto para deploy em produção.
