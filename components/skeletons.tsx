'use client';

import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

/**
 * Skeleton loader para cards de Pokémon no mercado
 * Mobile-first: respeita touch targets e thumb zone
 */
export function PokemonCardSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn(
            "bg-card rounded-2xl border border-border overflow-hidden animate-in fade-in-50 duration-300",
            className
        )}>
            {/* Imagem - proporção 4:3 */}
            <div className="aspect-[4/3] relative">
                <Skeleton className="absolute inset-0" />
                {/* Badges skeleton */}
                <div className="absolute top-2 left-2 flex gap-1">
                    <Skeleton className="h-5 w-12 rounded-full" />
                </div>
            </div>

            {/* Conteúdo */}
            <div className="p-3 space-y-2">
                {/* Título */}
                <Skeleton className="h-4 w-3/4" />

                {/* Vendedor */}
                <div className="flex items-center gap-2">
                    <Skeleton className="h-5 w-5 rounded-full" />
                    <Skeleton className="h-3 w-20" />
                </div>

                {/* Preço e ações */}
                <div className="flex items-center justify-between pt-1">
                    <Skeleton className="h-5 w-16" />
                    <div className="flex gap-1">
                        <Skeleton className="h-9 w-9 rounded-lg" />
                        <Skeleton className="h-9 w-9 rounded-lg" />
                    </div>
                </div>
            </div>
        </div>
    );
}

/**
 * Skeleton loader para lista de pedidos
 */
export function OrderCardSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn(
            "bg-card rounded-xl border border-border p-4 space-y-3 animate-in fade-in-50 duration-300",
            className
        )}>
            {/* Header */}
            <div className="flex items-start justify-between">
                <div className="space-y-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-32" />
                </div>
                <Skeleton className="h-6 w-20 rounded-full" />
            </div>

            {/* Item */}
            <div className="flex items-center gap-3">
                <Skeleton className="h-14 w-14 rounded-lg" />
                <div className="flex-1 space-y-1">
                    <Skeleton className="h-4 w-2/3" />
                    <Skeleton className="h-3 w-1/3" />
                </div>
                <Skeleton className="h-5 w-16" />
            </div>
        </div>
    );
}

/**
 * Skeleton loader para mensagens/conversas
 */
export function ConversationSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn(
            "flex items-center gap-3 p-3 rounded-xl animate-in fade-in-50 duration-300",
            className
        )}>
            <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />
            <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-12" />
                </div>
                <Skeleton className="h-3 w-3/4" />
            </div>
        </div>
    );
}

/**
 * Skeleton para perfil de usuário
 */
export function ProfileSkeleton({ className }: { className?: string }) {
    return (
        <div className={cn("space-y-6 animate-in fade-in-50 duration-300", className)}>
            {/* Header com avatar */}
            <div className="flex flex-col items-center gap-4">
                <Skeleton className="h-24 w-24 rounded-full" />
                <div className="text-center space-y-2">
                    <Skeleton className="h-6 w-32 mx-auto" />
                    <Skeleton className="h-4 w-24 mx-auto" />
                </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3].map((i) => (
                    <div key={i} className="text-center space-y-1">
                        <Skeleton className="h-6 w-8 mx-auto" />
                        <Skeleton className="h-3 w-12 mx-auto" />
                    </div>
                ))}
            </div>
        </div>
    );
}

/**
 * Skeleton para lista genérica - grid
 */
export function GridSkeleton({
    count = 6,
    className
}: {
    count?: number;
    className?: string
}) {
    return (
        <div className={cn(
            "grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3",
            className
        )}>
            {Array.from({ length: count }).map((_, i) => (
                <PokemonCardSkeleton key={i} />
            ))}
        </div>
    );
}

/**
 * Loading state com feedback visual para botões
 */
export function ButtonLoadingSpinner({ className }: { className?: string }) {
    return (
        <div
            className={cn(
                "h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin",
                className
            )}
        />
    );
}
