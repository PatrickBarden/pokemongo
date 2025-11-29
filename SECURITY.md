# 🔐 Guia de Segurança - PokémonGO Marketplace

## Visão Geral

Este documento descreve as medidas de segurança implementadas no sistema.

---

## 1. Autenticação e Autorização

### Supabase Auth
- ✅ Autenticação via email/senha
- ✅ Tokens JWT com expiração
- ✅ Refresh tokens automáticos
- ✅ Verificação de email

### Middleware de Proteção
- ✅ Verificação de sessão em rotas protegidas
- ✅ Verificação de role para rotas admin
- ✅ Detecção de usuários banidos
- ✅ Redirecionamento automático

### Timeout de Sessão
- Sessão expira após 30 minutos de inatividade
- Monitoramento de atividade do usuário
- Logout automático

---

## 2. Headers de Segurança

### Implementados via Next.js e Middleware

| Header | Valor | Proteção |
|--------|-------|----------|
| `X-XSS-Protection` | `1; mode=block` | Ataques XSS |
| `X-Content-Type-Options` | `nosniff` | MIME sniffing |
| `X-Frame-Options` | `DENY` | Clickjacking |
| `Strict-Transport-Security` | `max-age=63072000` | Força HTTPS |
| `Referrer-Policy` | `strict-origin-when-cross-origin` | Vazamento de referrer |
| `Permissions-Policy` | Desabilita câmera, mic, geo | Acesso a recursos |
| `Content-Security-Policy` | Restritivo | XSS, injeção de código |

---

## 3. Rate Limiting

### Configuração
- **Limite**: 100 requests por minuto por IP
- **Janela**: 60 segundos
- **Resposta**: HTTP 429 (Too Many Requests)

### Headers de Resposta
- `X-RateLimit-Limit`: Limite máximo
- `X-RateLimit-Remaining`: Requests restantes
- `Retry-After`: Tempo para retry (quando bloqueado)

---

## 4. Row Level Security (RLS)

### Tabelas Protegidas
Todas as tabelas principais têm RLS habilitado:

```sql
-- Exemplo de política
CREATE POLICY "Users can view own data"
ON users FOR SELECT
USING (auth.uid() = id);
```

### Políticas por Role
- **user**: Acesso apenas aos próprios dados
- **admin**: Acesso total
- **mod**: Acesso moderado

---

## 5. Validação e Sanitização

### Funções Disponíveis (`lib/security.ts`)

```typescript
// Sanitização
sanitizeHtml(input)      // Remove tags HTML
sanitizeInput(input)     // Remove caracteres perigosos
sanitizeFileName(name)   // Limpa nomes de arquivo

// Validação
isValidEmail(email)      // Valida formato de email
validatePassword(pass)   // Valida força da senha
isValidUUID(uuid)        // Valida UUID
isValidPixKey(key)       // Valida chave PIX
isValidPrice(price)      // Valida valor monetário

// Detecção de Ataques
detectSqlInjection(input)  // Detecta SQL injection
detectXss(input)           // Detecta XSS

// Mascaramento
maskEmail(email)         // m***e@domain.com
maskPixKey(key)          // 123***89
maskSensitiveData(data)  // Mascara dados sensíveis
```

---

## 6. Proteção de APIs

### Rotas Protegidas
- `/api/*` - Requer autenticação
- Rate limiting aplicado
- Validação de entrada

### Webhook Mercado Pago
- Verificação de assinatura
- Validação de origem
- Logging de eventos

---

## 7. Armazenamento Seguro

### Supabase Storage
- Buckets privados por padrão
- Políticas de acesso por usuário
- Validação de tipo de arquivo
- Limite de tamanho (5MB)

### Dados Sensíveis
- Chaves PIX mascaradas na exibição
- Senhas nunca armazenadas em plain text
- Tokens não expostos no frontend

---

## 8. Logs e Monitoramento

### Logging Seguro
```typescript
secureLog('info', 'User action', {
  userId: '123',
  password: 'secret' // Será [REDACTED]
});
```

### Campos Redatados Automaticamente
- password
- token
- secret
- key
- pix
- cpf
- cnpj

---

## 9. Checklist de Segurança

### Antes do Deploy

- [ ] Variáveis de ambiente configuradas
- [ ] HTTPS habilitado
- [ ] RLS habilitado em todas as tabelas
- [ ] Rate limiting configurado
- [ ] Headers de segurança ativos
- [ ] Logs de erro configurados
- [ ] Backup automático habilitado

### Manutenção Regular

- [ ] Atualizar dependências (`npm audit fix`)
- [ ] Revisar logs de acesso
- [ ] Verificar tentativas de login falhas
- [ ] Rotacionar secrets se necessário
- [ ] Testar políticas de RLS

---

## 10. Configurações Recomendadas no Supabase

### Auth Settings
1. Acesse: Dashboard > Authentication > Settings
2. Habilite:
   - ✅ Leaked Password Protection
   - ✅ Email confirmations
   - ✅ Secure password requirements

### Database Settings
1. Acesse: Dashboard > Database > Settings
2. Configure:
   - SSL mode: Require
   - Connection pooling: Enabled

---

## 11. Resposta a Incidentes

### Em caso de vazamento de dados:
1. Revogar todos os tokens ativos
2. Forçar reset de senhas
3. Notificar usuários afetados
4. Revisar logs de acesso
5. Corrigir vulnerabilidade

### Em caso de ataque DDoS:
1. Aumentar rate limiting
2. Ativar modo de manutenção
3. Contatar provedor de hosting
4. Analisar padrões de tráfego

---

## 12. Contatos de Emergência

- **Supabase Support**: support@supabase.io
- **Mercado Pago**: Central de ajuda
- **Vercel/Netlify**: Suporte do provedor

---

## Atualizações

| Data | Versão | Mudanças |
|------|--------|----------|
| 29/11/2025 | 1.0 | Implementação inicial |

---

> ⚠️ **IMPORTANTE**: Nunca commite arquivos `.env` ou secrets no repositório!
