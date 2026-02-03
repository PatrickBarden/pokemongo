'use client';

import { useEffect, useState, useRef, useCallback } from 'react';
import {
  LayoutDashboard,
  Store,
  Wallet,
  LogOut,
  Menu,
  ShoppingCart,
  Package,
  MessageCircle,
  Heart,
  TrendingUp,
  Percent,
  ChevronRight,
  Settings,
  HelpCircle,
  X,
  Lightbulb,
  Plus,
  FileText,
  AlertTriangle,
  Search,
  User
} from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { Sheet, SheetContent, SheetTitle } from '@/components/ui/sheet';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CartProvider, useCart } from '@/contexts/CartContext';
import { NotificationBell } from '@/components/NotificationBell';
import { useUnreadMessages } from '@/components/MessageBadge';
import { cn } from '@/lib/utils';
import { ThemeToggle } from '@/components/theme-toggle';
import { SearchInput } from '@/components/search-input';
import { SearchProvider, useSearch } from '@/contexts/SearchContext';
import { usePushNotifications } from '@/hooks/use-push-notifications';
import { PushPermissionPrompt } from '@/components/push-permission-prompt';

// Navegação principal - itens mais usados
const mainNavigation = [
  { name: 'Início', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Mercado', href: '/dashboard/market', icon: Store },
  { name: 'Carrinho', href: '/dashboard/cart', icon: ShoppingCart, showBadge: true },
  { name: 'Mensagens', href: '/dashboard/messages', icon: MessageCircle, showMessageBadge: true },
];

// Navegação secundária
const secondaryNavigation = [
  { name: 'Favoritos', href: '/dashboard/favorites', icon: Heart },
  { name: 'Pedidos', href: '/dashboard/orders', icon: Package },
  { name: 'Minhas Vendas', href: '/dashboard/seller', icon: TrendingUp },
  { name: 'Carteira', href: '/dashboard/wallet', icon: Wallet },
  { name: 'Taxas', href: '/dashboard/fees', icon: Percent },
  { name: 'Regras', href: '/dashboard/rules', icon: FileText },
  { name: 'Denunciar', href: '/dashboard/report', icon: AlertTriangle },
  { name: 'Sugestões', href: '/dashboard/suggestions', icon: Lightbulb },
];

// Configuração de níveis de vendedor
const levelConfig: Record<string, { label: string; color: string; bgColor: string }> = {
  bronze: { label: 'Bronze', color: 'text-amber-700', bgColor: 'bg-amber-100' },
  silver: { label: 'Prata', color: 'text-slate-500', bgColor: 'bg-slate-100' },
  gold: { label: 'Ouro', color: 'text-yellow-600', bgColor: 'bg-yellow-100' },
  platinum: { label: 'Platina', color: 'text-cyan-600', bgColor: 'bg-cyan-100' },
  diamond: { label: 'Diamante', color: 'text-purple-600', bgColor: 'bg-purple-100' },
};

// Função para obter requisito do próximo nível
function getNextLevelRequirement(currentLevel: string): number {
  switch (currentLevel) {
    case 'bronze': return 5;
    case 'silver': return 20;
    case 'gold': return 50;
    case 'platinum': return 100;
    default: return 100;
  }
}

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [userId, setUserId] = useState<string>('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const { itemCount } = useCart();
  const { unreadCount: unreadMessages } = useUnreadMessages(userId);
  usePushNotifications({ userId });

  useEffect(() => {
    checkUser();

    const handleRouteChange = () => {
      if (pathname === '/dashboard/profile') {
        setTimeout(() => {
          loadProfile();
        }, 500);
      }
    };

    handleRouteChange();
  }, [pathname]);

  const checkUser = async (retryCount = 0) => {
    console.log('=== checkUser called ===', { retryCount });

    // Primeiro tentar getSession (mais confiável no Capacitor)
    const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();
    console.log('getSession result:', { hasSession: !!session, error: sessionError?.message });

    let authUser = session?.user;

    // Se não tem sessão, tentar getUser como fallback
    if (!authUser) {
      const { data: { user: fetchedUser }, error: userError } = await supabaseClient.auth.getUser();
      console.log('getUser result:', { hasUser: !!fetchedUser, error: userError?.message });
      authUser = fetchedUser;
    }

    if (!authUser) {
      // No Android/Capacitor, a sessão pode demorar um pouco para persistir
      // Tentar novamente algumas vezes antes de redirecionar
      if (retryCount < 3) {
        console.log('Sessão não encontrada, tentando novamente em 1s...');
        await new Promise(r => setTimeout(r, 1000));
        return checkUser(retryCount + 1);
      }

      console.log('Nenhuma sessão encontrada após retries, redirecionando para login');
      router.push('/login');
      return;
    }

    console.log('Usuário autenticado:', authUser.email);

    const { data: userData, error: dbError } = await supabaseClient
      .from('users')
      .select('*')
      .eq('id', authUser.id)
      .maybeSingle();

    console.log('userData result:', { hasData: !!userData, error: dbError?.message });

    if ((userData as any)?.role === 'admin') {
      router.push('/admin');
      return;
    }

    setUser(userData);
    setUserId(authUser.id);
    await loadProfile(authUser.id);
    setLoading(false);
  };

  const loadProfile = async (userIdParam?: string) => {
    try {
      const id = userIdParam || user?.id;
      if (!id) return;

      // Buscar avatar do perfil
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('avatar_url')
        .eq('user_id', id)
        .maybeSingle();

      // Se tem avatar no perfil, usar ele
      if (profile && (profile as any).avatar_url) {
        setAvatarUrl((profile as any).avatar_url);
        return;
      }

      // Se não tem avatar no perfil, buscar do Google (user_metadata)
      const { data: { user: authUser } } = await supabaseClient.auth.getUser();
      if (authUser) {
        const googleAvatar = authUser.user_metadata?.avatar_url ||
          authUser.user_metadata?.picture ||
          null;
        if (googleAvatar) {
          setAvatarUrl(googleAvatar);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar avatar:', error);
    }
  };

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="relative w-10 h-10">
          <div className="w-10 h-10 border-3 border-border rounded-full"></div>
          <div className="w-10 h-10 border-3 border-poke-blue border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
      </div>
    );
  }

  // Componente de item de navegação
  const NavItem = ({ item, collapsed = false }: { item: any; collapsed?: boolean }) => {
    const isActive = pathname === item.href;
    const hasNotification = (item.showBadge && itemCount > 0) || (item.showMessageBadge && unreadMessages > 0);

    return (
      <Link
        href={item.href}
        onClick={() => setMobileMenuOpen(false)}
        className={cn(
          "group relative flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200",
          isActive
            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/25"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-foreground",
          collapsed && "justify-center px-2"
        )}
      >
        <div className="relative">
          <item.icon className={cn("h-5 w-5 transition-transform group-hover:scale-110", isActive && "text-white")} />
          {hasNotification && (
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full animate-pulse" />
          )}
        </div>

        {!collapsed && (
          <>
            <span className="flex-1">{item.name}</span>
            {item.showBadge && itemCount > 0 && (
              <Badge className="bg-poke-yellow text-poke-dark border-0 h-5 min-w-[20px] text-xs font-bold">
                {itemCount}
              </Badge>
            )}
            {item.showMessageBadge && unreadMessages > 0 && (
              <Badge className="bg-red-500 text-white border-0 h-5 min-w-[20px] text-xs font-bold">
                {unreadMessages > 99 ? '99+' : unreadMessages}
              </Badge>
            )}
          </>
        )}
      </Link>
    );
  };

  // Sidebar Desktop
  const DesktopSidebar = () => (
    <aside className={cn(
      "hidden lg:flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300",
      sidebarCollapsed ? "w-20" : "w-64"
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center h-16 border-b border-sidebar-border px-4",
        sidebarCollapsed ? "justify-center" : "justify-between"
      )}>
        {!sidebarCollapsed && <Logo size="sm" showText={false} />}
        {sidebarCollapsed && <Logo size="xs" showText={false} />}
      </div>

      {/* User Profile Card */}
      <div className={cn("p-4", sidebarCollapsed && "px-2")}>
        <Link
          href="/dashboard/profile"
          className={cn(
            "flex items-center gap-3 p-3 rounded-xl bg-sidebar-accent hover:bg-sidebar-accent/80 transition-all",
            sidebarCollapsed && "justify-center p-2"
          )}
        >
          <Avatar className="h-10 w-10 ring-2 ring-background shadow-md">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={user?.display_name || 'Avatar'} />}
            <AvatarFallback className="bg-gradient-to-br from-poke-blue to-poke-blue/80 text-white font-bold">
              {user?.display_name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-foreground truncate">{user?.display_name}</p>
              <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
            </div>
          )}
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {!sidebarCollapsed && (
          <p className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Principal
          </p>
        )}
        {mainNavigation.map((item) => (
          <NavItem key={item.name} item={item} collapsed={sidebarCollapsed} />
        ))}

        {!sidebarCollapsed && (
          <p className="px-3 py-2 mt-6 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Mais opções
          </p>
        )}
        {sidebarCollapsed && <div className="h-4" />}
        {secondaryNavigation.map((item) => (
          <NavItem key={item.name} item={item} collapsed={sidebarCollapsed} />
        ))}
      </nav>

      {/* Footer */}
      <div className={cn("p-4 border-t border-sidebar-border", sidebarCollapsed && "px-2")}>
        <Button
          variant="ghost"
          className={cn(
            "w-full text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-xl",
            sidebarCollapsed ? "justify-center px-2" : "justify-start"
          )}
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5" />
          {!sidebarCollapsed && <span className="ml-3">Sair</span>}
        </Button>
      </div>
    </aside>
  );

  // Bottom Navigation Mobile - Ordem: Menu > Mercado > Início > Mensagens > Carrinho
  const bottomNavItems = [
    { name: 'Menu', icon: Menu, isButton: true },
    { name: 'Mercado', href: '/dashboard/market', icon: Store },
    { name: 'Início', href: '/dashboard', icon: LayoutDashboard },
    { name: 'Mensagens', href: '/dashboard/messages', icon: MessageCircle, showMessageBadge: true },
    { name: 'Carrinho', href: '/dashboard/cart', icon: ShoppingCart, showBadge: true },
  ];

  const MobileBottomNav = () => (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-card border-t border-border px-2 pb-4 z-50">
      <div className="flex items-center justify-around h-16">
        {bottomNavItems.map((item) => {
          // Botão Menu especial
          if (item.isButton) {
            return (
              <button
                key={item.name}
                onClick={() => setMobileMenuOpen(true)}
                className="flex flex-col items-center justify-center flex-1 h-full text-muted-foreground hover:text-foreground transition-colors"
              >
                <item.icon className="h-6 w-6" />
                <span className="text-[10px] mt-1 font-medium">{item.name}</span>
              </button>
            );
          }

          const isActive = pathname === item.href;
          const hasNotification = (item.showBadge && itemCount > 0) || (item.showMessageBadge && unreadMessages > 0);

          return (
            <Link
              key={item.name}
              href={item.href!}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full relative transition-all",
                isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
              )}
            >
              <div className="relative">
                <item.icon className={cn("h-6 w-6 transition-transform", isActive && "scale-110")} />
                {hasNotification && (
                  <span className="absolute -top-1 -right-1 min-w-[16px] h-4 px-1 bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center">
                    {item.showBadge ? itemCount : unreadMessages}
                  </span>
                )}
              </div>
              <span className={cn("text-[10px] mt-1 font-medium", isActive && "font-semibold")}>
                {item.name}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-primary rounded-b-full" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );

  // Mobile Menu Sheet
  const MobileMenuSheet = () => {
    if (!mobileMenuOpen) return null;

    return (
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-80 bg-card p-0 [&>button]:hidden">
          <SheetTitle className="sr-only">Menu de Navegação</SheetTitle>
          <div className="flex flex-col h-full pt-8">
            {/* Header - com safe area */}
            <div className="flex items-center justify-between px-4 pb-4 border-b border-border">
              <h2 className="font-semibold text-lg text-foreground">Menu</h2>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-3 -mr-1 rounded-xl bg-muted hover:bg-destructive/10 hover:text-destructive transition-colors touch-target"
                aria-label="Fechar menu"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* User Profile */}
            <Link
              href="/dashboard/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 p-3 m-4 rounded-2xl bg-accent"
            >
              <Avatar className="h-11 w-11 ring-2 ring-background shadow-md flex-shrink-0">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={user?.display_name || 'Avatar'} />}
                <AvatarFallback className="bg-gradient-to-br from-poke-blue to-poke-blue/80 text-white font-bold">
                  {user?.display_name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold text-sm text-foreground truncate">{user?.display_name}</p>
                  {user?.seller_level && (
                    <span className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded",
                      levelConfig[user.seller_level]?.bgColor,
                      levelConfig[user.seller_level]?.color
                    )}>
                      {levelConfig[user.seller_level]?.label}
                    </span>
                  )}
                </div>
                {/* Barra de progresso */}
                <div className="mt-1.5">
                  <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-poke-blue to-poke-yellow rounded-full transition-all duration-500"
                      style={{
                        width: user?.seller_level === 'diamond'
                          ? '100%'
                          : `${Math.min(100, ((user?.total_sales || 0) / getNextLevelRequirement(user?.seller_level || 'bronze')) * 100)}%`
                      }}
                    />
                  </div>
                </div>
              </div>
              <ChevronRight className="h-5 w-5 text-foreground flex-shrink-0" />
            </Link>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-1 overflow-auto">
              <p className="px-3 py-2 text-xs font-semibold text-foreground uppercase tracking-wider">
                Navegação
              </p>
              {secondaryNavigation.map((item) => (
                <NavItem key={item.name} item={item} />
              ))}
            </nav>

            {/* Footer Actions */}
            <div className="p-4 border-t border-border space-y-2">
              <Link
                href="/dashboard/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-muted"
              >
                <Settings className="h-5 w-5" />
                <span>Configurações</span>
              </Link>
              <Link
                href="/help"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-muted-foreground hover:bg-muted"
              >
                <HelpCircle className="h-5 w-5" />
                <span>Ajuda</span>
              </Link>
              <Button
                variant="ghost"
                className="w-full justify-start text-destructive hover:text-destructive hover:bg-destructive/10 rounded-xl"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5 mr-3" />
                Sair da conta
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>
    );
  };

  return (
    <div className="flex h-screen bg-background">
      {/* Push Notification Prompt */}
      <PushPermissionPrompt userId={userId} />

      {/* Desktop Sidebar */}
      <DesktopSidebar />

      {/* Mobile Menu */}
      <MobileMenuSheet />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Mobile Header */}
        <header className="lg:hidden bg-card border-b border-border px-3 py-3 pt-10 flex items-center gap-2 sticky top-0 z-40">
          <Logo size="sm" showText={false} />
          <GlobalSearchInput className="flex-1" placeholder="Buscar..." />
          <div className="flex items-center gap-1">
            <ThemeToggle variant="icon-only" />
            {userId && <NotificationBell userId={userId} />}
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:flex bg-card border-b border-border px-6 py-3 items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-muted-foreground hover:text-foreground"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <GlobalSearchInput className="w-64 lg:w-80" placeholder="Buscar Pokémon, pedidos, mensagens..." />
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            {userId && <NotificationBell userId={userId} />}
            <Link href="/dashboard/profile">
              <Avatar className="h-9 w-9 cursor-pointer ring-2 ring-border hover:ring-primary/50 transition-all">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={user?.display_name || 'Avatar'} />}
                <AvatarFallback className="bg-gradient-to-br from-poke-blue to-poke-blue/80 text-white font-bold text-sm">
                  {user?.display_name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-24 lg:pb-0">
          <div className="p-4 sm:p-6 lg:p-8 max-w-full lg:max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />

        {/* Floating Action Button - Cadastrar Pokémon */}
        <Link
          href="/dashboard/seller"
          className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-50 w-14 h-14 bg-gradient-to-r from-poke-blue to-blue-600 hover:from-poke-blue/90 hover:to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl flex items-center justify-center transition-all duration-300 hover:scale-110 active:scale-95"
          title="Cadastrar Pokémon"
        >
          <Plus className="h-6 w-6" />
        </Link>
      </div>
    </div>
  );
}

// Componente de busca que usa o contexto e suporta @usuário
function GlobalSearchInput({ className, placeholder }: { className?: string; placeholder?: string }) {
  const { searchQuery, setSearchQuery } = useSearch();
  const router = useRouter();
  const [userResults, setUserResults] = useState<any[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Detectar se é busca por @usuário
  const isUserSearch = searchQuery.startsWith('@') && searchQuery.length > 1;
  const userSearchTerm = isUserSearch ? searchQuery.slice(1) : '';

  // Buscar usuários quando digitar @
  useEffect(() => {
    const searchUsers = async () => {
      if (!isUserSearch || userSearchTerm.length < 2) {
        setUserResults([]);
        setShowDropdown(false);
        return;
      }

      setIsSearchingUsers(true);
      try {
        const { data, error } = await supabaseClient
          .from('profiles')
          .select('user_id, display_name, avatar_url, location')
          .ilike('display_name', `%${userSearchTerm}%`)
          .limit(5);

        if (!error && data) {
          setUserResults(data);
          setShowDropdown(data.length > 0);
        }
      } catch (error) {
        console.error('Erro ao buscar usuários:', error);
      } finally {
        setIsSearchingUsers(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [isUserSearch, userSearchTerm]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleUserClick = (userId: string) => {
    setShowDropdown(false);
    setSearchQuery('');
    router.push(`/seller/${userId}`);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  return (
    <div className={cn('relative', className)} ref={dropdownRef}>
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
      <input
        ref={inputRef}
        type="text"
        value={searchQuery}
        onChange={(e) => setSearchQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder || 'Buscar... (@ para usuários)'}
        className={cn(
          'w-full h-10 pl-10 pr-10 bg-muted/50 border border-border rounded-xl',
          'text-sm text-foreground placeholder:text-muted-foreground',
          'focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50',
          'transition-all duration-200'
        )}
      />
      {searchQuery && (
        <button
          onClick={() => { setSearchQuery(''); setShowDropdown(false); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-muted hover:bg-muted-foreground/20 flex items-center justify-center transition-colors"
        >
          <X className="h-3 w-3 text-muted-foreground" />
        </button>
      )}

      {/* Dropdown de resultados de usuários */}
      {showDropdown && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl shadow-lg z-50 overflow-hidden animate-in fade-in-0 slide-in-from-top-2">
          <div className="px-3 py-2 border-b border-border bg-muted/50">
            <span className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <User className="h-3 w-3" />
              Usuários encontrados
            </span>
          </div>
          <div className="py-1">
            {isSearchingUsers ? (
              <div className="px-3 py-4 text-center text-muted-foreground text-sm">
                <div className="animate-spin rounded-full h-5 w-5 border-2 border-muted border-t-primary mx-auto mb-2" />
                Buscando...
              </div>
            ) : (
              userResults.map((user) => (
                <button
                  key={user.user_id}
                  onClick={() => handleUserClick(user.user_id)}
                  className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-muted/50 transition-colors text-left"
                >
                  <Avatar className="h-9 w-9 border-2 border-primary/20">
                    <AvatarImage src={user.avatar_url} alt={user.display_name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-bold">
                      {(user.display_name || 'U').charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {user.display_name || 'Usuário'}
                    </p>
                    {user.location && (
                      <p className="text-xs text-muted-foreground truncate">
                        {user.location}
                      </p>
                    )}
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                </button>
              ))
            )}
            {!isSearchingUsers && userResults.length === 0 && (
              <div className="px-3 py-4 text-center text-muted-foreground text-sm">
                Nenhum usuário encontrado
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <CartProvider>
      <SearchProvider>
        <DashboardLayoutContent>{children}</DashboardLayoutContent>
      </SearchProvider>
    </CartProvider>
  );
}
