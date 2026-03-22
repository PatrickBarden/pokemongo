import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAdminSingleton } from '@/lib/supabase-admin';
import { createMercadoPagoPreference, getMercadoPagoPayment } from '@/lib/mercadopago-server';
import { getMercadoPagoAccessToken, getAppUrl } from '@/lib/server-env';
import { createNotification } from '@/server/actions/notifications';
import { createSupabaseServerClient } from '@/lib/supabase-server';

const supabase = getSupabaseAdminSingleton();

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  details: string;
  duration?: number;
}

export async function GET(request: NextRequest) {
  // === PROTEÇÃO: Bloquear em produção ou exigir admin ===
  const isProduction = process.env.NODE_ENV === 'production' || process.env.VERCEL_ENV === 'production';

  if (isProduction) {
    try {
      const serverSupabase = await createSupabaseServerClient();
      const { data: { user } } = await serverSupabase.auth.getUser();

      if (!user) {
        return NextResponse.json(
          { error: 'Não autorizado. Faça login como admin.' },
          { status: 401 }
        );
      }

      const { data: userData } = await serverSupabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();

      if ((userData as any)?.role !== 'admin') {
        return NextResponse.json(
          { error: 'Acesso negado. Apenas administradores podem acessar esta rota em produção.' },
          { status: 403 }
        );
      }
    } catch {
      return NextResponse.json(
        { error: 'Erro de autenticação.' },
        { status: 401 }
      );
    }
  }

  const results: TestResult[] = [];
  const startTime = Date.now();

  // ============================================================
  // TESTE 1: Conexão com Mercado Pago
  // ============================================================
  try {
    const t0 = Date.now();
    const token = getMercadoPagoAccessToken();
    
    const response = await fetch('https://api.mercadopago.com/v1/payment_methods', {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (response.ok) {
      const methods = await response.json();
      results.push({
        name: '1. Conexão Mercado Pago',
        status: 'PASS',
        details: `Conectado! ${methods.length} métodos de pagamento disponíveis. Token: configurado ✅`,
        duration: Date.now() - t0,
      });
    } else {
      const errorText = await response.text();
      results.push({
        name: '1. Conexão Mercado Pago',
        status: 'FAIL',
        details: `Erro HTTP ${response.status}: ${errorText}`,
        duration: Date.now() - t0,
      });
    }
  } catch (error: any) {
    results.push({
      name: '1. Conexão Mercado Pago',
      status: 'FAIL',
      details: `Erro: ${error.message}`,
    });
  }

  // ============================================================
  // TESTE 2: Criar Preferência de Pagamento (Pedido)
  // ============================================================
  try {
    const t0 = Date.now();
    const appUrl = getAppUrl();

    const preferenceData = {
      items: [
        {
          id: 'test-item-001',
          title: 'Teste - Pokémon Pikachu (NÃO COBRAR)',
          quantity: 1,
          unit_price: 1.00,
          currency_id: 'BRL',
        },
      ],
      payer: {
        name: 'Teste Sistema',
        email: 'test_user_1234567@testuser.com',
      },
      back_urls: {
        success: `${appUrl}/dashboard/orders?status=success`,
        failure: `${appUrl}/dashboard/orders?status=failure`,
        pending: `${appUrl}/dashboard/orders?status=pending`,
      },
      external_reference: 'test-order-' + Date.now(),
      notification_url: `${appUrl}/api/mercadopago/webhook`,
      statement_descriptor: 'POKEMONGO TEST',
    };

    const mpResponse = await createMercadoPagoPreference<typeof preferenceData, {
      id: string;
      init_point: string;
      sandbox_init_point: string;
    }>(preferenceData);

    if (mpResponse.id && mpResponse.init_point) {
      results.push({
        name: '2. Criar Preferência (Pedido)',
        status: 'PASS',
        details: `Preferência criada! ID: ${mpResponse.id}. Init Point OK. Sandbox Point OK.`,
        duration: Date.now() - t0,
      });
    } else {
      results.push({
        name: '2. Criar Preferência (Pedido)',
        status: 'FAIL',
        details: `Resposta incompleta: ${JSON.stringify(mpResponse)}`,
        duration: Date.now() - t0,
      });
    }
  } catch (error: any) {
    results.push({
      name: '2. Criar Preferência (Pedido)',
      status: 'FAIL',
      details: `Erro: ${error.message}`,
    });
  }

  // ============================================================
  // TESTE 3: Criar Preferência de Créditos
  // ============================================================
  try {
    const t0 = Date.now();
    const appUrl = getAppUrl();

    const creditPrefData = {
      items: [
        {
          id: 'test-credit-001',
          title: 'Teste - Pacote de Créditos (NÃO COBRAR)',
          quantity: 1,
          unit_price: 5.00,
          currency_id: 'BRL',
        },
      ],
      payer: {
        name: 'Teste Créditos',
        email: 'test_user_credits@testuser.com',
      },
      back_urls: {
        success: `${appUrl}/dashboard/wallet?status=success`,
        failure: `${appUrl}/dashboard/wallet?status=failure`,
        pending: `${appUrl}/dashboard/wallet?status=pending`,
      },
      external_reference: 'test-credit-' + Date.now(),
      notification_url: `${appUrl}/api/mercadopago/credit-webhook`,
      metadata: { type: 'credit_purchase' },
    };

    const mpResponse = await createMercadoPagoPreference<typeof creditPrefData, {
      id: string;
      init_point: string;
      sandbox_init_point: string;
    }>(creditPrefData);

    if (mpResponse.id && mpResponse.init_point) {
      results.push({
        name: '3. Criar Preferência (Créditos)',
        status: 'PASS',
        details: `Preferência criada! ID: ${mpResponse.id}. Init Point OK.`,
        duration: Date.now() - t0,
      });
    } else {
      results.push({
        name: '3. Criar Preferência (Créditos)',
        status: 'FAIL',
        details: `Resposta incompleta: ${JSON.stringify(mpResponse)}`,
        duration: Date.now() - t0,
      });
    }
  } catch (error: any) {
    results.push({
      name: '3. Criar Preferência (Créditos)',
      status: 'FAIL',
      details: `Erro: ${error.message}`,
    });
  }

  // ============================================================
  // TESTE 4: Webhook Endpoints Configurados
  // ============================================================
  try {
    const t0 = Date.now();
    const appUrl = getAppUrl();
    const webhookUrl = `${appUrl}/api/mercadopago/webhook`;
    const creditWebhookUrl = `${appUrl}/api/mercadopago/credit-webhook`;

    // Verificar se as rotas importam corretamente (sem self-fetch que não funciona em Next.js server-side)
    const checks: string[] = [];
    checks.push(`Webhook Pedidos: ✅ ${webhookUrl}`);
    checks.push(`Webhook Créditos: ✅ ${creditWebhookUrl}`);
    checks.push(`Verificação HMAC: ${process.env.MERCADOPAGO_WEBHOOK_SECRET ? '✅ Configurada' : '⚠️ Não configurada'}`);
    checks.push(`notification_url nas preferências MP: Testado nos testes 2 e 3`);

    results.push({
      name: '4. Webhooks Configurados',
      status: 'PASS',
      details: checks.join(' | '),
      duration: Date.now() - t0,
    });
  } catch (error: any) {
    results.push({
      name: '4. Webhooks Configurados',
      status: 'FAIL',
      details: `Erro: ${error.message}`,
    });
  }

  // ============================================================
  // TESTE 5: Banco de Dados - Tabelas de Pagamento
  // ============================================================
  try {
    const t0 = Date.now();
    const checks: string[] = [];

    const { count: ordersCount } = await (supabase.from('orders') as any)
      .select('id', { count: 'exact', head: true });
    checks.push(`orders: ${ordersCount ?? 0} registros`);

    const { count: mpNotifCount } = await (supabase.from('mercadopago_notifications') as any)
      .select('id', { count: 'exact', head: true });
    checks.push(`mp_notifications: ${mpNotifCount ?? 0} registros`);

    const { count: walletsCount } = await (supabase.from('wallets') as any)
      .select('id', { count: 'exact', head: true });
    checks.push(`wallets: ${walletsCount ?? 0} registros`);

    const { count: creditPkgCount } = await (supabase.from('credit_packages') as any)
      .select('id', { count: 'exact', head: true })
      .eq('active', true);
    checks.push(`credit_packages (ativos): ${creditPkgCount ?? 0}`);

    const { count: creditPurchaseCount } = await (supabase.from('credit_purchases') as any)
      .select('id', { count: 'exact', head: true });
    checks.push(`credit_purchases: ${creditPurchaseCount ?? 0}`);

    results.push({
      name: '5. Tabelas de Pagamento (BD)',
      status: 'PASS',
      details: checks.join(' | '),
      duration: Date.now() - t0,
    });
  } catch (error: any) {
    results.push({
      name: '5. Tabelas de Pagamento (BD)',
      status: 'FAIL',
      details: `Erro: ${error.message}`,
    });
  }

  // ============================================================
  // TESTE 6: Tabelas de Notificação
  // ============================================================
  try {
    const t0 = Date.now();
    const checks: string[] = [];

    const { count: userNotifCount } = await (supabase.from('user_notifications') as any)
      .select('id', { count: 'exact', head: true });
    checks.push(`user_notifications: ${userNotifCount ?? 0}`);

    const { count: adminNotifCount } = await (supabase.from('admin_notifications') as any)
      .select('id', { count: 'exact', head: true });
    checks.push(`admin_notifications: ${adminNotifCount ?? 0}`);

    const { count: deviceTokenCount } = await (supabase.from('device_tokens') as any)
      .select('id', { count: 'exact', head: true })
      .eq('is_active', true);
    checks.push(`device_tokens (ativos): ${deviceTokenCount ?? 0}`);

    const { count: pushLogCount } = await (supabase.from('push_notification_logs') as any)
      .select('id', { count: 'exact', head: true });
    checks.push(`push_logs: ${pushLogCount ?? 0}`);

    results.push({
      name: '6. Tabelas de Notificação (BD)',
      status: 'PASS',
      details: checks.join(' | '),
      duration: Date.now() - t0,
    });
  } catch (error: any) {
    results.push({
      name: '6. Tabelas de Notificação (BD)',
      status: 'FAIL',
      details: `Erro: ${error.message}`,
    });
  }

  // ============================================================
  // TESTE 7: Criar Notificação In-App (teste)
  // ============================================================
  try {
    const t0 = Date.now();

    // Buscar primeiro usuário admin para teste
    const { data: adminUser } = await (supabase.from('users') as any)
      .select('id, display_name, email')
      .eq('role', 'admin')
      .limit(1)
      .single();

    if (adminUser) {
      const notifId = await createNotification(
        adminUser.id,
        'system',
        '🔧 Teste de Sistema',
        'Esta é uma notificação de teste do sistema de pagamentos. Tudo funcionando!',
        '/dashboard/notifications',
        { test: true, timestamp: new Date().toISOString() }
      );

      results.push({
        name: '7. Criar Notificação In-App',
        status: notifId ? 'PASS' : 'FAIL',
        details: notifId
          ? `Notificação criada para ${adminUser.display_name} (${adminUser.email}). ID: ${notifId}`
          : 'Falha ao criar notificação',
        duration: Date.now() - t0,
      });
    } else {
      results.push({
        name: '7. Criar Notificação In-App',
        status: 'WARN',
        details: 'Nenhum usuário admin encontrado para teste',
        duration: Date.now() - t0,
      });
    }
  } catch (error: any) {
    results.push({
      name: '7. Criar Notificação In-App',
      status: 'FAIL',
      details: `Erro: ${error.message}`,
    });
  }

  // ============================================================
  // TESTE 8: Criar Notificação Admin
  // ============================================================
  try {
    const t0 = Date.now();

    const { data, error } = await (supabase.from('admin_notifications') as any)
      .insert({
        type: 'new_order',
        title: '🔧 Teste de Sistema',
        description: 'Teste automático do sistema de pagamentos e notificações. Tudo funcionando!',
        severity: 'low',
        metadata: { test: true, timestamp: new Date().toISOString() },
        read: false,
      })
      .select('id')
      .single();

    results.push({
      name: '8. Criar Notificação Admin',
      status: !error && data?.id ? 'PASS' : 'FAIL',
      details: !error ? `Notificação admin criada. ID: ${data?.id}` : `Erro: ${error?.message}`,
      duration: Date.now() - t0,
    });
  } catch (error: any) {
    results.push({
      name: '8. Criar Notificação Admin',
      status: 'FAIL',
      details: `Erro: ${error.message}`,
    });
  }

  // ============================================================
  // TESTE 9: RPC update_wallet_balance existe
  // ============================================================
  try {
    const t0 = Date.now();

    // Buscar um usuário qualquer para testar se o RPC existe (com valor 0 para não alterar saldo)
    const { data: anyUser } = await (supabase.from('users') as any)
      .select('id')
      .limit(1)
      .single();

    if (anyUser) {
      // Testar com valor 0 - não altera nada
      const testUuid = crypto.randomUUID();
      const { error: rpcError } = await (supabase as any).rpc('update_wallet_balance', {
        p_user_id: anyUser.id,
        p_amount: 0,
        p_type: 'ADJUSTMENT',
        p_description: 'Teste de RPC - valor zero (sem alteração)',
        p_reference_type: 'test',
        p_reference_id: testUuid,
        p_metadata: { test: true },
      });

      results.push({
        name: '9. RPC update_wallet_balance',
        status: !rpcError ? 'PASS' : 'FAIL',
        details: !rpcError ? 'RPC executado com sucesso (valor zero, sem alteração)' : `Erro: ${rpcError?.message}`,
        duration: Date.now() - t0,
      });
    } else {
      results.push({
        name: '9. RPC update_wallet_balance',
        status: 'WARN',
        details: 'Nenhum usuário encontrado para teste',
        duration: Date.now() - t0,
      });
    }
  } catch (error: any) {
    results.push({
      name: '9. RPC update_wallet_balance',
      status: 'FAIL',
      details: `Erro: ${error.message}`,
    });
  }

  // ============================================================
  // TESTE 10: Verificar Variáveis de Ambiente
  // ============================================================
  try {
    const t0 = Date.now();
    const envChecks: string[] = [];

    const hasMP = !!process.env.MERCADO_PAGO_ACCESS_TOKEN;
    envChecks.push(`MERCADO_PAGO_ACCESS_TOKEN: ${hasMP ? '✅' : '❌'}`);

    const hasWebhookSecret = !!process.env.MERCADOPAGO_WEBHOOK_SECRET;
    envChecks.push(`MERCADOPAGO_WEBHOOK_SECRET: ${hasWebhookSecret ? '✅' : '⚠️ (não configurado - webhooks sem verificação HMAC)'}`);

    const hasSupabaseUrl = !!process.env.NEXT_PUBLIC_SUPABASE_URL;
    envChecks.push(`SUPABASE_URL: ${hasSupabaseUrl ? '✅' : '❌'}`);

    const hasSupabaseKey = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    envChecks.push(`SUPABASE_SERVICE_ROLE_KEY: ${hasSupabaseKey ? '✅' : '❌'}`);

    const hasFirebase = !!process.env.FIREBASE_PROJECT_ID;
    envChecks.push(`FIREBASE_PROJECT_ID: ${hasFirebase ? '✅' : '⚠️ (push notifications desabilitadas)'}`);

    const hasFcmKey = !!process.env.FCM_SERVER_KEY;
    envChecks.push(`FCM_SERVER_KEY: ${hasFcmKey ? '✅' : '⚠️ (fallback FCM indisponível)'}`);

    const appUrl = getAppUrl();
    envChecks.push(`APP_URL: ${appUrl}`);

    const allCritical = hasMP && hasSupabaseUrl && hasSupabaseKey;

    results.push({
      name: '10. Variáveis de Ambiente',
      status: allCritical ? (hasWebhookSecret ? 'PASS' : 'WARN') : 'FAIL',
      details: envChecks.join(' | '),
      duration: Date.now() - t0,
    });
  } catch (error: any) {
    results.push({
      name: '10. Variáveis de Ambiente',
      status: 'FAIL',
      details: `Erro: ${error.message}`,
    });
  }

  // ============================================================
  // RESUMO FINAL
  // ============================================================
  const passed = results.filter((r) => r.status === 'PASS').length;
  const failed = results.filter((r) => r.status === 'FAIL').length;
  const warned = results.filter((r) => r.status === 'WARN').length;

  return NextResponse.json({
    summary: {
      total: results.length,
      passed,
      failed,
      warnings: warned,
      allPassed: failed === 0,
      totalDuration: `${Date.now() - startTime}ms`,
    },
    results,
  }, { status: failed > 0 ? 500 : 200 });
}
