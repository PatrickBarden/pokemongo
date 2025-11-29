import { createClient } from '@supabase/supabase-js';
import { Database } from './database.types';

// Cliente admin com service role key - bypassa RLS
// APENAS para uso em server-side (server actions, API routes, etc.)
export function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL environment variable');
  }

  if (!serviceRoleKey) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY environment variable');
  }

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
