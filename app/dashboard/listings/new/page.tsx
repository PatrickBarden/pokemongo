'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
    ArrowLeft,
    Plus,
    Sparkles,
    Shirt,
    Image as ImageIcon,
    Heart,
    Upload,
    CheckCircle2,
    AlertCircle,
    Loader2,
    Zap
} from 'lucide-react';
import Link from 'next/link';
import { PokemonSearch } from '@/components/pokemon-search';
import { PokemonDetails } from '@/lib/pokeapi';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

export default function NewListingPage() {
    const router = useRouter();
    const { toast } = useToast();
    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [userId, setUserId] = useState<string>('');
    const [step, setStep] = useState(1);

    const [formData, setFormData] = useState({
        title: '',
        description: '',
        category: '',
        price_suggested: '',
        accepts_offers: true,
        is_shiny: false,
        has_costume: false,
        has_background: false,
        is_purified: false,
        is_dynamax: false,
        is_gigantamax: false,
        pokemon_data: null as PokemonDetails | null,
        photo_url: '',
    });

    useEffect(() => {
        checkUser();
    }, []);

    const checkUser = async () => {
        const { data: { user } } = await supabaseClient.auth.getUser();
        if (!user) {
            router.push('/login');
            return;
        }
        setUserId(user.id);
        setLoading(false);
    };

    const handlePokemonSelect = (pokemon: PokemonDetails, description: string) => {
        setFormData({
            ...formData,
            title: pokemon.name.charAt(0).toUpperCase() + pokemon.name.slice(1),
            description: description || `Pokémon ${pokemon.name} para troca/venda`,
            category: pokemon.types[0].type.name,
            pokemon_data: pokemon,
        });
        setStep(2);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.title || !formData.price_suggested) {
            toast({
                title: "Campos obrigatórios",
                description: "Preencha o título e o preço do Pokémon",
                variant: "destructive"
            });
            return;
        }

        setSubmitting(true);

        try {
            const { error } = await supabaseClient
                .from('listings')
                .insert({
                    owner_id: userId,
                    title: formData.title,
                    description: formData.description,
                    category: formData.category,
                    price_suggested: parseFloat(formData.price_suggested),
                    accepts_offers: formData.accepts_offers,
                    is_shiny: formData.is_shiny,
                    has_costume: formData.has_costume,
                    has_background: formData.has_background,
                    is_purified: formData.is_purified,
                    is_dynamax: formData.is_dynamax,
                    is_gigantamax: formData.is_gigantamax,
                    pokemon_data: formData.pokemon_data,
                    photo_url: formData.photo_url || null,
                    active: true,
                });

            if (error) throw error;

            toast({
                title: "Anúncio criado! 🎉",
                description: "Seu Pokémon foi cadastrado com sucesso",
            });

            router.push('/dashboard/seller');
        } catch (error: any) {
            toast({
                title: "Erro ao criar anúncio",
                description: error.message || "Tente novamente",
                variant: "destructive"
            });
        } finally {
            setSubmitting(false);
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
        <div className="space-y-6 max-w-2xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard/seller">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Novo Anúncio</h1>
                    <p className="text-muted-foreground text-sm">Cadastre seu Pokémon para venda</p>
                </div>
            </div>

            {/* Progress Steps */}
            <div className="flex items-center gap-2">
                <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors",
                    step >= 1 ? "bg-poke-blue text-white" : "bg-muted text-muted-foreground"
                )}>
                    1
                </div>
                <div className={cn("flex-1 h-1 rounded-full transition-colors", step >= 2 ? "bg-poke-blue" : "bg-muted")} />
                <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors",
                    step >= 2 ? "bg-poke-blue text-white" : "bg-muted text-muted-foreground"
                )}>
                    2
                </div>
                <div className={cn("flex-1 h-1 rounded-full transition-colors", step >= 3 ? "bg-poke-blue" : "bg-muted")} />
                <div className={cn(
                    "flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors",
                    step >= 3 ? "bg-poke-blue text-white" : "bg-muted text-muted-foreground"
                )}>
                    3
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Step 1: Buscar Pokémon */}
                {step === 1 && (
                    <Card className="border-2 border-poke-blue/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Zap className="h-5 w-5 text-poke-blue" />
                                Selecione o Pokémon
                            </CardTitle>
                            <CardDescription>
                                Busque na Pokédex para preencher automaticamente
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <PokemonSearch onSelect={handlePokemonSelect} />

                            <div className="text-center py-4">
                                <p className="text-sm text-muted-foreground mb-3">Ou preencha manualmente</p>
                                <Button
                                    type="button"
                                    variant="outline"
                                    onClick={() => setStep(2)}
                                >
                                    Preencher Manual
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 2: Detalhes */}
                {step === 2 && (
                    <Card className="border-2 border-poke-blue/20">
                        <CardHeader>
                            <CardTitle>Detalhes do Pokémon</CardTitle>
                            <CardDescription>
                                Preencha as informações do seu anúncio
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid gap-4 sm:grid-cols-2">
                                <div className="space-y-2">
                                    <Label htmlFor="title">Nome do Pokémon *</Label>
                                    <Input
                                        id="title"
                                        value={formData.title}
                                        onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                                        placeholder="Ex: Pikachu"
                                        required
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="category">Tipo *</Label>
                                    <Input
                                        id="category"
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        placeholder="Ex: electric, fire, water"
                                        required
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Descrição</Label>
                                <Textarea
                                    id="description"
                                    value={formData.description}
                                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                    placeholder="Descreva seu Pokémon..."
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="price">Preço (R$) *</Label>
                                <Input
                                    id="price"
                                    type="number"
                                    step="0.01"
                                    min="1"
                                    value={formData.price_suggested}
                                    onChange={(e) => setFormData({ ...formData, price_suggested: e.target.value })}
                                    placeholder="0,00"
                                    required
                                />
                            </div>

                            {/* Variantes */}
                            <div className="space-y-3">
                                <Label>Variantes especiais</Label>
                                <div className="flex flex-wrap gap-2">
                                    <Badge
                                        variant={formData.is_shiny ? "default" : "outline"}
                                        className={cn(
                                            "cursor-pointer transition-all",
                                            formData.is_shiny && "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-0"
                                        )}
                                        onClick={() => setFormData({ ...formData, is_shiny: !formData.is_shiny })}
                                    >
                                        <Sparkles className="h-3 w-3 mr-1" />
                                        Brilhante
                                    </Badge>
                                    <Badge
                                        variant={formData.has_costume ? "default" : "outline"}
                                        className={cn(
                                            "cursor-pointer transition-all",
                                            formData.has_costume && "bg-gradient-to-r from-purple-500 to-purple-700 text-white border-0"
                                        )}
                                        onClick={() => setFormData({ ...formData, has_costume: !formData.has_costume })}
                                    >
                                        <Shirt className="h-3 w-3 mr-1" />
                                        Com Traje
                                    </Badge>
                                    <Badge
                                        variant={formData.has_background ? "default" : "outline"}
                                        className={cn(
                                            "cursor-pointer transition-all",
                                            formData.has_background && "bg-gradient-to-r from-blue-500 to-blue-700 text-white border-0"
                                        )}
                                        onClick={() => setFormData({ ...formData, has_background: !formData.has_background })}
                                    >
                                        <ImageIcon className="h-3 w-3 mr-1" />
                                        Com Fundo
                                    </Badge>
                                    <Badge
                                        variant={formData.is_purified ? "default" : "outline"}
                                        className={cn(
                                            "cursor-pointer transition-all",
                                            formData.is_purified && "bg-gradient-to-r from-pink-500 to-pink-700 text-white border-0"
                                        )}
                                        onClick={() => setFormData({ ...formData, is_purified: !formData.is_purified })}
                                    >
                                        <Heart className="h-3 w-3 mr-1" />
                                        Purificado
                                    </Badge>
                                    <Badge
                                        variant={formData.is_dynamax ? "default" : "outline"}
                                        className={cn(
                                            "cursor-pointer transition-all",
                                            formData.is_dynamax && "bg-gradient-to-r from-red-600 to-red-800 text-white border-0"
                                        )}
                                        onClick={() => setFormData({ ...formData, is_dynamax: !formData.is_dynamax })}
                                    >
                                        <Zap className="h-3 w-3 mr-1" />
                                        Dinamax
                                    </Badge>
                                    <Badge
                                        variant={formData.is_gigantamax ? "default" : "outline"}
                                        className={cn(
                                            "cursor-pointer transition-all",
                                            formData.is_gigantamax && "bg-gradient-to-r from-orange-500 to-red-600 text-white border-0"
                                        )}
                                        onClick={() => setFormData({ ...formData, is_gigantamax: !formData.is_gigantamax })}
                                    >
                                        <Sparkles className="h-3 w-3 mr-1" />
                                        Gigamax
                                    </Badge>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <input
                                    type="checkbox"
                                    id="accepts_offers"
                                    checked={formData.accepts_offers}
                                    onChange={(e) => setFormData({ ...formData, accepts_offers: e.target.checked })}
                                    className="rounded"
                                />
                                <Label htmlFor="accepts_offers" className="cursor-pointer text-sm">
                                    Aceito propostas de valor
                                </Label>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setStep(1)}>
                                    Voltar
                                </Button>
                                <Button
                                    type="button"
                                    className="flex-1 bg-poke-blue hover:bg-poke-blue/90"
                                    onClick={() => setStep(3)}
                                >
                                    Continuar
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}

                {/* Step 3: Foto e Confirmação */}
                {step === 3 && (
                    <Card className="border-2 border-poke-blue/20">
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Upload className="h-5 w-5 text-poke-blue" />
                                Foto do Pokémon
                            </CardTitle>
                            <CardDescription>
                                Adicione uma foto real do seu Pokémon (opcional)
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="photo_url">URL da Foto</Label>
                                <Input
                                    id="photo_url"
                                    value={formData.photo_url}
                                    onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                                    placeholder="https://exemplo.com/foto.jpg"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Cole o link de uma imagem do seu Pokémon no jogo
                                </p>
                            </div>

                            {/* Preview */}
                            <div className="bg-muted/50 rounded-xl p-4">
                                <h4 className="font-semibold text-sm mb-3">Resumo do anúncio</h4>
                                <div className="flex gap-4">
                                    <div className="w-20 h-20 bg-gradient-to-br from-poke-blue/10 to-poke-yellow/10 rounded-xl flex items-center justify-center overflow-hidden">
                                        {formData.photo_url ? (
                                            <img src={formData.photo_url} alt="Preview" className="w-full h-full object-cover" />
                                        ) : formData.pokemon_data?.sprites?.front_default ? (
                                            <img src={formData.pokemon_data.sprites.front_default} alt="Pokemon" className="w-full h-full object-contain p-2" />
                                        ) : (
                                            <Plus className="w-8 h-8 text-muted-foreground" />
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-bold text-foreground">{formData.title || 'Nome do Pokémon'}</p>
                                        <p className="text-sm text-muted-foreground">{formData.category || 'Tipo'}</p>
                                        <p className="text-lg font-bold text-poke-blue mt-1">
                                            R$ {formData.price_suggested || '0,00'}
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex gap-2 pt-4">
                                <Button type="button" variant="outline" onClick={() => setStep(2)}>
                                    Voltar
                                </Button>
                                <Button
                                    type="submit"
                                    className="flex-1 bg-green-600 hover:bg-green-700"
                                    disabled={submitting}
                                >
                                    {submitting ? (
                                        <>
                                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                            Criando...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle2 className="h-4 w-4 mr-2" />
                                            Publicar Anúncio
                                        </>
                                    )}
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                )}
            </form>
        </div>
    );
}
