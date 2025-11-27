'use server';

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

export async function getAllUsers() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Variáveis de ambiente de Admin não configuradas (SUPABASE_SERVICE_ROLE_KEY).');
    // Fallback: Retornar erro explicativo
    return { error: 'Chave de serviço (SUPABASE_SERVICE_ROLE_KEY) não encontrada. Verifique as variáveis de ambiente.' };
  }

  // Criar cliente com Service Role para ignorar RLS
  const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select(`
        *,
        profile:profiles(region, contact)
      `)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data };
  } catch (error: any) {
    console.error('Erro ao buscar todos os usuários:', error);
    return { error: error.message };
  }
}
