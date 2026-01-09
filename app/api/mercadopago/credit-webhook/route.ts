import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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
    console.log('📥 Credit Webhook recebido:', body);

    // Verificar tipo de notificação
    if (body.type !== 'payment') {
      return NextResponse.json({ received: true });
    }

    const paymentId = body.data?.id;
    if (!paymentId) {
      return NextResponse.json({ error: 'Payment ID não encontrado' }, { status: 400 });
    }

    // Buscar detalhes do pagamento no Mercado Pago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: {
        'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`
      }
    });

    if (!mpResponse.ok) {
      console.error('Erro ao buscar pagamento:', mpResponse.status);
      return NextResponse.json({ error: 'Erro ao verificar pagamento' }, { status: 500 });
    }

    const payment = await mpResponse.json();
    console.log('💳 Pagamento:', { status: payment.status, external_reference: payment.external_reference });

    // Verificar se é uma compra de créditos
    if (payment.metadata?.type !== 'credit_purchase') {
      console.log('Não é uma compra de créditos, ignorando');
      return NextResponse.json({ received: true });
    }

    const purchaseId = payment.external_reference;
    if (!purchaseId) {
      return NextResponse.json({ error: 'Purchase ID não encontrado' }, { status: 400 });
    }

    // Buscar compra de créditos
    const { data: purchase, error: purchaseError } = await supabase
      .from('credit_purchases')
      .select('*, credit_packages(*)')
      .eq('id', purchaseId)
      .single();

    if (purchaseError || !purchase) {
      console.error('Compra não encontrada:', purchaseError);
      return NextResponse.json({ error: 'Compra não encontrada' }, { status: 404 });
    }

    // Processar baseado no status do pagamento
    if (payment.status === 'approved') {
      // Atualizar status da compra
      await supabase
        .from('credit_purchases')
        .update({
          status: 'completed',
          payment_id: paymentId,
          completed_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .eq('id', purchaseId);

      const totalCredits = purchase.credits_amount + purchase.bonus_credits;

      // Atualizar saldo da carteira
      const { data: wallet } = await supabase
        .from('wallets')
        .select('*')
        .eq('user_id', purchase.user_id)
        .single();

      if (wallet) {
        await supabase
          .from('wallets')
          .update({
            balance: wallet.balance + totalCredits,
            total_deposited: wallet.total_deposited + totalCredits,
            updated_at: new Date().toISOString()
          })
          .eq('id', wallet.id);

        // Criar transação de depósito
        await supabase
          .from('wallet_transactions')
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

        // Se teve bônus, criar transação separada
        if (purchase.bonus_credits > 0) {
          await supabase
            .from('wallet_transactions')
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

      console.log(`✅ Créditos adicionados: ${totalCredits} para usuário ${purchase.user_id}`);

    } else if (payment.status === 'rejected' || payment.status === 'cancelled') {
      await supabase
        .from('credit_purchases')
        .update({
          status: 'failed',
          payment_id: paymentId,
          updated_at: new Date().toISOString()
        })
        .eq('id', purchaseId);

      console.log(`❌ Pagamento rejeitado/cancelado: ${purchaseId}`);
    }

    return NextResponse.json({ received: true, status: payment.status });

  } catch (error: any) {
    console.error('Erro no webhook de créditos:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// Aceitar GET para verificação do webhook
export async function GET() {
  return NextResponse.json({ status: 'Credit webhook active' });
}
