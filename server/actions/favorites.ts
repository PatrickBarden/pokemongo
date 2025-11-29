'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export type Favorite = {
  id: string;
  user_id: string;
  listing_id: string;
  price_at_favorite: number;
  notify_price_drop: boolean;
  created_at: string;
  listing?: {
    id: string;
    title: string;
    price_suggested: number;
    photo_url?: string;
    active: boolean;
    owner: {
      display_name: string;
    };
  };
};

export type WishlistItem = {
  id: string;
  user_id: string;
  pokemon_name: string;
  pokemon_id?: number;
  is_shiny: boolean;
  has_costume: boolean;
  max_price?: number;
  notify_new_listing: boolean;
  notes?: string;
  created_at: string;
};

// Adicionar aos favoritos
export async function addToFavorites(
  userId: string,
  listingId: string,
  currentPrice: number
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('favorites')
      .insert({
        user_id: userId,
        listing_id: listingId,
        price_at_favorite: currentPrice,
        notify_price_drop: true
      });

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Este anúncio já está nos favoritos' };
      }
      throw error;
    }

    revalidatePath('/dashboard/favorites');
    revalidatePath('/dashboard/market');
    return { success: true };
  } catch (error) {
    console.error('Erro ao adicionar favorito:', error);
    return { success: false, error: 'Erro ao adicionar aos favoritos' };
  }
}

// Remover dos favoritos
export async function removeFromFavorites(
  userId: string,
  listingId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('favorites')
      .delete()
      .eq('user_id', userId)
      .eq('listing_id', listingId);

    if (error) throw error;

    revalidatePath('/dashboard/favorites');
    revalidatePath('/dashboard/market');
    return { success: true };
  } catch (error) {
    console.error('Erro ao remover favorito:', error);
    return { success: false, error: 'Erro ao remover dos favoritos' };
  }
}

// Verificar se está nos favoritos
export async function isFavorite(
  userId: string,
  listingId: string
): Promise<boolean> {
  try {
    const { data } = await supabaseAdmin
      .from('favorites')
      .select('id')
      .eq('user_id', userId)
      .eq('listing_id', listingId)
      .single();

    return !!data;
  } catch {
    return false;
  }
}

// Buscar favoritos do usuário
export async function getUserFavorites(userId: string): Promise<Favorite[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('favorites')
      .select(`
        *,
        listing:listing_id(
          id,
          title,
          price_suggested,
          photo_url,
          active,
          owner:owner_id(display_name)
        )
      `)
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as Favorite[];
  } catch (error) {
    console.error('Erro ao buscar favoritos:', error);
    return [];
  }
}

// Buscar favoritos com preço reduzido
export async function getFavoritesWithPriceDrop(userId: string): Promise<Favorite[]> {
  try {
    const favorites = await getUserFavorites(userId);
    return favorites.filter(fav => 
      fav.listing && 
      fav.listing.active && 
      fav.listing.price_suggested < fav.price_at_favorite
    );
  } catch (error) {
    console.error('Erro ao buscar favoritos com desconto:', error);
    return [];
  }
}

// Adicionar à lista de desejos
export async function addToWishlist(
  userId: string,
  pokemonName: string,
  pokemonId?: number,
  isShiny: boolean = false,
  hasCostume: boolean = false,
  maxPrice?: number,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('wishlists')
      .insert({
        user_id: userId,
        pokemon_name: pokemonName,
        pokemon_id: pokemonId,
        is_shiny: isShiny,
        has_costume: hasCostume,
        max_price: maxPrice,
        notes,
        notify_new_listing: true
      });

    if (error) {
      if (error.code === '23505') {
        return { success: false, error: 'Este Pokémon já está na lista de desejos' };
      }
      throw error;
    }

    revalidatePath('/dashboard/favorites');
    return { success: true };
  } catch (error) {
    console.error('Erro ao adicionar à lista de desejos:', error);
    return { success: false, error: 'Erro ao adicionar à lista de desejos' };
  }
}

// Remover da lista de desejos
export async function removeFromWishlist(
  wishlistId: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabaseAdmin
      .from('wishlists')
      .delete()
      .eq('id', wishlistId);

    if (error) throw error;

    revalidatePath('/dashboard/favorites');
    return { success: true };
  } catch (error) {
    console.error('Erro ao remover da lista de desejos:', error);
    return { success: false, error: 'Erro ao remover da lista de desejos' };
  }
}

// Buscar lista de desejos do usuário
export async function getUserWishlist(userId: string): Promise<WishlistItem[]> {
  try {
    const { data, error } = await supabaseAdmin
      .from('wishlists')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []) as WishlistItem[];
  } catch (error) {
    console.error('Erro ao buscar lista de desejos:', error);
    return [];
  }
}

// Incrementar visualização de um listing
export async function incrementListingView(listingId: string): Promise<void> {
  try {
    await supabaseAdmin.rpc('increment_view_count', { listing_id: listingId });
  } catch {
    // Fallback se a função RPC não existir
    await supabaseAdmin
      .from('listings')
      .update({ view_count: supabaseAdmin.rpc('increment', { x: 1 }) })
      .eq('id', listingId);
  }
}

// Buscar anúncios que correspondem à lista de desejos
export async function getMatchingListingsForWishlist(userId: string): Promise<{
  wishlistItem: WishlistItem;
  matchingListings: any[];
}[]> {
  try {
    const wishlist = await getUserWishlist(userId);
    const results = [];

    for (const item of wishlist) {
      const query = supabaseAdmin
        .from('listings')
        .select(`
          *,
          owner:owner_id(display_name, average_rating, seller_level)
        `)
        .eq('active', true)
        .ilike('title', `%${item.pokemon_name}%`);

      if (item.is_shiny) {
        query.eq('is_shiny', true);
      }
      if (item.has_costume) {
        query.eq('has_costume', true);
      }
      if (item.max_price) {
        query.lte('price_suggested', item.max_price);
      }

      const { data } = await query.limit(5);

      if (data && data.length > 0) {
        results.push({
          wishlistItem: item,
          matchingListings: data
        });
      }
    }

    return results;
  } catch (error) {
    console.error('Erro ao buscar anúncios correspondentes:', error);
    return [];
  }
}
