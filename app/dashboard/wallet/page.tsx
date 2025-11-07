'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Package, Edit, Trash2 } from 'lucide-react';
import { formatCurrency } from '@/lib/format';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { PokemonSearch } from '@/components/pokemon-search';
import { PokemonDetails } from '@/lib/pokeapi';

export default function WalletPage() {
  const [listings, setListings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [userId, setUserId] = useState<string>('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    price_suggested: '',
    accepts_offers: false,
    regions: '',
    pokemon_data: null as PokemonDetails | null,
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

    const regions = formData.regions
      .split(',')
      .map(r => r.trim())
      .filter(r => r.length > 0);

    const { error: insertError } = await (supabaseClient as any)
      .from('listings')
      .insert({
        owner_id: userId,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        price_suggested: parseFloat(formData.price_suggested),
        accepts_offers: formData.accepts_offers,
        regions: regions,
        active: true,
      });

    if (insertError) {
      setError('Erro ao cadastrar Pokémon: ' + insertError.message);
      return;
    }

    setSuccess('Pokémon cadastrado com sucesso!');
    setShowForm(false);
    setFormData({
      title: '',
      description: '',
      category: '',
      price_suggested: '',
      accepts_offers: false,
      regions: '',
      pokemon_data: null,
    });
    loadListings();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este Pokémon?')) return;

    const { error } = await supabaseClient
      .from('listings')
      .delete()
      .eq('id', id);

    if (!error) {
      setSuccess('Pokémon excluído com sucesso!');
      loadListings();
    }
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
            Gerencie seus Pokémon para troca
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
        <Card className="border-2 border-poke-blue/30">
          <CardHeader>
            <CardTitle>Cadastrar Pokémon para Troca</CardTitle>
            <CardDescription>
              Preencha os dados do Pokémon que deseja trocar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Buscar Pokémon na Pokédex</Label>
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
              
              <div className="border-t pt-4">
                <p className="text-sm text-muted-foreground mb-4">
                  Ou preencha manualmente os dados:
                </p>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="title">Título *</Label>
                  <Input
                    id="title"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    required
                    className="border-poke-blue/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoria *</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    placeholder="Ex: Boosting, Raid, etc"
                    required
                    className="border-poke-blue/30"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Descrição *</Label>
                <Textarea
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  rows={3}
                  required
                  className="border-poke-blue/30"
                />
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="price">Preço Sugerido *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price_suggested}
                    onChange={(e) => setFormData({ ...formData, price_suggested: e.target.value })}
                    required
                    className="border-poke-blue/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="regions">Regiões (separadas por vírgula)</Label>
                  <Input
                    id="regions"
                    value={formData.regions}
                    onChange={(e) => setFormData({ ...formData, regions: e.target.value })}
                    placeholder="Ex: Brasil, América Latina"
                    className="border-poke-blue/30"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="accepts_offers"
                  checked={formData.accepts_offers}
                  onChange={(e) => setFormData({ ...formData, accepts_offers: e.target.checked })}
                  className="rounded border-poke-blue"
                />
                <Label htmlFor="accepts_offers" className="cursor-pointer">
                  Aceita ofertas
                </Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="bg-poke-blue hover:bg-poke-blue/90">
                  Cadastrar Pokémon
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowForm(false)}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing) => (
          <Card
            key={listing.id}
            className="border-2 border-poke-blue/20 hover:border-poke-blue transition-colors"
          >
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <CardTitle className="text-lg line-clamp-2">
                    {listing.title}
                  </CardTitle>
                  <Badge className="mt-2 bg-poke-yellow text-poke-dark border-0">
                    {listing.category}
                  </Badge>
                </div>
                {listing.active ? (
                  <Badge className="bg-green-500">Ativo</Badge>
                ) : (
                  <Badge variant="secondary">Inativo</Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground line-clamp-2 mb-4">
                {listing.description}
              </p>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Preço</span>
                  <span className="text-lg font-bold text-poke-blue">
                    {formatCurrency(listing.price_suggested)}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 border-poke-blue text-poke-blue hover:bg-poke-blue/10"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-poke-red text-poke-red hover:bg-poke-red/10"
                    onClick={() => handleDelete(listing.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
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
              Cadastre seu primeiro Pokémon para aparecer no mercado de trocas
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
    </div>
  );
}
