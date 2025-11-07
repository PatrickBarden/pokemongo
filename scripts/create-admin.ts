import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { resolve } from 'path';

// Carregar variáveis de ambiente do .env.local manualmente
const envPath = resolve(process.cwd(), '.env.local');
let supabaseUrl = '';
let supabaseServiceKey = '';

try {
  const envContent = readFileSync(envPath, 'utf-8');
  const lines = envContent.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('NEXT_PUBLIC_SUPABASE_URL=')) {
      supabaseUrl = line.split('=')[1].trim();
    }
    if (line.startsWith('SUPABASE_SERVICE_ROLE_KEY=')) {
      supabaseServiceKey = line.split('=')[1].trim();
    }
  }
} catch (error) {
  console.error('❌ Erro ao ler .env.local:', error);
  process.exit(1);
}

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Erro: Variáveis de ambiente não encontradas!');
  console.error('Certifique-se de que o arquivo .env.local existe e contém:');
  console.error('- NEXT_PUBLIC_SUPABASE_URL');
  console.error('- SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

console.log('✅ Variáveis carregadas com sucesso');
console.log('📍 URL:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function createAdmin() {
  try {
    console.log('\n🔍 Verificando se admin já existe...');
    
    // Verificar se já existe
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@admin.com')
      .single();

    if (existingUser) {
      console.log('✅ Admin já existe!');
      console.log('📧 Email: admin@admin.com');
      console.log('🔑 Senha: 123456');
      console.log('👤 Role:', existingUser.role);
      return;
    }

    console.log('📝 Criando usuário admin...');

    // Criar usuário no auth usando admin API
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: 'admin@admin.com',
      password: '123456',
      email_confirm: true,
      user_metadata: {
        display_name: 'Administrador'
      }
    });

    if (authError) {
      console.error('❌ Erro ao criar usuário no auth:', authError);
      return;
    }

    console.log('✅ Usuário criado no auth.users');

    // Criar registro na tabela users
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email: 'admin@admin.com',
        display_name: 'Administrador',
        role: 'admin',
        reputation_score: 100
      });

    if (userError) {
      console.error('❌ Erro ao criar registro em users:', userError);
      return;
    }

    console.log('✅ Registro criado em public.users');

    // Criar profile
    const { error: profileError } = await supabase
      .from('profiles')
      .insert({
        user_id: authData.user.id
      });

    if (profileError) {
      console.error('❌ Erro ao criar profile:', profileError);
      return;
    }

    console.log('✅ Profile criado');
    console.log('\n🎉 Admin criado com sucesso!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('📧 Email: admin@admin.com');
    console.log('🔑 Senha: 123456');
    console.log('👤 Role: admin');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('\n🚀 Acesse: http://localhost:3001/login');
    
  } catch (error) {
    console.error('❌ Erro:', error);
  }
}

createAdmin();
