'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export interface Wallet {
  id: string;
  user_id: string;
  balance: number;
  pending_balance: number;
  total_deposited: number;
  total_withdrawn: number;
  total_earned: number;
  total_spent: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreditPackage {
  id: string;
  name: string;
  slug: string;
  description: string;
  credits: number;
  price: number;
  bonus_credits: number;
  bonus_percentage: number;
  is_popular: boolean;
  is_best_value: boolean;
  display_order: number;
  icon: string;
  color: string;
  active: boolean;
}

export interface WalletTransaction {
  id: string;
  wallet_id: string;
  user_id: string;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string | null;
  reference_type: string | null;
  reference_id: string | null;
  metadata: Record<string, any>;
  status: string;
  created_at: string;
}

export interface CreditPurchase {
  id: string;
  user_id: string;
  wallet_id: string;
  package_id: string;
  credits_amount: number;
  bonus_amount: number;
  total_credits: number;
  price_paid: number;
  payment_status: string;
  preference_id: string | null;
  created_at: string;
  package?: CreditPackage;
}

export async function getWallet(userId: string): Promise<Wallet | null> {
  const { data, error } = await supabaseAdmin
    .from('wallets')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error) {
    console.error('Error fetching wallet:', error);
    // Se não existe, criar
    if (error.code === 'PGRST116') {
      const { data: newWallet, error: createError } = await supabaseAdmin
        .from('wallets')
        .insert({ user_id: userId })
        .select()
        .single();
      
      if (createError) {
        console.error('Error creating wallet:', createError);
        return null;
      }
      return newWallet;
    }
    return null;
  }

  return data;
}

export async function getCreditPackages(): Promise<CreditPackage[]> {
  const { data, error } = await supabaseAdmin
    .from('credit_packages')
    .select('*')
    .eq('active', true)
    .order('display_order', { ascending: true });

  if (error) {
    console.error('Error fetching credit packages:', error);
    return [];
  }

  return data || [];
}

export async function getWalletTransactions(
  userId: string,
  limit: number = 20,
  offset: number = 0
): Promise<{ transactions: WalletTransaction[]; total: number }> {
  const { data, error, count } = await supabaseAdmin
    .from('wallet_transactions')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1);

  if (error) {
    console.error('Error fetching transactions:', error);
    return { transactions: [], total: 0 };
  }

  return { transactions: data || [], total: count || 0 };
}

export async function createCreditPurchase(
  userId: string,
  packageId: string
): Promise<{ success: boolean; purchase?: CreditPurchase; error?: string }> {
  try {
    // Buscar pacote
    const { data: pkg, error: pkgError } = await supabaseAdmin
      .from('credit_packages')
      .select('*')
      .eq('id', packageId)
      .eq('active', true)
      .single();

    if (pkgError || !pkg) {
      return { success: false, error: 'Pacote não encontrado ou inativo' };
    }

    // Buscar ou criar carteira
    let wallet = await getWallet(userId);
    if (!wallet) {
      return { success: false, error: 'Erro ao acessar carteira' };
    }

    const totalCredits = parseFloat(pkg.credits) + parseFloat(pkg.bonus_credits);

    // Criar registro de compra
    const { data: purchase, error: purchaseError } = await supabaseAdmin
      .from('credit_purchases')
      .insert({
        user_id: userId,
        wallet_id: wallet.id,
        package_id: packageId,
        credits_amount: pkg.credits,
        bonus_amount: pkg.bonus_credits,
        total_credits: totalCredits,
        price_paid: pkg.price,
        payment_status: 'PENDING',
      })
      .select()
      .single();

    if (purchaseError) {
      console.error('Error creating purchase:', purchaseError);
      return { success: false, error: 'Erro ao criar compra' };
    }

    return { success: true, purchase };
  } catch (error) {
    console.error('Error in createCreditPurchase:', error);
    return { success: false, error: 'Erro interno' };
  }
}

export async function processCreditPurchasePayment(
  purchaseId: string,
  paymentId: string,
  paymentStatus: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Buscar compra
    const { data: purchase, error: fetchError } = await supabaseAdmin
      .from('credit_purchases')
      .select('*, package:package_id(*)')
      .eq('id', purchaseId)
      .single();

    if (fetchError || !purchase) {
      return { success: false, error: 'Compra não encontrada' };
    }

    if (purchase.payment_status === 'APPROVED') {
      return { success: true }; // Já processada
    }

    if (paymentStatus === 'approved') {
      // Atualizar compra
      await supabaseAdmin
        .from('credit_purchases')
        .update({
          payment_status: 'APPROVED',
          payment_id: paymentId,
          paid_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', purchaseId);

      // Adicionar créditos via função do banco
      const { error: walletError } = await supabaseAdmin.rpc('update_wallet_balance', {
        p_user_id: purchase.user_id,
        p_amount: purchase.total_credits,
        p_type: 'DEPOSIT',
        p_description: `Compra de pacote ${purchase.package?.name || 'de créditos'}`,
        p_reference_type: 'credit_purchase',
        p_reference_id: purchaseId,
        p_metadata: {
          package_id: purchase.package_id,
          credits: purchase.credits_amount,
          bonus: purchase.bonus_amount,
        },
      });

      if (walletError) {
        console.error('Error updating wallet:', walletError);
        return { success: false, error: 'Erro ao adicionar créditos' };
      }

      revalidatePath('/dashboard/wallet');
      return { success: true };
    } else {
      // Atualizar como rejeitado/cancelado
      await supabaseAdmin
        .from('credit_purchases')
        .update({
          payment_status: paymentStatus === 'rejected' ? 'REJECTED' : 'CANCELLED',
          payment_id: paymentId,
          updated_at: new Date().toISOString(),
        })
        .eq('id', purchaseId);

      return { success: true };
    }
  } catch (error) {
    console.error('Error processing payment:', error);
    return { success: false, error: 'Erro interno' };
  }
}

export async function useWalletBalance(
  userId: string,
  amount: number,
  description: string,
  referenceType: string,
  referenceId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const wallet = await getWallet(userId);
    if (!wallet) {
      return { success: false, error: 'Carteira não encontrada' };
    }

    if (wallet.balance < amount) {
      return { success: false, error: 'Saldo insuficiente' };
    }

    const { error } = await supabaseAdmin.rpc('update_wallet_balance', {
      p_user_id: userId,
      p_amount: -amount, // Negativo para débito
      p_type: 'PURCHASE_DEBIT',
      p_description: description,
      p_reference_type: referenceType,
      p_reference_id: referenceId,
      p_metadata: {},
    });

    if (error) {
      console.error('Error using balance:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/wallet');
    return { success: true };
  } catch (error) {
    console.error('Error in useWalletBalance:', error);
    return { success: false, error: 'Erro interno' };
  }
}

export async function creditSaleToWallet(
  userId: string,
  amount: number,
  orderId: string,
  description: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin.rpc('update_wallet_balance', {
      p_user_id: userId,
      p_amount: amount,
      p_type: 'SALE_CREDIT',
      p_description: description,
      p_reference_type: 'order',
      p_reference_id: orderId,
      p_metadata: {},
    });

    if (error) {
      console.error('Error crediting sale:', error);
      return { success: false, error: error.message };
    }

    revalidatePath('/dashboard/wallet');
    return { success: true };
  } catch (error) {
    console.error('Error in creditSaleToWallet:', error);
    return { success: false, error: 'Erro interno' };
  }
}

export async function requestWithdrawal(
  userId: string,
  amount: number,
  pixKey: string,
  pixKeyType: 'cpf' | 'cnpj' | 'email' | 'phone' | 'random'
): Promise<{ success: boolean; withdrawalId?: string; error?: string }> {
  try {
    const wallet = await getWallet(userId);
    if (!wallet) {
      return { success: false, error: 'Carteira não encontrada' };
    }

    if (wallet.balance < amount) {
      return { success: false, error: 'Saldo insuficiente' };
    }

    const fee = 0; // Pode implementar taxa de saque
    const netAmount = amount - fee;

    // Criar solicitação de saque
    const { data: withdrawal, error: withdrawalError } = await supabaseAdmin
      .from('wallet_withdrawals')
      .insert({
        user_id: userId,
        wallet_id: wallet.id,
        amount: amount,
        fee: fee,
        net_amount: netAmount,
        pix_key: pixKey,
        pix_key_type: pixKeyType,
        status: 'PENDING',
      })
      .select()
      .single();

    if (withdrawalError) {
      console.error('Error creating withdrawal:', withdrawalError);
      return { success: false, error: 'Erro ao criar solicitação' };
    }

    // Debitar do saldo imediatamente (fica como pendente)
    const { error: debitError } = await supabaseAdmin.rpc('update_wallet_balance', {
      p_user_id: userId,
      p_amount: -amount,
      p_type: 'WITHDRAWAL',
      p_description: `Saque via PIX - ${pixKeyType.toUpperCase()}`,
      p_reference_type: 'withdrawal',
      p_reference_id: withdrawal.id,
      p_metadata: { pix_key_type: pixKeyType },
    });

    if (debitError) {
      // Reverter criação do saque
      await supabaseAdmin
        .from('wallet_withdrawals')
        .delete()
        .eq('id', withdrawal.id);
      return { success: false, error: 'Erro ao processar saque' };
    }

    revalidatePath('/dashboard/wallet');
    return { success: true, withdrawalId: withdrawal.id };
  } catch (error) {
    console.error('Error in requestWithdrawal:', error);
    return { success: false, error: 'Erro interno' };
  }
}

export async function getCreditPurchaseHistory(
  userId: string,
  limit: number = 10
): Promise<CreditPurchase[]> {
  const { data, error } = await supabaseAdmin
    .from('credit_purchases')
    .select('*, package:package_id(*)')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching purchase history:', error);
    return [];
  }

  return data || [];
}

export async function getWithdrawalHistory(userId: string, limit: number = 10) {
  const { data, error } = await supabaseAdmin
    .from('wallet_withdrawals')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) {
    console.error('Error fetching withdrawal history:', error);
    return [];
  }

  return data || [];
}
