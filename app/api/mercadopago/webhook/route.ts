import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

      // Salvar notificação no banco
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
          break;
        case 'pending':
        case 'in_process':
          orderStatus = 'pending';
          break;
        case 'rejected':
        case 'cancelled':
          orderStatus = 'cancelled';
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

      // Marcar notificação como processada
      await supabase
        .from('mercadopago_notifications')
        .update({
          processed: true,
          processed_at: new Date().toISOString()
        })
        .eq('payment_id', paymentId);

      console.log('✅ Pedido atualizado:', orderId, 'Status:', orderStatus);
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
