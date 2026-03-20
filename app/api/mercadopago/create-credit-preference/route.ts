import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createMercadoPagoPreference } from '@/lib/mercadopago-server';
import { RouteError, jsonError, toErrorMessage } from '@/lib/route-errors';
import { getAppUrl } from '@/lib/server-env';
import { getSupabaseAdminSingleton } from '@/lib/supabase-admin';

const supabase = getSupabaseAdminSingleton();
const creditPurchasesTable = supabase.from('credit_purchases') as any;

const createCreditPreferenceSchema = z.object({
  userId: z.string().uuid(),
  purchaseId: z.string().uuid(),
  packageName: z.string().trim().min(1).max(120),
  credits: z.number().finite().positive(),
  price: z.number().finite().positive(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const parsedBody = createCreditPreferenceSchema.safeParse(body);

    if (!parsedBody.success) {
      return jsonError('Dados inválidos para gerar pagamento', 400, parsedBody.error.flatten());
    }

    const { userId, purchaseId, packageName, credits, price } = parsedBody.data;

    const { data: user, error: userError } = await (supabase
      .from('users')
      .select('email, display_name')
      .eq('id', userId)
      .single() as any);

    if (userError || !user) {
      return jsonError('Usuário não encontrado', 404);
    }

    const appUrl = getAppUrl();

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
        name: (user as any).display_name,
        email: (user as any).email,
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

    const mpData = await createMercadoPagoPreference<typeof preferenceData, {
      id: string;
      init_point: string;
      sandbox_init_point: string | null;
    }>(preferenceData);

    await creditPurchasesTable
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

  } catch (error) {
    if (error instanceof RouteError) {
      return jsonError(error.message, error.status, error.details);
    }

    return jsonError(toErrorMessage(error), 500);
  }
}
