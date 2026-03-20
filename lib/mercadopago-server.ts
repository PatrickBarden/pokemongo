import { getMercadoPagoAccessToken } from './server-env';
import { RouteError } from './route-errors';

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
