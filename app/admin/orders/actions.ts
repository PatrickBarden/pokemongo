'use server';

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente Admin para ignorar RLS
const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export async function getAllListingsWithOwners() {
  try {
    // Buscar todos os listings
    const { data: listings, error: listingsError } = await supabaseAdmin
      .from('listings')
      .select('*')
      .order('created_at', { ascending: false });

    if (listingsError) throw listingsError;

    if (!listings) return { data: [] };

    // Buscar todos os owner_ids únicos
    const ownerIds = Array.from(new Set((listings as any[]).map(l => l.owner_id)));

    // Buscar dados dos usuários
    const { data: users, error: usersError } = await supabaseAdmin
      .from('users')
      .select('id, display_name, email')
      .in('id', ownerIds);

    if (usersError) throw usersError;

    // Criar mapa de usuários
    const usersMap = new Map((users as any[])?.map(u => [u.id, u]) || []);

    // Combinar listings com owners
    const listingsWithOwners = (listings as any[]).map(listing => ({
      ...listing,
      owner: usersMap.get(listing.owner_id) || null
    }));

    return { data: listingsWithOwners };
  } catch (error: any) {
    console.error('Erro ao buscar listings:', error);
    return { error: error.message, data: [] };
  }
}
