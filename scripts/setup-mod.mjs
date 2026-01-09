import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Carregar .env
config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Variáveis de ambiente não encontradas!');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function main() {
  console.log('🚀 Setup do Sistema de Moderadores\n');

  const testEmail = 'moderador@teste.com';
  const testPassword = 'Mod@123456';
  const testName = 'Moderador Teste';

  // 1. Verificar se usuário já existe
  const { data: existingUser } = await supabase
    .from('users')
    .select('id, role')
    .eq('email', testEmail)
    .single();

  let userId;

  if (existingUser) {
    console.log('👤 Usuário já existe, atualizando para moderador...');
    userId = existingUser.id;
    
    await supabase.from('users').update({ role: 'mod' }).eq('id', userId);
  } else {
    console.log('👤 Criando novo usuário moderador...');
    
    // Criar no auth
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });

    if (authError) {
      console.error('❌ Erro auth:', authError.message);
      process.exit(1);
    }

    userId = authData.user.id;

    // Criar em users
    await supabase.from('users').insert({
      id: userId,
      email: testEmail,
      display_name: testName,
      role: 'mod',
    });

    // Criar profile
    await supabase.from('profiles').insert({ user_id: userId });
    
    console.log('✅ Usuário criado no auth e users!');
  }

  // 2. Criar/atualizar permissões
  console.log('🔐 Configurando permissões...');
  
  const { error: permError } = await supabase
    .from('moderator_permissions')
    .upsert({
      user_id: userId,
      can_view_orders: true,
      can_manage_orders: true,
      can_resolve_disputes: true,
      can_view_users: true,
      can_ban_users: false,
      can_warn_users: true,
      can_view_listings: true,
      can_moderate_listings: true,
      can_delete_listings: false,
      can_view_chats: true,
      can_respond_chats: true,
      can_view_finances: false,
      can_process_payouts: false,
      notes: 'Moderador de teste criado automaticamente',
    }, { onConflict: 'user_id' });

  if (permError) {
    console.log('⚠️ Tabela de permissões pode não existir:', permError.message);
    console.log('📝 Execute a migração SQL primeiro no Supabase Dashboard');
  } else {
    console.log('✅ Permissões configuradas!');
  }

  // 3. Criar carteira se não existir
  await supabase.from('wallets').upsert({ user_id: userId }, { onConflict: 'user_id' });

  console.log('\n========================================');
  console.log('🎉 MODERADOR DE TESTE PRONTO!');
  console.log('========================================');
  console.log(`📧 Email: ${testEmail}`);
  console.log(`🔑 Senha: ${testPassword}`);
  console.log('========================================');
  console.log('🌐 Login: http://localhost:3000/login');
  console.log('📱 Painel: http://localhost:3000/moderator');
  console.log('========================================\n');
}

main().catch(console.error);
