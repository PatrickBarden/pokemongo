import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { notifyNewOrder, notifyOrderStatus } from '@/server/actions/push-notifications';

// Cliente Supabase com service role
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
);

// Função para criar notificação do admin
async function createAdminNotification(
  type: string,
  title: string,
  description: string,
  severity: 'critical' | 'high' | 'medium' | 'low',
  link?: string,
  metadata?: Record<string, any>
) {
  try {
    await supabase.from('admin_notifications').insert({
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

// Função para formatar valor em BRL
function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

// Função para criar conversa do pedido (comprador + vendedor + admin)
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
    // Buscar um admin para ser o intermediário
    const { data: adminUser } = await supabase
      .from('users')
      .select('id, display_name')
      .eq('role', 'admin')
      .limit(1)
      .single();

    const adminId = adminUser?.id || null;
    const adminName = adminUser?.display_name || 'Administrador';

    // Criar a conversa
    const { data: conversation, error: convError } = await supabase
      .from('order_conversations')
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

    // Criar mensagem de sistema inicial
    const systemMessage = `🎉 **Pagamento Confirmado!**

Olá! O pagamento do pedido #${orderNumber} foi aprovado com sucesso!

📦 **Detalhes do Pedido:**
• Pokémon: ${pokemonName}
• Valor: ${formatCurrency(amount)}
• Comprador: ${buyerName}
• Vendedor: ${sellerName}

👋 **Próximos Passos:**
1. Vendedor: Por favor, combine a entrega com o comprador
2. Comprador: Aguarde o contato do vendedor para a troca
3. Após receber o Pokémon, confirme a entrega no sistema

⚠️ **Importante:** ${adminName} está acompanhando esta negociação como intermediário. Em caso de problemas, envie uma mensagem aqui.

Boa negociação! 🚀`;

    await supabase
      .from('order_conversation_messages')
      .insert({
        conversation_id: conversation.id,
        sender_id: adminId || buyerId, // Se não tiver admin, usa o buyer como sender do sistema
        content: systemMessage,
        message_type: 'SYSTEM',
        read_by_buyer: false,
        read_by_seller: false,
        read_by_admin: true
      });

    console.log('✅ Conversa criada:', conversation.id);
    return conversation;

  } catch (error) {
    console.error('Erro ao criar conversa do pedido:', error);
    return null;
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    console.log('📩 Webhook recebido:', body);

    const { type, data } = body;

    // Processar apenas notificações de pagamento
    if (type === 'payment') {
      const paymentId = data.id;

      // Buscar detalhes do pagamento via REST API
      const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
        headers: {
          'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`
        }
      });

      if (!mpResponse.ok) {
        throw new Error(`Erro ao buscar pagamento: ${mpResponse.statusText}`);
      }

      const paymentData = await mpResponse.json();
      console.log('💳 Dados do pagamento:', paymentData);

      const orderId = paymentData.external_reference;
      const paymentAmount = paymentData.transaction_amount || 0;

      // Buscar dados do pedido, comprador e vendedor
      const { data: orderData } = await supabase
        .from('orders')
        .select(`
          id,
          order_number,
          buyer_id,
          seller_id,
          listing_id,
          buyer:buyer_id(id, display_name, email),
          seller:seller_id(id, display_name, email),
          listing:listing_id(title)
        `)
        .eq('id', orderId)
        .single();

      const buyerId = (orderData as any)?.buyer?.id || (orderData as any)?.buyer_id;
      const sellerId = (orderData as any)?.seller?.id || (orderData as any)?.seller_id;
      const buyerName = (orderData as any)?.buyer?.display_name || 'Comprador';
      const sellerName = (orderData as any)?.seller?.display_name || 'Vendedor';
      const pokemonName = (orderData as any)?.listing?.title || 'Pokémon';
      const orderNumber = (orderData as any)?.order_number || orderId?.slice(0, 8);

      // Salvar notificação do Mercado Pago no banco
      await supabase.from('mercadopago_notifications').insert({
        order_id: orderId,
        payment_id: paymentId,
        notification_type: type,
        notification_data: paymentData,
        processed: false
      });

      // Atualizar status do pedido baseado no status do pagamento
      let orderStatus = 'pending';
      
      switch (paymentData.status) {
        case 'approved':
          orderStatus = 'confirmed';
          
          // 🔔 CRIAR NOTIFICAÇÃO PARA O ADMIN - PAGAMENTO APROVADO
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

          // 💬 CRIAR CONVERSA AUTOMÁTICA (comprador + vendedor + admin)
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
            console.log('✅ Conversa de negociação criada para o pedido:', orderNumber);
            
            // 📱 ENVIAR PUSH NOTIFICATION PARA O VENDEDOR - NOVA VENDA!
            notifyNewOrder(sellerId, buyerName, orderNumber, paymentAmount).catch(console.error);
            
            // 📱 ENVIAR PUSH NOTIFICATION PARA O COMPRADOR - PAGAMENTO CONFIRMADO
            notifyOrderStatus(
              buyerId,
              orderNumber,
              'PAID',
              'Pagamento aprovado! Aguarde o vendedor entrar em contato.'
            ).catch(console.error);
          }
          break;
          
        case 'pending':
        case 'in_process':
          orderStatus = 'pending';
          
          // 🔔 CRIAR NOTIFICAÇÃO - PAGAMENTO PENDENTE
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
          orderStatus = 'cancelled';
          
          // 🔔 CRIAR NOTIFICAÇÃO - PAGAMENTO REJEITADO
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
          break;
      }

      // Atualizar pedido
      await supabase
        .from('orders')
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

      // Marcar notificação do MP como processada
      await supabase
        .from('mercadopago_notifications')
        .update({
          processed: true,
          processed_at: new Date().toISOString()
        })
        .eq('payment_id', paymentId);

      console.log('✅ Pedido atualizado:', orderId, 'Status:', orderStatus);
      console.log('✅ Notificação admin criada para:', paymentData.status);
    }

    return NextResponse.json({ received: true });

  } catch (error: any) {
    console.error('❌ Erro no webhook:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// Endpoint GET para validação do webhook
export async function GET() {
  return NextResponse.json({ status: 'Webhook ativo' });
}
