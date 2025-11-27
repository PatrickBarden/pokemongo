'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Package, Edit, Trash2, Sparkles, Shirt, Image as ImageIcon, Heart, Eye, TrendingUp, Star } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PokemonSearch } from '@/components/pokemon-search';
import { PokemonDetails } from '@/lib/pokeapi';
import { translateType, capitalizePokemonName } from '@/lib/translations';
import { ImageUpload } from '@/components/ImageUpload';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';

export default function WalletPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [pokemonToDelete, setPokemonToDelete] = useState<any>(null);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    price_suggested: '',
    accepts_offers: false,
    regions: '',
    pokemon_data: null as PokemonDetails | null,
    photo_url: '',
    is_shiny: false,
    has_costume: false,
    has_background: false,
    is_purified: false,
  });

  useEffect(() => {
    loadListings();
  }, []);

  const loadListings = async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (!user) return;

    setUserId(user.id);

    const { data } = await supabaseClient
      .from('listings')
      .select('*')
      .eq('owner_id', user.id)
      .order('created_at', { ascending: false });

    if (data) {
      setListings(data);
    }
    setLoading(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      // Validações básicas
      if (!formData.title || formData.title.trim().length === 0) {
        setError('Por favor, preencha o nome do Pokémon');
        setLoading(false);
        return;
      }

      if (!formData.description || formData.description.trim().length < 10) {
        setError('A descrição deve ter pelo menos 10 caracteres');
        setLoading(false);
        return;
      }

      if (!formData.price_suggested || parseFloat(formData.price_suggested) <= 0) {
        setError('Por favor, insira um preço válido');
        setLoading(false);
        return;
      }

      const regions = formData.regions
        .split(',')
        .map(r => r.trim())
        .filter(r => r.length > 0);

      // Preparar dados
      const dataToSave = {
        owner_id: userId,
        title: formData.title.trim(),
        description: formData.description.trim(),
        category: formData.category.trim() || 'Geral',
        price_suggested: parseFloat(formData.price_suggested),
        accepts_offers: formData.accepts_offers,
        regions: regions.length > 0 ? regions : ['Global'],
        active: true,
        photo_url: formData.photo_url || null,
        is_shiny: formData.is_shiny || false,
        has_costume: formData.has_costume || false,
        has_background: formData.has_background || false,
        is_purified: formData.is_purified || false,
        pokemon_data: formData.pokemon_data,
      };

      if (editingId) {
        // Atualizar
        const { error: updateError } = await (supabaseClient as any)
          .from('listings')
          .update(dataToSave)
          .eq('id', editingId);

        if (updateError) {
          setError(`Erro ao atualizar: ${updateError.message}`);
          setLoading(false);
          return;
        }

        setSuccess('Pokémon atualizado com sucesso!');
      } else {
        // Inserir
        const { error: insertError } = await (supabaseClient as any)
          .from('listings')
          .insert(dataToSave)
          .select();

        if (insertError) {
          setError(`Erro ao cadastrar: ${insertError.message}`);
          setLoading(false);
          return;
        }

        setSuccess('Pokémon cadastrado com sucesso!');
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({
        title: '',
        description: '',
        category: '',
        price_suggested: '',
        accepts_offers: false,
        regions: '',
        pokemon_data: null,
        photo_url: '',
        is_shiny: false,
        has_costume: false,
        has_background: false,
        is_purified: false,
      });
      loadListings();
    } catch (error: any) {
      setError(`Erro inesperado: ${error.message || 'Tente novamente'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (listing: any) => {
    setEditingId(listing.id);
    setFormData({
      title: listing.title,
      description: listing.description,
      category: listing.category,
      price_suggested: listing.price_suggested.toString(),
      accepts_offers: listing.accepts_offers,
      regions: Array.isArray(listing.regions) ? listing.regions.join(', ') : '',
      pokemon_data: listing.pokemon_data,
      photo_url: listing.photo_url || '',
      is_shiny: listing.is_shiny || false,
      has_costume: listing.has_costume || false,
      has_background: listing.has_background || false,
      is_purified: listing.is_purified || false,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async () => {
    if (!pokemonToDelete) return;

    const { error } = await supabaseClient
      .from('listings')
      .delete()
      .eq('id', pokemonToDelete.id);

    if (!error) {
      setSuccess('Pokémon excluído com sucesso!');
      loadListings();
    }
    
    setDeleteDialogOpen(false);
    setPokemonToDelete(null);
  };

  const openDeleteDialog = (listing: any) => {
    setPokemonToDelete(listing);
    setDeleteDialogOpen(true);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-poke-blue mx-auto"></div>
          <p className="mt-4 text-muted-foreground">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-poke-dark">Minha Carteira</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie seus Pokémon para venda
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-poke-blue hover:bg-poke-blue/90"
        >
          <Plus className="h-4 w-4 mr-2" />
          Cadastrar Pokémon
        </Button>
      </div>

      {error && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {success && (
        <Alert className="border-poke-blue bg-poke-blue/10">
          <AlertDescription className="text-poke-blue">{success}</AlertDescription>
        </Alert>
      )}

      {showForm && (
        <Card className="border-2 border-poke-blue/30 shadow-lg">
          <CardHeader className="bg-gradient-to-r from-poke-blue/5 to-poke-yellow/5 border-b py-4">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-poke-blue rounded-lg">
                <Plus className="h-5 w-5 text-white" />
              </div>
              <div>
                <CardTitle className="text-xl">
                  {editingId ? 'Editar Pokémon' : 'Cadastrar Pokémon'}
                </CardTitle>
                <CardDescription className="text-xs">
                  {editingId ? 'Atualize as informações do seu Pokémon' : 'Preencha os dados para venda'}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Seção 1: Busca Rápida */}
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-lg p-3 border border-blue-200">
                <div className="flex items-center gap-2 mb-2">
                  <Eye className="h-4 w-4 text-blue-600" />
                  <Label className="text-sm font-semibold text-blue-900">Busca Rápida na Pokédex</Label>
                </div>
                <PokemonSearch
                  onSelect={(pokemon, description) => {
                    setFormData({
                      ...formData,
                      title: pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1),
                      description: description || `Pokémon ${pokemon.name}`,
                      category: pokemon.types[0].type.name,
                      pokemon_data: pokemon,
                    });
                  }}
                />
              </div>
              
              <div className="relative py-2">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="px-3 bg-white text-gray-500">ou preencha manualmente</span>
                </div>
              </div>

              {/* Seção: Upload de Foto Real */}
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 rounded-lg p-4 border-2 border-amber-200">
                <ImageUpload
                  userId={userId}
                  currentImage={formData.photo_url}
                  onImageUploaded={(url) => setFormData({ ...formData, photo_url: url })}
                />
              </div>
              
              {/* Seção 2: Informações Básicas + Descrição */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <Package className="h-4 w-4 text-poke-blue" />
                  <Label className="text-sm font-semibold text-gray-900">Informações do Pokémon</Label>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="title" className="text-xs font-medium text-gray-700">Nome *</Label>
                    <Input
                      id="title"
                      value={formData.title}
                      onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                      required
                      placeholder="Ex: Charizard"
                      className="h-9 text-sm"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="category" className="text-xs font-medium text-gray-700">Tipo *</Label>
                    <Input
                      id="category"
                      value={formData.category}
                      onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                      placeholder="Ex: Fire, Water"
                      required
                      className="h-9 text-sm"
                    />
                  </div>
                </div>

                <div className="space-y-1.5 mt-3">
                  <Label htmlFor="description" className="text-xs font-medium text-gray-700">
                    Descrição * <span className="text-gray-400 font-normal">({formData.description.length} caracteres)</span>
                  </Label>
                  <Textarea
                    id="description"
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={3}
                    required
                    placeholder="Nível, CP, IVs e outras informações..."
                    className="text-sm resize-none"
                  />
                </div>
              </div>

              {/* Seção 3: Preço e Localização */}
              <div className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-3">
                  <TrendingUp className="h-4 w-4 text-green-600" />
                  <Label className="text-sm font-semibold text-gray-900">Preço e Localização</Label>
                </div>
                <div className="grid gap-3 md:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="price" className="text-xs font-medium text-gray-700">Preço (R$) *</Label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-500 text-sm">R$</span>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        min="0"
                        value={formData.price_suggested}
                        onChange={(e) => setFormData({ ...formData, price_suggested: e.target.value })}
                        required
                        placeholder="0,00"
                        className="h-9 text-sm pl-9"
                      />
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="regions" className="text-xs font-medium text-gray-700">Regiões</Label>
                    <Input
                      id="regions"
                      value={formData.regions}
                      onChange={(e) => setFormData({ ...formData, regions: e.target.value })}
                      placeholder="Brasil, América Latina"
                      className="h-9 text-sm"
                    />
                  </div>
                </div>
              </div>

              {/* Seção 4: Opções e Variantes */}
              <div className="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg p-3 border border-amber-200">
                <div className="flex items-center gap-2 mb-3">
                  <Star className="h-4 w-4 text-amber-600" />
                  <Label className="text-sm font-semibold text-amber-900">Opções de Negociação</Label>
                </div>
                
                <label 
                  htmlFor="accepts_offers"
                  className="flex items-center gap-2 p-2.5 bg-white rounded-md border border-amber-200 cursor-pointer hover:border-amber-400 transition-all mb-3"
                >
                  <input
                    type="checkbox"
                    id="accepts_offers"
                    checked={formData.accepts_offers}
                    onChange={(e) => setFormData({ ...formData, accepts_offers: e.target.checked })}
                    className="w-4 h-4 rounded border-gray-300 text-amber-500 focus:ring-amber-500"
                  />
                  <div className="flex-1">
                    <span className="text-sm font-medium text-gray-900">Aceitar Propostas</span>
                  </div>
                  {formData.accepts_offers && (
                    <Badge className="bg-amber-500 text-white text-xs px-2 py-0.5">Ativo</Badge>
                  )}
                </label>

                {/* Variantes */}
                <div className="pt-2 border-t border-amber-200">
                  <Label className="text-xs font-semibold text-amber-900 mb-2 block">Variantes Especiais</Label>
                  
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_shiny: !formData.is_shiny })}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                        formData.is_shiny 
                          ? 'bg-gradient-to-r from-yellow-400 to-yellow-600 text-white shadow-md hover:shadow-lg' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Brilhante
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, has_costume: !formData.has_costume })}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                        formData.has_costume 
                          ? 'bg-gradient-to-r from-purple-500 to-purple-700 text-white shadow-md hover:shadow-lg' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Com Traje
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, has_background: !formData.has_background })}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                        formData.has_background 
                          ? 'bg-gradient-to-r from-blue-500 to-blue-700 text-white shadow-md hover:shadow-lg' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Com Fundo
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, is_purified: !formData.is_purified })}
                      className={`px-4 py-2 rounded-full text-sm font-semibold transition-all ${
                        formData.is_purified 
                          ? 'bg-gradient-to-r from-pink-500 to-pink-700 text-white shadow-md hover:shadow-lg' 
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      Purificado
                    </button>
                  </div>
                </div>
              </div>

              {/* Botões de Ação */}
              <div className="flex gap-2 pt-4 border-t">
                <Button 
                  type="submit" 
                  className="flex-1 bg-gradient-to-r from-poke-blue to-blue-600 hover:from-poke-blue/90 hover:to-blue-700 text-white font-semibold h-10 text-sm shadow-md hover:shadow-lg transition-all"
                >
                  {editingId ? (
                    <>
                      <Edit className="h-4 w-4 mr-1.5" />
                      Atualizar Pokémon
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-1.5" />
                      Cadastrar Pokémon
                    </>
                  )}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    setEditingId(null);
                    setFormData({
                      title: '',
                      description: '',
                      category: '',
                      price_suggested: '',
                      accepts_offers: false,
                      regions: '',
                      pokemon_data: null,
                      photo_url: '',
                      is_shiny: false,
                      has_costume: false,
                      has_background: false,
                      is_purified: false,
                    });
                  }}
                  className="px-6 h-10 text-sm font-medium"
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {listings.map((listing) => (
          <Card
            key={listing.id}
            className="group relative overflow-hidden border-2 border-gray-200 hover:border-poke-blue hover:shadow-xl transition-all duration-300"
          >
            {/* Header com gradiente */}
            <div className="relative bg-gradient-to-br from-poke-blue/10 via-purple-50 to-pink-50 p-4 border-b">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="text-xl font-bold text-gray-900 line-clamp-1">
                      {listing.title}
                    </h3>
                    {listing.active ? (
                      <Badge className="bg-green-500 text-white text-xs px-2 py-0.5">
                        <div className="w-1.5 h-1.5 bg-white rounded-full mr-1.5 animate-pulse" />
                        Ativo
                      </Badge>
                    ) : (
                      <Badge variant="secondary" className="text-xs">Inativo</Badge>
                    )}
                  </div>
                  <Badge className="bg-gradient-to-r from-poke-yellow to-amber-400 text-poke-dark border-0 font-semibold text-xs px-3 py-1">
                    {translateType(listing.category)}
                  </Badge>
                </div>
              </div>

              {/* Variantes */}
              {(listing.is_shiny || listing.has_costume || listing.has_background || listing.is_purified) && (
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {listing.is_shiny && (
                    <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-0 text-xs px-2 py-0.5">
                      <Sparkles className="h-3 w-3 mr-1" />
                      Brilhante
                    </Badge>
                  )}
                  {listing.has_costume && (
                    <Badge className="bg-gradient-to-r from-purple-500 to-purple-700 text-white border-0 text-xs px-2 py-0.5">
                      <Shirt className="h-3 w-3 mr-1" />
                      Com Traje
                    </Badge>
                  )}
                  {listing.has_background && (
                    <Badge className="bg-gradient-to-r from-blue-500 to-blue-700 text-white border-0 text-xs px-2 py-0.5">
                      <ImageIcon className="h-3 w-3 mr-1" />
                      Com Fundo
                    </Badge>
                  )}
                  {listing.is_purified && (
                    <Badge className="bg-gradient-to-r from-pink-500 to-pink-700 text-white border-0 text-xs px-2 py-0.5">
                      <Heart className="h-3 w-3 mr-1" />
                      Purificado
                    </Badge>
                  )}
                </div>
              )}
            </div>

            <CardContent className="p-4 space-y-4">
              {/* Descrição */}
              <div>
                <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed">
                  {listing.description}
                </p>
              </div>

              {/* Informações adicionais */}
              <div className="space-y-2 pt-2 border-t">
                {/* Regiões */}
                {listing.regions && listing.regions.length > 0 && (
                  <div className="flex items-start gap-2">
                    <Package className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-500 mb-1">Regiões</p>
                      <div className="flex flex-wrap gap-1">
                        {listing.regions.slice(0, 3).map((region: string, idx: number) => (
                          <Badge key={idx} variant="outline" className="text-xs px-2 py-0">
                            {region}
                          </Badge>
                        ))}
                        {listing.regions.length > 3 && (
                          <Badge variant="outline" className="text-xs px-2 py-0">
                            +{listing.regions.length - 3}
                          </Badge>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* Aceita ofertas */}
                {listing.accepts_offers && (
                  <div className="flex items-center gap-2 text-xs text-green-600 bg-green-50 px-2 py-1.5 rounded-md">
                    <TrendingUp className="h-3.5 w-3.5" />
                    <span className="font-medium">Aceita propostas</span>
                  </div>
                )}

                {/* Data de cadastro */}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Star className="h-3.5 w-3.5" />
                  <span>Cadastrado em {new Date(listing.created_at).toLocaleDateString('pt-BR')}</span>
                </div>
              </div>

              {/* Preço em destaque */}
              <div className="bg-gradient-to-r from-poke-blue/5 to-purple-50 rounded-lg p-3 border border-poke-blue/20">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-600 font-medium mb-0.5">Preço Sugerido</p>
                    <p className="text-2xl font-bold text-poke-blue">
                      {formatCurrency(listing.price_suggested)}
                    </p>
                  </div>
                  <div className="text-right">
                    <div className="bg-poke-blue/10 rounded-full p-2">
                      <TrendingUp className="h-5 w-5 text-poke-blue" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Botões de ação */}
              <div className="flex gap-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="flex-1 border-poke-blue text-poke-blue hover:bg-poke-blue hover:text-white transition-all font-semibold"
                  onClick={() => handleEdit(listing)}
                >
                  <Edit className="h-4 w-4 mr-2" />
                  Editar
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-red-500 text-red-500 hover:bg-red-500 hover:text-white transition-all"
                  onClick={() => openDeleteDialog(listing)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>

            {/* Indicador de hover */}
            <div className="absolute top-0 right-0 w-20 h-20 bg-gradient-to-br from-poke-blue/0 to-poke-blue/10 rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity" />
          </Card>
        ))}
      </div>

      {listings.length === 0 && !showForm && (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Package className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium text-muted-foreground">
              Nenhum Pokémon cadastrado
            </p>
            <p className="text-sm text-muted-foreground mt-2 mb-4">
              Cadastre seu primeiro Pokémon para aparecer no mercado
            </p>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-poke-blue hover:bg-poke-blue/90"
            >
              <Plus className="h-4 w-4 mr-2" />
              Cadastrar Pokémon
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Dialog de Confirmação de Exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="sm:max-w-md bg-gradient-to-br from-red-50 to-orange-50 border-2 border-red-200">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <Trash2 className="h-5 w-5 text-red-600" />
              </div>
              Excluir Pokémon
            </DialogTitle>
            <DialogDescription className="text-gray-700 pt-2">
              Tem certeza que deseja excluir este Pokémon da sua carteira?
            </DialogDescription>
          </DialogHeader>

          {pokemonToDelete && (
            <div className="bg-white rounded-lg p-4 border-2 border-red-100 my-4">
              <div className="flex items-center gap-3">
                {pokemonToDelete.photo_url ? (
                  <img
                    src={pokemonToDelete.photo_url}
                    alt={pokemonToDelete.title}
                    className="w-16 h-16 rounded-lg object-cover border-2 border-poke-blue/20"
                  />
                ) : (
                  <div className="w-16 h-16 bg-poke-blue/10 rounded-lg flex items-center justify-center">
                    <Package className="h-8 w-8 text-poke-blue/40" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="font-bold text-lg text-poke-dark">{pokemonToDelete.title}</h3>
                  <p className="text-sm text-muted-foreground">
                    {formatCurrency(pokemonToDelete.price_suggested)}
                  </p>
                  <Badge className="mt-1 bg-poke-yellow text-poke-dark border-0 text-xs">
                    {translateType(pokemonToDelete.category)}
                  </Badge>
                </div>
              </div>
            </div>
          )}

          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 flex gap-2">
            <div className="text-amber-600 flex-shrink-0 mt-0.5">⚠️</div>
            <p className="text-xs text-amber-900">
              <strong>Atenção:</strong> Esta ação não pode ser desfeita. O Pokémon será removido permanentemente da sua carteira e do mercado.
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              className="border-gray-300"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleDelete}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Sim, Excluir
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
