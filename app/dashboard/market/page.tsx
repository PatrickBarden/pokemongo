'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Eye, Star, X, MapPin, User, Calendar, TrendingUp, Award, Sparkles, Shirt, Image as ImageIcon, Heart, Package, Mail, Trophy, Plus, DollarSign } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { translateType } from '@/lib/translations';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';

export default function MarketPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pokemonImage, setPokemonImage] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [pokemonData, setPokemonData] = useState<any>(null);
  const [sellerProfileOpen, setSellerProfileOpen] = useState(false);
  const [selectedSeller, setSelectedSeller] = useState<any>(null);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const { addToCart, isInCart } = useCart();
  const { toast } = useToast();

  useEffect(() => {
    fetchListings();
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) {
      setCurrentUserId(user.id);
    }
  };

  const fetchListings = async () => {
    const { data } = await supabaseClient
      .from('listings')
      .select(`
        *,
        owner:owner_id(
          id, 
          display_name, 
          email, 
          reputation_score, 
          created_at
        )
      `)
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (data) {
      // Buscar imagens dos Pokémon que não têm pokemon_data salvo
      const listingsWithImages = await Promise.all(
        (data as any[]).map(async (listing: any) => {
          // Se não tem pokemon_data OU não tem sprites, buscar
          if (!listing.pokemon_data || !listing.pokemon_data.sprites) {
            try {
              // Extrair nome do Pokémon do título
              const pokemonName = listing.title
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '') // Remove acentos
                .split(' ')[0]
                .trim();
              
              console.log('🔍 Buscando imagem para:', pokemonName);
              
              const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
              if (response.ok) {
                const pokemonData = await response.json();
                console.log('✅ Imagem encontrada para:', pokemonName);
                return {
                  ...listing,
                  pokemon_data: pokemonData
                };
              } else {
                console.log('❌ Pokémon não encontrado:', pokemonName);
              }
            } catch (error) {
              console.log('❌ Erro ao buscar imagem do Pokémon:', listing.title, error);
            }
          }
          return listing;
        })
      );
      
      console.log('📦 Total de listings carregados:', listingsWithImages.length);
      setListings(listingsWithImages);
    }
    setLoading(false);
  };

  const handleOpenSellerProfile = async (seller: any) => {
    setSelectedSeller(seller);
    
    // Buscar informações adicionais do perfil
    const { data: profileData } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', seller.id)
      .single();
    
    // Buscar total de anúncios do vendedor
    const { count } = await supabaseClient
      .from('listings')
      .select('*', { count: 'exact', head: true })
      .eq('owner_id', seller.id)
      .eq('active', true);
    
    setSelectedSeller({
      ...seller,
      profile: profileData,
      totalListings: count || 0
    });
    
    setSellerProfileOpen(true);
  };

  const handleAddToCart = async (listing: any) => {
    // Validar se não é o próprio item do usuário
    if (listing.owner_id === currentUserId) {
      toast({
        title: "Ação não permitida",
        description: "Você não pode adicionar seus próprios Pokémon ao carrinho.",
        variant: "destructive",
      });
      return;
    }

    const success = await addToCart(listing.id);
    if (success) {
      toast({
        title: "Adicionado ao carrinho! 🛒",
        description: `${listing.title} foi adicionado ao seu carrinho.`,
      });
    } else {
      toast({
        title: "Erro",
        description: "Não foi possível adicionar ao carrinho. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const fetchPokemonImage = async (pokemonName: string) => {
    setLoadingImage(true);
    try {
      // Extrair nome do Pokémon do título (ex: "Bulbasaur" de "Bulbasaur")
      const cleanName = pokemonName.toLowerCase().trim();
      const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${cleanName}`);
      
      if (response.ok) {
        const data = await response.json();
        const imageUrl = data.sprites?.other?.['official-artwork']?.front_default || 
                        data.sprites?.front_default;
        setPokemonImage(imageUrl);
        setPokemonData(data); // Salvar dados completos
      } else {
        setPokemonImage(null);
        setPokemonData(null);
      }
    } catch (error) {
      console.error('Erro ao buscar imagem do Pokémon:', error);
      setPokemonImage(null);
      setPokemonData(null);
    } finally {
      setLoadingImage(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-poke-blue mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando Pokémon...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-poke-dark">Mercado</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            Explore todos os Pokémon disponíveis para troca
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="outline" className="border-poke-blue text-poke-blue">
            {listings.length} Pokémon
          </Badge>
        </div>
      </div>

      <div className="grid gap-4 sm:gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing) => (
          <Card
            key={listing.id}
            className="overflow-hidden hover:shadow-lg transition-shadow border-2 hover:border-poke-blue"
          >
            <CardHeader className="bg-gradient-to-r from-poke-blue/10 to-poke-yellow/10">
              <div className="flex items-start gap-3">
                {/* Imagem do Pokémon */}
                <div className="relative flex-shrink-0">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 bg-white rounded-full flex items-center justify-center shadow-md border-2 border-poke-blue/20 overflow-hidden">
                    {(() => {
                      // PRIORIDADE 1: Foto real do usuário
                      const realPhoto = listing.photo_url;
                      // PRIORIDADE 2: Sprite da PokeAPI
                      const apiSprite = listing.pokemon_data?.sprites?.other?.['official-artwork']?.front_default 
                        || listing.pokemon_data?.sprites?.front_default;
                      
                      const imageUrl = realPhoto || apiSprite;
                      
                      if (imageUrl) {
                        return (
                          <div className="relative w-full h-full">
                            <img
                              src={imageUrl}
                              alt={listing.title}
                              className={`w-full h-full ${realPhoto ? 'object-cover' : 'object-contain p-2'}`}
                              onError={(e) => {
                                console.log('❌ Erro ao carregar imagem:', imageUrl);
                                e.currentTarget.style.display = 'none';
                              }}
                            />
                            {realPhoto && (
                              <div className="absolute bottom-0 right-0 bg-green-500 text-white text-[8px] px-1 rounded-tl-md font-bold">
                                ✓ REAL
                              </div>
                            )}
                          </div>
                        );
                      }
                      
                      console.log('⚠️ Sem imagem para:', listing.title);
                      return <Package className="w-8 h-8 sm:w-10 sm:h-10 text-poke-blue/40" />;
                    })()}
                  </div>
                </div>

                {/* Informações */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <CardTitle className="text-base sm:text-lg line-clamp-2">
                        {listing.title}
                      </CardTitle>
                      <button
                        onClick={() => handleOpenSellerProfile(listing.owner)}
                        className="text-xs sm:text-sm text-poke-blue hover:text-poke-blue/80 hover:underline mt-1 transition-colors font-medium flex items-center gap-1"
                      >
                        <User className="h-3 w-3" />
                        {listing.owner?.display_name}
                      </button>
                    </div>
                    <Badge className="bg-poke-yellow text-poke-dark border-0 text-xs flex-shrink-0">
                      {translateType(listing.category)}
                    </Badge>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-4">
              <p className="text-sm text-muted-foreground line-clamp-3 mb-4">
                {listing.description}
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Preço sugerido</span>
                  <span className="text-xl font-bold text-poke-blue">
                    {formatCurrency(listing.price_suggested)}
                  </span>
                </div>

                {/* Variantes do Pokémon */}
                {(listing.is_shiny || listing.has_costume || listing.has_background || listing.is_purified) && (
                  <div className="flex flex-wrap gap-1.5">
                    {listing.is_shiny && (
                      <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-0 text-xs">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Brilhante
                      </Badge>
                    )}
                    {listing.has_costume && (
                      <Badge className="bg-gradient-to-r from-purple-500 to-purple-700 text-white border-0 text-xs">
                        <Shirt className="h-3 w-3 mr-1" />
                        Traje
                      </Badge>
                    )}
                    {listing.has_background && (
                      <Badge className="bg-gradient-to-r from-blue-500 to-blue-700 text-white border-0 text-xs">
                        <ImageIcon className="h-3 w-3 mr-1" />
                        Fundo
                      </Badge>
                    )}
                    {listing.is_purified && (
                      <Badge className="bg-gradient-to-r from-pink-500 to-pink-700 text-white border-0 text-xs">
                        <Heart className="h-3 w-3 mr-1" />
                        Purificado
                      </Badge>
                    )}
                  </div>
                )}

                {listing.accepts_offers && (
                  <Badge variant="outline" className="w-full justify-center border-poke-yellow text-poke-yellow">
                    <Star className="h-3 w-3 mr-1" />
                    Aceita ofertas
                  </Badge>
                )}

                {listing.regions && listing.regions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {listing.regions.slice(0, 3).map((region: string) => (
                      <Badge
                        key={region}
                        variant="secondary"
                        className="text-xs"
                      >
                        {region}
                      </Badge>
                    ))}
                    {listing.regions.length > 3 && (
                      <Badge variant="secondary" className="text-xs">
                        +{listing.regions.length - 3}
                      </Badge>
                    )}
                  </div>
                )}

                <div className="flex flex-col gap-2 pt-2">
                  {/* Botão Ver Detalhes */}
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full border-poke-blue text-poke-blue hover:bg-poke-blue/10"
                    onClick={() => {
                      setSelectedListing(listing);
                      setModalOpen(true);
                      
                      // PRIORIDADE 1: Foto real do usuário
                      if (listing.photo_url) {
                        setPokemonImage(listing.photo_url);
                        setPokemonData(listing.pokemon_data);
                      }
                      // PRIORIDADE 2: Sprite da PokeAPI
                      else if (listing.pokemon_data) {
                        const imageUrl = listing.pokemon_data.sprites?.other?.['official-artwork']?.front_default || 
                                       listing.pokemon_data.sprites?.front_default;
                        setPokemonImage(imageUrl);
                        setPokemonData(listing.pokemon_data);
                      }
                      // PRIORIDADE 3: Buscar na API pelo nome
                      else {
                        fetchPokemonImage(listing.title);
                      }
                    }}
                  >
                    <Eye className="h-4 w-4 mr-2" />
                    Ver Detalhes
                  </Button>

                  {/* Botões de Ação */}
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      size="sm"
                      className="bg-poke-blue hover:bg-poke-blue/90"
                    >
                      <ShoppingCart className="h-4 w-4 mr-1" />
                      Trocar
                    </Button>
                    <Button
                      size="sm"
                      className="bg-green-600 hover:bg-green-700 text-white"
                    >
                      <DollarSign className="h-4 w-4 mr-1" />
                      Comprar
                    </Button>
                  </div>

                  {/* Botão Adicionar ao Carrinho */}
                  <Button
                    size="sm"
                    variant={isInCart(listing.id) || listing.owner_id === currentUserId ? "secondary" : "outline"}
                    className={isInCart(listing.id) || listing.owner_id === currentUserId ? "" : "border-poke-yellow text-poke-yellow hover:bg-poke-yellow/10"}
                    onClick={() => handleAddToCart(listing)}
                    disabled={isInCart(listing.id) || listing.owner_id === currentUserId}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {listing.owner_id === currentUserId 
                      ? "Seu Pokémon" 
                      : isInCart(listing.id) 
                        ? "No Carrinho" 
                        : "Adicionar ao Carrinho"}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {listings.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              Nenhum Pokémon disponível no momento
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              Novos Pokémon aparecerão aqui quando forem cadastrados
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modal de Visualização - Design Inspirado em Jogos */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 border-2 border-poke-blue/50 max-h-[90vh] overflow-y-auto">
          {selectedListing && (
            <>
              <DialogTitle className="sr-only">
                Detalhes do Pokémon {selectedListing.title}
              </DialogTitle>
              {/* Header com Gradiente Pokémon */}
              <div className="relative bg-gradient-to-r from-poke-blue via-poke-yellow to-poke-blue p-4 sm:p-6 pb-16 sm:pb-20">
                <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>
                
                <div className="relative flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 sm:gap-3 mb-2">
                      <Sparkles className="h-5 w-5 sm:h-6 sm:w-6 text-white animate-pulse flex-shrink-0" />
                      <h2 className="text-xl sm:text-3xl font-bold text-white drop-shadow-lg truncate">
                        {selectedListing.title}
                      </h2>
                    </div>
                    <div className="flex items-center gap-2 text-white/90">
                      <User className="h-3 w-3 sm:h-4 sm:w-4 flex-shrink-0" />
                      <span className="text-xs sm:text-sm font-medium truncate">
                        {selectedListing.owner?.display_name || 'Treinador'}
                      </span>
                    </div>
                  </div>
                  
                  <Badge className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-xs sm:text-sm flex-shrink-0">
                    {selectedListing.category}
                  </Badge>
                </div>
              </div>

              {/* Imagem do Pokémon */}
              <div className="relative -mt-12 sm:-mt-16 px-4 sm:px-6 mb-4">
                <div className="bg-gradient-to-br from-white to-gray-100 rounded-2xl p-6 sm:p-8 shadow-2xl border-4 border-white">
                  <div className="flex items-center justify-center relative min-h-[192px] sm:min-h-[256px]">
                    {/* Efeito de brilho de fundo */}
                    <div className="absolute inset-0 bg-gradient-to-br from-poke-blue/20 via-poke-yellow/20 to-poke-blue/20 rounded-xl blur-2xl"></div>
                    
                    {/* Loading */}
                    {loadingImage ? (
                      <div className="relative z-10 flex items-center justify-center h-48 sm:h-64 w-48 sm:w-64">
                        <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-poke-blue"></div>
                      </div>
                    ) : pokemonImage ? (
                      <div className="relative z-10">
                        <img
                          src={pokemonImage}
                          alt={selectedListing.title}
                          className={`w-48 h-48 sm:w-64 sm:h-64 ${selectedListing.photo_url ? 'object-cover rounded-2xl' : 'object-contain'} drop-shadow-2xl`}
                          onError={() => setPokemonImage(null)}
                        />
                        {selectedListing.photo_url && (
                          <div className="absolute top-2 right-2 bg-green-500 text-white text-xs px-3 py-1 rounded-full font-bold shadow-lg flex items-center gap-1">
                            <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                            FOTO REAL
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="flex flex-col items-center justify-center h-48 sm:h-64 w-48 sm:w-64 bg-gradient-to-br from-poke-blue/10 to-poke-yellow/10 rounded-xl">
                        <Award className="h-24 w-24 sm:h-32 sm:w-32 text-poke-blue/30 mb-3" />
                        <p className="text-poke-blue/60 text-sm">Imagem não disponível</p>
                      </div>
                    )}
                  </div>
                  
                  {/* Nome do Pokémon como badge */}
                  <div className="text-center mt-3">
                    <span className="inline-block bg-gradient-to-r from-poke-blue to-poke-yellow text-white font-bold px-4 py-1 rounded-full text-sm">
                      {selectedListing.title}
                    </span>
                  </div>
                </div>
              </div>

              {/* Conteúdo Principal */}
              <div className="px-4 sm:px-6 pb-4 sm:pb-6 space-y-4 sm:space-y-6">
                {/* Variantes do Pokémon */}
                {(selectedListing.is_shiny || selectedListing.has_costume || selectedListing.has_background || selectedListing.is_purified) && (
                  <div className="flex justify-center gap-2 -mt-2">
                    {selectedListing.is_shiny && (
                      <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-0 px-4 py-1 text-xs sm:text-sm font-semibold uppercase">
                        <Sparkles className="h-3 w-3 sm:h-4 sm:w-4 mr-1 inline" />
                        Brilhante
                      </Badge>
                    )}
                    {selectedListing.has_costume && (
                      <Badge className="bg-gradient-to-r from-purple-500 to-purple-700 text-white border-0 px-4 py-1 text-xs sm:text-sm font-semibold uppercase">
                        <Shirt className="h-3 w-3 sm:h-4 sm:w-4 mr-1 inline" />
                        Traje
                      </Badge>
                    )}
                    {selectedListing.has_background && (
                      <Badge className="bg-gradient-to-r from-blue-500 to-blue-700 text-white border-0 px-4 py-1 text-xs sm:text-sm font-semibold uppercase">
                        <ImageIcon className="h-3 w-3 sm:h-4 sm:w-4 mr-1 inline" />
                        Fundo
                      </Badge>
                    )}
                    {selectedListing.is_purified && (
                      <Badge className="bg-gradient-to-r from-pink-500 to-pink-700 text-white border-0 px-4 py-1 text-xs sm:text-sm font-semibold uppercase">
                        <Heart className="h-3 w-3 sm:h-4 sm:w-4 mr-1 inline" />
                        Purificado
                      </Badge>
                    )}
                  </div>
                )}

                {/* Descrição */}
                <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20">
                  <h3 className="text-xs sm:text-sm font-semibold text-poke-yellow mb-2 flex items-center gap-2">
                    <Sparkles className="h-3 w-3 sm:h-4 sm:w-4" />
                    Descrição
                  </h3>
                  <p className="text-white/90 text-xs sm:text-sm leading-relaxed">
                    {selectedListing.description || 'Pokémon raro disponível para troca!'}
                  </p>
                </div>

                {/* Tipos do Pokémon */}
                {pokemonData?.types && pokemonData.types.length > 0 && (
                  <div className="flex justify-center gap-2">
                    {pokemonData.types.map((typeInfo: any) => (
                      <Badge
                        key={typeInfo.type.name}
                        className="bg-gradient-to-r from-poke-blue to-blue-600 text-white border-0 px-4 py-1 text-xs sm:text-sm font-semibold uppercase"
                      >
                        {translateType(typeInfo.type.name)}
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Estatísticas do Pokémon */}
                {pokemonData?.height && pokemonData?.weight && (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 text-center">
                      <p className="text-white/60 text-[10px] sm:text-xs mb-1">Altura</p>
                      <p className="text-white font-bold text-sm sm:text-base">
                        {(pokemonData.height / 10).toFixed(1)}m
                      </p>
                    </div>
                    <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 border border-white/20 text-center">
                      <p className="text-white/60 text-[10px] sm:text-xs mb-1">Peso</p>
                      <p className="text-white font-bold text-sm sm:text-base">
                        {(pokemonData.weight / 10).toFixed(1)}kg
                      </p>
                    </div>
                  </div>
                )}

                {/* Grid de Informações */}
                <div className="grid grid-cols-2 gap-3 sm:gap-4">
                  {/* Preço */}
                  <div className="bg-gradient-to-br from-poke-blue/20 to-poke-blue/5 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-poke-blue/30">
                    <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                      <TrendingUp className="h-3 w-3 sm:h-4 sm:w-4 text-poke-blue flex-shrink-0" />
                      <span className="text-[10px] sm:text-xs font-medium text-white/70">Preço Sugerido</span>
                    </div>
                    <p className="text-lg sm:text-2xl font-bold text-poke-blue">
                      {formatCurrency(selectedListing.price_suggested)}
                    </p>
                  </div>

                  {/* Status de Ofertas */}
                  <div className="bg-gradient-to-br from-poke-yellow/20 to-poke-yellow/5 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-poke-yellow/30">
                    <div className="flex items-center gap-1 sm:gap-2 mb-1 sm:mb-2">
                      <Star className="h-3 w-3 sm:h-4 sm:w-4 text-poke-yellow flex-shrink-0" />
                      <span className="text-[10px] sm:text-xs font-medium text-white/70">Ofertas</span>
                    </div>
                    <p className="text-base sm:text-lg font-bold text-poke-yellow">
                      {selectedListing.accepts_offers ? 'Aceita' : 'Não aceita'}
                    </p>
                  </div>
                </div>

                {/* Regiões Disponíveis */}
                {selectedListing.regions && selectedListing.regions.length > 0 && (
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 sm:p-4 border border-white/20">
                    <div className="flex items-center gap-2 mb-2 sm:mb-3">
                      <MapPin className="h-3 w-3 sm:h-4 sm:w-4 text-poke-yellow" />
                      <h3 className="text-xs sm:text-sm font-semibold text-white">Regiões Disponíveis</h3>
                    </div>
                    <div className="flex flex-wrap gap-1.5 sm:gap-2">
                      {selectedListing.regions.map((region: string) => (
                        <Badge
                          key={region}
                          className="bg-white/20 text-white border-white/30 backdrop-blur-sm text-xs"
                        >
                          {region}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Data de Criação */}
                <div className="flex items-center gap-2 text-white/60 text-[10px] sm:text-xs">
                  <Calendar className="h-3 w-3" />
                  <span>
                    Publicado em {new Date(selectedListing.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                <Separator className="bg-white/20" />

                {/* Botões de Ação */}
                <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                  <Button
                    className="flex-1 bg-gradient-to-r from-poke-blue to-blue-600 hover:from-poke-blue/90 hover:to-blue-600/90 text-white font-semibold shadow-lg shadow-poke-blue/50 h-11 sm:h-12"
                    onClick={() => {
                      // Lógica de troca aqui
                      setModalOpen(false);
                    }}
                  >
                    <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Iniciar Troca
                  </Button>
                  <Button
                    variant="outline"
                    className="border-2 border-white/30 text-white hover:bg-white/10 backdrop-blur-sm h-11 sm:h-12"
                    onClick={() => setModalOpen(false)}
                  >
                    <X className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                    Fechar
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog do Perfil do Vendedor */}
      <Dialog open={sellerProfileOpen} onOpenChange={setSellerProfileOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-poke-dark flex items-center gap-2">
              <User className="h-6 w-6 text-poke-blue" />
              Perfil do Vendedor
            </DialogTitle>
          </DialogHeader>

          {selectedSeller && (
            <div className="space-y-4 mt-4">
              {/* Avatar e Nome */}
              <div className="flex items-center gap-4 p-4 bg-gradient-to-r from-poke-blue/10 to-poke-yellow/10 rounded-lg">
                <div className="w-16 h-16 bg-poke-blue rounded-full flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                  {selectedSeller.profile?.avatar_url ? (
                    <img
                      src={selectedSeller.profile.avatar_url}
                      alt={selectedSeller.display_name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{selectedSeller.display_name?.charAt(0).toUpperCase()}</span>
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-poke-dark">
                    {selectedSeller.display_name}
                  </h3>
                  <p className="text-sm text-muted-foreground flex items-center gap-1">
                    <Mail className="h-3 w-3" />
                    {selectedSeller.email}
                  </p>
                </div>
              </div>

              {/* Estatísticas */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-white border-2 border-poke-blue/20 rounded-lg p-4 text-center">
                  <Package className="h-6 w-6 text-poke-blue mx-auto mb-2" />
                  <p className="text-2xl font-bold text-poke-dark">
                    {selectedSeller.totalListings}
                  </p>
                  <p className="text-xs text-muted-foreground">Anúncios Ativos</p>
                </div>

                <div className="bg-white border-2 border-poke-yellow/20 rounded-lg p-4 text-center">
                  <Trophy className="h-6 w-6 text-poke-yellow mx-auto mb-2" />
                  <p className="text-2xl font-bold text-poke-dark">
                    {selectedSeller.reputation_score || 100}
                  </p>
                  <p className="text-xs text-muted-foreground">Reputação</p>
                </div>
              </div>

              {/* Informações Adicionais */}
              <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="h-4 w-4 text-poke-blue" />
                  <span className="text-muted-foreground">Membro desde:</span>
                  <span className="font-medium">
                    {new Date(selectedSeller.created_at).toLocaleDateString('pt-BR')}
                  </span>
                </div>

                {selectedSeller.profile?.region && (
                  <div className="flex items-center gap-2 text-sm">
                    <MapPin className="h-4 w-4 text-poke-blue" />
                    <span className="text-muted-foreground">Região:</span>
                    <span className="font-medium">{selectedSeller.profile.region}</span>
                  </div>
                )}

                {selectedSeller.profile?.contact && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-poke-blue" />
                    <span className="text-muted-foreground">Contato:</span>
                    <span className="font-medium">{selectedSeller.profile.contact}</span>
                  </div>
                )}
              </div>

              {/* Botão Fechar */}
              <Button
                onClick={() => setSellerProfileOpen(false)}
                className="w-full bg-poke-blue hover:bg-poke-blue/90"
              >
                Fechar
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
