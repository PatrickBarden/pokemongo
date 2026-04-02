export { supabaseClient as supabase } from './supabase-client';
export type { Database } from './database.types';
export type Tables<T extends keyof import('./database.types').Database['public']['Tables']> = import('./database.types').Database['public']['Tables'][T]['Row'];
export type Enums<T extends keyof import('./database.types').Database['public']['Enums']> = import('./database.types').Database['public']['Enums'][T];
