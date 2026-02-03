'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    AlertTriangle,
    ArrowLeft,
    Send,
    User,
    Package,
    ShoppingCart,
    AlertCircle,
    CheckCircle2,
    Loader2,
    Shield,
    FileWarning,
    Ban,
    MessageCircleWarning,
    Skull,
    PackageX,
    HelpCircle
} from 'lucide-react';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

type ComplaintType = 'user' | 'listing' | 'order' | 'other';
type ComplaintReason = 'fraud' | 'inappropriate_content' | 'spam' | 'harassment' | 'fake_pokemon' | 'non_delivery' | 'scam' | 'other';

const reasonLabels: Record<ComplaintReason, { label: string; icon: any; description: string }> = {
    fraud: { label: 'Fraude', icon: AlertTriangle, description: 'Tentativa de enganar ou roubar' },
    inappropriate_content: { label: 'Conteúdo Inadequado', icon: Ban, description: 'Imagens ou textos ofensivos' },
    spam: { label: 'Spam', icon: MessageCircleWarning, description: 'Mensagens repetitivas ou propaganda' },
    harassment: { label: 'Assédio', icon: FileWarning, description: 'Comportamento abusivo ou ameaçador' },
    fake_pokemon: { label: 'Pokémon Falso', icon: Skull, description: 'Pokémon hackeado ou inexistente' },
    non_delivery: { label: 'Não Entrega', icon: PackageX, description: 'Vendedor não entregou o Pokémon' },
    scam: { label: 'Golpe', icon: AlertCircle, description: 'Pagou mas não recebeu / produto diferente' },
    other: { label: 'Outro', icon: HelpCircle, description: 'Outro motivo não listado' },
};

const typeLabels: Record<ComplaintType, { label: string; icon: any }> = {
    user: { label: 'Usuário', icon: User },
    listing: { label: 'Anúncio', icon: Package },
    order: { label: 'Pedido', icon: ShoppingCart },
    other: { label: 'Outro', icon: HelpCircle },
};

export default function ReportPage() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const [loading, setLoading] = useState(true);
    const [submitting, setSubmitting] = useState(false);
    const [userId, setUserId] = useState<string>('');
    const [submitted, setSubmitted] = useState(false);

    const [formData, setFormData] = useState({
        type: '' as ComplaintType | '',
        reason: '' as ComplaintReason | '',
        reportedUserId: searchParams.get('user') || '',
        listingId: searchParams.get('listing') || '',
        orderId: searchParams.get('order') || '',
        description: '',
        evidenceUrls: '',
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

        // Auto-set type based on URL params
        if (searchParams.get('user')) setFormData(prev => ({ ...prev, type: 'user' }));
        else if (searchParams.get('listing')) setFormData(prev => ({ ...prev, type: 'listing' }));
        else if (searchParams.get('order')) setFormData(prev => ({ ...prev, type: 'order' }));

        setLoading(false);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!formData.type || !formData.reason || !formData.description) {
            toast({
                title: "Campos obrigatórios",
                description: "Preencha o tipo, motivo e descrição da denúncia",
                variant: "destructive"
            });
            return;
        }

        setSubmitting(true);

        try {
            const evidenceArray = formData.evidenceUrls
                .split('\n')
                .map(url => url.trim())
                .filter(url => url.length > 0);

            const { error } = await supabaseClient
                .from('complaints')
                .insert({
                    reporter_id: userId,
                    reported_user_id: formData.reportedUserId || null,
                    listing_id: formData.listingId || null,
                    order_id: formData.orderId || null,
                    type: formData.type,
                    reason: formData.reason,
                    description: formData.description,
                    evidence_urls: evidenceArray.length > 0 ? evidenceArray : null,
                    status: 'pending',
                });

            if (error) throw error;

            setSubmitted(true);
            toast({
                title: "Denúncia enviada!",
                description: "Nossa equipe irá analisar em breve",
            });
        } catch (error: any) {
            console.error('Erro ao enviar denúncia:', error);
            toast({
                title: "Erro ao enviar",
                description: error.message || "Tente novamente mais tarde",
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

    if (submitted) {
        return (
            <div className="max-w-lg mx-auto space-y-6">
                <Card className="border-2 border-green-500/30">
                    <CardContent className="pt-8 pb-8 text-center">
                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                            <CheckCircle2 className="h-8 w-8 text-green-500" />
                        </div>
                        <h2 className="text-xl font-bold text-foreground mb-2">Denúncia Enviada!</h2>
                        <p className="text-muted-foreground mb-6">
                            Recebemos sua denúncia e nossa equipe irá analisar o caso em breve.
                            Você será notificado sobre o resultado.
                        </p>
                        <div className="flex gap-3 justify-center">
                            <Link href="/dashboard">
                                <Button variant="outline">Voltar ao Início</Button>
                            </Link>
                            <Button onClick={() => { setSubmitted(false); setFormData({ type: '', reason: '', reportedUserId: '', listingId: '', orderId: '', description: '', evidenceUrls: '' }); }}>
                                Nova Denúncia
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="max-w-2xl mx-auto space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Link href="/dashboard">
                    <Button variant="ghost" size="sm">
                        <ArrowLeft className="h-4 w-4 mr-2" />
                        Voltar
                    </Button>
                </Link>
                <div>
                    <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
                        <Shield className="h-6 w-6 text-red-500" />
                        Fazer Denúncia
                    </h1>
                    <p className="text-muted-foreground text-sm">Reporte comportamentos inadequados</p>
                </div>
            </div>

            {/* Info Box */}
            <div className="bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/30 rounded-xl p-4">
                <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm">
                        <p className="font-medium text-amber-700 dark:text-amber-400">Antes de denunciar</p>
                        <p className="text-amber-600 dark:text-amber-500 mt-1">
                            Denúncias falsas podem resultar em penalidades. Use este recurso apenas para
                            reportar violações reais das regras da plataforma.
                        </p>
                    </div>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
                {/* Tipo de Denúncia */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">O que você quer denunciar?</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            {(Object.entries(typeLabels) as [ComplaintType, typeof typeLabels[ComplaintType]][]).map(([type, config]) => (
                                <button
                                    key={type}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type })}
                                    className={cn(
                                        "p-4 rounded-xl border-2 transition-all text-center",
                                        formData.type === type
                                            ? "border-red-500 bg-red-500/10"
                                            : "border-border hover:border-muted-foreground/50"
                                    )}
                                >
                                    <config.icon className={cn(
                                        "h-6 w-6 mx-auto mb-2",
                                        formData.type === type ? "text-red-500" : "text-muted-foreground"
                                    )} />
                                    <span className={cn(
                                        "text-sm font-medium",
                                        formData.type === type ? "text-red-500" : "text-foreground"
                                    )}>
                                        {config.label}
                                    </span>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* IDs Relacionados */}
                {formData.type && formData.type !== 'other' && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-lg">Identificação</CardTitle>
                            <CardDescription>
                                {formData.type === 'user' && 'ID ou nome do usuário denunciado'}
                                {formData.type === 'listing' && 'ID do anúncio problemático'}
                                {formData.type === 'order' && 'ID do pedido relacionado'}
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            {formData.type === 'user' && (
                                <Input
                                    placeholder="ID ou nome do usuário"
                                    value={formData.reportedUserId}
                                    onChange={(e) => setFormData({ ...formData, reportedUserId: e.target.value })}
                                />
                            )}
                            {formData.type === 'listing' && (
                                <Input
                                    placeholder="ID do anúncio"
                                    value={formData.listingId}
                                    onChange={(e) => setFormData({ ...formData, listingId: e.target.value })}
                                />
                            )}
                            {formData.type === 'order' && (
                                <Input
                                    placeholder="ID do pedido"
                                    value={formData.orderId}
                                    onChange={(e) => setFormData({ ...formData, orderId: e.target.value })}
                                />
                            )}
                        </CardContent>
                    </Card>
                )}

                {/* Motivo */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Qual o motivo?</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid gap-2">
                            {(Object.entries(reasonLabels) as [ComplaintReason, typeof reasonLabels[ComplaintReason]][]).map(([reason, config]) => (
                                <button
                                    key={reason}
                                    type="button"
                                    onClick={() => setFormData({ ...formData, reason })}
                                    className={cn(
                                        "flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-left",
                                        formData.reason === reason
                                            ? "border-red-500 bg-red-500/10"
                                            : "border-border hover:border-muted-foreground/50"
                                    )}
                                >
                                    <config.icon className={cn(
                                        "h-5 w-5 flex-shrink-0",
                                        formData.reason === reason ? "text-red-500" : "text-muted-foreground"
                                    )} />
                                    <div>
                                        <p className={cn(
                                            "font-medium text-sm",
                                            formData.reason === reason ? "text-red-500" : "text-foreground"
                                        )}>
                                            {config.label}
                                        </p>
                                        <p className="text-xs text-muted-foreground">{config.description}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </CardContent>
                </Card>

                {/* Descrição */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Descreva o ocorrido *</CardTitle>
                        <CardDescription>
                            Seja detalhado para nos ajudar a entender a situação
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            placeholder="Explique o que aconteceu, quando ocorreu, e por que você acha que isso viola as regras..."
                            value={formData.description}
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            rows={5}
                            required
                        />
                    </CardContent>
                </Card>

                {/* Evidências */}
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">Evidências (opcional)</CardTitle>
                        <CardDescription>
                            Links de prints, fotos ou outros arquivos que comprovem a denúncia
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <Textarea
                            placeholder="Cole os links aqui (um por linha)&#10;https://exemplo.com/print1.jpg&#10;https://exemplo.com/print2.jpg"
                            value={formData.evidenceUrls}
                            onChange={(e) => setFormData({ ...formData, evidenceUrls: e.target.value })}
                            rows={3}
                        />
                    </CardContent>
                </Card>

                {/* Submit */}
                <Button
                    type="submit"
                    className="w-full bg-red-600 hover:bg-red-700 h-12"
                    disabled={submitting || !formData.type || !formData.reason || !formData.description}
                >
                    {submitting ? (
                        <>
                            <Loader2 className="h-5 w-5 mr-2 animate-spin" />
                            Enviando...
                        </>
                    ) : (
                        <>
                            <Send className="h-5 w-5 mr-2" />
                            Enviar Denúncia
                        </>
                    )}
                </Button>
            </form>
        </div>
    );
}
