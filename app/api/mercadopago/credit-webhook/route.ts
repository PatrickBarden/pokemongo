import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getMercadoPagoPayment, verifyWebhookSignature } from '@/lib/mercadopago-server';
import { RouteError, jsonError, toErrorMessage } from '@/lib/route-errors';
import { getSupabaseAdminSingleton } from '@/lib/supabase-admin';
import { createNotification } from '@/server/actions/notifications';

const supabase = getSupabaseAdminSingleton();
const creditPurchasesTable = supabase.from('credit_purchases') as any;
const notificationsTable = supabase.from('mercadopago_notifications') as any;

const creditWebhookSchema = z.object({
  type: z.string().optional(),
  data: z.object({
    id: z.union([z.string(), z.number()]).optional(),
  }).optional(),
});

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(value);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsedBody = creditWebhookSchema.safeParse(body);

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
      .eq('notification_type', 'credit_purchase')
      .maybeSingle();

    if (existingNotification?.processed) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    const payment = await getMercadoPagoPayment<{
      status?: string;
      external_reference?: string;
      metadata?: Record<string, unknown>;
    }>(paymentId);

    if (payment.metadata?.type !== 'credit_purchase') {
      return NextResponse.json({ received: true });
    }

    const purchaseId = payment.external_reference;
    if (!purchaseId) {
      return jsonError('Purchase ID não encontrado', 400);
    }

    const { data: purchase, error: purchaseError } = await creditPurchasesTable
      .select('*, credit_packages(*)')
      .eq('id', purchaseId)
      .single();

    if (purchaseError || !purchase) {
      return jsonError('Compra não encontrada', 404);
    }

    if (payment.status === 'approved') {
      // Verificar se já foi processado (idempotência)
      if (purchase.status === 'completed') {
        return NextResponse.json({ received: true, duplicate: true });
      }

      await creditPurchasesTable
        .update({
          status: 'completed',
          payment_id: paymentId,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', purchaseId);

      const totalCredits = purchase.credits_amount + (purchase.bonus_credits || 0);
      const packageName = purchase.credit_packages?.name || 'Pacote de créditos';

      // Usar RPC atômico para atualizar saldo (previne race conditions)
      const { error: walletError } = await (supabase as any).rpc('update_wallet_balance', {
        p_user_id: purchase.user_id,
        p_amount: totalCredits,
        p_type: 'DEPOSIT',
        p_description: `Compra de créditos: ${packageName}`,
        p_reference_type: 'credit_purchase',
        p_reference_id: purchaseId,
        p_metadata: {
          package_id: purchase.package_id || purchase.credit_packages?.id,
          credits: purchase.credits_amount,
          bonus: purchase.bonus_credits || 0,
          payment_id: paymentId
        },
      });

      if (walletError) {
        console.error('❌ Erro ao atualizar carteira via RPC:', walletError);
      } else {
        console.log(`✅ ${totalCredits} créditos adicionados para user ${purchase.user_id}`);
      }

      // Criar notificação in-app para o usuário
      createNotification(
        purchase.user_id,
        'payment_received',
        '✅ Créditos Adicionados!',
        `${totalCredits} créditos (${packageName}) foram adicionados à sua carteira. Valor: ${formatCurrency(purchase.price_paid || 0)}`,
        '/dashboard/wallet',
        { purchase_id: purchaseId, credits: totalCredits, payment_id: paymentId }
      ).catch(console.error);

    } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
      await creditPurchasesTable
        .update({
          status: 'failed',
          payment_id: paymentId,
          updated_at: new Date().toISOString()
        })
        .eq('id', purchaseId);

      // Notificar usuário sobre falha no pagamento
      createNotification(
        purchase.user_id,
        'system',
        '❌ Pagamento não aprovado',
        `Seu pagamento para o pacote de créditos não foi aprovado. Tente novamente ou use outro método de pagamento.`,
        '/dashboard/wallet/add-credits',
        { purchase_id: purchaseId, payment_id: paymentId }
      ).catch(console.error);
    }

    if (existingNotification?.id) {
      await notificationsTable
        .update({
          processed: true,
          processed_at: new Date().toISOString()
        })
        .eq('id', existingNotification.id);
    } else {
      await notificationsTable.insert({
        order_id: null,
        payment_id: paymentId,
        notification_type: 'credit_purchase',
        notification_data: payment,
        processed: true,
        processed_at: new Date().toISOString()
      });
    }

    return NextResponse.json({ received: true, status: payment.status });
  } catch (error) {
    if (error instanceof RouteError) {
      return jsonError(error.message, error.status, error.details);
    }

    return jsonError(toErrorMessage(error), 500);
  }
}

export async function GET() {
  return NextResponse.json({ status: 'Credit webhook active' });
}
