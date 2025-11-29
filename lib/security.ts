/**
 * Utilitários de Segurança
 * Funções para validação, sanitização e proteção de dados
 */

// ===== SANITIZAÇÃO =====

/**
 * Remove tags HTML e scripts de uma string
 */
export function sanitizeHtml(input: string): string {
  if (!input) return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]*>/g, '')
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim();
}

/**
 * Sanitiza input para uso seguro em queries
 */
export function sanitizeInput(input: string): string {
  if (!input) return '';
  return input
    .replace(/[<>\"\'\\]/g, '')
    .trim()
    .slice(0, 1000); // Limitar tamanho
}

/**
 * Sanitiza nome de arquivo
 */
export function sanitizeFileName(fileName: string): string {
  if (!fileName) return '';
  return fileName
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .replace(/\.{2,}/g, '.')
    .slice(0, 255);
}

// ===== VALIDAÇÃO =====

/**
 * Valida formato de email
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

/**
 * Valida força da senha
 */
export function validatePassword(password: string): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (password.length < 8) {
    errors.push('Senha deve ter pelo menos 8 caracteres');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Senha deve ter pelo menos uma letra maiúscula');
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Senha deve ter pelo menos uma letra minúscula');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Senha deve ter pelo menos um número');
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
    errors.push('Senha deve ter pelo menos um caractere especial');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}

/**
 * Valida UUID
 */
export function isValidUUID(uuid: string): boolean {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  return uuidRegex.test(uuid);
}

/**
 * Valida chave PIX
 */
export function isValidPixKey(key: string): { valid: boolean; type: string | null } {
  if (!key) return { valid: false, type: null };

  // CPF: 11 dígitos
  if (/^\d{11}$/.test(key)) {
    return { valid: true, type: 'cpf' };
  }

  // CNPJ: 14 dígitos
  if (/^\d{14}$/.test(key)) {
    return { valid: true, type: 'cnpj' };
  }

  // Email
  if (isValidEmail(key)) {
    return { valid: true, type: 'email' };
  }

  // Telefone: +55 + DDD + número
  if (/^\+55\d{10,11}$/.test(key)) {
    return { valid: true, type: 'phone' };
  }

  // Chave aleatória: 32 caracteres alfanuméricos
  if (/^[a-zA-Z0-9]{32}$/.test(key)) {
    return { valid: true, type: 'random' };
  }

  return { valid: false, type: null };
}

/**
 * Valida valor monetário
 */
export function isValidPrice(price: number): boolean {
  return typeof price === 'number' && price > 0 && price <= 1000000 && Number.isFinite(price);
}

// ===== PROTEÇÃO CONTRA ATAQUES =====

/**
 * Detecta tentativas de SQL Injection
 */
export function detectSqlInjection(input: string): boolean {
  const sqlPatterns = [
    /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|ALTER|CREATE|TRUNCATE)\b)/i,
    /(--|#|\/\*|\*\/)/,
    /(\bOR\b|\bAND\b)\s*\d+\s*=\s*\d+/i,
    /'\s*(OR|AND)\s*'?\d+'\s*=\s*'?\d+/i,
  ];

  return sqlPatterns.some(pattern => pattern.test(input));
}

/**
 * Detecta tentativas de XSS
 */
export function detectXss(input: string): boolean {
  const xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /expression\s*\(/gi,
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Valida e sanitiza dados de entrada
 */
export function validateAndSanitize(
  data: Record<string, any>,
  rules: Record<string, { type: string; required?: boolean; maxLength?: number }>
): { valid: boolean; errors: string[]; sanitized: Record<string, any> } {
  const errors: string[] = [];
  const sanitized: Record<string, any> = {};

  for (const [field, rule] of Object.entries(rules)) {
    const value = data[field];

    // Verificar campo obrigatório
    if (rule.required && (value === undefined || value === null || value === '')) {
      errors.push(`${field} é obrigatório`);
      continue;
    }

    if (value === undefined || value === null) {
      continue;
    }

    // Validar tipo
    switch (rule.type) {
      case 'string':
        if (typeof value !== 'string') {
          errors.push(`${field} deve ser texto`);
        } else {
          // Verificar ataques
          if (detectSqlInjection(value) || detectXss(value)) {
            errors.push(`${field} contém caracteres inválidos`);
          } else {
            sanitized[field] = sanitizeInput(value).slice(0, rule.maxLength || 1000);
          }
        }
        break;

      case 'number':
        const num = Number(value);
        if (isNaN(num)) {
          errors.push(`${field} deve ser um número`);
        } else {
          sanitized[field] = num;
        }
        break;

      case 'boolean':
        sanitized[field] = Boolean(value);
        break;

      case 'email':
        if (!isValidEmail(value)) {
          errors.push(`${field} deve ser um email válido`);
        } else {
          sanitized[field] = value.toLowerCase().trim();
        }
        break;

      case 'uuid':
        if (!isValidUUID(value)) {
          errors.push(`${field} deve ser um UUID válido`);
        } else {
          sanitized[field] = value;
        }
        break;

      default:
        sanitized[field] = value;
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    sanitized,
  };
}

// ===== TOKENS E HASHING =====

/**
 * Gera um token aleatório seguro
 */
export function generateSecureToken(length: number = 32): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  const randomValues = new Uint32Array(length);
  crypto.getRandomValues(randomValues);
  
  for (let i = 0; i < length; i++) {
    token += chars[randomValues[i] % chars.length];
  }
  
  return token;
}

/**
 * Mascara dados sensíveis para logs
 */
export function maskSensitiveData(data: string, visibleChars: number = 4): string {
  if (!data || data.length <= visibleChars) return '****';
  return data.slice(0, visibleChars) + '*'.repeat(data.length - visibleChars);
}

/**
 * Mascara email para exibição
 */
export function maskEmail(email: string): string {
  if (!email || !email.includes('@')) return '****@****.***';
  const [local, domain] = email.split('@');
  const maskedLocal = local.length > 2 
    ? local[0] + '*'.repeat(local.length - 2) + local[local.length - 1]
    : '**';
  return `${maskedLocal}@${domain}`;
}

/**
 * Mascara chave PIX para exibição
 */
export function maskPixKey(key: string): string {
  if (!key) return '****';
  
  // CPF/CNPJ
  if (/^\d+$/.test(key)) {
    return key.slice(0, 3) + '*'.repeat(key.length - 5) + key.slice(-2);
  }
  
  // Email
  if (key.includes('@')) {
    return maskEmail(key);
  }
  
  // Telefone
  if (key.startsWith('+')) {
    return key.slice(0, 5) + '*'.repeat(key.length - 7) + key.slice(-2);
  }
  
  // Chave aleatória
  return key.slice(0, 4) + '*'.repeat(key.length - 8) + key.slice(-4);
}

// ===== LOGGING SEGURO =====

/**
 * Log seguro que remove dados sensíveis
 */
export function secureLog(
  level: 'info' | 'warn' | 'error',
  message: string,
  data?: Record<string, any>
): void {
  const sensitiveFields = ['password', 'token', 'secret', 'key', 'pix', 'cpf', 'cnpj'];
  
  let safeData = data;
  if (data) {
    safeData = { ...data };
    for (const field of sensitiveFields) {
      if (safeData[field]) {
        safeData[field] = '[REDACTED]';
      }
    }
  }

  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] [${level.toUpperCase()}] ${message}`;

  switch (level) {
    case 'info':
      console.log(logMessage, safeData || '');
      break;
    case 'warn':
      console.warn(logMessage, safeData || '');
      break;
    case 'error':
      console.error(logMessage, safeData || '');
      break;
  }
}
