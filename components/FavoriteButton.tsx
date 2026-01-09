'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { addToFavorites, removeFromFavorites, isFavorite } from '@/server/actions/favorites';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface FavoriteButtonProps {
  userId: string;
  listingId: string;
  currentPrice: number;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'default' | 'icon';
  className?: string;
}

export function FavoriteButton({
  userId,
  listingId,
  currentPrice,
  size = 'md',
  variant = 'icon',
  className
}: FavoriteButtonProps) {
  const [isFav, setIsFav] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    checkFavorite();
  }, [userId, listingId]);

  const checkFavorite = async () => {
    if (!userId) return;
    const result = await isFavorite(userId, listingId);
    setIsFav(result);
  };

  const handleToggle = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!userId) {
      toast({
        title: 'Faça login',
        description: 'Você precisa estar logado para favoritar.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    try {
      if (isFav) {
        const result = await removeFromFavorites(userId, listingId);
        if (result.success) {
          setIsFav(false);
          toast({
            title: 'Removido dos favoritos',
            description: 'O anúncio foi removido da sua lista.'
          });
        } else {
          console.error('Erro ao remover favorito:', result.error);
          toast({
            title: 'Erro',
            description: result.error || 'Não foi possível remover dos favoritos.',
            variant: 'destructive'
          });
        }
      } else {
        const result = await addToFavorites(userId, listingId, currentPrice);
        if (result.success) {
          setIsFav(true);
          toast({
            title: 'Adicionado aos favoritos! ❤️',
            description: 'Veja seus favoritos na aba Favoritos.'
          });
        } else {
          console.error('Erro ao adicionar favorito:', result.error);
          toast({
            title: 'Erro',
            description: result.error || 'Não foi possível adicionar aos favoritos.',
            variant: 'destructive'
          });
        }
      }
    } catch (error) {
      console.error('Exceção ao atualizar favorito:', error);
      toast({
        title: 'Erro',
        description: 'Não foi possível atualizar favoritos.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const sizeClasses = {
    sm: 'h-7 w-7',
    md: 'h-9 w-9',
    lg: 'h-11 w-11'
  };

  const iconSizes = {
    sm: 'h-3.5 w-3.5',
    md: 'h-4 w-4',
    lg: 'h-5 w-5'
  };

  if (variant === 'icon') {
    return (
      <button
        onClick={handleToggle}
        disabled={loading}
        className={cn(
          'rounded-full flex items-center justify-center transition-all shadow-md',
          'hover:scale-110 active:scale-95',
          isFav 
            ? 'bg-red-500 text-white hover:bg-red-600' 
            : 'bg-white/90 backdrop-blur-sm text-gray-500 hover:bg-white hover:text-red-500',
          sizeClasses[size],
          loading && 'opacity-50 cursor-not-allowed animate-pulse',
          className
        )}
        title={isFav ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}
      >
        <Heart 
          className={cn(
            iconSizes[size],
            isFav && 'fill-current'
          )} 
        />
      </button>
    );
  }

  return (
    <Button
      variant={isFav ? 'default' : 'outline'}
      size={size === 'lg' ? 'default' : 'sm'}
      onClick={handleToggle}
      disabled={loading}
      className={cn(
        isFav 
          ? 'bg-red-500 hover:bg-red-600 text-white' 
          : 'border-red-200 text-red-500 hover:bg-red-50',
        className
      )}
    >
      <Heart className={cn('h-4 w-4 mr-1', isFav && 'fill-current')} />
      {isFav ? 'Favoritado' : 'Favoritar'}
    </Button>
  );
}
