import { getSupabaseAdmin } from '@/lib/supabase-admin';

export async function listOrders() {
  const supabaseAdmin = getSupabaseAdmin();
  
  const { data } = await supabaseAdmin
    .from('orders')
    .select(`
      *,
      buyer:buyer_id(id, display_name, email),
      seller:seller_id(id, display_name, email),
      listing:listing_id(id, title, category)
    `)
    .order('created_at', { ascending: false });

  return data || [];
}

export async function getOrderStats() {
  const supabaseAdmin = getSupabaseAdmin();
  
  const { data: orders } = await supabaseAdmin
    .from('orders')
    .select('id, status, amount_total, platform_fee, created_at');

  if (!orders) return null;

  const openOrders = (orders as any[]).filter((o: any) =>
    ['PAYMENT_PENDING', 'AWAITING_SELLER', 'SELLER_ACCEPTED', 'DELIVERY_SUBMITTED'].includes(o.status)
  ).length;

  const inReview = (orders as any[]).filter((o: any) => o.status === 'IN_REVIEW').length;

  const { data: disputes } = await supabaseAdmin
    .from('disputes')
    .select('id, status')
    .in('status', ['OPEN', 'IN_REVIEW']);

  const totalRevenue = (orders as any[])
    .filter((o: any) => o.status === 'COMPLETED')
    .reduce((sum: number, o: any) => sum + Number(o.platform_fee), 0);

  const completed = (orders as any[]).filter((o: any) => o.status === 'COMPLETED').length;
  const paid = (orders as any[]).filter((o: any) => o.status !== 'PAYMENT_PENDING').length;
  const conversionRate = paid > 0 ? (completed / paid) * 100 : 0;

  const completedOrders = (orders as any[]).filter((o: any) => o.status === 'COMPLETED');
  const avgCompletionTime = completedOrders.length > 0
    ? completedOrders.reduce((sum: number, o: any) => {
        const created = new Date(o.created_at).getTime();
        const now = new Date().getTime();
        return sum + (now - created);
      }, 0) / completedOrders.length / (1000 * 60 * 60)
    : 0;

  return {
    openOrders,
    inReview,
    disputes: disputes?.length || 0,
    revenue: totalRevenue,
    conversionRate,
    avgCompletionTime,
  };
}
