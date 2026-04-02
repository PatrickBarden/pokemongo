'use server';

import { getSupabaseAdminSingleton } from '@/lib/supabase-admin';
import { requireAdmin } from '@/lib/auth-guard';

const supabase = getSupabaseAdminSingleton();
const db = supabase as any;

export type CouponDiscountType = 'percentage' | 'fixed';
export type CouponRewardType = 'percentage' | 'fixed';

export interface Coupon {
  id: string;
  code: string;
  description: string | null;
  owner_id: string | null;
  owner?: { id: string; display_name: string; email: string } | null;
  discount_type: CouponDiscountType;
  discount_value: number;
  reward_type: CouponRewardType | null;
  reward_value: number;
  min_order_value: number;
  max_discount: number | null;
  max_uses: number | null;
  uses_count: number;
  expires_at: string | null;
  active: boolean;
  description_text?: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CouponValidationResult {
  valid: boolean;
  coupon?: Coupon;
  discountAmount: number;
  finalPrice: number;
  error?: string;
}

// ─── Validar cupom (uso no checkout) ────────────────────────────────────────
export async function validateCoupon(
  code: string,
  userId: string,
  orderAmount: number
): Promise<CouponValidationResult> {
  const invalid = (error: string): CouponValidationResult => ({
    valid: false,
    discountAmount: 0,
    finalPrice: orderAmount,
    error,
  });

  if (!code?.trim()) return invalid('Código de cupom inválido.');

  const { data: coupon, error } = await db
    .from('coupons')
    .select('*, owner:owner_id(id, display_name, email)')
    .eq('code', code.trim().toUpperCase())
    .eq('active', true)
    .maybeSingle();

  if (error || !coupon) return invalid('Cupom não encontrado ou inativo.');

  if (coupon.expires_at && new Date(coupon.expires_at) < new Date()) {
    return invalid('Este cupom expirou.');
  }

  if (coupon.max_uses !== null && coupon.uses_count >= coupon.max_uses) {
    return invalid('Este cupom atingiu o limite de usos.');
  }

  if (orderAmount < coupon.min_order_value) {
    return invalid(
      `Pedido mínimo de R$ ${Number(coupon.min_order_value).toFixed(2)} para este cupom.`
    );
  }

  // Verificar se usuário já usou este cupom
  const { data: existingUsage } = await db
    .from('coupon_usages')
    .select('id')
    .eq('coupon_id', coupon.id)
    .eq('used_by', userId)
    .maybeSingle();

  if (existingUsage) return invalid('Você já utilizou este cupom.');

  // Calcular desconto
  let discountAmount = 0;
  if (coupon.discount_type === 'percentage') {
    discountAmount = Math.round(orderAmount * (coupon.discount_value / 100) * 100) / 100;
    if (coupon.max_discount !== null) {
      discountAmount = Math.min(discountAmount, coupon.max_discount);
    }
  } else {
    discountAmount = Math.min(coupon.discount_value, orderAmount);
  }

  discountAmount = Math.round(discountAmount * 100) / 100;
  const finalPrice = Math.max(0, Math.round((orderAmount - discountAmount) * 100) / 100);

  return { valid: true, coupon, discountAmount, finalPrice };
}

// ─── Registrar uso + creditar recompensa ────────────────────────────────────
export async function applyCouponUsage(
  couponId: string,
  orderId: string,
  userId: string,
  discountAmount: number
): Promise<{ success: boolean; rewardAmount: number; error?: string }> {
  const { data: coupon, error: couponError } = await db
    .from('coupons')
    .select('*')
    .eq('id', couponId)
    .single();

  if (couponError || !coupon) {
    return { success: false, rewardAmount: 0, error: 'Cupom não encontrado.' };
  }

  // Calcular recompensa para o influenciador
  let rewardAmount = 0;
  if (coupon.owner_id && coupon.reward_value > 0) {
    if (coupon.reward_type === 'percentage') {
      rewardAmount = Math.round(discountAmount * (coupon.reward_value / 100) * 100) / 100;
    } else {
      rewardAmount = coupon.reward_value;
    }
  }

  // Registrar uso
  const { error: usageError } = await db
    .from('coupon_usages')
    .insert({
      coupon_id: couponId,
      used_by: userId,
      order_id: orderId,
      discount_amount: discountAmount,
      reward_amount: rewardAmount,
      reward_paid: false,
    });

  if (usageError) {
    return { success: false, rewardAmount: 0, error: usageError.message };
  }

  // Incrementar contador de usos
  await db
    .from('coupons')
    .update({ uses_count: (coupon.uses_count || 0) + 1, updated_at: new Date().toISOString() })
    .eq('id', couponId);

  return { success: true, rewardAmount };
}

// ─── Creditar recompensa na carteira do influenciador ───────────────────────
export async function creditInfluencerReward(orderId: string): Promise<void> {
  const { data: usage } = await db
    .from('coupon_usages')
    .select('*, coupon:coupon_id(*)')
    .eq('order_id', orderId)
    .eq('reward_paid', false)
    .maybeSingle();

  if (!usage || !usage.coupon?.owner_id || usage.reward_amount <= 0) return;

  // Creditar carteira do influenciador
  const { data: wallet } = await db
    .from('wallets')
    .select('id, balance')
    .eq('user_id', usage.coupon.owner_id)
    .maybeSingle();

  if (wallet) {
    await db
      .from('wallets')
      .update({
        balance: Math.round((parseFloat(wallet.balance) + usage.reward_amount) * 100) / 100,
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', usage.coupon.owner_id);
  }

  // Criar notificação para o influenciador
  await db.from('notifications').insert({
    user_id: usage.coupon.owner_id,
    type: 'coupon_reward',
    title: 'Recompensa de cupom recebida! 🎉',
    message: `Seu cupom **${usage.coupon.code}** foi usado. Você recebeu R$ ${usage.reward_amount.toFixed(2)} na sua carteira!`,
    read: false,
  });

  // Marcar recompensa como paga
  await db
    .from('coupon_usages')
    .update({ reward_paid: true })
    .eq('id', usage.id);
}

// ─── Admin: Criar cupom ──────────────────────────────────────────────────────
export async function createCoupon(data: {
  code: string;
  description?: string;
  owner_id?: string | null;
  discount_type: CouponDiscountType;
  discount_value: number;
  reward_type?: CouponRewardType | null;
  reward_value?: number;
  min_order_value?: number;
  max_discount?: number | null;
  max_uses?: number | null;
  expires_at?: string | null;
}): Promise<{ success: boolean; coupon?: Coupon; error?: string }> {
  await requireAdmin();

  const code = data.code.trim().toUpperCase();

  const { data: existing } = await db
    .from('coupons')
    .select('id')
    .eq('code', code)
    .maybeSingle();

  if (existing) return { success: false, error: 'Já existe um cupom com este código.' };

  const { data: coupon, error } = await db
    .from('coupons')
    .insert({
      code,
      description: data.description || null,
      owner_id: data.owner_id || null,
      discount_type: data.discount_type,
      discount_value: data.discount_value,
      reward_type: data.reward_type || null,
      reward_value: data.reward_value ?? 0,
      min_order_value: data.min_order_value ?? 0,
      max_discount: data.max_discount || null,
      max_uses: data.max_uses || null,
      expires_at: data.expires_at || null,
      active: true,
    })
    .select()
    .single();

  if (error) return { success: false, error: error.message };

  return { success: true, coupon };
}

// ─── Admin: Atualizar cupom ──────────────────────────────────────────────────
export async function updateCoupon(
  id: string,
  data: Partial<Pick<Coupon, 'active' | 'description' | 'max_uses' | 'expires_at' | 'reward_value' | 'reward_type'>>
): Promise<{ success: boolean; error?: string }> {
  await requireAdmin();

  const { error } = await db
    .from('coupons')
    .update({ ...data, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { success: false, error: error.message };
  return { success: true };
}

// ─── Admin: Listar todos os cupons ──────────────────────────────────────────
export async function listCoupons(): Promise<Coupon[]> {
  await requireAdmin();

  const { data, error } = await db
    .from('coupons')
    .select('*, owner:owner_id(id, display_name, email)')
    .order('created_at', { ascending: false });

  if (error) return [];
  return data || [];
}

// ─── Admin: Estatísticas de um cupom ────────────────────────────────────────
export async function getCouponStats(couponId: string): Promise<{
  totalUses: number;
  totalDiscount: number;
  totalReward: number;
  recentUsages: any[];
}> {
  await requireAdmin();

  const { data: usages } = await db
    .from('coupon_usages')
    .select('*, used_by_user:used_by(display_name, email)')
    .eq('coupon_id', couponId)
    .order('created_at', { ascending: false })
    .limit(20);

  const list = usages || [];

  return {
    totalUses: list.length,
    totalDiscount: list.reduce((acc: number, u: any) => acc + parseFloat(u.discount_amount || 0), 0),
    totalReward: list.reduce((acc: number, u: any) => acc + parseFloat(u.reward_amount || 0), 0),
    recentUsages: list,
  };
}

// ─── Admin: Buscar usuários para selecionar influenciador ───────────────────
export async function searchUsers(query: string): Promise<Array<{ id: string; display_name: string; email: string }>> {
  await requireAdmin();

  const { data } = await db
    .from('users')
    .select('id, display_name, email')
    .or(`display_name.ilike.%${query}%,email.ilike.%${query}%`)
    .limit(10);

  return data || [];
}
