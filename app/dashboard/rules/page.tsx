'use client';

import { useState } from 'react';
import {
    FileText,
    Package,
    CreditCard,
    Ban,
    Users,
    AlertTriangle,
    RefreshCw,
    ChevronDown,
    ChevronUp,
    Shield,
    Clock,
    CheckCircle2,
    XCircle,
    Info
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface RuleSection {
    id: string;
    title: string;
    icon: any;
    color: string;
    rules: {
        title: string;
        description: string;
        type?: 'info' | 'warning' | 'success' | 'danger';
    }[];
}

const ruleSections: RuleSection[] = [
    {
        id: 'entrega',
        title: 'Entrega e Troca',
        icon: Package,
        color: 'bg-blue-500/10 text-blue-600 dark:text-blue-400',
        rules: [
            {
                title: 'Prazo de Entrega: 48 horas',
                description: 'Após a confirmação do pagamento, o vendedor tem até 48 horas para iniciar a entrega do Pokémon.',
                type: 'info'
            },
            {
                title: 'Reembolso por Atraso',
                description: 'Se o Pokémon não for entregue em até 72 horas, o comprador receberá reembolso total automaticamente.',
                type: 'success'
            },
            {
                title: 'Período de Amizade',
                description: 'Algumas trocas requerem período de amizade no Pokémon GO (1-90 dias). O vendedor deve informar previamente.',
                type: 'info'
            },
            {
                title: 'Resposta Obrigatória',
                description: 'Vendedores devem responder mensagens dos compradores em até 12 horas úteis.',
                type: 'warning'
            }
        ]
    },
    {
        id: 'pagamentos',
        title: 'Pagamentos e Carteira',
        icon: CreditCard,
        color: 'bg-green-500/10 text-green-600 dark:text-green-400',
        rules: [
            {
                title: 'Saque Mínimo: R$ 20,00',
                description: 'O valor mínimo para solicitar saque da carteira é de R$ 20,00.',
                type: 'info'
            },
            {
                title: 'Prazo de Saque: 2 dias úteis',
                description: 'Saques são processados em até 2 dias úteis após a solicitação.',
                type: 'info'
            },
            {
                title: 'Liberação do Pagamento',
                description: 'O pagamento só é liberado ao vendedor após a confirmação da entrega pelo comprador.',
                type: 'success'
            },
            {
                title: 'Taxa de Serviço: 10-30%',
                description: 'Cobramos uma taxa de serviço que varia de 10% a 30% dependendo do valor. Consulte a página de Taxas.',
                type: 'info'
            }
        ]
    },
    {
        id: 'proibido',
        title: 'Conteúdo Proibido',
        icon: Ban,
        color: 'bg-red-500/10 text-red-600 dark:text-red-400',
        rules: [
            {
                title: 'Pokémon Hackeados',
                description: 'É estritamente proibido vender Pokémon gerados por terceiros, hackeados ou obtidos ilegalmente.',
                type: 'danger'
            },
            {
                title: 'Contas Compartilhadas',
                description: 'Não é permitido vender acesso a contas ou usar múltiplas contas para manipular o sistema.',
                type: 'danger'
            },
            {
                title: 'Bots e Automação',
                description: 'O uso de bots, scripts ou qualquer forma de automação é proibido e resulta em banimento.',
                type: 'danger'
            },
            {
                title: 'Preços Abusivos',
                description: 'Anúncios com preços muito acima do mercado podem ser removidos. Golpes resultam em banimento imediato.',
                type: 'warning'
            }
        ]
    },
    {
        id: 'comportamento',
        title: 'Comportamento do Usuário',
        icon: Users,
        color: 'bg-purple-500/10 text-purple-600 dark:text-purple-400',
        rules: [
            {
                title: 'Comunicação Respeitosa',
                description: 'Trate todos os usuários com respeito. Linguagem ofensiva ou assédio não são tolerados.',
                type: 'info'
            },
            {
                title: 'Transações na Plataforma',
                description: 'Todas as transações devem ser realizadas dentro da plataforma. Negociações externas não são protegidas.',
                type: 'warning'
            },
            {
                title: 'Proibido Spam',
                description: 'Não publique anúncios duplicados ou envie mensagens em massa. Isso pode resultar em suspensão.',
                type: 'warning'
            },
            {
                title: 'Avaliações Honestas',
                description: 'Avaliações falsas (positivas ou negativas) resultam em suspensão da conta.',
                type: 'danger'
            }
        ]
    },
    {
        id: 'penalidades',
        title: 'Penalidades',
        icon: AlertTriangle,
        color: 'bg-orange-500/10 text-orange-600 dark:text-orange-400',
        rules: [
            {
                title: '1ª Infração: Aviso',
                description: 'Na primeira violação das regras, o usuário receberá um aviso formal.',
                type: 'warning'
            },
            {
                title: '2ª Infração: Suspensão 7 dias',
                description: 'Na segunda violação, a conta será suspensa por 7 dias.',
                type: 'warning'
            },
            {
                title: '3ª Infração: Banimento',
                description: 'Na terceira violação, o usuário será banido permanentemente da plataforma.',
                type: 'danger'
            },
            {
                title: 'Golpes: Ação Imediata',
                description: 'Tentativas de golpe resultam em banimento imediato e possível ação legal.',
                type: 'danger'
            }
        ]
    },
    {
        id: 'cancelamentos',
        title: 'Cancelamentos e Reembolsos',
        icon: RefreshCw,
        color: 'bg-cyan-500/10 text-cyan-600 dark:text-cyan-400',
        rules: [
            {
                title: 'Cancelamento Antes da Troca',
                description: 'Cancelamentos solicitados antes do início da troca resultam em reembolso total.',
                type: 'success'
            },
            {
                title: 'Cancelamento Durante a Troca',
                description: 'Após o início da troca, cancelamentos são analisados caso a caso pela equipe de suporte.',
                type: 'info'
            },
            {
                title: 'Desistência do Vendedor',
                description: 'Se o vendedor desistir após a venda, receberá penalidade na reputação e possível suspensão.',
                type: 'warning'
            },
            {
                title: 'Disputa de Transação',
                description: 'Em caso de disputa, nossa equipe analisará as evidências e tomará uma decisão em até 48 horas.',
                type: 'info'
            }
        ]
    }
];

function RuleItem({ title, description, type = 'info' }: { title: string; description: string; type?: string }) {
    const iconMap = {
        info: Info,
        warning: AlertTriangle,
        success: CheckCircle2,
        danger: XCircle
    };

    const colorMap = {
        info: 'text-blue-500',
        warning: 'text-amber-500',
        success: 'text-emerald-500',
        danger: 'text-red-500'
    };

    const Icon = iconMap[type as keyof typeof iconMap] || Info;
    const color = colorMap[type as keyof typeof colorMap] || 'text-blue-500';

    return (
        <div className="flex gap-3 p-3 rounded-xl bg-muted/50 hover:bg-muted transition-colors">
            <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", color)} />
            <div>
                <p className="font-medium text-foreground text-sm">{title}</p>
                <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
            </div>
        </div>
    );
}

function RuleSectionComponent({ section, isOpen, onToggle }: { section: RuleSection; isOpen: boolean; onToggle: () => void }) {
    return (
        <div className="bg-card rounded-2xl border border-border overflow-hidden">
            <button
                onClick={onToggle}
                className="w-full flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
            >
                <div className="flex items-center gap-3">
                    <div className={cn("p-2 rounded-xl", section.color)}>
                        <section.icon className="h-5 w-5" />
                    </div>
                    <div className="text-left">
                        <h3 className="font-semibold text-foreground">{section.title}</h3>
                        <p className="text-xs text-muted-foreground">{section.rules.length} regras</p>
                    </div>
                </div>
                {isOpen ? (
                    <ChevronUp className="h-5 w-5 text-muted-foreground" />
                ) : (
                    <ChevronDown className="h-5 w-5 text-muted-foreground" />
                )}
            </button>

            <div className={cn(
                "overflow-hidden transition-all duration-300",
                isOpen ? "max-h-[1000px]" : "max-h-0"
            )}>
                <div className="p-4 pt-0 space-y-2">
                    {section.rules.map((rule, index) => (
                        <RuleItem
                            key={index}
                            title={rule.title}
                            description={rule.description}
                            type={rule.type}
                        />
                    ))}
                </div>
            </div>
        </div>
    );
}

export default function RulesPage() {
    const [openSections, setOpenSections] = useState<string[]>(['entrega']);

    const toggleSection = (id: string) => {
        setOpenSections(prev =>
            prev.includes(id)
                ? prev.filter(s => s !== id)
                : [...prev, id]
        );
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <div className="p-3 bg-gradient-to-br from-poke-blue/20 to-blue-600/10 rounded-2xl">
                    <Shield className="h-8 w-8 text-poke-blue" />
                </div>
                <div>
                    <h1 className="text-2xl font-bold text-foreground">Regras do Aplicativo</h1>
                    <p className="text-muted-foreground text-sm">Conheça as regras para uma experiência segura</p>
                </div>
            </div>

            {/* Aviso importante */}
            <div className="bg-amber-500/10 dark:bg-amber-500/20 border border-amber-500/20 rounded-2xl p-4">
                <div className="flex gap-3">
                    <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                        <p className="font-medium text-foreground text-sm">Importante</p>
                        <p className="text-xs text-muted-foreground mt-1">
                            Ao utilizar a plataforma, você concorda com todas as regras listadas abaixo.
                            O descumprimento pode resultar em penalidades, incluindo suspensão ou banimento permanente.
                        </p>
                    </div>
                </div>
            </div>

            {/* Seções de regras */}
            <div className="space-y-3">
                {ruleSections.map((section) => (
                    <RuleSectionComponent
                        key={section.id}
                        section={section}
                        isOpen={openSections.includes(section.id)}
                        onToggle={() => toggleSection(section.id)}
                    />
                ))}
            </div>

            {/* Footer */}
            <div className="text-center py-6">
                <p className="text-xs text-muted-foreground">
                    Última atualização: {new Date().toLocaleDateString('pt-BR')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                    Dúvidas? Entre em contato com nosso suporte.
                </p>
            </div>
        </div>
    );
}
