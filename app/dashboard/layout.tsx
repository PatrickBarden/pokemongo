'use client';

import { useEffect, useState } from 'react';
import { LayoutDashboard, Store, Wallet, LogOut, User, Menu, X, ShoppingCart, Package } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { CartProvider, useCart } from '@/contexts/CartContext';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Mercado', href: '/dashboard/market', icon: Store },
  { name: 'Carteira', href: '/dashboard/wallet', icon: Wallet },
  { name: 'Carrinho', href: '/dashboard/cart', icon: ShoppingCart, showBadge: true },
  { name: 'Pedidos', href: '/dashboard/orders', icon: Package },
];

function DashboardLayoutContent({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<any>(null);
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { itemCount } = useCart();

  useEffect(() => {
    checkUser();
    
    // Escutar mudanças na rota para atualizar o perfil
    const handleRouteChange = () => {
      if (pathname === '/dashboard/profile') {
        // Pequeno delay para garantir que o perfil foi salvo
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
    
    // Buscar avatar do perfil
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
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-poke-blue"></div>
      </div>
    );
  }

  // Componente de navegação reutilizável
  const NavigationContent = () => (
    <>
      <nav className="flex-1 p-4 space-y-1">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors relative ${
                isActive
                  ? 'bg-poke-blue text-white'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
              {item.showBadge && itemCount > 0 && (
                <Badge className="ml-auto bg-poke-yellow text-poke-dark border-0 h-5 min-w-[20px] flex items-center justify-center px-1.5">
                  {itemCount}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-2">
        <Link
          href="/dashboard/profile"
          onClick={() => setMobileMenuOpen(false)}
          className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            pathname === '/dashboard/profile'
              ? 'bg-poke-blue text-white'
              : 'text-white/80 hover:bg-white/10 hover:text-white'
          }`}
        >
          <Avatar className="h-8 w-8">
            {avatarUrl && <AvatarImage src={avatarUrl} alt={user?.display_name || 'Avatar'} />}
            <AvatarFallback className="bg-poke-blue text-white font-bold text-xs">
              {user?.display_name?.charAt(0).toUpperCase() || 'U'}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-sm truncate">{user?.display_name}</p>
            <p className="text-xs opacity-60 truncate">{user?.email}</p>
          </div>
        </Link>
        
        <Button
          variant="ghost"
          className="w-full justify-start text-white/80 hover:bg-white/10 hover:text-white"
          onClick={handleLogout}
        >
          <LogOut className="h-5 w-5 mr-3" />
          Sair
        </Button>
      </div>
    </>
  );

  return (
    <div className="flex h-screen bg-poke-gray">
      {/* Sidebar Desktop - Oculta em mobile */}
      <aside className="hidden lg:flex w-64 bg-poke-dark border-r border-poke-dark/50">
        <div className="flex flex-col h-full w-full">
          <div className="px-6 py-4 border-b border-white/10">
            <Logo size="sm" showText={true} />
          </div>
          <NavigationContent />
        </div>
      </aside>

      {/* Menu Mobile */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 bg-poke-dark border-poke-dark/50 p-0">
          <div className="flex flex-col h-full">
            <div className="px-6 py-4 border-b border-white/10">
              <Logo size="sm" showText={true} />
            </div>
            <NavigationContent />
          </div>
        </SheetContent>
      </Sheet>

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Header Mobile - Visível apenas em mobile */}
        <header className="lg:hidden bg-poke-dark border-b border-poke-dark/50 px-4 py-3 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            className="text-white hover:bg-white/10"
          >
            <Menu className="h-6 w-6" />
          </Button>
          <Logo size="sm" showText={true} />
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
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
