'use client';

import { FormEvent, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { supabaseClient } from '@/lib/supabase-client';
import { createAccountListing } from '@/server/actions/listings';
import { useToast } from '@/hooks/use-toast';
import { ImageUpload } from '@/components/ImageUpload';

export default function NewAccountListingPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [userId, setUserId] = useState('');
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    priceSuggested: '',
    photoUrl: '',
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
    specialItemsDescription: ''
  });

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);
      setLoading(false);
    };

    checkUser();
  }, [router]);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSubmitting(true);

    const result = await createAccountListing({
      userId,
      title: formData.title,
      description: formData.description,
      priceSuggested: Number(formData.priceSuggested),
      photoUrl: formData.photoUrl || null,
      accountLevel: Number(formData.accountLevel),
      team: formData.team || null,
      trainerCode: formData.trainerCode || null,
      totalPokemon: formData.totalPokemon ? Number(formData.totalPokemon) : null,
      shinyCount: formData.shinyCount ? Number(formData.shinyCount) : null,
      legendaryCount: formData.legendaryCount ? Number(formData.legendaryCount) : null,
      mythicalCount: formData.mythicalCount ? Number(formData.mythicalCount) : null,
      stardust: formData.stardust ? Number(formData.stardust) : null,
      pokecoins: formData.pokecoins ? Number(formData.pokecoins) : null,
      medalsGold: formData.medalsGold ? Number(formData.medalsGold) : null,
      medalsTotal: formData.medalsTotal ? Number(formData.medalsTotal) : null,
      hasSpecialItems: formData.hasSpecialItems,
      specialItemsDescription: formData.specialItemsDescription || null
    });

    if (!result.success) {
      toast({
        title: 'Erro ao criar anúncio de conta',
        description: result.error || 'Tente novamente',
        variant: 'destructive'
      });
      setSubmitting(false);
      return;
    }

    toast({
      title: 'Conta enviada com sucesso',
      description: 'O anúncio da conta está aguardando aprovação do administrador'
    });

    router.push('/dashboard/seller');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/seller">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Nova Conta para Venda</h1>
          <p className="text-muted-foreground text-sm">Cadastre uma conta completa de Pokémon GO</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações principais</CardTitle>
            <CardDescription>Defina a oferta comercial da conta</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Título</Label>
                <Input id="title" value={formData.title} onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="priceSuggested">Preço</Label>
                <Input id="priceSuggested" type="number" min="1" step="0.01" value={formData.priceSuggested} onChange={(e) => setFormData((prev) => ({ ...prev, priceSuggested: e.target.value }))} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" rows={5} value={formData.description} onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label>Foto da conta</Label>
              {userId && (
                <ImageUpload
                  userId={userId}
                  currentImage={formData.photoUrl || null}
                  onImageUploaded={(url) => setFormData((prev) => ({ ...prev, photoUrl: url }))}
                />
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Dados da conta</CardTitle>
            <CardDescription>Preencha os atributos relevantes para o comprador</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="accountLevel">Nível da conta</Label>
              <Input id="accountLevel" type="number" min="1" max="60" value={formData.accountLevel} onChange={(e) => setFormData((prev) => ({ ...prev, accountLevel: e.target.value }))} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="team">Time</Label>
              <Input id="team" value={formData.team} onChange={(e) => setFormData((prev) => ({ ...prev, team: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="trainerCode">Trainer code</Label>
              <Input id="trainerCode" value={formData.trainerCode} onChange={(e) => setFormData((prev) => ({ ...prev, trainerCode: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="totalPokemon">Total de Pokémons</Label>
              <Input id="totalPokemon" type="number" min="0" value={formData.totalPokemon} onChange={(e) => setFormData((prev) => ({ ...prev, totalPokemon: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="shinyCount">Shinies</Label>
              <Input id="shinyCount" type="number" min="0" value={formData.shinyCount} onChange={(e) => setFormData((prev) => ({ ...prev, shinyCount: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="legendaryCount">Lendários</Label>
              <Input id="legendaryCount" type="number" min="0" value={formData.legendaryCount} onChange={(e) => setFormData((prev) => ({ ...prev, legendaryCount: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mythicalCount">Míticos</Label>
              <Input id="mythicalCount" type="number" min="0" value={formData.mythicalCount} onChange={(e) => setFormData((prev) => ({ ...prev, mythicalCount: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="stardust">Stardust</Label>
              <Input id="stardust" type="number" min="0" value={formData.stardust} onChange={(e) => setFormData((prev) => ({ ...prev, stardust: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pokecoins">Pokécoins</Label>
              <Input id="pokecoins" type="number" min="0" value={formData.pokecoins} onChange={(e) => setFormData((prev) => ({ ...prev, pokecoins: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="medalsGold">Medalhas douradas</Label>
              <Input id="medalsGold" type="number" min="0" value={formData.medalsGold} onChange={(e) => setFormData((prev) => ({ ...prev, medalsGold: e.target.value }))} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="medalsTotal">Medalhas totais</Label>
              <Input id="medalsTotal" type="number" min="0" value={formData.medalsTotal} onChange={(e) => setFormData((prev) => ({ ...prev, medalsTotal: e.target.value }))} />
            </div>
            <div className="space-y-2 flex items-center gap-2 pt-8">
              <input id="hasSpecialItems" type="checkbox" checked={formData.hasSpecialItems} onChange={(e) => setFormData((prev) => ({ ...prev, hasSpecialItems: e.target.checked }))} />
              <Label htmlFor="hasSpecialItems">Possui itens especiais</Label>
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="specialItemsDescription">Descrição de itens especiais</Label>
              <Textarea id="specialItemsDescription" rows={4} value={formData.specialItemsDescription} onChange={(e) => setFormData((prev) => ({ ...prev, specialItemsDescription: e.target.value }))} />
            </div>
          </CardContent>
        </Card>

        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
          Publicar conta
        </Button>
      </form>
    </div>
  );
}
