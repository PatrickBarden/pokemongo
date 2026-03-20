import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createMercadoPagoPreference } from '@/lib/mercadopago-server';
import { RouteError, jsonError, toErrorMessage } from '@/lib/route-errors';
import { getAppUrl } from '@/lib/server-env';
import { getSupabaseAdminSingleton } from '@/lib/supabase-admin';

const supabase = getSupabaseAdminSingleton();
const ordersTable = supabase.from('orders') as any;
const orderItemsTable = supabase.from('order_items') as any;
const usersTable = supabase.from('users') as any;
const platformFeeTiersTable = supabase.from('platform_fee_tiers') as any;

const checkoutItemSchema = z.object({
  listing_id: z.string().uuid(),
  seller_id: z.string().uuid(),
  pokemon_name: z.string().trim().min(1).max(120),
  pokemon_photo_url: z.string().trim().optional().nullable(),
  price: z.number().finite().positive(),
  quantity: z.number().int().positive(),
});

const createPreferenceSchema = z.object({
  orderId: z.string().uuid().optional(),
  userId: z.string().uuid(),
  items: z.array(checkoutItemSchema).min(1).optional(),
  total_amount: z.number().finite().positive().optional(),
}).refine((value) => Boolean(value.orderId) || (Boolean(value.items?.length) && typeof value.total_amount === 'number'), {
  message: 'Forneça orderId ou (items + total_amount)',
});

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
    const { data: tiers } = await platformFeeTiersTable
      .select('*')
      .eq('active', true)
      .lte('min_value', transactionAmount)
      .order('min_value', { ascending: false })
      .limit(1);

    let totalFeePercentage = 10; // Padrão

    if (tiers && tiers.length > 0) {
      const tier = tiers[0] as any;
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
    const parsedBody = createPreferenceSchema.safeParse(body);

    if (!parsedBody.success) {
      return jsonError('Dados inválidos para checkout', 400, parsedBody.error.flatten());
    }

    const { orderId, userId, items, total_amount } = parsedBody.data;

    let order;
    let orderItems;

    if (orderId) {
      const { data: existingOrder, error: orderError } = await ordersTable
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
        return jsonError(`Erro ao buscar pedido: ${orderError.message}`, 500);
      }

      order = existingOrder;
      orderItems = existingOrder.order_items;
    } else if (items && typeof total_amount === 'number') {
      const { data: orderNumber, error: orderNumberError } = await supabase
        .rpc('generate_order_number');

      if (orderNumberError) {
        throw orderNumberError;
      }

      const feeCalc = await calculatePlatformFee(total_amount);

      const primaryItem = items[0];

      const { data: newOrder, error: createOrderError } = await ordersTable
        .insert({
          order_number: orderNumber,
          buyer_id: userId,
          listing_id: primaryItem.listing_id,
          seller_id: primaryItem.seller_id,
          status: 'PAYMENT_PENDING',
          total_amount: total_amount,
          amount_total: total_amount,
          platform_fee: feeCalc.platformFee,
          fee_percentage: feeCalc.feePercentage,
          mercadopago_fee: feeCalc.mercadopagoFee,
          seller_receives: feeCalc.sellerReceives,
        })
        .select()
        .single();

      if (createOrderError) {
        throw createOrderError;
      }

      const orderItemsData = items.map((item) => ({
        order_id: newOrder.id,
        listing_id: item.listing_id,
        seller_id: item.seller_id,
        pokemon_name: item.pokemon_name,
        pokemon_photo_url: item.pokemon_photo_url,
        price: item.price,
        quantity: item.quantity,
      }));

      const { data: createdItems, error: itemsError } = await orderItemsTable
        .insert(orderItemsData)
        .select();

      if (itemsError) {
        throw itemsError;
      }

      order = { ...newOrder, order_number: orderNumber };
      orderItems = createdItems;
    } else {
      return jsonError('Forneça orderId ou (items + total_amount)', 400);
    }

    const { data: user, error: userError } = await usersTable
      .select('email, display_name')
      .eq('id', userId)
      .single();

    if (userError || !user) {
      return jsonError('Usuário não encontrado', 404);
    }

    const mpItems = orderItems.map((item: any) => ({
      id: item.listing_id,
      title: item.pokemon_name,
      description: `Pokémon: ${item.pokemon_name}`,
      quantity: item.quantity,
      unit_price: Number(item.price),
      currency_id: 'BRL'
    }));

    const appUrl = getAppUrl();
    const preferenceData = {
      items: mpItems,
      payer: {
        name: user.display_name,
        email: user.email,
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

    const mpData = await createMercadoPagoPreference<typeof preferenceData, {
      id: string;
      init_point: string;
      sandbox_init_point: string | null;
    }>(preferenceData);

    await ordersTable
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

  } catch (error) {
    if (error instanceof RouteError) {
      return jsonError(error.message, error.status, error.details);
    }

    return jsonError(toErrorMessage(error), 500);
  }
}
