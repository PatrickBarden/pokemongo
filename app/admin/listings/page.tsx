'use client';

import { useEffect, useState } from 'react';
import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, X } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { ColumnDef } from '@tanstack/react-table';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { PokemonSearch } from '@/components/pokemon-search';
import { PokemonDetails } from '@/lib/pokeapi';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type Listing = {
  id: string;
  title: string;
  category: string;
  price_suggested: number;
  active: boolean;
  created_at: string;
  owner: { display_name: string } | null;
};

const columns: ColumnDef<Listing>[] = [
  {
    accessorKey: 'title',
    header: 'Título',
  },
  {
    accessorKey: 'category',
    header: 'Categoria',
  },
  {
    accessorKey: 'owner',
    header: 'Proprietário',
    cell: ({ row }) => {
      const owner = row.getValue('owner') as any;
      return owner?.display_name || 'N/A';
    },
  },
  {
    accessorKey: 'price_suggested',
    header: 'Preço Sugerido',
    cell: ({ row }) => formatCurrency(row.getValue('price_suggested')),
  },
  {
    accessorKey: 'active',
    header: 'Status',
    cell: ({ row }) => {
      const active = row.getValue<boolean>('active');
      return active ? (
        <Badge variant="default">Ativo</Badge>
      ) : (
        <Badge variant="outline">Inativo</Badge>
      );
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Criado em',
    cell: ({ row }) => formatDateTime(row.getValue('created_at')),
  },
];

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    owner_id: '',
    title: '',
    description: '',
    category: '',
    price_suggested: '',
    accepts_offers: false,
    regions: '',
    pokemon_data: null as PokemonDetails | null,
  });

  useEffect(() => {
    fetchListings();
    fetchUsers();
  }, []);

  const fetchListings = async () => {
    const { data } = await supabase
      .from('listings')
      .select('*, owner:owner_id(display_name)')
      .order('created_at', { ascending: false });

    if (data) {
      setListings(data as any);
    }
    setLoading(false);
  };

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select('id, display_name, email')
      .order('display_name');

    if (data) {
      setUsers(data);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.owner_id) {
      setError('Selecione um usuário proprietário');
      return;
    }

    const regions = formData.regions
      .split(',')
      .map(r => r.trim())
      .filter(r => r.length > 0);

    const { error: insertError } = await (supabase as any)
      .from('listings')
      .insert({
        owner_id: formData.owner_id,
        title: formData.title,
        description: formData.description,
        category: formData.category,
        price_suggested: parseFloat(formData.price_suggested),
        accepts_offers: formData.accepts_offers,
        regions: regions,
        active: true,
      });

    if (insertError) {
      setError('Erro ao criar anúncio: ' + insertError.message);
      return;
    }

    setSuccess('Anúncio criado com sucesso!');
    setShowForm(false);
    setFormData({
      owner_id: '',
      title: '',
      description: '',
      category: '',
      price_suggested: '',
      accepts_offers: false,
      regions: '',
      pokemon_data: null,
    });
    fetchListings();
  };

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Anúncios</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os Pokémon cadastrados para venda na plataforma
          </p>
        </div>
        <Button
          onClick={() => setShowForm(!showForm)}
          className="bg-poke-blue hover:bg-poke-blue/90"
        >
          {showForm ? (
            <>
              <X className="h-4 w-4 mr-2" />
              Cancelar
            </>
          ) : (
            <>
              <Plus className="h-4 w-4 mr-2" />
              Novo Anúncio
            </>
          )}
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
            <CardTitle>Cadastrar Novo Anúncio</CardTitle>
            <CardDescription>
              Crie um anúncio de venda em nome de um usuário
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="owner_id">Usuário Proprietário *</Label>
                <Select
                  value={formData.owner_id}
                  onValueChange={(value) => setFormData({ ...formData, owner_id: value })}
                >
                  <SelectTrigger className="border-poke-blue/30">
                    <SelectValue placeholder="Selecione um usuário" />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.display_name} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

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
                    placeholder="Ex: electric, fire, water"
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
                  Criar Anúncio
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

      <DataTable
        columns={columns}
        data={listings}
        searchKey="title"
        searchPlaceholder="Pesquisar por título..."
        exportFilename="anuncios.csv"
      />
    </div>
  );
}
