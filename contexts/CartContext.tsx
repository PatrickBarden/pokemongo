'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { supabaseClient } from '@/lib/supabase-client';

interface CartItem {
  id: string;
  listing_id: string;
  quantity: number;
  added_at: string;
  listing?: any;
}

interface CartContextType {
  items: CartItem[];
  itemCount: number;
  loading: boolean;
  addToCart: (listingId: string) => Promise<boolean>;
  removeFromCart: (itemId: string) => Promise<boolean>;
  clearCart: () => Promise<boolean>;
  refreshCart: () => Promise<void>;
  isInCart: (listingId: string) => boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>('');

  // Buscar ID do usuário
  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        setUserId(user.id);
      }
    };
    fetchUser();
  }, []);

  // Carregar itens do carrinho
  const refreshCart = async () => {
    if (!userId) return;
    
    setLoading(true);
    try {
      const { data, error } = await supabaseClient
        .from('cart_items')
        .select(`
          *,
          listing:listing_id(
            *,
            owner:owner_id(id, display_name)
          )
        `)
        .eq('user_id', userId)
        .order('added_at', { ascending: false });

      if (error) throw error;

      // Buscar imagens dos Pokémon
      const itemsWithImages = await Promise.all(
        (data || []).map(async (item: any) => {
          if (item.listing && (!item.listing.pokemon_data || !item.listing.pokemon_data.sprites)) {
            try {
              const pokemonName = item.listing.title
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .split(' ')[0]
                .trim();
              
              const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
              if (response.ok) {
                const pokemonData = await response.json();
                item.listing.pokemon_data = pokemonData;
              }
            } catch (error) {
              console.log('Erro ao buscar imagem:', error);
            }
          }
          return item;
        })
      );

      setItems(itemsWithImages);
    } catch (error) {
      console.error('Erro ao carregar carrinho:', error);
    } finally {
      setLoading(false);
    }
  };

  // Carregar carrinho quando usuário estiver disponível
  useEffect(() => {
    if (userId) {
      refreshCart();
    }
  }, [userId]);

  // Adicionar item ao carrinho
  const addToCart = async (listingId: string): Promise<boolean> => {
    if (!userId) return false;

    try {
      const { error } = await (supabaseClient as any)
        .from('cart_items')
        .insert({
          user_id: userId,
          listing_id: listingId,
          quantity: 1
        });

      if (error) {
        // Se já existe, não é erro
        if (error.code === '23505') {
          console.log('Item já está no carrinho');
          return true;
        }
        throw error;
      }

      await refreshCart();
      return true;
    } catch (error) {
      console.error('Erro ao adicionar ao carrinho:', error);
      return false;
    }
  };

  // Remover item do carrinho
  const removeFromCart = async (itemId: string): Promise<boolean> => {
    try {
      const { error } = await supabaseClient
        .from('cart_items')
        .delete()
        .eq('id', itemId);

      if (error) throw error;

      await refreshCart();
      return true;
    } catch (error) {
      console.error('Erro ao remover do carrinho:', error);
      return false;
    }
  };

  // Limpar carrinho
  const clearCart = async (): Promise<boolean> => {
    if (!userId) return false;

    try {
      const { error } = await supabaseClient
        .from('cart_items')
        .delete()
        .eq('user_id', userId);

      if (error) throw error;

      setItems([]);
      return true;
    } catch (error) {
      console.error('Erro ao limpar carrinho:', error);
      return false;
    }
  };

  // Verificar se item está no carrinho
  const isInCart = (listingId: string): boolean => {
    return items.some(item => item.listing_id === listingId);
  };

  const value = {
    items,
    itemCount: items.length,
    loading,
    addToCart,
    removeFromCart,
    clearCart,
    refreshCart,
    isInCart
  };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
