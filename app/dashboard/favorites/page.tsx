'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { formatCurrency } from '@/lib/format';
import { 
  Heart, 
  Star, 
  Trash2, 
  ShoppingCart, 
  TrendingDown, 
  Bell, 
  Plus,
  Sparkles,
  Search,
  ExternalLink,
  AlertCircle,
  Package
} from 'lucide-react';
import { 
  getUserFavorites, 
  removeFromFavorites, 
  getUserWishlist, 
  addToWishlist, 
  removeFromWishlist,
  getFavoritesWithPriceDrop,
  getMatchingListingsForWishlist,
  type Favorite,
  type WishlistItem
} from '@/server/actions/favorites';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function FavoritesPage() {
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState('');
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [wishlist, setWishlist] = useState<WishlistItem[]>([]);
  const [priceDrops, setPriceDrops] = useState<Favorite[]>([]);
  const [matchingListings, setMatchingListings] = useState<any[]>([]);
  const [addWishlistOpen, setAddWishlistOpen] = useState(false);
  const [newWishlistItem, setNewWishlistItem] = useState({
    pokemon_name: '',
    is_shiny: false,
    has_costume: false,
    max_price: '',
    notes: ''
  });
  const { addToCart, isInCart } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const [favoritesData, wishlistData, priceDropsData, matchingData] = await Promise.all([
        getUserFavorites(user.id),
        getUserWishlist(user.id),
        getFavoritesWithPriceDrop(user.id),
        getMatchingListingsForWishlist(user.id)
      ]);

      setFavorites(favoritesData);
      setWishlist(wishlistData);
      setPriceDrops(priceDropsData);
      setMatchingListings(matchingData);
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveFavorite = async (listingId: string) => {
    const result = await removeFromFavorites(userId, listingId);
    if (result.success) {
      setFavorites(prev => prev.filter(f => f.listing_id !== listingId));
      toast({
        title: 'Removido dos favoritos',
        description: 'O anúncio foi removido da sua lista de favoritos.'
      });
    }
  };

  const handleAddToWishlist = async () => {
    if (!newWishlistItem.pokemon_name.trim()) {
      toast({
        title: 'Nome obrigatório',
        description: 'Digite o nome do Pokémon desejado.',
        variant: 'destructive'
      });
      return;
    }

    const result = await addToWishlist(
      userId,
      newWishlistItem.pokemon_name,
      undefined,
      newWishlistItem.is_shiny,
      newWishlistItem.has_costume,
      newWishlistItem.max_price ? parseFloat(newWishlistItem.max_price) : undefined,
      newWishlistItem.notes
    );

    if (result.success) {
      toast({
        title: 'Adicionado à lista de desejos',
        description: `${newWishlistItem.pokemon_name} foi adicionado à sua lista.`
      });
      setAddWishlistOpen(false);
      setNewWishlistItem({
        pokemon_name: '',
        is_shiny: false,
        has_costume: false,
        max_price: '',
        notes: ''
      });
      loadData();
    } else {
      toast({
        title: 'Erro',
        description: result.error,
        variant: 'destructive'
      });
    }
  };

  const handleRemoveFromWishlist = async (wishlistId: string) => {
    const result = await removeFromWishlist(wishlistId);
    if (result.success) {
      setWishlist(prev => prev.filter(w => w.id !== wishlistId));
      toast({
        title: 'Removido da lista de desejos',
        description: 'O Pokémon foi removido da sua lista.'
      });
    }
  };

  const handleAddToCart = async (listing: any) => {
    try {
      const success = await addToCart(listing.id);
      if (success) {
        toast({
          title: 'Adicionado ao carrinho',
          description: `${listing.title} foi adicionado ao seu carrinho.`
        });
      }
    } catch (error) {
      toast({
        title: 'Erro',
        description: 'Não foi possível adicionar ao carrinho.',
        variant: 'destructive'
      });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="relative w-10 h-10">
          <div className="w-10 h-10 border-3 border-slate-200 rounded-full"></div>
          <div className="w-10 h-10 border-3 border-poke-blue border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-poke-dark">Favoritos & Lista de Desejos</h1>
        <p className="text-muted-foreground mt-1">
          Seus anúncios favoritos e Pokémon desejados
        </p>
      </div>

      {/* Alertas de Preço */}
      {priceDrops.length > 0 && (
        <Card className="border-green-200 bg-green-50">
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-green-700 text-lg">
              <TrendingDown className="h-5 w-5" />
              Preços Baixaram! ({priceDrops.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {priceDrops.map((fav) => (
                <div
                  key={fav.id}
                  className="flex items-center justify-between p-3 bg-white rounded-lg border border-green-200"
                >
                  <div>
                    <p className="font-medium">{fav.listing?.title}</p>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-muted-foreground line-through">
                        {formatCurrency(fav.price_at_favorite)}
                      </span>
                      <span className="text-green-600 font-bold">
                        {formatCurrency(fav.listing?.price_suggested || 0)}
                      </span>
                      <Badge className="bg-green-500 text-white">
                        -{Math.round(((fav.price_at_favorite - (fav.listing?.price_suggested || 0)) / fav.price_at_favorite) * 100)}%
                      </Badge>
                    </div>
                  </div>
                  <Link href={`/dashboard/market?listing=${fav.listing_id}`}>
                    <Button size="sm" className="bg-green-600 hover:bg-green-700">
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      Comprar
                    </Button>
                  </Link>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tabs */}
      <Tabs defaultValue="favorites" className="space-y-4">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="favorites" className="flex items-center gap-2">
            <Heart className="h-4 w-4" />
            Favoritos ({favorites.length})
          </TabsTrigger>
          <TabsTrigger value="wishlist" className="flex items-center gap-2">
            <Star className="h-4 w-4" />
            Lista de Desejos ({wishlist.length})
          </TabsTrigger>
        </TabsList>

        {/* Tab Favoritos */}
        <TabsContent value="favorites">
          {favorites.length > 0 ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {favorites.map((fav) => (
                <Card key={fav.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center overflow-hidden">
                        {fav.listing?.photo_url ? (
                          <img
                            src={fav.listing.photo_url}
                            alt={fav.listing.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="h-8 w-8 text-gray-400" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm truncate">{fav.listing?.title}</h3>
                        <p className="text-xs text-muted-foreground">
                          por {fav.listing?.owner?.display_name}
                        </p>
                        <div className="mt-1">
                          {fav.listing?.price_suggested && fav.listing.price_suggested < fav.price_at_favorite ? (
                            <div className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground line-through">
                                {formatCurrency(fav.price_at_favorite)}
                              </span>
                              <span className="font-bold text-green-600">
                                {formatCurrency(fav.listing.price_suggested)}
                              </span>
                            </div>
                          ) : (
                            <span className="font-bold text-poke-blue">
                              {formatCurrency(fav.listing?.price_suggested || 0)}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {!fav.listing?.active && (
                      <Badge variant="outline" className="mt-2 text-red-500 border-red-200">
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Indisponível
                      </Badge>
                    )}

                    <div className="flex items-center gap-2 mt-3">
                      {fav.listing?.active && (
                        <Button
                          size="sm"
                          className="flex-1 bg-poke-blue hover:bg-poke-blue/90"
                          onClick={() => handleAddToCart(fav.listing)}
                          disabled={isInCart(fav.listing_id)}
                        >
                          <ShoppingCart className="h-4 w-4 mr-1" />
                          {isInCart(fav.listing_id) ? 'No Carrinho' : 'Comprar'}
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50"
                        onClick={() => handleRemoveFavorite(fav.listing_id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <p className="text-xs text-muted-foreground mt-2">
                      Adicionado em {format(new Date(fav.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="border-dashed">
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Heart className="h-16 w-16 text-gray-300 mb-4" />
                <h3 className="text-xl font-semibold text-gray-600 mb-2">
                  Nenhum favorito ainda
                </h3>
                <p className="text-muted-foreground text-center max-w-md mb-4">
                  Explore o mercado e clique no coração para salvar seus anúncios favoritos
                </p>
                <Link href="/dashboard/market">
                  <Button className="bg-poke-blue hover:bg-poke-blue/90">
                    <Search className="h-4 w-4 mr-2" />
                    Explorar Mercado
                  </Button>
                </Link>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Tab Lista de Desejos */}
        <TabsContent value="wishlist">
          <div className="space-y-4">
            {/* Botão Adicionar */}
            <div className="flex justify-end">
              <Dialog open={addWishlistOpen} onOpenChange={setAddWishlistOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-poke-yellow hover:bg-poke-yellow/90 text-poke-dark">
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Pokémon
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Adicionar à Lista de Desejos</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="pokemon_name">Nome do Pokémon *</Label>
                      <Input
                        id="pokemon_name"
                        placeholder="Ex: Pikachu, Charizard..."
                        value={newWishlistItem.pokemon_name}
                        onChange={(e) => setNewWishlistItem(prev => ({ ...prev, pokemon_name: e.target.value }))}
                      />
                    </div>

                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="is_shiny"
                          checked={newWishlistItem.is_shiny}
                          onCheckedChange={(checked) => setNewWishlistItem(prev => ({ ...prev, is_shiny: !!checked }))}
                        />
                        <Label htmlFor="is_shiny" className="flex items-center gap-1">
                          <Sparkles className="h-4 w-4 text-yellow-500" />
                          Shiny
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <Checkbox
                          id="has_costume"
                          checked={newWishlistItem.has_costume}
                          onCheckedChange={(checked) => setNewWishlistItem(prev => ({ ...prev, has_costume: !!checked }))}
                        />
                        <Label htmlFor="has_costume">Com Fantasia</Label>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_price">Preço Máximo (opcional)</Label>
                      <Input
                        id="max_price"
                        type="number"
                        placeholder="R$ 0,00"
                        value={newWishlistItem.max_price}
                        onChange={(e) => setNewWishlistItem(prev => ({ ...prev, max_price: e.target.value }))}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="notes">Observações (opcional)</Label>
                      <Input
                        id="notes"
                        placeholder="Ex: CP alto, IV bom..."
                        value={newWishlistItem.notes}
                        onChange={(e) => setNewWishlistItem(prev => ({ ...prev, notes: e.target.value }))}
                      />
                    </div>

                    <Button onClick={handleAddToWishlist} className="w-full bg-poke-blue hover:bg-poke-blue/90">
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar à Lista
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            {/* Anúncios Correspondentes */}
            {matchingListings.length > 0 && (
              <Card className="border-blue-200 bg-blue-50">
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center gap-2 text-blue-700 text-lg">
                    <Bell className="h-5 w-5" />
                    Encontramos Pokémon da sua lista!
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {matchingListings.map((match, index) => (
                      <div key={index} className="space-y-2">
                        <p className="font-medium text-sm flex items-center gap-2">
                          {match.wishlistItem.pokemon_name}
                          {match.wishlistItem.is_shiny && <Sparkles className="h-4 w-4 text-yellow-500" />}
                        </p>
                        <div className="grid gap-2 sm:grid-cols-2">
                          {match.matchingListings.slice(0, 2).map((listing: any) => (
                            <div
                              key={listing.id}
                              className="flex items-center justify-between p-2 bg-white rounded-lg border"
                            >
                              <div>
                                <p className="text-sm font-medium">{listing.title}</p>
                                <p className="text-xs text-muted-foreground">
                                  {listing.owner?.display_name}
                                </p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-poke-blue text-sm">
                                  {formatCurrency(listing.price_suggested)}
                                </p>
                                <Link href={`/dashboard/market?listing=${listing.id}`}>
                                  <Button size="sm" variant="ghost" className="h-6 px-2">
                                    <ExternalLink className="h-3 w-3" />
                                  </Button>
                                </Link>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Lista de Desejos */}
            {wishlist.length > 0 ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {wishlist.map((item) => (
                  <Card key={item.id} className="overflow-hidden">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold flex items-center gap-2">
                            {item.pokemon_name}
                            {item.is_shiny && (
                              <Badge className="bg-yellow-500 text-white">
                                <Sparkles className="h-3 w-3 mr-1" />
                                Shiny
                              </Badge>
                            )}
                          </h3>
                          {item.has_costume && (
                            <Badge variant="outline" className="mt-1">Com Fantasia</Badge>
                          )}
                          {item.max_price && (
                            <p className="text-sm text-muted-foreground mt-1">
                              Até {formatCurrency(item.max_price)}
                            </p>
                          )}
                          {item.notes && (
                            <p className="text-xs text-muted-foreground mt-1 italic">
                              "{item.notes}"
                            </p>
                          )}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600 hover:bg-red-50"
                          onClick={() => handleRemoveFromWishlist(item.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>

                      <div className="flex items-center gap-2 mt-3 pt-3 border-t">
                        <Bell className="h-4 w-4 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">
                          {item.notify_new_listing ? 'Notificações ativas' : 'Notificações desativadas'}
                        </span>
                      </div>

                      <p className="text-xs text-muted-foreground mt-2">
                        Adicionado em {format(new Date(item.created_at), "dd/MM/yyyy", { locale: ptBR })}
                      </p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="flex flex-col items-center justify-center py-12">
                  <Star className="h-16 w-16 text-gray-300 mb-4" />
                  <h3 className="text-xl font-semibold text-gray-600 mb-2">
                    Lista de desejos vazia
                  </h3>
                  <p className="text-muted-foreground text-center max-w-md mb-4">
                    Adicione Pokémon que você está procurando e seja notificado quando aparecerem no mercado
                  </p>
                  <Button
                    onClick={() => setAddWishlistOpen(true)}
                    className="bg-poke-yellow hover:bg-poke-yellow/90 text-poke-dark"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Adicionar Pokémon
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
