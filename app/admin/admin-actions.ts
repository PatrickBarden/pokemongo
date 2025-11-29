'use server';

import { getSupabaseAdmin } from '@/lib/supabase-admin';

export type AdminNotification = {
  id: string;
  type: 'dispute' | 'payout' | 'order_check' | 'new_user' | 'high_value' | 'payment_approved' | 'payment_pending' | 'payment_rejected' | 'new_order' | 'delivery_submitted';
  title: string;
  description: string;
  link: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  created_at: string;
  read?: boolean;
  metadata?: Record<string, any>;
};

export async function getAdminNotifications(): Promise<AdminNotification[]> {
  const notifications: AdminNotification[] = [];
  const supabaseAdmin = getSupabaseAdmin();

  try {
    // 0. Buscar notificações persistentes da tabela admin_notifications (não lidas)
    const { data: persistentNotifications } = await supabaseAdmin
      .from('admin_notifications')
      .select('*')
      .eq('read', false)
      .order('created_at', { ascending: false })
      .limit(50);

    (persistentNotifications as any)?.forEach((n: any) => {
      notifications.push({
        id: n.id,
        type: n.type,
        title: n.title,
        description: n.description,
        link: n.link || '/admin',
        severity: n.severity,
        created_at: n.created_at,
        read: n.read,
        metadata: n.metadata
      });
    });

    // 1. Buscar Disputas Abertas
    const { data: disputes } = await supabaseAdmin
      .from('disputes')
      .select('id, order_id, reason, created_at')
      .in('status', ['OPEN', 'IN_REVIEW'])
      .order('created_at', { ascending: false });

    (disputes as any)?.forEach((d: any) => {
      // Evitar duplicatas se já existe na tabela persistente
      if (!notifications.some(n => n.id === `disp-${d.id}`)) {
        notifications.push({
          id: `disp-${d.id}`,
          type: 'dispute',
          title: '⚠️ Nova Disputa Aberta',
          description: `Disputa na ordem #${d.order_id.slice(0,8)}. Motivo: ${d.reason}`,
          link: '/admin/disputes',
          severity: 'critical',
          created_at: d.created_at
        });
      }
    });

    // 2. Buscar Payouts Pendentes
    const { data: payouts } = await supabaseAdmin
      .from('payouts')
      .select('id, amount, seller_id, created_at')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    (payouts as any)?.forEach((p: any) => {
      if (!notifications.some(n => n.id === `pay-${p.id}`)) {
        notifications.push({
          id: `pay-${p.id}`,
          type: 'payout',
          title: '💸 Solicitação de Saque',
          description: `Vendedor solicitou saque de R$ ${p.amount.toFixed(2)}`,
          link: '/admin/payouts',
          severity: 'high',
          created_at: p.created_at
        });
      }
    });

    // 3. Ordens Aguardando Confirmação de Entrega (Manual Check)
    const { data: ordersToCheck } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, created_at')
      .eq('status', 'DELIVERY_SUBMITTED')
      .order('created_at', { ascending: false });

    (ordersToCheck as any)?.forEach((o: any) => {
      if (!notifications.some(n => n.id === `ord-${o.id}`)) {
        notifications.push({
          id: `ord-${o.id}`,
          type: 'order_check',
          title: '📦 Verificar Entrega',
          description: `Ordem #${o.order_number} marcada como entregue. Verifique as provas.`,
          link: `/admin/orders/${o.id}`,
          severity: 'medium',
          created_at: o.created_at
        });
      }
    });

    // 4. Novos Usuários (Últimas 24h)
    const oneDayAgo = new Date();
    oneDayAgo.setDate(oneDayAgo.getDate() - 1);

    const { data: newUsers } = await supabaseAdmin
      .from('users')
      .select('id, display_name, created_at')
      .gte('created_at', oneDayAgo.toISOString())
      .order('created_at', { ascending: false });

    if (newUsers && newUsers.length > 0) {
      // Agrupar para não poluir
      const firstUser = newUsers[0] as any;
      if (!notifications.some(n => n.id === 'new-users-summary')) {
        notifications.push({
          id: 'new-users-summary',
          type: 'new_user',
          title: '👤 Novos Usuários',
          description: `${newUsers.length} novos usuários cadastrados nas últimas 24h.`,
          link: '/admin/users',
          severity: 'low',
          created_at: firstUser.created_at
        });
      }
    }

    // Ordenar todas por data (mais recente primeiro)
    return notifications.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

  } catch (error) {
    console.error('Erro ao gerar notificações admin:', error);
    return [];
  }
}

// Marcar notificação como lida
export async function markNotificationAsRead(notificationId: string): Promise<boolean> {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    // Se for uma notificação persistente (UUID)
    if (notificationId.length === 36) {
      const { error } = await (supabaseAdmin as any)
        .from('admin_notifications')
        .update({ 
          read: true, 
          read_at: new Date().toISOString() 
        })
        .eq('id', notificationId);
      
      if (error) throw error;
    }
    return true;
  } catch (error) {
    console.error('Erro ao marcar notificação como lida:', error);
    return false;
  }
}

// Marcar todas as notificações como lidas
export async function markAllNotificationsAsRead(): Promise<boolean> {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    const { error } = await (supabaseAdmin as any)
      .from('admin_notifications')
      .update({ 
        read: true, 
        read_at: new Date().toISOString() 
      })
      .eq('read', false);
    
    if (error) throw error;
    return true;
  } catch (error) {
    console.error('Erro ao marcar todas notificações como lidas:', error);
    return false;
  }
}

// Buscar contagem de notificações não lidas
export async function getUnreadNotificationCount(): Promise<number> {
  const supabaseAdmin = getSupabaseAdmin();
  try {
    const { count, error } = await supabaseAdmin
      .from('admin_notifications')
      .select('*', { count: 'exact', head: true })
      .eq('read', false);
    
    if (error) throw error;
    return count || 0;
  } catch (error) {
    console.error('Erro ao buscar contagem de notificações:', error);
    return 0;
  }
}
