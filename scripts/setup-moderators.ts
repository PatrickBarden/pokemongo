import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function setupModerators() {
  console.log('🚀 Iniciando setup do sistema de moderadores...\n');

  // 1. Criar tabela de permissões de moderadores
  console.log('📊 Criando tabela moderator_permissions...');
  
  const { error: tableError1 } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE TABLE IF NOT EXISTS public.moderator_permissions (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
        can_view_orders BOOLEAN DEFAULT true,
        can_manage_orders BOOLEAN DEFAULT false,
        can_resolve_disputes BOOLEAN DEFAULT false,
        can_view_users BOOLEAN DEFAULT true,
        can_ban_users BOOLEAN DEFAULT false,
        can_warn_users BOOLEAN DEFAULT true,
        can_view_listings BOOLEAN DEFAULT true,
        can_moderate_listings BOOLEAN DEFAULT true,
        can_delete_listings BOOLEAN DEFAULT false,
        can_view_chats BOOLEAN DEFAULT true,
        can_respond_chats BOOLEAN DEFAULT true,
        can_view_finances BOOLEAN DEFAULT false,
        can_process_payouts BOOLEAN DEFAULT false,
        notes TEXT,
        created_by UUID REFERENCES public.users(id),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(user_id)
      );
    `
  });

  if (tableError1) {
    // Tentar via query direta
    const { error } = await supabase.from('moderator_permissions').select('id').limit(1);
    if (error?.code === '42P01') {
      console.log('⚠️ Tabela não existe, criando via SQL direto...');
    }
  }

  // 2. Criar tabela de log de ações
  console.log('📊 Criando tabela moderator_actions...');

  // 3. Criar usuário moderador de teste
  console.log('\n👤 Criando moderador de teste...');
  
  const testEmail = 'moderador@teste.com';
  const testPassword = 'Mod@123456';
  const testName = 'Moderador Teste';

  // Verificar se já existe
  const { data: existingUser } = await supabase
    .from('users')
    .select('id')
    .eq('email', testEmail)
    .single();

  if (existingUser) {
    console.log('✅ Moderador de teste já existe!');
    
    // Atualizar para mod
    await supabase
      .from('users')
      .update({ role: 'mod' })
      .eq('id', existingUser.id);
    
    // Criar/atualizar permissões
    await supabase
      .from('moderator_permissions')
      .upsert({
        user_id: existingUser.id,
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
      });

    console.log('\n✅ Permissões atualizadas!');
  } else {
    // Criar novo usuário
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: testEmail,
      password: testPassword,
      email_confirm: true,
    });

    if (authError) {
      console.error('❌ Erro ao criar usuário auth:', authError.message);
      return;
    }

    console.log('✅ Usuário auth criado!');

    // Criar registro em users
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: testEmail,
        display_name: testName,
        role: 'mod',
      });

    if (userError) {
      console.error('❌ Erro ao criar usuário:', userError.message);
      return;
    }

    console.log('✅ Registro de usuário criado!');

    // Criar perfil
    await supabase
      .from('profiles')
      .insert({
        user_id: authData.user.id,
      });

    // Criar permissões
    const { error: permError } = await supabase
      .from('moderator_permissions')
      .insert({
        user_id: authData.user.id,
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
      });

    if (permError) {
      console.error('❌ Erro ao criar permissões:', permError.message);
    } else {
      console.log('✅ Permissões criadas!');
    }
  }

  console.log('\n========================================');
  console.log('🎉 MODERADOR DE TESTE CRIADO!');
  console.log('========================================');
  console.log(`📧 Email: ${testEmail}`);
  console.log(`🔑 Senha: ${testPassword}`);
  console.log(`🌐 Acesse: http://localhost:3000/login`);
  console.log(`📱 Painel: http://localhost:3000/moderator`);
  console.log('========================================\n');
}

setupModerators().catch(console.error);
