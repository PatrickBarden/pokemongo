import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function createAdmin() {
  try {
    const { data: existingUser } = await supabase
      .from('users')
      .select('*')
      .eq('email', 'admin@admin.com')
      .single();

    if (existingUser) {
      console.log('Admin já existe!');
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: 'admin@admin.com',
      password: '123456',
      options: {
        data: {
          display_name: 'Administrador',
        },
      },
    });

    if (error) {
      console.error('Erro ao criar admin:', error);
      return;
    }

    console.log('Admin criado com sucesso!');
    console.log('Email: admin@admin.com');
    console.log('Senha: 123456');
  } catch (error) {
    console.error('Erro:', error);
  }
}

createAdmin();
