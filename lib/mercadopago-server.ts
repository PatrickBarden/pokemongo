import { getMercadoPagoAccessToken } from './server-env';
import { RouteError } from './route-errors';
import crypto from 'crypto';

/**
 * Verifica a assinatura HMAC do webhook do Mercado Pago.
 * Em produção, rejeita webhooks se MERCADOPAGO_WEBHOOK_SECRET não estiver configurado.
 * Em desenvolvimento, permite bypass com warning.
 */
export function verifyWebhookSignature(
  request: { headers: { get(name: string): string | null }; url: string },
  dataId: string
): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  
  if (!secret) {
    const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';
    if (isProduction) {
      console.error('🔴 MERCADOPAGO_WEBHOOK_SECRET não configurado em PRODUÇÃO. Webhook REJEITADO por segurança.');
      return false;
    }
    console.warn('⚠️ MERCADOPAGO_WEBHOOK_SECRET não configurado (dev mode). Webhook aceito sem verificação.');
    return true;
  }

  const xSignature = request.headers.get('x-signature');
  const xRequestId = request.headers.get('x-request-id');

  if (!xSignature || !xRequestId) {
    console.error('❌ Webhook sem headers x-signature ou x-request-id');
    return false;
  }

  // Extrair ts e v1 do header x-signature
  const parts: Record<string, string> = {};
  xSignature.split(',').forEach(part => {
    const [key, ...valueParts] = part.trim().split('=');
    if (key && valueParts.length > 0) {
      parts[key.trim()] = valueParts.join('=').trim();
    }
  });

  const ts = parts['ts'];
  const v1 = parts['v1'];

  if (!ts || !v1) {
    console.error('❌ Formato inválido do x-signature:', xSignature);
    return false;
  }

  // Montar o template de validação conforme documentação MP
  const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
  
  const hmac = crypto
    .createHmac('sha256', secret)
    .update(manifest)
    .digest('hex');

  if (hmac !== v1) {
    console.error('❌ Assinatura HMAC inválida. Possível tentativa de fraude.');
    return false;
  }

  return true;
}

async function mercadopagoRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getMercadoPagoAccessToken()}`,
      ...(init?.headers || {}),
    },
  });

  if (!response.ok) {
    const rawBody = await response.text();
    let body: unknown = rawBody;

    try {
      body = JSON.parse(rawBody);
    } catch {
      body = rawBody;
    }

    throw new RouteError(`Erro do Mercado Pago (${response.status})`, response.status, body);
  }

  return response.json() as Promise<T>;
}

export async function createMercadoPagoPreference<TPayload extends Record<string, unknown>, TResponse>(payload: TPayload) {
  return mercadopagoRequest<TResponse>('/checkout/preferences', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

export async function getMercadoPagoPayment<TResponse>(paymentId: string) {
  return mercadopagoRequest<TResponse>(`/v1/payments/${paymentId}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
    },
  });
}
