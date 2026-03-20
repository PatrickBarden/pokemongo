import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { getMercadoPagoPayment } from '@/lib/mercadopago-server';
import { RouteError, jsonError, toErrorMessage } from '@/lib/route-errors';
import { getSupabaseAdminSingleton } from '@/lib/supabase-admin';

const supabase = getSupabaseAdminSingleton();
const creditPurchasesTable = supabase.from('credit_purchases') as any;
const notificationsTable = supabase.from('mercadopago_notifications') as any;

const creditWebhookSchema = z.object({
  type: z.string().optional(),
  data: z.object({
    id: z.union([z.string(), z.number()]).optional(),
  }).optional(),
});

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
      await creditPurchasesTable
        .update({
          status: 'completed',
          payment_id: paymentId,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', purchaseId);

      const totalCredits = purchase.credits_amount + purchase.bonus_credits;

      const { data: wallet } = await (supabase
        .from('wallets') as any)
        .select('*')
        .eq('user_id', purchase.user_id)
        .single();

      if (wallet) {
        await (supabase
          .from('wallets') as any)
          .update({
            balance: wallet.balance + totalCredits,
            total_deposited: wallet.total_deposited + totalCredits,
            updated_at: new Date().toISOString()
          })
          .eq('id', wallet.id);

        await (supabase
          .from('wallet_transactions') as any)
          .insert({
            wallet_id: wallet.id,
            user_id: purchase.user_id,
            type: 'DEPOSIT',
            amount: totalCredits,
            balance_after: wallet.balance + totalCredits,
            description: `Compra de créditos: ${purchase.credit_packages?.name || 'Pacote'}`,
            reference_type: 'credit_purchase',
            reference_id: purchaseId,
            status: 'completed'
          });

        if (purchase.bonus_credits > 0) {
          await (supabase
            .from('wallet_transactions') as any)
            .insert({
              wallet_id: wallet.id,
              user_id: purchase.user_id,
              type: 'BONUS_CREDIT',
              amount: purchase.bonus_credits,
              balance_after: wallet.balance + totalCredits,
              description: `Bônus: ${purchase.credit_packages?.bonus_percentage || 0}% extra`,
              reference_type: 'credit_purchase',
              reference_id: purchaseId,
              status: 'completed'
            });
        }
      }
    } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
      await creditPurchasesTable
        .update({
          status: 'failed',
          payment_id: paymentId,
          updated_at: new Date().toISOString()
        })
        .eq('id', purchaseId);
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
