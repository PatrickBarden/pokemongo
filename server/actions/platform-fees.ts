'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export type FeeTier = {
  id: string;
  min_value: number;
  max_value: number | null;
  fee_percentage: number; // Taxa TOTAL (já inclui 5% do MP)
  description: string;
  active: boolean;
};

export type FeeCalculation = {
  transactionAmount: number;
  totalFee: number;           // Taxa total descontada
  totalFeePercentage: number; // Porcentagem total (da tabela)
  platformFee: number;        // O que a plataforma recebe (total - MP)
  platformPercentage: number; // Porcentagem da plataforma
  mercadopagoFee: number;     // O que o MP recebe (5%)
  sellerReceives: number;     // O que o vendedor recebe
  tierDescription: string;
};

// Constantes
const MERCADOPAGO_FEE_PERCENTAGE = 5;
const MINIMUM_TOTAL_FEE = 10; // Taxa mínima TOTAL

// Buscar todas as faixas de taxa
export async function getFeeTiers(): Promise<FeeTier[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('platform_fee_tiers')
      .select('*')
      .eq('active', true)
      .order('min_value', { ascending: true });

    if (error) throw error;
    return (data || []) as FeeTier[];
  } catch (error) {
    console.error('Erro ao buscar faixas de taxa:', error);
    return [];
  }
}

// Calcular taxa para um valor específico
// IMPORTANTE: fee_percentage na tabela é a taxa TOTAL (já inclui 5% do MP)
export async function calculateFee(transactionAmount: number): Promise<FeeCalculation> {
  try {
    // Buscar faixa aplicável (fee_percentage = taxa TOTAL)
    const { data: tiers } = await supabaseAdmin
      .from('platform_fee_tiers')
      .select('*')
      .eq('active', true)
      .lte('min_value', transactionAmount)
      .order('min_value', { ascending: false })
      .limit(1);

    let totalFeePercentage = 10; // Padrão
    let tierDescription = 'Taxa padrão';

    if (tiers && tiers.length > 0) {
      const tier = tiers[0];
      if (tier.max_value === null || transactionAmount <= tier.max_value) {
        totalFeePercentage = tier.fee_percentage;
        tierDescription = tier.description;
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
    if (platformFee < 0) platformFee = 0;

    // Porcentagem da plataforma
    const platformPercentage = totalFeePercentage - MERCADOPAGO_FEE_PERCENTAGE;

    // Valor que o vendedor recebe = Valor - Taxa Total
    const sellerReceives = Math.round((transactionAmount - totalFee) * 100) / 100;

    return {
      transactionAmount,
      totalFee,
      totalFeePercentage,
      platformFee,
      platformPercentage,
      mercadopagoFee,
      sellerReceives,
      tierDescription
    };
  } catch (error) {
    console.error('Erro ao calcular taxa:', error);
    // Retornar cálculo padrão em caso de erro
    const totalFee = Math.max(MINIMUM_TOTAL_FEE, transactionAmount * 0.1);
    const mercadopagoFee = transactionAmount * 0.05;
    const platformFee = totalFee - mercadopagoFee;
    return {
      transactionAmount,
      totalFee,
      totalFeePercentage: 10,
      platformFee,
      platformPercentage: 5,
      mercadopagoFee,
      sellerReceives: transactionAmount - totalFee,
      tierDescription: 'Taxa padrão'
    };
  }
}

// Calcular taxa usando a função do banco (alternativa)
export async function calculateFeeFromDB(transactionAmount: number): Promise<FeeCalculation | null> {
  try {
    const { data, error } = await supabaseAdmin
      .rpc('get_platform_fee_v2', { transaction_amount: transactionAmount });

    if (error) throw error;
    
    if (data && data.length > 0) {
      const result = data[0];
      return {
        transactionAmount,
        totalFee: result.total_fee,
        totalFeePercentage: result.total_fee_percentage,
        platformFee: result.platform_fee,
        platformPercentage: result.platform_percentage,
        mercadopagoFee: result.mercadopago_fee,
        sellerReceives: result.seller_receives,
        tierDescription: result.tier_description
      };
    }
    
    return null;
  } catch (error) {
    console.error('Erro ao calcular taxa do DB:', error);
    return null;
  }
}

// Simular várias faixas de preço (para exibição)
export async function getFeesSimulation(): Promise<FeeCalculation[]> {
  const testAmounts = [20, 50, 100, 150, 300, 500, 750, 1000, 2000];
  const simulations: FeeCalculation[] = [];

  for (const amount of testAmounts) {
    const calc = await calculateFee(amount);
    simulations.push(calc);
  }

  return simulations;
}

// Atualizar faixa de taxa (admin)
export async function updateFeeTier(
  tierId: string,
  updates: Partial<Pick<FeeTier, 'fee_percentage' | 'active'>>
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('platform_fee_tiers')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', tierId);

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Erro ao atualizar faixa:', error);
    return { success: false, error: error.message };
  }
}

// Buscar configuração da plataforma
export async function getPlatformSetting(key: string): Promise<any> {
  try {
    const { data, error } = await supabaseAdmin
      .from('platform_settings')
      .select('value')
      .eq('key', key)
      .single();

    if (error) throw error;
    return data?.value;
  } catch (error) {
    console.error('Erro ao buscar configuração:', error);
    return null;
  }
}

// Atualizar configuração da plataforma (admin)
export async function updatePlatformSetting(
  key: string,
  value: any,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('platform_settings')
      .upsert({
        key,
        value,
        updated_at: new Date().toISOString(),
        updated_by: userId
      });

    if (error) throw error;
    return { success: true };
  } catch (error: any) {
    console.error('Erro ao atualizar configuração:', error);
    return { success: false, error: error.message };
  }
}
