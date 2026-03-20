import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';
import { getRequiredEnv } from './server-env';

// Cliente admin com service role key - bypassa RLS
// APENAS para uso em server-side (server actions, API routes, etc.)
export function getSupabaseAdmin() {
  const supabaseUrl = getRequiredEnv('NEXT_PUBLIC_SUPABASE_URL');
  const serviceRoleKey = getRequiredEnv('SUPABASE_SERVICE_ROLE_KEY');

  return createClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });
}

// Singleton para evitar criar múltiplas instâncias
let adminClient: ReturnType<typeof createClient<Database>> | null = null;

export function getSupabaseAdminSingleton() {
  if (!adminClient) {
    adminClient = getSupabaseAdmin();
  }
  return adminClient;
}
