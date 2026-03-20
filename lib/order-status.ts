import { Json } from './database.types';
import { getSupabaseAdminSingleton } from './supabase-admin';

type OrderStatus =
  | 'PAYMENT_PENDING'
  | 'AWAITING_SELLER'
  | 'SELLER_ACCEPTED'
  | 'DELIVERY_SUBMITTED'
  | 'IN_REVIEW'
  | 'COMPLETED'
  | 'DISPUTE'
  | 'CANCELLED';

const supabase = getSupabaseAdminSingleton();
const ordersTable = supabase.from('orders') as any;
const orderStatusHistoryTable = supabase.from('order_status_history') as any;

export async function transitionOrderStatus(params: {
  orderId: string;
  nextStatus: OrderStatus;
  changedBy?: string | null;
  reason?: string | null;
  metadata?: Json | null;
  extraOrderFields?: Record<string, unknown>;
}) {
  const { orderId, nextStatus, changedBy = null, reason = null, metadata = null, extraOrderFields = {} } = params;

  const { data: currentOrder, error: fetchError } = await ordersTable
    .select('status')
    .eq('id', orderId)
    .single();

  if (fetchError || !currentOrder) {
    throw new Error(fetchError?.message || 'Ordem não encontrada');
  }

  const previousStatus = currentOrder.status as OrderStatus | null;

  await ordersTable
    .update({
      status: nextStatus,
      updated_at: new Date().toISOString(),
      ...extraOrderFields
    })
    .eq('id', orderId);

  if (previousStatus !== nextStatus) {
    await orderStatusHistoryTable.insert({
      order_id: orderId,
      old_status: previousStatus,
      new_status: nextStatus,
      changed_by: changedBy,
      reason,
      metadata
    });
  }

  return { previousStatus, nextStatus };
}
