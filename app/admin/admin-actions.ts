'use server';

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente Admin para ignorar RLS
const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export type AdminNotification = {
  id: string;
  type: 'dispute' | 'payout' | 'order_check' | 'new_user' | 'high_value';
  title: string;
  description: string;
  link: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  created_at: string;
};

export async function getAdminNotifications(): Promise<AdminNotification[]> {
  const notifications: AdminNotification[] = [];

  try {
    // 1. Buscar Disputas Abertas
    const { data: disputes } = await supabaseAdmin
      .from('disputes')
      .select('id, order_id, reason, created_at')
      .in('status', ['OPEN', 'IN_REVIEW'])
      .order('created_at', { ascending: false });

    (disputes as any)?.forEach((d: any) => {
      notifications.push({
        id: `disp-${d.id}`,
        type: 'dispute',
        title: 'Nova Disputa Aberta',
        description: `Disputa na ordem #${d.order_id.slice(0,8)}. Motivo: ${d.reason}`,
        link: '/admin/disputes',
        severity: 'critical',
        created_at: d.created_at
      });
    });

    // 2. Buscar Payouts Pendentes
    const { data: payouts } = await supabaseAdmin
      .from('payouts')
      .select('id, amount, seller_id, created_at')
      .eq('status', 'PENDING')
      .order('created_at', { ascending: false });

    (payouts as any)?.forEach((p: any) => {
      notifications.push({
        id: `pay-${p.id}`,
        type: 'payout',
        title: 'Solicitação de Saque',
        description: `Vendedor solicitou saque de R$ ${p.amount.toFixed(2)}`,
        link: '/admin/payouts',
        severity: 'high',
        created_at: p.created_at
      });
    });

    // 3. Ordens Aguardando Confirmação de Entrega (Manual Check)
    const { data: ordersToCheck } = await supabaseAdmin
      .from('orders')
      .select('id, order_number, created_at')
      .eq('status', 'DELIVERY_SUBMITTED')
      .order('created_at', { ascending: false });

    (ordersToCheck as any)?.forEach((o: any) => {
      notifications.push({
        id: `ord-${o.id}`,
        type: 'order_check',
        title: 'Verificar Entrega',
        description: `Ordem #${o.order_number} marcada como entregue. Verifique as provas.`,
        link: `/admin/orders/${o.id}`,
        severity: 'medium',
        created_at: o.created_at
      });
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
        notifications.push({
            id: 'new-users-summary',
            type: 'new_user',
            title: 'Novos Usuários',
            description: `${newUsers.length} novos usuários cadastrados nas últimas 24h.`,
            link: '/admin/users',
            severity: 'low',
            created_at: firstUser.created_at
        });
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
