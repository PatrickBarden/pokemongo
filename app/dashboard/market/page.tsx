'use client';

import { useEffect, useState, useMemo } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Eye, Star, X, MapPin, User, Calendar, TrendingUp, Award, Sparkles, Shirt, Image as ImageIcon, Heart, Package, Mail, Trophy, DollarSign, ShieldCheck, Filter, Zap, SlidersHorizontal, ChevronDown, RotateCcw } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';
import { translateType } from '@/lib/translations';
import { useCart } from '@/contexts/CartContext';
import { useToast } from '@/hooks/use-toast';
import { SellerBadge } from '@/components/reviews';
import { FavoriteButton } from '@/components/FavoriteButton';
import { useSearch } from '@/contexts/SearchContext';

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
  const { searchQuery, clearSearch, filters, setFilters, resetFilters, hasActiveFilters } = useSearch();
  const { addToCart, isInCart } = useCart();
  const { toast } = useToast();
  const [showFilters, setShowFilters] = useState(false);

  // Filtrar listings baseado na busca e filtros avançados
  const filteredListings = useMemo(() => {
    let result = [...listings];

    // Filtro de texto
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();

      // Detectar termos de variantes na busca
      const shinyTerms = ['shiny', 'brilhante', 'cintilante'];
      const costumeTerms = ['traje', 'costume', 'fantasia', 'roupa'];
      const dynamaxTerms = ['dinamax', 'dynamax'];
      const gigantamaxTerms = ['gigamax', 'gigantamax', 'gmax'];
      const purifiedTerms = ['purificado', 'purified'];
      const backgroundTerms = ['fundo', 'background'];

      const hasShinyTerm = shinyTerms.some(t => query.includes(t));
      const hasCostumeTerm = costumeTerms.some(t => query.includes(t));
      const hasDynamaxTerm = dynamaxTerms.some(t => query.includes(t));
      const hasGigantamaxTerm = gigantamaxTerms.some(t => query.includes(t));
      const hasPurifiedTerm = purifiedTerms.some(t => query.includes(t));
      const hasBackgroundTerm = backgroundTerms.some(t => query.includes(t));

      result = result.filter((listing) => {
        const title = listing.title?.toLowerCase() || '';
        const description = listing.description?.toLowerCase() || '';
        const sellerName = listing.owner?.display_name?.toLowerCase() || '';
        const category = listing.category?.toLowerCase() || '';

        // Verificar match textual
        const textMatch =
          title.includes(query) ||
          description.includes(query) ||
          sellerName.includes(query) ||
          category.includes(query);

        // Verificar variantes se detectadas na busca
        let variantMatch = true;
        if (hasShinyTerm) variantMatch = variantMatch && listing.is_shiny === true;
        if (hasCostumeTerm) variantMatch = variantMatch && listing.has_costume === true;
        if (hasDynamaxTerm) variantMatch = variantMatch && listing.is_dynamax === true;
        if (hasGigantamaxTerm) variantMatch = variantMatch && listing.is_gigantamax === true;
        if (hasPurifiedTerm) variantMatch = variantMatch && listing.is_purified === true;
        if (hasBackgroundTerm) variantMatch = variantMatch && listing.has_background === true;

        // Se encontrou termo de variante, filtra por ele; senão filtro textual
        const hasVariantTerm = hasShinyTerm || hasCostumeTerm || hasDynamaxTerm || hasGigantamaxTerm || hasPurifiedTerm || hasBackgroundTerm;

        return hasVariantTerm ? variantMatch : textMatch;
      });
    }

    // Filtro de categoria
    if (filters.category) {
      result = result.filter(l => l.category?.toLowerCase() === filters.category?.toLowerCase());
    }

    // Filtros de variantes do painel
    if (filters.variants.is_shiny === true) {
      result = result.filter(l => l.is_shiny === true);
    }
    if (filters.variants.has_costume === true) {
      result = result.filter(l => l.has_costume === true);
    }
    if (filters.variants.is_dynamax === true) {
      result = result.filter(l => l.is_dynamax === true);
    }
    if (filters.variants.is_gigantamax === true) {
      result = result.filter(l => l.is_gigantamax === true);
    }
    if (filters.variants.is_purified === true) {
      result = result.filter(l => l.is_purified === true);
    }
    if (filters.variants.has_background === true) {
      result = result.filter(l => l.has_background === true);
    }

    // Filtro de preço
    if (filters.price.min !== null) {
      result = result.filter(l => l.price_suggested >= filters.price.min!);
    }
    if (filters.price.max !== null) {
      result = result.filter(l => l.price_suggested <= filters.price.max!);
    }

    // Ordenação
    switch (filters.sortBy) {
      case 'price_asc':
        result.sort((a, b) => a.price_suggested - b.price_suggested);
        break;
      case 'price_desc':
        result.sort((a, b) => b.price_suggested - a.price_suggested);
        break;
      case 'popular':
        result.sort((a, b) => (b.view_count || 0) - (a.view_count || 0));
        break;
      case 'recent':
      default:
        // Já vem ordenado por data
        break;
    }

    return result;
  }, [listings, searchQuery, filters]);

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
          created_at,
          total_sales,
          average_rating,
          seller_level,
          verified_seller
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
    if (!seller?.id) {
      toast({
        title: "Erro",
        description: "Informações do vendedor não disponíveis.",
        variant: "destructive",
      });
      return;
    }

    setSelectedSeller(seller);

    // Buscar informações adicionais do perfil
    const { data: profileData } = await supabaseClient
      .from('profiles')
      .select('*')
      .eq('user_id', seller.id)
      .maybeSingle();

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
      <div className="flex items-center justify-center h-[50vh]">
        <div className="relative w-10 h-10">
          <div className="w-10 h-10 border-3 border-border rounded-full"></div>
          <div className="w-10 h-10 border-3 border-poke-blue border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Mercado</h1>
          <p className="text-sm sm:text-base text-muted-foreground mt-1">
            {searchQuery
              ? `Resultados para "${searchQuery}"`
              : 'Explore todos os Pokémon disponíveis para venda'
            }
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hasActiveFilters && (
            <Button
              variant="ghost"
              size="sm"
              onClick={resetFilters}
              className="text-muted-foreground hover:text-destructive"
            >
              <RotateCcw className="h-4 w-4 mr-1" />
              Limpar
            </Button>
          )}
          <Badge variant="outline" className="border-primary text-primary">
            {filteredListings.length} Pokémon
          </Badge>
        </div>
      </div>

      {/* Filtros Rápidos de Variantes */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide">
          <span className="text-sm font-medium text-muted-foreground whitespace-nowrap flex items-center gap-1">
            <Filter className="h-4 w-4" />
            Filtrar:
          </span>

          {/* Badge Shiny */}
          <Badge
            variant={filters.variants.is_shiny ? "default" : "outline"}
            className={`cursor-pointer whitespace-nowrap transition-all ${filters.variants.is_shiny
                ? "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-0 shadow-lg"
                : "hover:border-yellow-500 hover:text-yellow-600"
              }`}
            onClick={() => setFilters({
              variants: { ...filters.variants, is_shiny: filters.variants.is_shiny ? null : true }
            })}
          >
            <Sparkles className="h-3 w-3 mr-1" />
            Shiny
          </Badge>

          {/* Badge Traje */}
          <Badge
            variant={filters.variants.has_costume ? "default" : "outline"}
            className={`cursor-pointer whitespace-nowrap transition-all ${filters.variants.has_costume
                ? "bg-gradient-to-r from-purple-500 to-purple-700 text-white border-0 shadow-lg"
                : "hover:border-purple-500 hover:text-purple-600"
              }`}
            onClick={() => setFilters({
              variants: { ...filters.variants, has_costume: filters.variants.has_costume ? null : true }
            })}
          >
            <Shirt className="h-3 w-3 mr-1" />
            Traje
          </Badge>

          {/* Badge Dinamax */}
          <Badge
            variant={filters.variants.is_dynamax ? "default" : "outline"}
            className={`cursor-pointer whitespace-nowrap transition-all ${filters.variants.is_dynamax
                ? "bg-gradient-to-r from-red-600 to-red-800 text-white border-0 shadow-lg"
                : "hover:border-red-500 hover:text-red-600"
              }`}
            onClick={() => setFilters({
              variants: { ...filters.variants, is_dynamax: filters.variants.is_dynamax ? null : true }
            })}
          >
            <Zap className="h-3 w-3 mr-1" />
            Dinamax
          </Badge>

          {/* Badge Gigamax */}
          <Badge
            variant={filters.variants.is_gigantamax ? "default" : "outline"}
            className={`cursor-pointer whitespace-nowrap transition-all ${filters.variants.is_gigantamax
                ? "bg-gradient-to-r from-orange-500 to-red-600 text-white border-0 shadow-lg"
                : "hover:border-orange-500 hover:text-orange-600"
              }`}
            onClick={() => setFilters({
              variants: { ...filters.variants, is_gigantamax: filters.variants.is_gigantamax ? null : true }
            })}
          >
            <Zap className="h-3 w-3 mr-1" />
            Gigamax
          </Badge>

          {/* Badge Purificado */}
          <Badge
            variant={filters.variants.is_purified ? "default" : "outline"}
            className={`cursor-pointer whitespace-nowrap transition-all ${filters.variants.is_purified
                ? "bg-gradient-to-r from-pink-500 to-pink-700 text-white border-0 shadow-lg"
                : "hover:border-pink-500 hover:text-pink-600"
              }`}
            onClick={() => setFilters({
              variants: { ...filters.variants, is_purified: filters.variants.is_purified ? null : true }
            })}
          >
            <Heart className="h-3 w-3 mr-1" />
            Purificado
          </Badge>

          {/* Badge com Fundo */}
          <Badge
            variant={filters.variants.has_background ? "default" : "outline"}
            className={`cursor-pointer whitespace-nowrap transition-all ${filters.variants.has_background
                ? "bg-gradient-to-r from-blue-500 to-blue-700 text-white border-0 shadow-lg"
                : "hover:border-blue-500 hover:text-blue-600"
              }`}
            onClick={() => setFilters({
              variants: { ...filters.variants, has_background: filters.variants.has_background ? null : true }
            })}
          >
            <ImageIcon className="h-3 w-3 mr-1" />
            Com Fundo
          </Badge>
        </div>

        {/* Ordenação */}
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-muted-foreground flex items-center gap-1">
            <SlidersHorizontal className="h-4 w-4" />
            Ordenar:
          </span>
          <div className="flex gap-1 flex-wrap">
            {[
              { value: 'recent', label: 'Recentes' },
              { value: 'price_asc', label: 'Menor Preço' },
              { value: 'price_desc', label: 'Maior Preço' },
              { value: 'popular', label: 'Populares' },
            ].map((option) => (
              <Badge
                key={option.value}
                variant={filters.sortBy === option.value ? "default" : "outline"}
                className={`cursor-pointer transition-all ${filters.sortBy === option.value
                    ? "bg-poke-blue text-white"
                    : "hover:border-poke-blue hover:text-poke-blue"
                  }`}
                onClick={() => setFilters({ sortBy: option.value as any })}
              >
                {option.label}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {filteredListings.map((listing) => {
          const realPhoto = listing.photo_url;
          const apiSprite = listing.pokemon_data?.sprites?.other?.['official-artwork']?.front_default
            || listing.pokemon_data?.sprites?.front_default;
          const imageUrl = realPhoto || apiSprite;

          return (
            <div
              key={listing.id}
              className="group bg-gradient-to-r from-primary/5 via-card to-card rounded-2xl overflow-hidden border border-border hover:border-primary/40 hover:shadow-xl transition-all duration-300 cursor-pointer"
              onClick={() => {
                setSelectedListing(listing);
                setModalOpen(true);
                if (listing.photo_url) {
                  setPokemonImage(listing.photo_url);
                  setPokemonData(listing.pokemon_data);
                } else if (listing.pokemon_data) {
                  setPokemonImage(apiSprite);
                  setPokemonData(listing.pokemon_data);
                } else {
                  fetchPokemonImage(listing.title);
                }
              }}
            >
              <div className="flex h-[120px] sm:h-[130px]">
                {/* Imagem à esquerda - altura fixa para uniformizar */}
                <div className="relative w-[120px] h-[120px] sm:w-[130px] sm:h-[130px] flex-shrink-0 bg-gradient-to-br from-muted/30 to-muted/60 overflow-hidden">
                  {imageUrl ? (
                    <img
                      src={imageUrl}
                      alt={listing.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-10 h-10 text-muted-foreground/30" />
                    </div>
                  )}

                  {/* Badges no topo esquerdo da imagem - z-index alto para não ser tapado */}
                  <div className="absolute top-1.5 left-1.5 flex flex-row gap-1 z-20">
                    {listing.is_shiny && (
                      <span className="bg-gradient-to-r from-yellow-400 to-amber-500 text-white text-[9px] font-bold px-2 py-1 rounded-full flex items-center gap-0.5 shadow-lg">
                        <Sparkles className="h-2.5 w-2.5" />
                        Shiny
                      </span>
                    )}
                    {realPhoto && (
                      <span className="bg-gradient-to-r from-emerald-400 to-green-500 text-white text-[9px] font-bold px-2 py-1 rounded-full shadow-lg">
                        Real
                      </span>
                    )}
                  </div>
                </div>

                {/* Conteúdo à direita */}
                <div className="flex-1 p-3 flex flex-col justify-between min-w-0 overflow-hidden">
                  {/* Header: Título, Tipo e Favorito */}
                  <div>
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-base sm:text-lg text-foreground line-clamp-1">
                          {listing.title}
                        </h3>
                        <button
                          className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 mt-0.5"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (listing.owner?.id) handleOpenSellerProfile(listing.owner);
                          }}
                        >
                          <User className="h-3 w-3" />
                          <span className="truncate">{listing.owner?.display_name || 'Vendedor'}</span>
                          {listing.owner?.verified_seller && <ShieldCheck className="h-3 w-3 text-green-500 flex-shrink-0" />}
                        </button>
                      </div>

                      <div className="flex items-center gap-2 flex-shrink-0">
                        <Badge className="bg-primary/10 text-primary border-0 text-[10px] px-2 py-0.5 h-5">
                          {translateType(listing.category)}
                        </Badge>
                        {/* Botão Favorito */}
                        {currentUserId && listing.owner_id !== currentUserId && (
                          <div onClick={(e) => e.stopPropagation()}>
                            <FavoriteButton
                              userId={currentUserId}
                              listingId={listing.id}
                              currentPrice={listing.price_suggested}
                              size="sm"
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer: Preço e Ações */}
                  <div className="flex items-center justify-between gap-2 mt-auto pt-2">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg font-bold text-primary whitespace-nowrap">
                        {formatCurrency(listing.price_suggested)}
                      </span>
                      {listing.accepts_offers && (
                        <span className="text-[9px] text-muted-foreground bg-muted px-1.5 py-0.5 rounded whitespace-nowrap">
                          Aceita oferta
                        </span>
                      )}
                    </div>

                    {/* Botões de ação - Design moderno */}
                    <div className="flex gap-1 flex-shrink-0" onClick={(e) => e.stopPropagation()}>
                      <button
                        className={`p-2 rounded-full shadow-sm active:scale-95 transition-all duration-200 ${isInCart(listing.id)
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground hover:bg-primary hover:text-primary-foreground'
                          }`}
                        onClick={() => handleAddToCart(listing)}
                        disabled={isInCart(listing.id) || listing.owner_id === currentUserId}
                        title={isInCart(listing.id) ? 'No carrinho' : 'Adicionar ao carrinho'}
                      >
                        <ShoppingCart className="h-4 w-4" />
                      </button>
                      <button
                        className="p-2 rounded-full bg-green-500 text-white shadow-sm hover:bg-green-600 active:scale-95 transition-all duration-200"
                        onClick={() => {
                          if (listing.owner_id !== currentUserId) {
                            window.location.href = `/dashboard/checkout?listing=${listing.id}`;
                          }
                        }}
                        disabled={listing.owner_id === currentUserId}
                        title="Comprar agora"
                      >
                        <DollarSign className="h-4 w-4" />
                      </button>
                      <button
                        className="p-2 rounded-full bg-muted text-muted-foreground hover:bg-muted/80 hover:text-foreground active:scale-95 transition-all duration-200"
                        onClick={() => {
                          setSelectedListing(listing);
                          setModalOpen(true);
                          if (listing.photo_url) {
                            setPokemonImage(listing.photo_url);
                            setPokemonData(listing.pokemon_data);
                          } else if (listing.pokemon_data) {
                            setPokemonImage(apiSprite);
                            setPokemonData(listing.pokemon_data);
                          } else {
                            fetchPokemonImage(listing.title);
                          }
                        }}
                        title="Ver detalhes"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredListings.length === 0 && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <ShoppingCart className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              {searchQuery ? 'Nenhum Pokémon encontrado' : 'Nenhum Pokémon disponível no momento'}
            </p>
            <p className="text-sm text-muted-foreground mt-2">
              {searchQuery
                ? `Não encontramos resultados para "${searchQuery}". Tente outro termo.`
                : 'Novos Pokémon aparecerão aqui quando forem cadastrados'
              }
            </p>
            {searchQuery && (
              <Button
                variant="outline"
                className="mt-4"
                onClick={clearSearch}
              >
                Limpar busca
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {/* Modal de Visualização - Design Inspirado em Jogos */}
      {modalOpen && selectedListing && (
        <Dialog open={true} onOpenChange={setModalOpen}>
          <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden bg-gradient-to-br from-slate-900 via-blue-900 to-slate-900 border-2 border-poke-blue/50 max-h-[90vh] overflow-y-auto">
            <DialogTitle className="sr-only">
              Detalhes do Pokémon {selectedListing.title}
            </DialogTitle>
            {/* Header com Gradiente Pokémon */}
            <div className="relative bg-gradient-to-r from-poke-blue via-poke-yellow to-poke-blue p-4 sm:p-6 pb-16 sm:pb-20">
              <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PGRlZnM+PHBhdHRlcm4gaWQ9ImdyaWQiIHdpZHRoPSI2MCIgaGVpZ2h0PSI2MCIgcGF0dGVyblVuaXRzPSJ1c2VyU3BhY2VPblVzZSI+PHBhdGggZD0iTSAxMCAwIEwgMCAwIDAgMTAiIGZpbGw9Im5vbmUiIHN0cm9rZT0id2hpdGUiIHN0cm9rZS1vcGFjaXR5PSIwLjEiIHN0cm9rZS13aWR0aD0iMSIvPjwvcGF0dGVybj48L2RlZnM+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0idXJsKCNncmlkKSIvPjwvc3ZnPg==')] opacity-30"></div>

              <div className="relative flex items-start justify-between gap-3 pr-8">
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
              {(selectedListing.is_shiny || selectedListing.has_costume || selectedListing.has_background || selectedListing.is_purified || selectedListing.is_dynamax || selectedListing.is_gigantamax) && (
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
                  {selectedListing.is_dynamax && (
                    <Badge className="bg-gradient-to-r from-red-500 to-red-700 text-white border-0 px-4 py-1 text-xs sm:text-sm font-semibold uppercase">
                      Dinamax
                    </Badge>
                  )}
                  {selectedListing.is_gigantamax && (
                    <Badge className="bg-gradient-to-r from-orange-500 to-red-600 text-white border-0 px-4 py-1 text-xs sm:text-sm font-semibold uppercase">
                      Gigamax
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
                  {selectedListing.description || 'Pokémon raro disponível para venda!'}
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
                    handleAddToCart(selectedListing);
                    setModalOpen(false);
                  }}
                  disabled={selectedListing?.owner_id === currentUserId}
                >
                  <ShoppingCart className="h-4 w-4 sm:h-5 sm:w-5 mr-2" />
                  Adicionar ao Carrinho
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
          </DialogContent>
        </Dialog>
      )}

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
                    <>
                      <img
                        src={selectedSeller.profile.avatar_url}
                        alt={selectedSeller.display_name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                        }}
                      />
                      <span className="fallback-initial">{selectedSeller.display_name?.charAt(0).toUpperCase()}</span>
                    </>
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
