'use client';

import { useEffect, useState } from 'react';
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
  Search,
  ChevronRight,
  Settings,
  HelpCircle,
  X,
  Lightbulb
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CartProvider, useCart } from '@/contexts/CartContext';
import { NotificationBell } from '@/components/NotificationBell';
import { useUnreadMessages } from '@/components/MessageBadge';
import { cn } from '@/lib/utils';

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

  const checkUser = async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();

    if (!user) {
      router.push('/login');
      return;
    }

    const { data: userData } = await supabaseClient
      .from('users')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    if ((userData as any)?.role === 'admin') {
      router.push('/admin');
      return;
    }

    setUser(userData);
    setUserId(user.id);
    await loadProfile(user.id);
    setLoading(false);
  };

  const loadProfile = async (userId?: string) => {
    try {
      const id = userId || user?.id;
      if (!id) return;
      
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('avatar_url')
        .eq('user_id', id)
        .maybeSingle();
      
      if (profile && (profile as any).avatar_url) {
        setAvatarUrl((profile as any).avatar_url);
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
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="relative w-10 h-10">
          <div className="w-10 h-10 border-3 border-slate-200 rounded-full"></div>
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
            ? "bg-poke-blue text-white shadow-lg shadow-poke-blue/25"
            : "text-slate-600 hover:bg-slate-100 hover:text-slate-900",
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
      "hidden lg:flex flex-col bg-white border-r border-slate-200 transition-all duration-300",
      sidebarCollapsed ? "w-20" : "w-64"
    )}>
      {/* Header */}
      <div className={cn(
        "flex items-center h-16 border-b border-slate-100 px-4",
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
            "flex items-center gap-3 p-3 rounded-xl bg-gradient-to-r from-poke-blue/5 to-poke-yellow/5 hover:from-poke-blue/10 hover:to-poke-yellow/10 transition-all",
            sidebarCollapsed && "justify-center p-2"
          )}
        >
          <Avatar className="h-10 w-10 ring-2 ring-white shadow-md">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={user?.display_name || 'Avatar'} />}
            <AvatarFallback className="bg-gradient-to-br from-poke-blue to-poke-blue/80 text-white font-bold">
              {user?.display_name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          {!sidebarCollapsed && (
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-slate-900 truncate">{user?.display_name}</p>
              <p className="text-xs text-slate-500 truncate">{user?.email}</p>
            </div>
          )}
        </Link>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 space-y-1">
        {!sidebarCollapsed && (
          <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Principal
          </p>
        )}
        {mainNavigation.map((item) => (
          <NavItem key={item.name} item={item} collapsed={sidebarCollapsed} />
        ))}
        
        {!sidebarCollapsed && (
          <p className="px-3 py-2 mt-6 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Mais opções
          </p>
        )}
        {sidebarCollapsed && <div className="h-4" />}
        {secondaryNavigation.map((item) => (
          <NavItem key={item.name} item={item} collapsed={sidebarCollapsed} />
        ))}
      </nav>

      {/* Footer */}
      <div className={cn("p-4 border-t border-slate-100", sidebarCollapsed && "px-2")}>
        <Button
          variant="ghost"
          className={cn(
            "w-full text-slate-500 hover:text-red-600 hover:bg-red-50 rounded-xl",
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

  // Bottom Navigation Mobile
  const MobileBottomNav = () => (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-slate-200 px-2 pb-safe z-50">
      <div className="flex items-center justify-around h-16">
        {mainNavigation.map((item) => {
          const isActive = pathname === item.href;
          const hasNotification = (item.showBadge && itemCount > 0) || (item.showMessageBadge && unreadMessages > 0);
          
          return (
            <Link
              key={item.name}
              href={item.href}
              className={cn(
                "flex flex-col items-center justify-center flex-1 h-full relative transition-all",
                isActive ? "text-poke-blue" : "text-slate-400"
              )}
            >
              <div className="relative">
                <item.icon className={cn("h-6 w-6", isActive && "scale-110")} />
                {hasNotification && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full text-[10px] text-white font-bold flex items-center justify-center">
                    {item.showBadge ? itemCount : unreadMessages}
                  </span>
                )}
              </div>
              <span className={cn("text-[10px] mt-1 font-medium", isActive && "font-semibold")}>
                {item.name}
              </span>
              {isActive && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-8 h-1 bg-poke-blue rounded-b-full" />
              )}
            </Link>
          );
        })}
        
        {/* Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(true)}
          className="flex flex-col items-center justify-center flex-1 h-full text-slate-400"
        >
          <Menu className="h-6 w-6" />
          <span className="text-[10px] mt-1 font-medium">Menu</span>
        </button>
      </div>
    </nav>
  );

  // Mobile Menu Sheet
  const MobileMenuSheet = () => (
    <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
      <SheetContent side="left" className="w-80 bg-white p-0 [&>button]:hidden">
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-slate-100">
            <h2 className="font-semibold text-lg text-slate-900">Menu</h2>
            <button 
              onClick={() => setMobileMenuOpen(false)}
              className="p-2 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>

          {/* User Profile */}
          <Link
            href="/dashboard/profile"
            onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-3 p-3 m-4 rounded-2xl bg-gradient-to-r from-poke-blue/10 to-poke-yellow/10"
          >
            <Avatar className="h-11 w-11 ring-2 ring-white shadow-md flex-shrink-0">
              {avatarUrl && <AvatarImage src={avatarUrl} alt={user?.display_name || 'Avatar'} />}
              <AvatarFallback className="bg-gradient-to-br from-poke-blue to-poke-blue/80 text-white font-bold">
                {user?.display_name?.charAt(0).toUpperCase() || 'U'}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-semibold text-sm text-slate-900 truncate">{user?.display_name}</p>
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
                <div className="h-1.5 bg-slate-200 rounded-full overflow-hidden">
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
            <ChevronRight className="h-5 w-5 text-slate-400 flex-shrink-0" />
          </Link>

          {/* Navigation */}
          <nav className="flex-1 px-4 space-y-1 overflow-auto">
            <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Navegação
            </p>
            {secondaryNavigation.map((item) => (
              <NavItem key={item.name} item={item} />
            ))}
          </nav>

          {/* Footer Actions */}
          <div className="p-4 border-t border-slate-100 space-y-2">
            <Link
              href="/dashboard/profile"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100"
            >
              <Settings className="h-5 w-5" />
              <span>Configurações</span>
            </Link>
            <Link
              href="/help"
              onClick={() => setMobileMenuOpen(false)}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-600 hover:bg-slate-100"
            >
              <HelpCircle className="h-5 w-5" />
              <span>Ajuda</span>
            </Link>
            <Button
              variant="ghost"
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 rounded-xl"
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

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Desktop Sidebar */}
      <DesktopSidebar />

      {/* Mobile Menu */}
      <MobileMenuSheet />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Mobile Header */}
        <header className="lg:hidden bg-white border-b border-slate-200 px-4 py-2 flex items-center justify-between sticky top-0 z-40">
          <Logo size="sm" showText={false} />
          <div className="flex items-center gap-2">
            {userId && <NotificationBell userId={userId} />}
          </div>
        </header>

        {/* Desktop Header */}
        <header className="hidden lg:flex bg-white border-b border-slate-200 px-6 py-3 items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
              className="text-slate-500 hover:text-slate-900"
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                placeholder="Buscar Pokémon..."
                className="w-64 pl-10 pr-4 py-2 bg-slate-100 border-0 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-poke-blue/20"
              />
            </div>
          </div>
          <div className="flex items-center gap-4">
            {userId && <NotificationBell userId={userId} />}
            <Link href="/dashboard/profile">
              <Avatar className="h-9 w-9 cursor-pointer ring-2 ring-slate-100 hover:ring-poke-blue/50 transition-all">
                {avatarUrl && <AvatarImage src={avatarUrl} alt={user?.display_name || 'Avatar'} />}
                <AvatarFallback className="bg-gradient-to-br from-poke-blue to-poke-blue/80 text-white font-bold text-sm">
                  {user?.display_name?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Link>
          </div>
        </header>

        {/* Main Content Area */}
        <main className="flex-1 overflow-auto pb-20 lg:pb-0">
          <div className="p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto">
            {children}
          </div>
        </main>

        {/* Mobile Bottom Navigation */}
        <MobileBottomNav />
      </div>
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
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </CartProvider>
  );
}
