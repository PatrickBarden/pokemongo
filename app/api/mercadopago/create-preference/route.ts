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

      // Criar pedido
      const { data: newOrder, error: createOrderError } = await supabase
        .from('orders')
        .insert({
          order_number: orderNumber,
          buyer_id: userId,
          status: 'pending',
          total_amount: total_amount,
        })
        .select()
        .single();

      if (createOrderError) {
        console.error('❌ Erro ao criar pedido:', createOrderError);
        throw createOrderError;
      }

      console.log('✅ Pedido criado:', newOrder.id);

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
        email: user.email
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
