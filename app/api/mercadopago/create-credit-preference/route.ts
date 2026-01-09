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
    const { userId, purchaseId, packageName, credits, price } = body;

    if (!userId || !purchaseId || !packageName || !credits || !price) {
      return NextResponse.json(
        { error: 'Dados incompletos' },
        { status: 400 }
      );
    }

    // Buscar dados do usuário
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('email, display_name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return NextResponse.json(
        { error: 'Usuário não encontrado' },
        { status: 404 }
      );
    }

    // Verificar se tem access token
    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      console.error('MERCADO_PAGO_ACCESS_TOKEN não configurado');
      return NextResponse.json(
        { error: 'Configuração de pagamento incompleta' },
        { status: 500 }
      );
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

    // Criar preferência de pagamento
    const preferenceData = {
      items: [{
        id: purchaseId,
        title: `${packageName} - ${credits} Créditos`,
        description: `Pacote de ${credits} créditos para o Pokémon GO Marketplace`,
        quantity: 1,
        unit_price: Number(price),
        currency_id: 'BRL'
      }],
      payer: {
        name: user.display_name,
        email: user.email,
      },
      back_urls: {
        success: `${appUrl}/dashboard/wallet?status=success&purchase_id=${purchaseId}`,
        failure: `${appUrl}/dashboard/wallet?status=failure&purchase_id=${purchaseId}`,
        pending: `${appUrl}/dashboard/wallet?status=pending&purchase_id=${purchaseId}`
      },
      external_reference: purchaseId,
      notification_url: `${appUrl}/api/mercadopago/credit-webhook`,
      statement_descriptor: 'POKEMONGO CREDITS',
      metadata: {
        purchase_id: purchaseId,
        user_id: userId,
        type: 'credit_purchase'
      }
    };

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`
      },
      body: JSON.stringify(preferenceData)
    });

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error('Erro do Mercado Pago:', errorText);
      throw new Error(`Erro do Mercado Pago: ${mpResponse.status}`);
    }

    const mpData = await mpResponse.json();

    // Atualizar compra com ID da preferência
    await supabase
      .from('credit_purchases')
      .update({
        payment_preference_id: mpData.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', purchaseId);

    return NextResponse.json({
      preferenceId: mpData.id,
      initPoint: mpData.init_point,
      sandboxInitPoint: mpData.sandbox_init_point,
    });

  } catch (error: any) {
    console.error('Erro ao criar preferência de créditos:', error);
    return NextResponse.json(
      { error: error.message || 'Erro ao processar pagamento' },
      { status: 500 }
    );
  }
}
