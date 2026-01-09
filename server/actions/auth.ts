'use server';

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

export async function signUpUserComplete(
  email: string,
  password: string,
  displayName: string
) {
  try {
    const isAdmin = email === 'admin@admin.com';

    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        display_name: displayName,
      },
    });

    if (authError || !authData.user) {
      console.error('Error creating auth user:', authError);
      throw new Error(authError?.message || 'Failed to create auth user');
    }

    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: authData.user.id,
        email: email,
        display_name: displayName,
        role: isAdmin ? 'admin' : 'user',
        reputation_score: 100,
      });

    if (userError) {
      console.error('Error creating user:', userError);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw new Error(userError.message || 'Failed to create user');
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: authData.user.id,
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      await supabaseAdmin.auth.admin.deleteUser(authData.user.id);
      throw new Error(profileError.message || 'Failed to create profile');
    }

    return { success: true, userId: authData.user.id };
  } catch (error) {
    console.error('Error in signUpUserComplete:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error creating user');
  }
}

export async function createUserInDatabase(
  userId: string,
  email: string,
  displayName: string,
  avatarUrl?: string
) {
  try {
    console.log('=== createUserInDatabase ===');
    console.log('userId:', userId);
    console.log('email:', email);
    console.log('displayName:', displayName);
    console.log('avatarUrl:', avatarUrl);

    const isAdmin = email === 'admin@admin.com';

    // Verificar se usuário já existe
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (existingUser) {
      console.log('Usuário já existe, atualizando...');
      // Atualizar dados se necessário
      await supabaseAdmin
        .from('users')
        .update({
          display_name: displayName,
        })
        .eq('id', userId);
      
      return { success: true, updated: true };
    }

    // Criar usuário
    const { error: userError } = await supabaseAdmin
      .from('users')
      .insert({
        id: userId,
        email: email,
        display_name: displayName,
        role: isAdmin ? 'admin' : 'user',
        reputation_score: 100,
      });

    if (userError) {
      console.error('Error creating user:', userError);
      // Se for erro de duplicata, ignorar
      if (userError.code === '23505') {
        console.log('Usuário já existe (duplicata), ignorando...');
        return { success: true, duplicate: true };
      }
      throw new Error(userError.message || 'Failed to create user');
    }

    console.log('Usuário criado com sucesso!');

    // Criar perfil com avatar se fornecido
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: userId,
        avatar_url: avatarUrl || null,
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      // Se for erro de duplicata, tentar atualizar
      if (profileError.code === '23505') {
        console.log('Perfil já existe, atualizando avatar...');
        if (avatarUrl) {
          await supabaseAdmin
            .from('profiles')
            .update({ avatar_url: avatarUrl })
            .eq('user_id', userId);
        }
        return { success: true };
      }
      throw new Error(profileError.message || 'Failed to create profile');
    }

    console.log('Perfil criado com sucesso!');

    // Criar carteira para o usuário
    const { error: walletError } = await supabaseAdmin
      .from('wallets')
      .insert({
        user_id: userId,
        balance: 0,
        pending_balance: 0,
      });

    if (walletError && walletError.code !== '23505') {
      console.error('Error creating wallet:', walletError);
      // Não falhar por causa da carteira
    } else {
      console.log('Carteira criada com sucesso!');
    }

    return { success: true };
  } catch (error) {
    console.error('Error in createUserInDatabase:', error);
    if (error instanceof Error) {
      throw error;
    }
    throw new Error('Unknown error creating user');
  }
}
