'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency } from '@/lib/format';
import { Button } from '@/components/ui/button';
import { ShoppingCart, Eye, Star, X, MapPin, User, Calendar, TrendingUp, Award, Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Separator } from '@/components/ui/separator';

export default function MarketPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [pokemonImage, setPokemonImage] = useState<string | null>(null);
  const [loadingImage, setLoadingImage] = useState(false);
  const [pokemonData, setPokemonData] = useState<any>(null);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    const { data } = await supabaseClient
      .from('listings')
      .select(`
        *,
        owner:owner_id(id, display_name)
      `)
      .eq('active', true)
      .order('created_at', { ascending: false });

    if (data) {
      setListings(data);
    }
    setLoading(false);
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
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-2">
                    {listing.title}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground mt-1">
                    {listing.owner?.display_name}
                  </p>
                </div>
                <Badge className="bg-poke-yellow text-poke-dark border-0">
                  {listing.category}
                </Badge>
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

                <div className="flex gap-2 pt-2">
                  <Button
                    className="flex-1 bg-poke-blue hover:bg-poke-blue/90"
                    size="sm"
                  >
                    <ShoppingCart className="h-4 w-4 mr-2" />
                    Trocar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-poke-blue text-poke-blue hover:bg-poke-blue/10"
                    onClick={() => {
                      setSelectedListing(listing);
                      setModalOpen(true);
                      // Buscar imagem do Pokémon se tiver pokemon_data ou usar o título
                      if (listing.pokemon_data) {
                        const imageUrl = listing.pokemon_data.sprites?.other?.['official-artwork']?.front_default || 
                                       listing.pokemon_data.sprites?.front_default;
                        setPokemonImage(imageUrl);
                        setPokemonData(listing.pokemon_data);
                      } else {
                        fetchPokemonImage(listing.title);
                      }
                    }}
                  >
                    <Eye className="h-4 w-4" />
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
                      <img
                        src={pokemonImage}
                        alt={selectedListing.title}
                        className="relative z-10 w-48 h-48 sm:w-64 sm:h-64 object-contain drop-shadow-2xl"
                        onError={() => setPokemonImage(null)}
                      />
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
                {/* Tipos do Pokémon */}
                {pokemonData?.types && pokemonData.types.length > 0 && (
                  <div className="flex justify-center gap-2 -mt-2">
                    {pokemonData.types.map((typeInfo: any) => (
                      <Badge
                        key={typeInfo.type.name}
                        className="bg-gradient-to-r from-poke-blue to-blue-600 text-white border-0 px-4 py-1 text-xs sm:text-sm font-semibold uppercase"
                      >
                        {typeInfo.type.name}
                      </Badge>
                    ))}
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
    </div>
  );
}
