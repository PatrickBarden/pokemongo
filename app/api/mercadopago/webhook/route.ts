import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getMercadoPagoPayment, verifyWebhookSignature } from '@/lib/mercadopago-server';
import { RouteError, jsonError, toErrorMessage } from '@/lib/route-errors';
import { getSupabaseAdminSingleton } from '@/lib/supabase-admin';
import { notifyNewOrder, notifyOrderStatus } from '@/server/actions/push-notifications';
import { createNotification } from '@/server/actions/notifications';

const supabase = getSupabaseAdminSingleton();
const adminNotificationsTable = supabase.from('admin_notifications') as any;
const notificationsTable = supabase.from('mercadopago_notifications') as any;
const ordersTable = supabase.from('orders') as any;
const usersTable = supabase.from('users') as any;
const orderConversationsTable = supabase.from('order_conversations') as any;
const orderConversationMessagesTable = supabase.from('order_conversation_messages') as any;

const mercadopagoWebhookSchema = z.object({
  type: z.string().optional(),
  data: z.object({
    id: z.union([z.string(), z.number()]).optional(),
  }).optional(),
});

async function createAdminNotification(
  type: string,
  title: string,
  description: string,
  severity: 'critical' | 'high' | 'medium' | 'low',
  link?: string,
  metadata?: Record<string, any>
) {
  try {
    await adminNotificationsTable.insert({
      type,
      title,
      description,
      severity,
      link: link || null,
      metadata: metadata || {},
      read: false
    });
  } catch (error) {
    console.error('Erro ao criar notificação admin:', error);
  }
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

async function createOrderConversation(
  orderId: string,
  buyerId: string,
  sellerId: string,
  orderNumber: string,
  buyerName: string,
  sellerName: string,
  pokemonName: string,
  amount: number
) {
  try {
    const { data: adminUser } = await usersTable
      .select('id, display_name')
      .eq('role', 'admin')
      .limit(1)
      .single();

    const adminId = adminUser?.id || null;
    const adminName = adminUser?.display_name || 'Administrador';

    const { data: conversation, error: convError } = await orderConversationsTable
      .insert({
        order_id: orderId,
        buyer_id: buyerId,
        seller_id: sellerId,
        admin_id: adminId,
        subject: `Pedido #${orderNumber} - ${pokemonName}`,
        status: 'ACTIVE'
      })
      .select()
      .single();

    if (convError) {
      console.error('Erro ao criar conversa:', convError);
      return null;
    }

    const systemMessage = `Pagamento Confirmado!

Olá! O pagamento do pedido #${orderNumber} foi aprovado com sucesso!

Detalhes do Pedido:
• Pokémon: ${pokemonName}
• Valor: ${formatCurrency(amount)}
• Comprador: ${buyerName}
• Vendedor: ${sellerName}

Próximos Passos:
1. Vendedor: Por favor, combine a entrega com o comprador
2. Comprador: Aguarde o contato do vendedor para a troca
3. Após receber o Pokémon, confirme a entrega no sistema

Importante: A administração está acompanhando esta negociação como intermediária. Em caso de problemas, envie uma mensagem aqui.

Boa negociação!`;

    await orderConversationMessagesTable.insert({
      conversation_id: conversation.id,
      sender_id: adminId || buyerId,
      content: systemMessage,
      message_type: 'SYSTEM',
      read_by_buyer: false,
      read_by_seller: false,
      read_by_admin: true
    });

    return conversation;
  } catch (error) {
    console.error('Erro ao criar conversa do pedido:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsedBody = mercadopagoWebhookSchema.safeParse(body);

    if (!parsedBody.success) {
      return jsonError('Payload de webhook inválido', 400, parsedBody.error.flatten());
    }

    if (parsedBody.data.type !== 'payment') {
      return NextResponse.json({ received: true });
    }

    const paymentId = parsedBody.data.data?.id?.toString();
    if (!paymentId) {
      return jsonError('Payment ID não encontrado', 400);
    }

    // Verificar assinatura HMAC do Mercado Pago (anti-fraude)
    if (!verifyWebhookSignature(request, paymentId)) {
      return jsonError('Assinatura de webhook inválida', 401);
    }

    const { data: existingNotification } = await notificationsTable
      .select('id, processed')
      .eq('payment_id', paymentId)
      .eq('notification_type', 'payment')
      .maybeSingle();

    if (existingNotification?.processed) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    const paymentData = await getMercadoPagoPayment<{
      external_reference?: string;
      transaction_amount?: number;
      status?: string;
      status_detail?: string;
      payment_method_id?: string;
      payment_type_id?: string;
    }>(paymentId);

    const orderId = paymentData.external_reference;
    if (!orderId) {
      return jsonError('Order ID não encontrado', 400);
    }

    const paymentAmount = paymentData.transaction_amount || 0;

    const { data: orderData } = await ordersTable
      .select(`
        id,
        order_number,
        total_amount,
        buyer_id,
        seller_id,
        listing_id,
        buyer:buyer_id(id, display_name, email),
        seller:seller_id(id, display_name, email),
        listing:listing_id(title)
      `)
      .eq('id', orderId)
      .single();

    // Verificar se o valor pago corresponde ao valor do pedido (anti-fraude)
    const orderTotalAmount = (orderData as any)?.total_amount;
    if (
      paymentData.status === 'approved' &&
      orderTotalAmount != null &&
      paymentAmount > 0 &&
      Math.abs(paymentAmount - orderTotalAmount) > 0.01
    ) {
      console.error(
        `🔴 FRAUDE POTENCIAL: Valor pago (${paymentAmount}) ≠ Valor do pedido (${orderTotalAmount}). ` +
        `Order: ${orderId}, Payment: ${paymentId}`
      );

      await createAdminNotification(
        'payment_mismatch',
        '🚨 ALERTA: Valor de pagamento divergente!',
        `Pedido #${(orderData as any)?.order_number || orderId.slice(0, 8)} - Pago: ${formatCurrency(paymentAmount)}, Esperado: ${formatCurrency(orderTotalAmount)}. Verificação manual necessária.`,
        'critical',
        `/admin/orders/${orderId}`,
        { order_id: orderId, payment_id: paymentId, paid: paymentAmount, expected: orderTotalAmount }
      );

      // Não bloquear o fluxo, mas registrar a divergência para análise
    }

    const buyerId = (orderData as any)?.buyer?.id || (orderData as any)?.buyer_id;
    const sellerId = (orderData as any)?.seller?.id || (orderData as any)?.seller_id;
    const buyerName = (orderData as any)?.buyer?.display_name || 'Comprador';
    const sellerName = (orderData as any)?.seller?.display_name || 'Vendedor';
    const pokemonName = (orderData as any)?.listing?.title || 'Pokémon';
    const orderNumber = (orderData as any)?.order_number || orderId.slice(0, 8);

    if (existingNotification?.id) {
      await notificationsTable
        .update({
          order_id: orderId,
          notification_data: paymentData,
          processed: false
        })
        .eq('id', existingNotification.id);
    } else {
      await notificationsTable.insert({
        order_id: orderId,
        payment_id: paymentId,
        notification_type: 'payment',
        notification_data: paymentData,
        processed: false
      });
    }

    let orderStatus = 'PAYMENT_PENDING';

    switch (paymentData.status) {
      case 'approved':
        orderStatus = 'AWAITING_SELLER';

        await createAdminNotification(
          'payment_approved',
          '💰 Novo Pagamento Aprovado!',
          `Pedido #${orderNumber} - ${buyerName} pagou ${formatCurrency(paymentAmount)}`,
          'high',
          `/admin/orders/${orderId}`,
          {
            order_id: orderId,
            order_number: orderNumber,
            payment_id: paymentId,
            amount: paymentAmount,
            buyer_name: buyerName,
            seller_name: sellerName,
            payment_method: paymentData.payment_method_id,
            payment_type: paymentData.payment_type_id
          }
        );

        if (buyerId && sellerId) {
          await createOrderConversation(
            orderId,
            buyerId,
            sellerId,
            orderNumber,
            buyerName,
            sellerName,
            pokemonName,
            paymentAmount
          );

          // Push notifications
          notifyNewOrder(sellerId, buyerName, orderNumber, paymentAmount).catch(console.error);
          notifyOrderStatus(
            buyerId,
            orderNumber,
            'PAID',
            'Pagamento aprovado! Aguarde o vendedor entrar em contato.'
          ).catch(console.error);

          // Notificações in-app para comprador e vendedor
          createNotification(
            buyerId,
            'order_status',
            '✅ Pagamento Aprovado!',
            `Seu pagamento de ${formatCurrency(paymentAmount)} para "${pokemonName}" foi aprovado. Aguarde o vendedor entrar em contato.`,
            `/dashboard/orders`,
            { order_id: orderId, order_number: orderNumber, payment_id: paymentId }
          ).catch(console.error);

          createNotification(
            sellerId,
            'new_sale',
            '🎉 Nova Venda!',
            `${buyerName} comprou "${pokemonName}" por ${formatCurrency(paymentAmount)}. Entre em contato para combinar a entrega.`,
            `/dashboard/orders`,
            { order_id: orderId, order_number: orderNumber, payment_id: paymentId }
          ).catch(console.error);
        }
        break;

      case 'pending':
      case 'in_process':
        orderStatus = 'PAYMENT_PENDING';

        await createAdminNotification(
          'payment_pending',
          '⏳ Pagamento Pendente',
          `Pedido #${orderNumber} - ${buyerName} iniciou pagamento de ${formatCurrency(paymentAmount)}`,
          'medium',
          `/admin/orders/${orderId}`,
          {
            order_id: orderId,
            order_number: orderNumber,
            payment_id: paymentId,
            amount: paymentAmount,
            buyer_name: buyerName
          }
        );
        break;

      case 'rejected':
      case 'cancelled':
        orderStatus = 'CANCELLED';

        await createAdminNotification(
          'payment_rejected',
          '❌ Pagamento Rejeitado',
          `Pedido #${orderNumber} - Pagamento de ${buyerName} foi rejeitado`,
          'medium',
          `/admin/orders/${orderId}`,
          {
            order_id: orderId,
            order_number: orderNumber,
            payment_id: paymentId,
            amount: paymentAmount,
            buyer_name: buyerName,
            status_detail: paymentData.status_detail
          }
        );

        // Notificação in-app para o comprador sobre falha
        if (buyerId) {
          createNotification(
            buyerId,
            'order_status',
            '❌ Pagamento não aprovado',
            `Seu pagamento para "${pokemonName}" não foi aprovado. Tente novamente ou use outro método de pagamento.`,
            `/dashboard/orders`,
            { order_id: orderId, order_number: orderNumber, payment_id: paymentId }
          ).catch(console.error);
        }
        break;
    }

    await ordersTable
      .update({
        payment_id: paymentId,
        payment_status: paymentData.status,
        payment_type: paymentData.payment_type_id,
        payment_method: paymentData.payment_method_id,
        status: orderStatus,
        paid_at: paymentData.status === 'approved' ? new Date().toISOString() : null,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId);

    await notificationsTable
      .update({
        processed: true,
        processed_at: new Date().toISOString()
      })
      .eq('payment_id', paymentId);

    return NextResponse.json({ received: true, status: paymentData.status });
  } catch (error) {
    if (error instanceof RouteError) {
      return jsonError(error.message, error.status, error.details);
    }

    return jsonError(toErrorMessage(error), 500);
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Webhook ativo' });
}
