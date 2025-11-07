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
  displayName: string
) {
  try {
    const isAdmin = email === 'admin@admin.com';

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
      throw new Error(userError.message || 'Failed to create user');
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert({
        user_id: userId,
      });

    if (profileError) {
      console.error('Error creating profile:', profileError);
      throw new Error(profileError.message || 'Failed to create profile');
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
