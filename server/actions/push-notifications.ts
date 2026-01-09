'use server';

import { createClient } from '@supabase/supabase-js';
import { GoogleAuth } from 'google-auth-library';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const fcmServerKey = process.env.FCM_SERVER_KEY;

const firebaseProjectId = process.env.FIREBASE_PROJECT_ID;
const firebaseClientEmail = process.env.FIREBASE_CLIENT_EMAIL;
const firebasePrivateKey = process.env.FIREBASE_PRIVATE_KEY;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

let cachedAccessToken: { token: string; expiresAtMs: number } | null = null;

function hasFcmV1Config() {
  return !!(firebaseProjectId && firebaseClientEmail && firebasePrivateKey);
}

async function getFcmV1AccessToken(): Promise<string> {
  if (!firebaseClientEmail || !firebasePrivateKey) {
    throw new Error('Missing FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY');
  }

  const now = Date.now();
  if (cachedAccessToken && cachedAccessToken.expiresAtMs - now > 60_000) {
    return cachedAccessToken.token;
  }

  const auth = new GoogleAuth({
    credentials: {
      client_email: firebaseClientEmail,
      private_key: firebasePrivateKey.replace(/\\n/g, '\n')
    },
    scopes: ['https://www.googleapis.com/auth/firebase.messaging']
  });

  const client = await auth.getClient();
  const tokenResponse = await client.getAccessToken();
  const token = tokenResponse?.token;

  if (!token) {
    throw new Error('Could not obtain Firebase access token');
  }

  // Access tokens are typically valid for ~3600s
  cachedAccessToken = { token, expiresAtMs: now + 55 * 60 * 1000 };
  return token;
}

// Tipos
export interface PushNotificationPayload {
  title: string;
  body: string;
  data?: Record<string, string>;
  imageUrl?: string;
}

export interface SendPushResult {
  success: boolean;
  successCount: number;
  failureCount: number;
  errors?: string[];
}

// Enviar push notification para um usuário específico
export async function sendPushToUser(
  userId: string,
  payload: PushNotificationPayload
): Promise<SendPushResult> {
  try {
    // Buscar tokens ativos do usuário
    const { data: tokens, error } = await supabaseAdmin
      .from('device_tokens')
      .select('id, token, platform')
      .eq('user_id', userId)
      .eq('is_active', true);

    if (error || !tokens || tokens.length === 0) {
      return { success: false, successCount: 0, failureCount: 0, errors: ['Nenhum dispositivo encontrado'] };
    }

    const results = await Promise.all(
      tokens.map(async (device) => {
        const result = await sendToFCM(device.token, payload);
        
        // Registrar no log
        await supabaseAdmin.from('push_notification_logs').insert({
          user_id: userId,
          device_token_id: device.id,
          title: payload.title,
          body: payload.body,
          data: payload.data || {},
          notification_type: payload.data?.type || 'general',
          status: result.success ? 'sent' : 'failed',
          error_message: result.error,
          sent_at: result.success ? new Date().toISOString() : null
        });

        return result;
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;
    const errors = results.filter(r => r.error).map(r => r.error!);

    return {
      success: successCount > 0,
      successCount,
      failureCount,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error('Erro ao enviar push:', error);
    return { success: false, successCount: 0, failureCount: 1, errors: ['Erro interno'] };
  }
}

// Enviar push notification para múltiplos usuários
export async function sendPushToUsers(
  userIds: string[],
  payload: PushNotificationPayload
): Promise<SendPushResult> {
  try {
    const results = await Promise.all(
      userIds.map(userId => sendPushToUser(userId, payload))
    );

    const successCount = results.reduce((acc, r) => acc + r.successCount, 0);
    const failureCount = results.reduce((acc, r) => acc + r.failureCount, 0);
    const errors = results.flatMap(r => r.errors || []);

    return {
      success: successCount > 0,
      successCount,
      failureCount,
      errors: errors.length > 0 ? errors : undefined
    };
  } catch (error) {
    console.error('Erro ao enviar push para múltiplos usuários:', error);
    return { success: false, successCount: 0, failureCount: userIds.length, errors: ['Erro interno'] };
  }
}

// Enviar push notification para todos os usuários
export async function sendPushToAll(
  payload: PushNotificationPayload,
  campaignId?: string
): Promise<SendPushResult> {
  try {
    // Buscar todos os tokens ativos
    const { data: tokens, error } = await supabaseAdmin
      .from('device_tokens')
      .select('id, user_id, token, platform')
      .eq('is_active', true);

    if (error || !tokens || tokens.length === 0) {
      return { success: false, successCount: 0, failureCount: 0, errors: ['Nenhum dispositivo encontrado'] };
    }

    // Atualizar campanha se existir
    if (campaignId) {
      await supabaseAdmin
        .from('push_campaigns')
        .update({ 
          status: 'sending', 
          total_recipients: tokens.length,
          sent_at: new Date().toISOString()
        })
        .eq('id', campaignId);
    }

    const results = await Promise.all(
      tokens.map(async (device) => {
        const result = await sendToFCM(device.token, payload);
        
        // Registrar no log
        await supabaseAdmin.from('push_notification_logs').insert({
          user_id: device.user_id,
          device_token_id: device.id,
          title: payload.title,
          body: payload.body,
          data: payload.data || {},
          notification_type: 'campaign',
          status: result.success ? 'sent' : 'failed',
          error_message: result.error,
          sent_at: result.success ? new Date().toISOString() : null
        });

        return result;
      })
    );

    const successCount = results.filter(r => r.success).length;
    const failureCount = results.filter(r => !r.success).length;

    // Atualizar campanha com resultados
    if (campaignId) {
      await supabaseAdmin
        .from('push_campaigns')
        .update({ 
          status: 'sent',
          successful_sends: successCount,
          failed_sends: failureCount
        })
        .eq('id', campaignId);
    }

    return {
      success: successCount > 0,
      successCount,
      failureCount
    };
  } catch (error) {
    console.error('Erro ao enviar push para todos:', error);
    return { success: false, successCount: 0, failureCount: 0, errors: ['Erro interno'] };
  }
}

// Enviar push por segmento (ex: vendedores, compradores, etc)
export async function sendPushBySegment(
  segment: 'sellers' | 'buyers' | 'verified_sellers' | 'new_users',
  payload: PushNotificationPayload
): Promise<SendPushResult> {
  try {
    let userQuery = supabaseAdmin.from('users').select('id');

    switch (segment) {
      case 'sellers':
        userQuery = userQuery.gt('total_sales', 0);
        break;
      case 'buyers':
        userQuery = userQuery.gt('total_purchases', 0);
        break;
      case 'verified_sellers':
        userQuery = userQuery.eq('verified_seller', true);
        break;
      case 'new_users':
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        userQuery = userQuery.gte('created_at', thirtyDaysAgo.toISOString());
        break;
    }

    const { data: users, error } = await userQuery;

    if (error || !users || users.length === 0) {
      return { success: false, successCount: 0, failureCount: 0, errors: ['Nenhum usuário no segmento'] };
    }

    return sendPushToUsers(users.map(u => u.id), payload);
  } catch (error) {
    console.error('Erro ao enviar push por segmento:', error);
    return { success: false, successCount: 0, failureCount: 0, errors: ['Erro interno'] };
  }
}

// Criar campanha de push notification
export async function createPushCampaign(
  adminId: string,
  title: string,
  body: string,
  targetType: 'all' | 'segment' | 'specific_users',
  targetFilter?: Record<string, any>,
  scheduledAt?: Date
): Promise<{ success: boolean; campaignId?: string; error?: string }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('push_campaigns')
      .insert({
        title,
        body,
        target_type: targetType,
        target_filter: targetFilter || {},
        scheduled_at: scheduledAt?.toISOString(),
        status: scheduledAt ? 'scheduled' : 'draft',
        created_by: adminId
      })
      .select('id')
      .single();

    if (error) throw error;

    return { success: true, campaignId: data.id };
  } catch (error) {
    console.error('Erro ao criar campanha:', error);
    return { success: false, error: 'Erro ao criar campanha' };
  }
}

// Listar campanhas
export async function listPushCampaigns(limit: number = 20) {
  try {
    const { data, error } = await supabaseAdmin
      .from('push_campaigns')
      .select(`
        *,
        created_by_user:users!push_campaigns_created_by_fkey(display_name)
      `)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Erro ao listar campanhas:', error);
    return [];
  }
}

// Enviar notificação diretamente para FCM
async function sendToFCM(
  token: string, 
  payload: PushNotificationPayload
): Promise<{ success: boolean; error?: string }> {
  // Preferir FCM HTTP v1 (recomendado)
  if (hasFcmV1Config()) {
    try {
      const accessToken = await getFcmV1AccessToken();
      const projectId = firebaseProjectId!;

      const response = await fetch(`https://fcm.googleapis.com/v1/projects/${projectId}/messages:send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          message: {
            token,
            notification: {
              title: payload.title,
              body: payload.body
            },
            data: payload.data || {},
            android: payload.imageUrl
              ? {
                  notification: {
                    image: payload.imageUrl
                  }
                }
              : undefined,
            apns: payload.imageUrl
              ? {
                  payload: {
                    aps: {
                      'mutable-content': 1
                    }
                  },
                  fcm_options: {
                    image: payload.imageUrl
                  }
                }
              : undefined
          }
        })
      });

      if (!response.ok) {
        const errorText = await response.text();
        return { success: false, error: `FCM v1 error (${response.status}): ${errorText}` };
      }

      return { success: true };
    } catch (error: any) {
      console.error('Erro ao enviar para FCM v1:', error);
      return { success: false, error: error?.message || 'Erro ao enviar para FCM v1' };
    }
  }

  // Fallback para Legacy (Server Key) - se não tiver, simular envio
  if (!fcmServerKey) {
    console.log('[MOCK] Push enviado para token:', token.substring(0, 20) + '...');
    console.log('[MOCK] Payload:', payload);
    return { success: true };
  }

  try {
    const response = await fetch('https://fcm.googleapis.com/fcm/send', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `key=${fcmServerKey}`
      },
      body: JSON.stringify({
        to: token,
        notification: {
          title: payload.title,
          body: payload.body,
          image: payload.imageUrl
        },
        data: payload.data || {}
      })
    });

    const result = await response.json();

    if (result.success === 1) {
      return { success: true };
    } else {
      return { 
        success: false, 
        error: result.results?.[0]?.error || 'Erro desconhecido'
      };
    }
  } catch (error) {
    console.error('Erro ao enviar para FCM:', error);
    return { success: false, error: 'Erro de conexão com FCM' };
  }
}

// ===============================================
// NOTIFICAÇÕES AUTOMÁTICAS DO SISTEMA
// ===============================================

// Notificar sobre novo pedido
export async function notifyNewOrder(
  sellerId: string,
  buyerName: string,
  orderNumber: string,
  totalAmount: number
) {
  return sendPushToUser(sellerId, {
    title: '🎉 Nova Venda!',
    body: `${buyerName} fez um pedido de R$ ${totalAmount.toFixed(2)}`,
    data: {
      type: 'new_order',
      screen: 'orders',
      order_number: orderNumber
    }
  });
}

// Notificar sobre status do pedido
export async function notifyOrderStatus(
  userId: string,
  orderNumber: string,
  status: string,
  message: string
) {
  const statusEmojis: Record<string, string> = {
    'PAID': '💰',
    'PROCESSING': '⏳',
    'SHIPPED': '📦',
    'DELIVERED': '✅',
    'COMPLETED': '🎊',
    'CANCELLED': '❌',
    'DISPUTED': '⚠️'
  };

  return sendPushToUser(userId, {
    title: `${statusEmojis[status] || '📋'} Pedido Atualizado`,
    body: message,
    data: {
      type: 'order_status',
      screen: 'orders',
      order_number: orderNumber,
      status
    }
  });
}

// Notificar sobre nova mensagem
export async function notifyNewMessage(
  userId: string,
  senderName: string,
  messagePreview: string,
  conversationId: string
) {
  return sendPushToUser(userId, {
    title: `💬 ${senderName}`,
    body: messagePreview.length > 100 ? messagePreview.substring(0, 97) + '...' : messagePreview,
    data: {
      type: 'new_message',
      link: `/dashboard/chat/${conversationId}`,
      conversation_id: conversationId
    }
  });
}

// Notificar sobre pagamento recebido
export async function notifyPaymentReceived(
  sellerId: string,
  amount: number,
  orderNumber: string
) {
  return sendPushToUser(sellerId, {
    title: '💰 Pagamento Recebido!',
    body: `R$ ${amount.toFixed(2)} creditado na sua carteira`,
    data: {
      type: 'payment_received',
      screen: 'wallet',
      order_number: orderNumber
    }
  });
}

// Notificar sobre nova avaliação
export async function notifyNewReview(
  userId: string,
  reviewerName: string,
  rating: number
) {
  const stars = '⭐'.repeat(rating);
  
  return sendPushToUser(userId, {
    title: '📝 Nova Avaliação',
    body: `${reviewerName} te avaliou com ${stars}`,
    data: {
      type: 'new_review',
      screen: 'profile'
    }
  });
}

// Notificar sobre saque aprovado
export async function notifyWithdrawalApproved(
  userId: string,
  amount: number
) {
  return sendPushToUser(userId, {
    title: '✅ Saque Aprovado',
    body: `Seu saque de R$ ${amount.toFixed(2)} foi processado!`,
    data: {
      type: 'withdrawal_approved',
      screen: 'wallet'
    }
  });
}

// Notificar sobre item na wishlist disponível
export async function notifyWishlistMatch(
  userId: string,
  pokemonName: string,
  listingId: string
) {
  return sendPushToUser(userId, {
    title: '🔔 Pokémon Disponível!',
    body: `${pokemonName} da sua wishlist está à venda!`,
    data: {
      type: 'wishlist_match',
      link: `/listing/${listingId}`,
      listing_id: listingId
    }
  });
}
