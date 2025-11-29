# 🚨 CORREÇÕES PRIORITÁRIAS
## Checklist de Ações Imediatas

Este documento lista as correções que devem ser implementadas **imediatamente** para garantir a segurança e estabilidade do sistema.

---

## 🔴 CRÍTICO - Implementar Agora

### 1. Criar Middleware de Autenticação

**Problema:** Verificação de autenticação é feita apenas no client-side, podendo ser bypassada.

**Solução:** Criar arquivo `middleware.ts` na raiz do projeto:

```typescript
// middleware.ts
import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });
  
  const { data: { session } } = await supabase.auth.getSession();

  const isAdminRoute = req.nextUrl.pathname.startsWith('/admin');
  const isDashboardRoute = req.nextUrl.pathname.startsWith('/dashboard');
  const isAuthRoute = req.nextUrl.pathname === '/login' || req.nextUrl.pathname === '/signup';

  // Redirecionar usuários não autenticados
  if ((isAdminRoute || isDashboardRoute) && !session) {
    return NextResponse.redirect(new URL('/login', req.url));
  }

  // Redirecionar usuários autenticados que tentam acessar login/signup
  if (isAuthRoute && session) {
    return NextResponse.redirect(new URL('/dashboard', req.url));
  }

  // Para rotas admin, verificar role (precisa de query adicional)
  if (isAdminRoute && session) {
    // A verificação de role admin ainda precisa ser feita no layout
    // pois middleware não pode fazer queries complexas facilmente
  }

  return res;
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/dashboard/:path*',
    '/login',
    '/signup',
  ],
};
```

**Dependência necessária:**
```bash
npm install @supabase/auth-helpers-nextjs
```

- [ ] Criar arquivo middleware.ts
- [ ] Instalar dependência
- [ ] Testar rotas protegidas

---

### 2. Remover Admin por Email Hardcoded

**Problema:** Qualquer pessoa que cadastre com `admin@admin.com` se torna admin.

**Arquivo:** `server/actions/auth.ts` (linha 21 e 81)

**Solução:**

```typescript
// Antes (INSEGURO)
const isAdmin = email === 'admin@admin.com';

// Depois (SEGURO)
// Opção 1: Usar variável de ambiente
const ADMIN_EMAILS = (process.env.ADMIN_EMAILS || '').split(',').map(e => e.trim().toLowerCase());
const isAdmin = ADMIN_EMAILS.includes(email.toLowerCase());

// Opção 2: Criar tabela de admins no banco
// Opção 3: Primeiro usuário é admin, depois só via painel
```

**Adicionar ao .env.local:**
```
ADMIN_EMAILS=admin@admin.com,outro-admin@email.com
```

- [ ] Modificar server/actions/auth.ts
- [ ] Adicionar ADMIN_EMAILS ao .env.local
- [ ] Adicionar ADMIN_EMAILS ao .env.production.example (sem valores reais)

---

### 3. Implementar Rate Limiting

**Problema:** APIs vulneráveis a ataques de força bruta e DDoS.

**Solução com Upstash Redis:**

```bash
npm install @upstash/ratelimit @upstash/redis
```

```typescript
// lib/ratelimit.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

export const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'), // 10 requests por 10 segundos
  analytics: true,
});

// Uso em API routes
export async function POST(request: NextRequest) {
  const ip = request.ip ?? '127.0.0.1';
  const { success, limit, reset, remaining } = await ratelimit.limit(ip);
  
  if (!success) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { 
        status: 429,
        headers: {
          'X-RateLimit-Limit': limit.toString(),
          'X-RateLimit-Remaining': remaining.toString(),
          'X-RateLimit-Reset': reset.toString(),
        }
      }
    );
  }
  
  // ... resto do código
}
```

**Variáveis de ambiente necessárias:**
```
UPSTASH_REDIS_REST_URL=https://xxx.upstash.io
UPSTASH_REDIS_REST_TOKEN=xxx
```

- [ ] Criar conta no Upstash
- [ ] Instalar dependências
- [ ] Criar lib/ratelimit.ts
- [ ] Aplicar em /api/mercadopago/create-preference
- [ ] Aplicar em /api/mercadopago/webhook

---

### 4. Validar Webhook do Mercado Pago

**Problema:** Webhook não valida assinatura, qualquer pessoa pode enviar dados falsos.

**Arquivo:** `app/api/mercadopago/webhook/route.ts`

**Solução:**

```typescript
import crypto from 'crypto';

export async function POST(request: NextRequest) {
  try {
    // Validar assinatura do Mercado Pago
    const xSignature = request.headers.get('x-signature');
    const xRequestId = request.headers.get('x-request-id');
    
    if (!xSignature || !xRequestId) {
      console.warn('⚠️ Webhook sem assinatura');
      return NextResponse.json({ error: 'Missing signature' }, { status: 401 });
    }

    const body = await request.text();
    const bodyJson = JSON.parse(body);
    
    // Extrair partes da assinatura
    const parts = xSignature.split(',');
    const ts = parts.find(p => p.startsWith('ts='))?.split('=')[1];
    const v1 = parts.find(p => p.startsWith('v1='))?.split('=')[1];
    
    if (!ts || !v1) {
      return NextResponse.json({ error: 'Invalid signature format' }, { status: 401 });
    }

    // Criar string para validação
    const dataId = bodyJson.data?.id;
    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    
    // Calcular HMAC
    const secret = process.env.MERCADO_PAGO_WEBHOOK_SECRET!;
    const hmac = crypto.createHmac('sha256', secret);
    hmac.update(manifest);
    const calculatedSignature = hmac.digest('hex');
    
    if (calculatedSignature !== v1) {
      console.error('❌ Assinatura inválida');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }

    // ... resto do processamento
  } catch (error) {
    // ...
  }
}
```

**Adicionar ao .env.local:**
```
MERCADO_PAGO_WEBHOOK_SECRET=sua_chave_secreta
```

- [ ] Obter webhook secret no painel do Mercado Pago
- [ ] Adicionar variável de ambiente
- [ ] Implementar validação de assinatura

---

### 5. Limpar Credenciais do .env.example

**Problema:** Arquivo `.env.production.example` contém tokens de teste reais.

**Solução:**

```env
# .env.production.example (CORRIGIDO)

# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://seu-projeto.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui
SUPABASE_SERVICE_ROLE_KEY=sua_service_role_key_aqui

# Mercado Pago
MERCADO_PAGO_ACCESS_TOKEN=seu_access_token_aqui
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=sua_public_key_aqui
MERCADO_PAGO_WEBHOOK_SECRET=seu_webhook_secret_aqui

# URL da Aplicação
NEXT_PUBLIC_APP_URL=https://seu-app.vercel.app

# Admins (emails separados por vírgula)
ADMIN_EMAILS=admin@seudominio.com
```

- [ ] Atualizar .env.production.example
- [ ] Regenerar tokens de teste expostos no Mercado Pago
- [ ] Regenerar chaves do Supabase se necessário

---

## 🟠 ALTO - Implementar Esta Semana

### 6. Remover Console.logs de Produção

**Arquivos afetados:**
- `app/api/mercadopago/create-preference/route.ts` (21 logs)
- `app/dashboard/market/page.tsx` (6 logs)
- `app/api/mercadopago/webhook/route.ts` (3 logs)
- E outros...

**Solução:**

```typescript
// lib/logger.ts
const isDev = process.env.NODE_ENV === 'development';

export const logger = {
  log: (...args: any[]) => isDev && console.log(...args),
  error: (...args: any[]) => console.error(...args), // Erros sempre logam
  warn: (...args: any[]) => isDev && console.warn(...args),
  info: (...args: any[]) => isDev && console.info(...args),
};

// Uso
import { logger } from '@/lib/logger';
logger.log('📥 Recebendo requisição:', data); // Só aparece em dev
```

- [ ] Criar lib/logger.ts
- [ ] Substituir console.log por logger.log
- [ ] Manter console.error para erros reais

---

### 7. Habilitar ESLint em Builds

**Arquivo:** `next.config.js`

```javascript
// Antes
eslint: {
  ignoreDuringBuilds: true,
},

// Depois
eslint: {
  ignoreDuringBuilds: false,
},
```

- [ ] Modificar next.config.js
- [ ] Corrigir erros de ESLint que aparecerem
- [ ] Rodar `npm run lint` localmente

---

## 🟡 MÉDIO - Implementar Este Mês

### 8. Corrigir Tipos TypeScript

Substituir `any` por tipos específicos em:
- [ ] `app/dashboard/layout.tsx` - useState<any>
- [ ] `app/admin/settings/page.tsx` - useState<any>
- [ ] `app/dashboard/market/page.tsx` - useState<any[]>
- [ ] Outros arquivos com `as any`

### 9. Implementar Cache de Dados

- [ ] Instalar React Query ou SWR
- [ ] Cachear listagens do mercado
- [ ] Cachear dados do usuário

### 10. Adicionar Testes Básicos

- [ ] Configurar Jest
- [ ] Criar teste para auth.ts
- [ ] Criar teste para orders.ts

---

## 📋 CHECKLIST FINAL

### Antes de ir para Produção:
- [ ] Middleware de autenticação implementado
- [ ] Admin hardcoded removido
- [ ] Rate limiting ativo
- [ ] Webhook validado
- [ ] Credenciais de exemplo limpas
- [ ] Console.logs removidos
- [ ] ESLint habilitado
- [ ] Variáveis de ambiente de produção configuradas
- [ ] Tokens de teste regenerados

### Variáveis de Ambiente Necessárias em Produção:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=
MERCADO_PAGO_ACCESS_TOKEN=
NEXT_PUBLIC_MERCADO_PAGO_PUBLIC_KEY=
MERCADO_PAGO_WEBHOOK_SECRET=
NEXT_PUBLIC_APP_URL=
ADMIN_EMAILS=
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
```

---

*Última atualização: 28/11/2025*
