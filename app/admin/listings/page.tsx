'use client';

import { useEffect, useMemo, useState } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Camera, Check, CheckCircle2, Clock, Loader2, Plus, Search, ShieldCheck, Sparkles, Trash2, User, X, XCircle, Zap, AlertTriangle, MoreVertical } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { supabaseClient as supabase } from '@/lib/supabase-client';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { PokemonSearch } from '@/components/pokemon-search';
import { getTypeColor, PokemonDetails } from '@/lib/pokeapi';
import { ImageUpload } from '@/components/ImageUpload';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ListingType = 'pokemon' | 'account' | null;

type Listing = {
  id: string;
  title: string;
  description: string;
  category: string;
  price_suggested: number;
  accepts_offers: boolean | null;
  photo_url: string | null;
  pokemon_data: PokemonDetails | null;
  is_shiny: boolean | null;
  active: boolean;
  admin_approved: boolean | null;
  approved_at: string | null;
  rejected_at: string | null;
  rejection_reason: string | null;
  created_at: string;
  owner: { display_name: string; email?: string } | null;
};

type FilterTab = 'pending' | 'all' | 'approved' | 'rejected';

const initialPokemonForm = {
  owner_id: '',
  title: '',
  description: '',
  category: '',
  price_suggested: '',
  accepts_offers: false,
  regions: '',
  pokemon_data: null as PokemonDetails | null,
  photo_url: '',
};

const initialAccountForm = {
  owner_id: '',
  title: '',
  description: '',
  price_suggested: '',
  photo_url: '',
  accountLevel: '',
  team: '',
  trainerCode: '',
  totalPokemon: '',
  shinyCount: '',
  legendaryCount: '',
  mythicalCount: '',
  stardust: '',
  pokecoins: '',
  medalsGold: '',
  medalsTotal: '',
  hasSpecialItems: false,
  specialItemsDescription: '',
};

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [listingType, setListingType] = useState<ListingType>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const [formData, setFormData] = useState(initialPokemonForm);
  const [accountFormData, setAccountFormData] = useState(initialAccountForm);
  const [filterTab, setFilterTab] = useState<FilterTab>('pending');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [processing, setProcessing] = useState(false);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [deletingListing, setDeletingListing] = useState<Listing | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchListings();
    fetchUsers();
  }, []);

  const fetchListings = async () => {
    const { data } = await supabase
      .from('listings')
      .select('*, owner:owner_id(display_name, email)')
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

  const resetForms = () => {
    setShowForm(false);
    setListingType(null);
    setFormData(initialPokemonForm);
    setAccountFormData(initialAccountForm);
  };

  const handlePokemonSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.owner_id) {
      setError('Selecione um usuário proprietário');
      return;
    }

    if (!formData.photo_url) {
      setError('Envie a foto de comprovação do Pokémon antes de criar o anúncio');
      return;
    }

    const regions = formData.regions
      .split(',')
      .map((region) => region.trim())
      .filter((region) => region.length > 0);

    const { error: insertError } = await (supabase as any)
      .from('listings')
      .insert({
        owner_id: formData.owner_id,
        title: formData.title,
        description: formData.description,
        category: 'pokemon',
        pokemon_type: formData.category,
        price_suggested: parseFloat(formData.price_suggested),
        accepts_offers: formData.accepts_offers,
        regions,
        pokemon_data: formData.pokemon_data,
        photo_url: formData.photo_url,
        active: true,
        admin_approved: true,
        approved_at: new Date().toISOString(),
      });

    if (insertError) {
      setError('Erro ao criar anúncio: ' + insertError.message);
      return;
    }

    setSuccess('Anúncio de Pokémon criado com sucesso!');
    resetForms();
    fetchListings();
  };

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!accountFormData.owner_id) {
      setError('Selecione um usuário proprietário');
      return;
    }

    if (!accountFormData.accountLevel || Number(accountFormData.accountLevel) < 1) {
      setError('Informe o nível da conta (mínimo 1)');
      return;
    }

    // Create listing base
    const { data: listing, error: listingError } = await (supabase as any)
      .from('listings')
      .insert({
        owner_id: accountFormData.owner_id,
        title: accountFormData.title,
        description: accountFormData.description,
        category: 'account',
        pokemon_type: 'account',
        price_suggested: parseFloat(accountFormData.price_suggested),
        accepts_offers: true,
        photo_url: accountFormData.photo_url || null,
        active: true,
        admin_approved: true,
        approved_at: new Date().toISOString(),
        tags: ['account_sale'],
      })
      .select('id')
      .single();

    if (listingError || !listing) {
      setError('Erro ao criar anúncio: ' + (listingError?.message || 'Erro desconhecido'));
      return;
    }

    // Create account details
    const { error: accountError } = await (supabase as any)
      .from('account_listings')
      .insert({
        listing_id: listing.id,
        account_level: Number(accountFormData.accountLevel),
        team: accountFormData.team || null,
        trainer_code: accountFormData.trainerCode || null,
        total_pokemon: accountFormData.totalPokemon ? Number(accountFormData.totalPokemon) : null,
        shiny_count: accountFormData.shinyCount ? Number(accountFormData.shinyCount) : null,
        legendary_count: accountFormData.legendaryCount ? Number(accountFormData.legendaryCount) : null,
        mythical_count: accountFormData.mythicalCount ? Number(accountFormData.mythicalCount) : null,
        stardust: accountFormData.stardust ? Number(accountFormData.stardust) : null,
        pokecoins: accountFormData.pokecoins ? Number(accountFormData.pokecoins) : null,
        medals_gold: accountFormData.medalsGold ? Number(accountFormData.medalsGold) : null,
        medals_total: accountFormData.medalsTotal ? Number(accountFormData.medalsTotal) : null,
        has_special_items: accountFormData.hasSpecialItems,
        special_items_description: accountFormData.specialItemsDescription || null,
        updated_at: new Date().toISOString(),
      });

    if (accountError) {
      // Rollback: delete the listing
      await (supabase as any).from('listings').delete().eq('id', listing.id);
      setError('Erro ao criar detalhes da conta: ' + accountError.message);
      return;
    }

    setSuccess('Anúncio de conta criado com sucesso!');
    resetForms();
    fetchListings();
  };

  const pendingCount = useMemo(() => listings.filter(l => !l.admin_approved && !l.rejected_at).length, [listings]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const visible = filteredListings.map(l => l.id);
    setSelectedIds(prev => {
      const allSelected = visible.every(id => prev.has(id));
      if (allSelected) return new Set();
      return new Set(visible);
    });
  };

  const handleApprove = async (ids: string[]) => {
    if (ids.length === 0) return;
    setProcessing(true);
    setError('');

    const { error: err } = await (supabase as any)
      .from('listings')
      .update({
        admin_approved: true,
        active: true,
        approved_at: new Date().toISOString(),
        rejected_at: null,
        rejection_reason: null,
      })
      .in('id', ids);

    if (err) {
      setError('Erro ao aprovar: ' + err.message);
    } else {
      setSuccess(`${ids.length} anúncio(s) aprovado(s) com sucesso!`);
      setSelectedIds(new Set());
      fetchListings();
    }
    setProcessing(false);
  };

  const handleReject = async (id: string, reason: string) => {
    setProcessing(true);
    setError('');

    const { error: err } = await (supabase as any)
      .from('listings')
      .update({
        admin_approved: false,
        active: false,
        rejected_at: new Date().toISOString(),
        rejection_reason: reason || 'Reprovado pelo administrador',
      })
      .eq('id', id);

    if (err) {
      setError('Erro ao rejeitar: ' + err.message);
    } else {
      setSuccess('Anúncio rejeitado.');
      setRejectingId(null);
      setRejectionReason('');
      fetchListings();
    }
    setProcessing(false);
  };

  const handleBulkReject = async (ids: string[]) => {
    if (ids.length === 0) return;
    setProcessing(true);
    setError('');

    const { error: err } = await (supabase as any)
      .from('listings')
      .update({
        admin_approved: false,
        active: false,
        rejected_at: new Date().toISOString(),
        rejection_reason: 'Reprovado em lote pelo administrador',
      })
      .in('id', ids);

    if (err) {
      setError('Erro ao rejeitar: ' + err.message);
    } else {
      setSuccess(`${ids.length} anúncio(s) rejeitado(s).`);
      setSelectedIds(new Set());
      fetchListings();
    }
    setProcessing(false);
  };

  const handleDeleteListing = async () => {
    if (!deletingListing) return;
    setDeleting(true);
    setError('');

    const { error: err } = await (supabase as any)
      .from('listings')
      .delete()
      .eq('id', deletingListing.id);

    if (err) {
      setError('Erro ao deletar: ' + err.message);
    } else {
      setSuccess(`Anúncio "${deletingListing.title}" deletado com sucesso.`);
      fetchListings();
    }
    setDeletingListing(null);
    setDeleting(false);
  };

  const filteredListings = useMemo(() => {
    const term = searchTerm.toLowerCase();

    return listings.filter((listing) => {
      const matchesSearch =
        listing.title.toLowerCase().includes(term) ||
        listing.category.toLowerCase().includes(term) ||
        listing.owner?.display_name?.toLowerCase().includes(term);

      if (!matchesSearch) return false;

      switch (filterTab) {
        case 'pending':
          return !listing.admin_approved && !listing.rejected_at;
        case 'approved':
          return listing.admin_approved === true;
        case 'rejected':
          return listing.rejected_at !== null;
        case 'all':
        default:
          return true;
      }
    });
  }, [listings, searchTerm, filterTab]);

  if (loading) {
    return <LoadingSpinner text="Carregando anúncios..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Anúncios</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie os Pokémon e contas cadastrados para venda na plataforma
          </p>
        </div>
        <Button
          onClick={() => { if (showForm) { resetForms(); } else { setShowForm(true); } }}
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

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {success ? (
        <Alert className="border-poke-blue bg-poke-blue/10">
          <AlertDescription className="text-poke-blue">{success}</AlertDescription>
        </Alert>
      ) : null}

      {/* Step 1: Type Selection */}
      {showForm && !listingType ? (
        <Card className="border-2 border-poke-blue/30">
          <CardHeader>
            <CardTitle>Cadastrar Novo Anúncio</CardTitle>
            <CardDescription>
              Escolha o tipo de anúncio que deseja criar
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              <button
                onClick={() => setListingType('pokemon')}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-poke-blue hover:bg-poke-blue/5 transition-all group"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-poke-blue/20 to-poke-yellow/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <Zap className="h-8 w-8 text-poke-blue" />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-lg">Pokémon</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Cadastrar um Pokémon individual para venda ou troca
                  </p>
                </div>
              </button>

              <button
                onClick={() => setListingType('account')}
                className="flex flex-col items-center gap-3 p-6 rounded-xl border-2 border-border hover:border-poke-blue hover:bg-poke-blue/5 transition-all group"
              >
                <div className="w-16 h-16 rounded-full bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition-transform">
                  <User className="h-8 w-8 text-green-600" />
                </div>
                <div className="text-center">
                  <h3 className="font-bold text-lg">Conta</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Cadastrar uma conta completa de Pokémon GO para venda
                  </p>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Pokemon Form */}
      {showForm && listingType === 'pokemon' ? (
        <Card className="border-2 border-poke-blue/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-poke-blue" />
                  Cadastrar Pokémon
                </CardTitle>
                <CardDescription>
                  Crie um anúncio de Pokémon em nome de um usuário
                </CardDescription>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setListingType(null)}>
                Trocar tipo
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handlePokemonSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="owner_id">Usuário Proprietário *</Label>
                <Select
                  value={formData.owner_id}
                  onValueChange={(value) => setFormData((prev) => ({ ...prev, owner_id: value }))}
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
                    setFormData((prev) => ({
                      ...prev,
                      title: pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1),
                      description: description || `Pokémon ${pokemon.name}`,
                      category: pokemon.types[0].type.name,
                      pokemon_data: pokemon,
                    }));
                  }}
                />
              </div>

              <div className="space-y-3 rounded-xl border border-poke-blue/20 bg-poke-blue/5 p-4">
                <div>
                  <h3 className="text-sm font-semibold">Foto de comprovação obrigatória</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Para publicar o anúncio, envie a captura do Pokémon dentro do jogo mostrando que o usuário realmente possui o Pokémon à venda.
                  </p>
                </div>

                {formData.owner_id ? (
                  <ImageUpload
                    userId={formData.owner_id}
                    currentImage={formData.photo_url || null}
                    onImageUploaded={(url) => setFormData((prev) => ({ ...prev, photo_url: url }))}
                  />
                ) : (
                  <Alert>
                    <AlertDescription>
                      Selecione primeiro o usuário proprietário para habilitar o upload da foto de comprovação.
                    </AlertDescription>
                  </Alert>
                )}
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
                    onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
                    required
                    className="border-poke-blue/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="category">Categoria *</Label>
                  <Input
                    id="category"
                    value={formData.category}
                    onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
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
                  onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
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
                    onChange={(e) => setFormData((prev) => ({ ...prev, price_suggested: e.target.value }))}
                    required
                    className="border-poke-blue/30"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="regions">Regiões (separadas por vírgula)</Label>
                  <Input
                    id="regions"
                    value={formData.regions}
                    onChange={(e) => setFormData((prev) => ({ ...prev, regions: e.target.value }))}
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
                  onChange={(e) => setFormData((prev) => ({ ...prev, accepts_offers: e.target.checked }))}
                  className="rounded border-poke-blue"
                />
                <Label htmlFor="accepts_offers" className="cursor-pointer">
                  Aceita ofertas
                </Label>
              </div>

              <div className="flex gap-2">
                <Button type="submit" className="bg-poke-blue hover:bg-poke-blue/90">
                  Criar Anúncio de Pokémon
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForms}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {/* Account Form */}
      {showForm && listingType === 'account' ? (
        <Card className="border-2 border-green-500/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <User className="h-5 w-5 text-green-600" />
                  Cadastrar Conta
                </CardTitle>
                <CardDescription>
                  Crie um anúncio de conta completa de Pokémon GO
                </CardDescription>
              </div>
              <Button type="button" variant="ghost" size="sm" onClick={() => setListingType(null)}>
                Trocar tipo
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAccountSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Usuário Proprietário *</Label>
                <Select
                  value={accountFormData.owner_id}
                  onValueChange={(value) => setAccountFormData((prev) => ({ ...prev, owner_id: value }))}
                >
                  <SelectTrigger className="border-green-500/30">
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

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label>Título *</Label>
                  <Input
                    value={accountFormData.title}
                    onChange={(e) => setAccountFormData((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="Ex: Conta Nível 50 - Time Mystic"
                    required
                    className="border-green-500/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preço (R$) *</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="1"
                    value={accountFormData.price_suggested}
                    onChange={(e) => setAccountFormData((prev) => ({ ...prev, price_suggested: e.target.value }))}
                    required
                    className="border-green-500/30"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Descrição *</Label>
                <Textarea
                  value={accountFormData.description}
                  onChange={(e) => setAccountFormData((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Descreva os detalhes da conta..."
                  rows={3}
                  required
                  className="border-green-500/30"
                />
              </div>

              <div className="space-y-3 rounded-xl border border-green-500/20 bg-green-500/5 p-4">
                <h3 className="text-sm font-semibold">Foto de comprovação (opcional)</h3>
                {accountFormData.owner_id ? (
                  <ImageUpload
                    userId={accountFormData.owner_id}
                    currentImage={accountFormData.photo_url || null}
                    onImageUploaded={(url) => setAccountFormData((prev) => ({ ...prev, photo_url: url }))}
                  />
                ) : (
                  <Alert>
                    <AlertDescription>
                      Selecione o usuário proprietário para habilitar o upload.
                    </AlertDescription>
                  </Alert>
                )}
              </div>

              <div className="border-t pt-4">
                <p className="text-sm font-semibold mb-4">Dados da conta</p>
              </div>

              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                <div className="space-y-2">
                  <Label>Nível da Conta *</Label>
                  <Input
                    type="number"
                    min="1"
                    max="60"
                    value={accountFormData.accountLevel}
                    onChange={(e) => setAccountFormData((prev) => ({ ...prev, accountLevel: e.target.value }))}
                    required
                    className="border-green-500/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Time</Label>
                  <Select
                    value={accountFormData.team}
                    onValueChange={(value) => setAccountFormData((prev) => ({ ...prev, team: value }))}
                  >
                    <SelectTrigger className="border-green-500/30">
                      <SelectValue placeholder="Selecione" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Mystic">Mystic (Azul)</SelectItem>
                      <SelectItem value="Valor">Valor (Vermelho)</SelectItem>
                      <SelectItem value="Instinct">Instinct (Amarelo)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Trainer Code</Label>
                  <Input
                    value={accountFormData.trainerCode}
                    onChange={(e) => setAccountFormData((prev) => ({ ...prev, trainerCode: e.target.value }))}
                    placeholder="0000 0000 0000"
                    className="border-green-500/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Total de Pokémon</Label>
                  <Input
                    type="number"
                    min="0"
                    value={accountFormData.totalPokemon}
                    onChange={(e) => setAccountFormData((prev) => ({ ...prev, totalPokemon: e.target.value }))}
                    className="border-green-500/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Shinies</Label>
                  <Input
                    type="number"
                    min="0"
                    value={accountFormData.shinyCount}
                    onChange={(e) => setAccountFormData((prev) => ({ ...prev, shinyCount: e.target.value }))}
                    className="border-green-500/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Lendários</Label>
                  <Input
                    type="number"
                    min="0"
                    value={accountFormData.legendaryCount}
                    onChange={(e) => setAccountFormData((prev) => ({ ...prev, legendaryCount: e.target.value }))}
                    className="border-green-500/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Míticos</Label>
                  <Input
                    type="number"
                    min="0"
                    value={accountFormData.mythicalCount}
                    onChange={(e) => setAccountFormData((prev) => ({ ...prev, mythicalCount: e.target.value }))}
                    className="border-green-500/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stardust</Label>
                  <Input
                    type="number"
                    min="0"
                    value={accountFormData.stardust}
                    onChange={(e) => setAccountFormData((prev) => ({ ...prev, stardust: e.target.value }))}
                    className="border-green-500/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Pokécoins</Label>
                  <Input
                    type="number"
                    min="0"
                    value={accountFormData.pokecoins}
                    onChange={(e) => setAccountFormData((prev) => ({ ...prev, pokecoins: e.target.value }))}
                    className="border-green-500/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Medalhas Douradas</Label>
                  <Input
                    type="number"
                    min="0"
                    value={accountFormData.medalsGold}
                    onChange={(e) => setAccountFormData((prev) => ({ ...prev, medalsGold: e.target.value }))}
                    className="border-green-500/30"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Medalhas Totais</Label>
                  <Input
                    type="number"
                    min="0"
                    value={accountFormData.medalsTotal}
                    onChange={(e) => setAccountFormData((prev) => ({ ...prev, medalsTotal: e.target.value }))}
                    className="border-green-500/30"
                  />
                </div>
                <div className="space-y-2 flex items-center gap-2 pt-8">
                  <input
                    type="checkbox"
                    id="hasSpecialItems"
                    checked={accountFormData.hasSpecialItems}
                    onChange={(e) => setAccountFormData((prev) => ({ ...prev, hasSpecialItems: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="hasSpecialItems" className="cursor-pointer">Itens especiais</Label>
                </div>
              </div>

              {accountFormData.hasSpecialItems ? (
                <div className="space-y-2">
                  <Label>Descrição dos itens especiais</Label>
                  <Textarea
                    value={accountFormData.specialItemsDescription}
                    onChange={(e) => setAccountFormData((prev) => ({ ...prev, specialItemsDescription: e.target.value }))}
                    rows={3}
                    className="border-green-500/30"
                  />
                </div>
              ) : null}

              <div className="flex gap-2">
                <Button type="submit" className="bg-green-600 hover:bg-green-700">
                  Criar Anúncio de Conta
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={resetForms}
                >
                  Cancelar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-2">
        {([
          { key: 'pending' as FilterTab, label: 'Pendentes', icon: Clock, count: pendingCount, color: 'text-amber-600' },
          { key: 'all' as FilterTab, label: 'Todos', icon: Search, count: listings.length },
          { key: 'approved' as FilterTab, label: 'Aprovados', icon: CheckCircle2, count: listings.filter(l => l.admin_approved).length, color: 'text-green-600' },
          { key: 'rejected' as FilterTab, label: 'Rejeitados', icon: XCircle, count: listings.filter(l => l.rejected_at).length, color: 'text-red-500' },
        ]).map(tab => (
          <button
            key={tab.key}
            onClick={() => { setFilterTab(tab.key); setSelectedIds(new Set()); }}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              filterTab === tab.key
                ? 'bg-poke-blue text-white shadow-md'
                : 'bg-muted hover:bg-accent text-foreground'
            }`}
          >
            <tab.icon className={`h-4 w-4 ${filterTab !== tab.key && tab.color ? tab.color : ''}`} />
            {tab.label}
            <span className={`text-xs px-1.5 py-0.5 rounded-full ${
              filterTab === tab.key ? 'bg-white/20' : 'bg-background'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

      {/* Bulk Action Bar */}
      {selectedIds.size > 0 ? (
        <Card className="border-2 border-poke-blue/40 bg-poke-blue/5">
          <CardContent className="py-3 px-4 flex flex-wrap items-center gap-3">
            <span className="text-sm font-medium">
              {selectedIds.size} anúncio(s) selecionado(s)
            </span>
            <div className="flex gap-2 ml-auto">
              <Button
                size="sm"
                className="bg-green-600 hover:bg-green-700"
                disabled={processing}
                onClick={() => handleApprove(Array.from(selectedIds))}
              >
                {processing ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Check className="h-4 w-4 mr-1" />}
                Aprovar selecionados
              </Button>
              <Button
                size="sm"
                variant="destructive"
                disabled={processing}
                onClick={() => handleBulkReject(Array.from(selectedIds))}
              >
                <X className="h-4 w-4 mr-1" />
                Rejeitar selecionados
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => setSelectedIds(new Set())}
              >
                Limpar
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <CardTitle className="text-xl">
                {filterTab === 'pending' ? 'Aguardando aprovação' : filterTab === 'approved' ? 'Anúncios aprovados' : filterTab === 'rejected' ? 'Anúncios rejeitados' : 'Todos os anúncios'}
              </CardTitle>
              <CardDescription>
                {filterTab === 'pending'
                  ? 'Analise os anúncios e aprove ou rejeite. Selecione vários para ação em lote.'
                  : 'Visualize a foto do jogo, dados do Pokémon e status do anúncio.'}
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              {filteredListings.length > 0 && (filterTab === 'pending' || filterTab === 'all') ? (
                <Button variant="outline" size="sm" onClick={toggleSelectAll}>
                  {filteredListings.every(l => selectedIds.has(l.id)) ? 'Desmarcar todos' : 'Selecionar todos'}
                </Button>
              ) : null}
              <div className="relative w-full lg:w-72">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Pesquisar..."
                  className="pl-10"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {filteredListings.map((listing) => {
              const pokemonSprite =
                listing.photo_url ||
                listing.pokemon_data?.sprites?.other?.['official-artwork']?.front_default ||
                listing.pokemon_data?.sprites?.front_default ||
                null;

              const isPending = !listing.admin_approved && !listing.rejected_at;
              const isSelected = selectedIds.has(listing.id);

              return (
                <Card
                  key={listing.id}
                  className={`overflow-hidden transition-all ${
                    isSelected ? 'ring-2 ring-poke-blue border-poke-blue' : 'border-border/60'
                  } ${isPending ? 'border-amber-400/50' : ''}`}
                >
                  {/* Selection checkbox overlay */}
                  <div className="relative">
                    <div className="aspect-[4/3] bg-muted/40 border-b overflow-hidden flex items-center justify-center">
                      {pokemonSprite ? (
                        <img
                          src={pokemonSprite}
                          alt={listing.title}
                          className="h-full w-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <Camera className="h-8 w-8 text-muted-foreground" />
                      )}
                    </div>
                    <button
                      onClick={() => toggleSelect(listing.id)}
                      className={`absolute top-2 left-2 w-6 h-6 rounded border-2 flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-poke-blue border-poke-blue text-white'
                          : 'bg-background/80 border-border hover:border-poke-blue'
                      }`}
                    >
                      {isSelected ? <Check className="h-4 w-4" /> : null}
                    </button>
                    {/* Status badge overlay */}
                    <div className="absolute top-2 right-2 flex gap-1">
                      {isPending ? (
                        <Badge className="bg-amber-500 text-white border-0 shadow-md">
                          <Clock className="h-3 w-3 mr-1" /> Pendente
                        </Badge>
                      ) : listing.admin_approved ? (
                        <Badge className="bg-green-600 text-white border-0 shadow-md">
                          <CheckCircle2 className="h-3 w-3 mr-1" /> Aprovado
                        </Badge>
                      ) : (
                        <Badge className="bg-red-600 text-white border-0 shadow-md">
                          <XCircle className="h-3 w-3 mr-1" /> Rejeitado
                        </Badge>
                      )}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="w-6 h-6 rounded bg-background/80 hover:bg-background border border-border flex items-center justify-center shadow-sm">
                            <MoreVertical className="h-3.5 w-3.5 text-muted-foreground" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem
                            onClick={() => setDeletingListing(listing)}
                            className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Deletar
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <CardContent className="p-4 space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold truncate">{listing.title}</h3>
                          {listing.is_shiny ? <Sparkles className="h-4 w-4 text-yellow-500" /> : null}
                        </div>
                        <p className="text-sm text-muted-foreground line-clamp-2">{listing.description}</p>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2">
                      <Badge
                        variant="secondary"
                        style={{
                          backgroundColor: `${getTypeColor(listing.category)}20`,
                          color: getTypeColor(listing.category),
                        }}
                        className="capitalize"
                      >
                        {listing.category}
                      </Badge>
                      <Badge className={listing.photo_url ? 'bg-green-600 text-white' : 'bg-red-600 text-white'}>
                        {listing.photo_url ? 'Com foto' : 'Sem foto'}
                      </Badge>
                      {listing.accepts_offers ? <Badge variant="outline">Aceita ofertas</Badge> : null}
                    </div>

                    <div className="space-y-1 text-sm">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Proprietário</span>
                        <span className="font-medium text-right">{listing.owner?.display_name || 'N/A'}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Preço</span>
                        <span className="font-semibold text-poke-blue">{formatCurrency(listing.price_suggested)}</span>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-muted-foreground">Criado em</span>
                        <span className="text-right">{formatDateTime(listing.created_at)}</span>
                      </div>
                    </div>

                    {listing.photo_url ? (
                      <a
                        href={listing.photo_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-2 text-sm text-poke-blue hover:underline"
                      >
                        <ShieldCheck className="h-4 w-4" />
                        Ver foto de comprovação
                      </a>
                    ) : null}

                    {listing.rejection_reason ? (
                      <div className="text-xs text-red-500 bg-red-500/10 rounded-md p-2">
                        <span className="font-medium">Motivo:</span> {listing.rejection_reason}
                      </div>
                    ) : null}

                    {/* Action buttons for individual listing */}
                    {isPending ? (
                      rejectingId === listing.id ? (
                        <div className="space-y-2 pt-2 border-t">
                          <Label className="text-xs">Motivo da rejeição (opcional)</Label>
                          <Input
                            value={rejectionReason}
                            onChange={(e) => setRejectionReason(e.target.value)}
                            placeholder="Ex: Foto ilegível, dados incorretos..."
                            className="text-sm"
                          />
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              variant="destructive"
                              disabled={processing}
                              onClick={() => handleReject(listing.id, rejectionReason)}
                              className="flex-1"
                            >
                              Confirmar Rejeição
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => { setRejectingId(null); setRejectionReason(''); }}
                            >
                              Cancelar
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2 pt-2 border-t">
                          <Button
                            size="sm"
                            className="flex-1 bg-green-600 hover:bg-green-700"
                            disabled={processing}
                            onClick={() => handleApprove([listing.id])}
                          >
                            <CheckCircle2 className="h-4 w-4 mr-1" />
                            Aprovar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 border-red-300 text-red-600 hover:bg-red-50 dark:hover:bg-red-950"
                            disabled={processing}
                            onClick={() => setRejectingId(listing.id)}
                          >
                            <XCircle className="h-4 w-4 mr-1" />
                            Rejeitar
                          </Button>
                        </div>
                      )
                    ) : null}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {filteredListings.length === 0 ? (
            <div className="rounded-lg border border-dashed p-8 text-center text-muted-foreground">
              {filterTab === 'pending'
                ? 'Nenhum anúncio pendente de aprovação.'
                : 'Nenhum anúncio encontrado para o filtro informado.'}
            </div>
          ) : null}
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deletingListing} onOpenChange={() => setDeletingListing(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <AlertTriangle className="h-5 w-5" />
              Deletar Anúncio
            </DialogTitle>
          </DialogHeader>
          <DialogDescription className="space-y-4">
            <p>
              Você está prestes a <strong className="text-red-600">deletar permanentemente</strong> o anúncio:
            </p>
            {deletingListing && (
              <div className="bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900 rounded-lg p-3">
                <p className="font-semibold text-foreground">{deletingListing.title}</p>
                <p className="text-sm text-muted-foreground">
                  Proprietário: {deletingListing.owner?.display_name || 'N/A'}
                </p>
                <p className="text-sm text-muted-foreground">
                  Preço: {formatCurrency(deletingListing.price_suggested)}
                </p>
              </div>
            )}
            <div className="text-sm text-muted-foreground">
              <AlertTriangle className="h-4 w-4 inline mr-1" />
              Esta ação não pode ser desfeita!
            </div>
          </DialogDescription>
          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => setDeletingListing(null)}
              disabled={deleting}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteListing}
              disabled={deleting}
            >
              {deleting ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Trash2 className="h-4 w-4 mr-1" />}
              {deleting ? 'Deletando...' : 'Deletar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
