'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { translateType } from '@/lib/translations';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { getAllListingsWithOwners } from './actions';
import { 
  ShoppingCart, Eye, Star, Search, Filter, TrendingUp, 
  Package, Users, DollarSign, MoreHorizontal, Ban, CheckCircle,
  Sparkles, Shield, Palette, Ghost, ImageIcon
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

export default function MarketPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selectedListing, setSelectedListing] = useState<any>(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  useEffect(() => {
    fetchListings();
  }, []);

  const fetchListings = async () => {
    // Usar Server Action com privilégios admin para buscar listings e owners
    const { data, error } = await getAllListingsWithOwners();

    if (error) {
      console.error('Erro ao buscar listings:', error);
    }

    if (data && data.length > 0) {
      // Buscar imagens dos Pokémon via PokeAPI
      const listingsWithImages = await Promise.all(
        data.map(async (listing: any) => {
          if (!listing.pokemon_data || !listing.pokemon_data.sprites) {
            try {
              const pokemonName = listing.title
                .toLowerCase()
                .normalize('NFD')
                .replace(/[\u0300-\u036f]/g, '')
                .split(' ')[0]
                .trim();
              
              const response = await fetch(`https://pokeapi.co/api/v2/pokemon/${pokemonName}`);
              if (response.ok) {
                const pokemonData = await response.json();
                return { ...listing, pokemon_data: pokemonData };
              }
            } catch (err) {
              console.log('Erro ao buscar imagem:', listing.title);
            }
          }
          return listing;
        })
      );
      
      setListings(listingsWithImages);
    }
    setLoading(false);
  };

  // Função para obter a imagem do Pokémon
  const getPokemonImage = (listing: any) => {
    if (listing.pokemon_data?.sprites) {
      if (listing.is_shiny && listing.pokemon_data.sprites.front_shiny) {
        return listing.pokemon_data.sprites.front_shiny;
      }
      if (listing.pokemon_data.sprites.other?.['official-artwork']?.front_default) {
        return listing.pokemon_data.sprites.other['official-artwork'].front_default;
      }
      return listing.pokemon_data.sprites.front_default;
    }
    return null;
  };

  const openDetailModal = (listing: any) => {
    setSelectedListing(listing);
    setDetailModalOpen(true);
  };

  // Estatísticas
  const stats = {
    total: listings.length,
    active: listings.filter(l => l.active).length,
    inactive: listings.filter(l => !l.active).length,
    totalValue: listings.reduce((acc, l) => acc + (l.price_suggested || 0), 0),
    shiny: listings.filter(l => l.is_shiny).length,
  };

  // Filtros
  const filteredListings = listings.filter(listing => {
    const matchesSearch = 
      listing.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      listing.owner?.display_name?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = categoryFilter === 'all' || listing.category === categoryFilter;
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && listing.active) ||
      (statusFilter === 'inactive' && !listing.active);

    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Categorias únicas
  const categories = Array.from(new Set(listings.map(l => l.category)));

  const toggleListingStatus = async (id: string, currentStatus: boolean) => {
    const client = supabaseClient as any;
    await client
      .from('listings')
      .update({ active: !currentStatus })
      .eq('id', id);
    fetchListings();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-poke-blue"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-poke-dark">Gestão do Mercado</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie todos os anúncios e produtos da plataforma
          </p>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
        <Card className="border-l-4 border-l-poke-blue">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total de Anúncios</p>
                <p className="text-2xl font-bold text-poke-blue">{stats.total}</p>
              </div>
              <Package className="h-8 w-8 text-poke-blue/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Ativos</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <CheckCircle className="h-8 w-8 text-green-500/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-red-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Inativos</p>
                <p className="text-2xl font-bold text-red-600">{stats.inactive}</p>
              </div>
              <Ban className="h-8 w-8 text-red-500/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-poke-yellow">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold text-poke-yellow">{formatCurrency(stats.totalValue)}</p>
              </div>
              <DollarSign className="h-8 w-8 text-poke-yellow/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Shinies</p>
                <p className="text-2xl font-bold text-purple-600">{stats.shiny}</p>
              </div>
              <Sparkles className="h-8 w-8 text-purple-500/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por título ou vendedor..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={categoryFilter} onValueChange={setCategoryFilter}>
              <SelectTrigger className="w-full md:w-[180px]">
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas Categorias</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Table */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Package className="h-5 w-5" />
            Anúncios ({filteredListings.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Pokémon</TableHead>
                <TableHead>Vendedor</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Atributos</TableHead>
                <TableHead className="text-right">Preço</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Criado em</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredListings.map((listing) => {
                const pokemonImg = getPokemonImage(listing);
                return (
                <TableRow key={listing.id} className="hover:bg-slate-50">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div 
                        className={`w-14 h-14 rounded-lg flex items-center justify-center overflow-hidden cursor-pointer transition-transform hover:scale-110 ${
                          listing.is_shiny 
                            ? 'bg-gradient-to-br from-yellow-100 via-purple-100 to-pink-100 ring-2 ring-yellow-400' 
                            : 'bg-gradient-to-br from-poke-blue/20 to-poke-yellow/20'
                        }`}
                        onClick={() => openDetailModal(listing)}
                      >
                        {pokemonImg ? (
                          <img 
                            src={pokemonImg} 
                            alt={listing.title}
                            className="w-12 h-12 object-contain"
                          />
                        ) : (
                          <ImageIcon className="h-6 w-6 text-muted-foreground" />
                        )}
                      </div>
                      <div>
                        <p className="font-medium text-sm flex items-center gap-1">
                          {listing.title}
                          {listing.is_shiny && <Sparkles className="h-3 w-3 text-yellow-500" />}
                        </p>
                        <p className="text-xs text-muted-foreground line-clamp-1 max-w-[180px]">
                          {listing.description}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="text-sm font-medium">{listing.owner?.display_name || 'N/A'}</p>
                      <p className="text-xs text-muted-foreground">{listing.owner?.email}</p>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="text-xs">
                      {translateType(listing.category)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-1 flex-wrap">
                      {listing.is_shiny && (
                        <Badge className="bg-purple-100 text-purple-700 border-0 text-[10px] px-1.5">
                          <Sparkles className="h-3 w-3 mr-0.5" />
                          Brilhante
                        </Badge>
                      )}
                      {listing.has_costume && (
                        <Badge className="bg-pink-100 text-pink-700 border-0 text-[10px] px-1.5">
                          <Palette className="h-3 w-3 mr-0.5" />
                          Traje
                        </Badge>
                      )}
                      {listing.is_purified && (
                        <Badge className="bg-blue-100 text-blue-700 border-0 text-[10px] px-1.5">
                          <Shield className="h-3 w-3 mr-0.5" />
                          Purificado
                        </Badge>
                      )}
                      {listing.has_background && (
                        <Badge className="bg-green-100 text-green-700 border-0 text-[10px] px-1.5">
                          <Ghost className="h-3 w-3 mr-0.5" />
                          Fundo
                        </Badge>
                      )}
                      {!listing.is_shiny && !listing.has_costume && !listing.is_purified && !listing.has_background && (
                        <span className="text-xs text-muted-foreground">-</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div>
                      <p className="font-bold text-poke-blue">{formatCurrency(listing.price_suggested)}</p>
                      {listing.accepts_offers && (
                        <p className="text-[10px] text-poke-yellow flex items-center justify-end gap-0.5">
                          <Star className="h-3 w-3" /> Aceita ofertas
                        </p>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {listing.active ? (
                      <Badge className="bg-green-100 text-green-700 border-0">Ativo</Badge>
                    ) : (
                      <Badge className="bg-red-100 text-red-700 border-0">Inativo</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(listing.created_at)}
                    </p>
                  </TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Ações</DropdownMenuLabel>
                        <DropdownMenuItem onClick={() => openDetailModal(listing)}>
                          <Eye className="mr-2 h-4 w-4" />
                          Ver Detalhes
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => toggleListingStatus(listing.id, listing.active)}>
                          {listing.active ? (
                            <>
                              <Ban className="mr-2 h-4 w-4 text-red-500" />
                              <span className="text-red-500">Desativar</span>
                            </>
                          ) : (
                            <>
                              <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                              <span className="text-green-500">Ativar</span>
                            </>
                          )}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredListings.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Nenhum anúncio encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Detalhes */}
      <Dialog open={detailModalOpen} onOpenChange={setDetailModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Detalhes do Anúncio
            </DialogTitle>
          </DialogHeader>
          
          {selectedListing && (
            <div className="space-y-6">
              {/* Imagem Grande */}
              <div className="flex justify-center">
                <div className={`w-48 h-48 rounded-xl flex items-center justify-center ${
                  selectedListing.is_shiny 
                    ? 'bg-gradient-to-br from-yellow-100 via-purple-100 to-pink-100 ring-4 ring-yellow-400' 
                    : 'bg-gradient-to-br from-poke-blue/20 to-poke-yellow/20'
                }`}>
                  {getPokemonImage(selectedListing) ? (
                    <img 
                      src={getPokemonImage(selectedListing)} 
                      alt={selectedListing.title}
                      className="w-40 h-40 object-contain"
                    />
                  ) : (
                    <ImageIcon className="h-16 w-16 text-muted-foreground" />
                  )}
                </div>
              </div>

              {/* Informações */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Título</p>
                  <p className="font-semibold flex items-center gap-1">
                    {selectedListing.title}
                    {selectedListing.is_shiny && <Sparkles className="h-4 w-4 text-yellow-500" />}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Preço</p>
                  <p className="font-bold text-poke-blue text-lg">{formatCurrency(selectedListing.price_suggested)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Vendedor</p>
                  <p className="font-medium">{selectedListing.owner?.display_name || 'Vendedor não identificado'}</p>
                  <p className="text-xs text-muted-foreground">{selectedListing.owner?.email || 'Email não disponível'}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Categoria</p>
                  <Badge variant="secondary">{translateType(selectedListing.category)}</Badge>
                </div>
              </div>

              {/* Descrição */}
              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">Descrição</p>
                <p className="text-sm bg-slate-50 p-3 rounded-lg">{selectedListing.description}</p>
              </div>

              {/* Atributos */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground">Atributos</p>
                <div className="flex flex-wrap gap-2">
                  {selectedListing.is_shiny && (
                    <Badge className="bg-purple-100 text-purple-700 border-0">
                      <Sparkles className="h-3 w-3 mr-1" /> Brilhante
                    </Badge>
                  )}
                  {selectedListing.has_costume && (
                    <Badge className="bg-pink-100 text-pink-700 border-0">
                      <Palette className="h-3 w-3 mr-1" /> Traje
                    </Badge>
                  )}
                  {selectedListing.is_purified && (
                    <Badge className="bg-blue-100 text-blue-700 border-0">
                      <Shield className="h-3 w-3 mr-1" /> Purificado
                    </Badge>
                  )}
                  {selectedListing.has_background && (
                    <Badge className="bg-green-100 text-green-700 border-0">
                      <Ghost className="h-3 w-3 mr-1" /> Fundo
                    </Badge>
                  )}
                  {selectedListing.accepts_offers && (
                    <Badge className="bg-yellow-100 text-yellow-700 border-0">
                      <Star className="h-3 w-3 mr-1" /> Aceita Ofertas
                    </Badge>
                  )}
                </div>
              </div>

              {/* Ações */}
              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  variant={selectedListing.active ? "destructive" : "default"}
                  className="flex-1"
                  onClick={() => {
                    toggleListingStatus(selectedListing.id, selectedListing.active);
                    setDetailModalOpen(false);
                  }}
                >
                  {selectedListing.active ? (
                    <>
                      <Ban className="h-4 w-4 mr-2" /> Desativar Anúncio
                    </>
                  ) : (
                    <>
                      <CheckCircle className="h-4 w-4 mr-2" /> Ativar Anúncio
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
