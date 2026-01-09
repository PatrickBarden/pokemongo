'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import {
  Calculator,
  Heart,
  LayoutDashboard,
  MessageCircle,
  Package,
  Percent,
  Search,
  Settings,
  ShoppingCart,
  Sparkles,
  Store,
  TrendingUp,
  Wallet,
  Lightbulb,
  HelpCircle,
  User,
} from 'lucide-react';
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from '@/components/ui/command';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface SearchCommandProps {
  className?: string;
}

interface NavItem {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href: string;
  shortcut?: string;
}

interface NavGroup {
  heading: string;
  items: NavItem[];
}

const navigationItems: NavGroup[] = [
  {
    heading: 'Navegação Principal',
    items: [
      { icon: LayoutDashboard, label: 'Início', href: '/dashboard', shortcut: '⌘1' },
      { icon: Store, label: 'Mercado', href: '/dashboard/market', shortcut: '⌘2' },
      { icon: ShoppingCart, label: 'Carrinho', href: '/dashboard/cart', shortcut: '⌘3' },
      { icon: MessageCircle, label: 'Mensagens', href: '/dashboard/messages', shortcut: '⌘4' },
    ],
  },
  {
    heading: 'Suas Atividades',
    items: [
      { icon: Package, label: 'Pedidos', href: '/dashboard/orders' },
      { icon: Heart, label: 'Favoritos', href: '/dashboard/favorites' },
      { icon: TrendingUp, label: 'Minhas Vendas', href: '/dashboard/seller' },
      { icon: Wallet, label: 'Carteira', href: '/dashboard/wallet' },
    ],
  },
  {
    heading: 'Configurações',
    items: [
      { icon: User, label: 'Meu Perfil', href: '/dashboard/profile' },
      { icon: Percent, label: 'Taxas', href: '/dashboard/fees' },
      { icon: Lightbulb, label: 'Sugestões', href: '/dashboard/suggestions' },
      { icon: HelpCircle, label: 'Ajuda', href: '/help' },
    ],
  },
];

export function SearchCommand({ className }: SearchCommandProps) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      <Button
        variant="outline"
        className={cn(
          'relative h-9 w-full justify-start rounded-xl bg-muted/50 text-sm text-muted-foreground hover:bg-muted hover:text-foreground sm:pr-12 md:w-40 lg:w-64',
          className
        )}
        onClick={() => setOpen(true)}
      >
        <Search className="mr-2 h-4 w-4" />
        <span className="hidden lg:inline-flex">Buscar...</span>
        <span className="inline-flex lg:hidden">Buscar...</span>
        <kbd className="pointer-events-none absolute right-1.5 top-1.5 hidden h-6 select-none items-center gap-1 rounded-md border bg-background px-1.5 font-mono text-[10px] font-medium opacity-100 sm:flex">
          <span className="text-xs">⌘</span>K
        </kbd>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar páginas, Pokémon, pedidos..." />
        <CommandList>
          <CommandEmpty>
            <div className="flex flex-col items-center justify-center py-6">
              <Search className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum resultado encontrado.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Tente buscar por outra coisa</p>
            </div>
          </CommandEmpty>

          {navigationItems.map((group) => (
            <CommandGroup key={group.heading} heading={group.heading}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.href}
                  value={item.label}
                  onSelect={() => runCommand(() => router.push(item.href))}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="flex-1">{item.label}</span>
                  {item.shortcut && (
                    <CommandShortcut>{item.shortcut}</CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}

          <CommandSeparator />

          <CommandGroup heading="Ações Rápidas">
            <CommandItem
              onSelect={() => runCommand(() => router.push('/dashboard/seller'))}
              className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
                <Sparkles className="h-4 w-4 text-green-500" />
              </div>
              <span className="flex-1">Vender Pokémon</span>
              <CommandShortcut>⌘N</CommandShortcut>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push('/dashboard/market'))}
              className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                <Store className="h-4 w-4 text-blue-500" />
              </div>
              <span className="flex-1">Explorar Mercado</span>
              <CommandShortcut>⌘E</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

export function SearchCommandTrigger({ className }: { className?: string }) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  React.useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'flex items-center gap-2 h-9 px-3 rounded-xl bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors',
          className
        )}
      >
        <Search className="h-4 w-4" />
        <span className="text-sm hidden sm:inline">Buscar</span>
        <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-1 rounded border bg-background px-1.5 font-mono text-[10px] font-medium">
          <span className="text-xs">⌘</span>K
        </kbd>
      </button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar páginas, Pokémon, pedidos..." />
        <CommandList>
          <CommandEmpty>
            <div className="flex flex-col items-center justify-center py-6">
              <Search className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum resultado encontrado.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Tente buscar por outra coisa</p>
            </div>
          </CommandEmpty>

          {navigationItems.map((group) => (
            <CommandGroup key={group.heading} heading={group.heading}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.href}
                  value={item.label}
                  onSelect={() => runCommand(() => router.push(item.href))}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="flex-1">{item.label}</span>
                  {item.shortcut && (
                    <CommandShortcut>{item.shortcut}</CommandShortcut>
                  )}
                </CommandItem>
              ))}
            </CommandGroup>
          ))}

          <CommandSeparator />

          <CommandGroup heading="Ações Rápidas">
            <CommandItem
              onSelect={() => runCommand(() => router.push('/dashboard/seller'))}
              className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
                <Sparkles className="h-4 w-4 text-green-500" />
              </div>
              <span className="flex-1">Vender Pokémon</span>
              <CommandShortcut>⌘N</CommandShortcut>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push('/dashboard/market'))}
              className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                <Store className="h-4 w-4 text-blue-500" />
              </div>
              <span className="flex-1">Explorar Mercado</span>
              <CommandShortcut>⌘E</CommandShortcut>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

export function MobileSearchButton({ className }: { className?: string }) {
  const [open, setOpen] = React.useState(false);
  const router = useRouter();

  const runCommand = React.useCallback((command: () => unknown) => {
    setOpen(false);
    command();
  }, []);

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className={cn('h-9 w-9 rounded-xl', className)}
        onClick={() => setOpen(true)}
      >
        <Search className="h-5 w-5" />
        <span className="sr-only">Buscar</span>
      </Button>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Buscar páginas, Pokémon, pedidos..." />
        <CommandList>
          <CommandEmpty>
            <div className="flex flex-col items-center justify-center py-6">
              <Search className="h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">Nenhum resultado encontrado.</p>
              <p className="text-xs text-muted-foreground/70 mt-1">Tente buscar por outra coisa</p>
            </div>
          </CommandEmpty>

          {navigationItems.map((group) => (
            <CommandGroup key={group.heading} heading={group.heading}>
              {group.items.map((item) => (
                <CommandItem
                  key={item.href}
                  value={item.label}
                  onSelect={() => runCommand(() => router.push(item.href))}
                  className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                    <item.icon className="h-4 w-4 text-primary" />
                  </div>
                  <span className="flex-1">{item.label}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          ))}

          <CommandSeparator />

          <CommandGroup heading="Ações Rápidas">
            <CommandItem
              onSelect={() => runCommand(() => router.push('/dashboard/seller'))}
              className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-green-500/10">
                <Sparkles className="h-4 w-4 text-green-500" />
              </div>
              <span className="flex-1">Vender Pokémon</span>
            </CommandItem>
            <CommandItem
              onSelect={() => runCommand(() => router.push('/dashboard/market'))}
              className="flex items-center gap-3 px-3 py-2.5 cursor-pointer"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                <Store className="h-4 w-4 text-blue-500" />
              </div>
              <span className="flex-1">Explorar Mercado</span>
            </CommandItem>
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}
