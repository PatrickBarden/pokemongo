import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Nota: Usando MCP do Mercado Pago conectado na IDE
// Não precisa do SDK tradicional

// Cliente Supabase com service role para operações no backend
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

// ============================================================
// SISTEMA DE TAXAS ESCALONADAS
// ============================================================
// A taxa da tabela JÁ INCLUI os 5% do Mercado Pago!
// Faixa de valor        | Taxa TOTAL | Plataforma | MP  | Vendedor
// R$1 - R$49,99         | 30%        | 25%        | 5%  | 70%
// R$50 - R$149,99       | 20%        | 15%        | 5%  | 80%
// R$150 - R$499,99      | 15%        | 10%        | 5%  | 85%
// R$500 - R$999,99      | 12%        | 7%         | 5%  | 88%
// R$1.000+              | 10%        | 5%         | 5%  | 90%
// Taxa mínima TOTAL: R$10
// ============================================================

const MERCADOPAGO_FEE_PERCENTAGE = 5;
const MINIMUM_TOTAL_FEE = 10; // Taxa mínima TOTAL (plataforma + MP)

async function calculatePlatformFee(transactionAmount: number): Promise<{
  platformFee: number;      // O que a plataforma recebe
  feePercentage: number;    // Taxa TOTAL (inclui MP)
  mercadopagoFee: number;   // O que o MP recebe
  sellerReceives: number;   // O que o vendedor recebe
}> {
  try {
    // Buscar faixa aplicável do banco (fee_percentage = taxa TOTAL)
    const { data: tiers } = await supabase
      .from('platform_fee_tiers')
      .select('*')
      .eq('active', true)
      .lte('min_value', transactionAmount)
      .order('min_value', { ascending: false })
      .limit(1);

    let totalFeePercentage = 10; // Padrão

    if (tiers && tiers.length > 0) {
      const tier = tiers[0];
      if (tier.max_value === null || transactionAmount <= tier.max_value) {
        totalFeePercentage = tier.fee_percentage;
      }
    }

    // Calcular taxa TOTAL (o que sai do valor da venda)
    let totalFee = Math.round(transactionAmount * (totalFeePercentage / 100) * 100) / 100;

    // Aplicar taxa mínima TOTAL de R$10
    if (totalFee < MINIMUM_TOTAL_FEE) {
      totalFee = MINIMUM_TOTAL_FEE;
      totalFeePercentage = Math.round((MINIMUM_TOTAL_FEE / transactionAmount) * 100 * 100) / 100;
    }

    // Taxa do Mercado Pago (5% do valor da transação)
    const mercadopagoFee = Math.round(transactionAmount * (MERCADOPAGO_FEE_PERCENTAGE / 100) * 100) / 100;

    // Taxa da PLATAFORMA = Taxa Total - Taxa MP
    let platformFee = Math.round((totalFee - mercadopagoFee) * 100) / 100;
    
    // Se ficar negativo (transação muito pequena), ajustar
    if (platformFee < 0) platformFee = 0;

    // Valor que o vendedor recebe = Valor - Taxa Total
    const sellerReceives = Math.round((transactionAmount - totalFee) * 100) / 100;

    console.log(`💰 Cálculo de taxas para R$${transactionAmount}:`);
    console.log(`   Taxa TOTAL: ${totalFeePercentage}% = R$${totalFee}`);
    console.log(`   ├─ Plataforma: R$${platformFee}`);
    console.log(`   └─ Mercado Pago: R$${mercadopagoFee}`);
    console.log(`   Vendedor recebe: R$${sellerReceives}`);

    return { 
      platformFee,           // O que a plataforma fica
      feePercentage: totalFeePercentage, // Taxa total para exibição
      mercadopagoFee,        // O que o MP fica
      sellerReceives         // O que o vendedor recebe
    };
  } catch (error) {
    console.error('Erro ao calcular taxa, usando padrão:', error);
    const totalFee = Math.max(MINIMUM_TOTAL_FEE, transactionAmount * 0.1);
    const mercadopagoFee = transactionAmount * 0.05;
    const platformFee = totalFee - mercadopagoFee;
    return {
      platformFee,
      feePercentage: 10,
      mercadopagoFee,
      sellerReceives: transactionAmount - totalFee
    };
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId, userId, items, total_amount } = body;

    console.log('📥 Recebendo requisição:', { orderId, userId, items, total_amount });

    // Suportar ambos os formatos: com orderId (carrinho) ou com items (checkout direto)
    if (!userId) {
      return NextResponse.json(
        { error: 'userId é obrigatório' },
        { status: 400 }
      );
    }

    // MCP do Mercado Pago está conectado na IDE
    console.log('✅ Usando MCP do Mercado Pago');

    let order;
    let orderItems;

    // Se já tem orderId, buscar pedido existente
    if (orderId) {
      console.log('🔍 Buscando pedido existente:', orderId);
      const { data: existingOrder, error: orderError } = await supabase
        .from('orders')
        .select(`
          *,
          order_items(
            id,
            pokemon_name,
            price,
            quantity,
            listing_id
          )
        `)
        .eq('id', orderId)
        .eq('buyer_id', userId)
        .single();

      if (orderError) {
        console.error('❌ Erro ao buscar pedido:', orderError);
        return NextResponse.json(
          { error: `Erro ao buscar pedido: ${orderError.message}` },
          { status: 500 }
        );
      }

      order = existingOrder;
      orderItems = existingOrder.order_items;
    } 
    // Senão, criar novo pedido
    else if (items && total_amount) {
      console.log('🆕 Criando novo pedido...');
      console.log('📦 Dados recebidos:', { userId, items, total_amount });
      
      // Gerar número do pedido
      console.log('🔢 Chamando generate_order_number...');
      const { data: orderNumber, error: orderNumberError } = await supabase
        .rpc('generate_order_number');

      if (orderNumberError) {
        console.error('❌ Erro ao gerar número do pedido:', orderNumberError);
        throw orderNumberError;
      }

      console.log('📝 Número do pedido gerado:', orderNumber);

      // Calcular taxas escalonadas
      const feeCalc = await calculatePlatformFee(total_amount);
      console.log('💰 Taxas calculadas:', feeCalc);

      // Criar pedido com taxas
      const { data: newOrder, error: createOrderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          buyer_id: userId,
          status: 'pending',
          total_amount: total_amount,
          platform_fee: feeCalc.platformFee,
          fee_percentage: feeCalc.feePercentage,
          mercadopago_fee: feeCalc.mercadopagoFee,
          seller_receives: feeCalc.sellerReceives,
        })
        .select()
        .single();

      if (createOrderError) {
        console.error('❌ Erro ao criar pedido:', createOrderError);
        throw createOrderError;
      }

      console.log('✅ Pedido criado:', newOrder.id);
      console.log('💵 Vendedor receberá: R$', feeCalc.sellerReceives);

      // Criar itens do pedido
      const orderItemsData = items.map((item: any) => ({
        order_id: newOrder.id,
        listing_id: item.listing_id,
        seller_id: item.seller_id,
        pokemon_name: item.pokemon_name,
        pokemon_photo_url: item.pokemon_photo_url,
        price: item.price,
        quantity: item.quantity,
      }));

      const { data: createdItems, error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData)
        .select();

      if (itemsError) {
        console.error('❌ Erro ao criar itens do pedido:', itemsError);
        throw itemsError;
      }

      console.log('✅ Itens do pedido criados:', createdItems.length);

      order = { ...newOrder, order_number: orderNumber };
      orderItems = createdItems;
    } else {
      return NextResponse.json(
        { error: 'Forneça orderId ou (items + total_amount)' },
        { status: 400 }
      );
    }

    console.log('✅ Pedido pronto:', order.id);

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

    // Preparar itens para o Mercado Pago
    const mpItems = orderItems.map((item: any) => ({
      id: item.listing_id,
      title: item.pokemon_name,
      description: `Pokémon: ${item.pokemon_name}`,
      quantity: item.quantity,
      unit_price: Number(item.price),
      currency_id: 'BRL'
    }));

    console.log('📦 Itens do pedido:', mpItems);

    // Obter URL base da aplicação
    // IMPORTANTE: Certifique-se de que NEXT_PUBLIC_APP_URL está definido no .env.local
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || 'http://localhost:3000';
    
    console.log('🌐 URL da aplicação:', appUrl);
    console.log('🔍 NEXT_PUBLIC_APP_URL:', process.env.NEXT_PUBLIC_APP_URL);
    console.log('🔍 APP_URL:', process.env.APP_URL);

    // Criar preferência de pagamento via API REST do Mercado Pago
    const preferenceData = {
      items: mpItems,
      payer: {
        name: user.display_name,
        email: user.email,
        identification: {
          type: 'CPF',
          number: '12345678909' // CPF de teste
        }
      },
      back_urls: {
        success: `${appUrl}/dashboard/orders?status=success&order_id=${order.id}`,
        failure: `${appUrl}/dashboard/orders?status=failure&order_id=${order.id}`,
        pending: `${appUrl}/dashboard/orders?status=pending&order_id=${order.id}`
      },
      // Removido auto_return - usuário clica manualmente em "Voltar"
      external_reference: order.id,
      notification_url: `${appUrl}/api/mercadopago/webhook`,
      statement_descriptor: 'POKEMONGO MARKETPLACE',
      metadata: {
        order_id: order.id,
        buyer_id: userId
      }
    };
    
    console.log('📋 Preferência a ser criada:', JSON.stringify(preferenceData, null, 2));

    console.log('🔄 Criando preferência no Mercado Pago...');

    // Usar API REST direta do Mercado Pago
    // O MCP já está configurado com as credenciais
    // Verificar se tem access token
    if (!process.env.MERCADO_PAGO_ACCESS_TOKEN) {
      console.error('❌ MERCADO_PAGO_ACCESS_TOKEN não encontrado!');
      throw new Error('Credenciais do Mercado Pago não configuradas');
    }

    console.log('🔑 Access Token presente:', process.env.MERCADO_PAGO_ACCESS_TOKEN.substring(0, 20) + '...');

    const mpResponse = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.MERCADO_PAGO_ACCESS_TOKEN}`
      },
      body: JSON.stringify(preferenceData)
    });

    console.log('📡 Status da resposta do Mercado Pago:', mpResponse.status);

    if (!mpResponse.ok) {
      const errorText = await mpResponse.text();
      console.error('❌ Resposta completa do Mercado Pago:', errorText);
      
      let errorData;
      try {
        errorData = JSON.parse(errorText);
      } catch (e) {
        errorData = { message: errorText };
      }
      
      console.error('❌ Erro do Mercado Pago:', errorData);
      throw new Error(`Erro do Mercado Pago (${mpResponse.status}): ${errorData.message || errorText}`);
    }

    const mpData = await mpResponse.json();
    console.log('✅ Preferência criada:', mpData.id);
    console.log('✅ Sandbox Init Point:', mpData.sandbox_init_point);
    console.log('✅ Init Point:', mpData.init_point);

    // Atualizar pedido com ID da preferência
    await supabase
      .from('orders')
      .update({
        payment_preference_id: mpData.id,
        updated_at: new Date().toISOString()
      })
      .eq('id', order.id);

    return NextResponse.json({
      preferenceId: mpData.id,
      initPoint: mpData.init_point,
      sandboxInitPoint: mpData.sandbox_init_point,
      orderNumber: order.order_number
    });

  } catch (error: any) {
    console.error('❌ ERRO COMPLETO ao criar preferência:', {
      name: error.name,
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      stack: error.stack
    });
    return NextResponse.json(
      { 
        error: error.message || 'Erro ao criar preferência de pagamento',
        details: error.details || null,
        hint: error.hint || null
      },
      { status: 500 }
    );
  }
}
