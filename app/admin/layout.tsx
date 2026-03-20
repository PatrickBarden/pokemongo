'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { LayoutDashboard, Store, ShoppingBag, Users, AlertTriangle, DollarSign, Webhook, BarChart3, Settings, LogOut, Menu, Shield, MessageCircle, Lightbulb, UserCog, Bell, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { getAdminUnreadCounts } from '@/server/actions/chat';
import { ThemeToggle } from '@/components/theme-toggle';

type NavItem = {
  name: string;
  href: string;
  icon: any;
  badgeKey?: string;
};

const navigation: NavItem[] = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Negociações', href: '/admin/negotiations', icon: DollarSign, badgeKey: 'negotiations' },
  { name: 'Mercado', href: '/admin/orders', icon: Store, badgeKey: 'orders' },
  { name: 'Anúncios', href: '/admin/listings', icon: ShoppingBag },
  { name: 'Usuários', href: '/admin/users', icon: Users },
  { name: 'Moderadores', href: '/admin/moderators', icon: UserCog },
  { name: 'Denúncias', href: '/admin/complaints', icon: Shield, badgeKey: 'complaints' },
  { name: 'Disputas', href: '/admin/disputes', icon: AlertTriangle, badgeKey: 'disputes' },
  { name: 'Mensagens', href: '/admin/chat', icon: MessageCircle, badgeKey: 'messages' },
  { name: 'Sugestões', href: '/admin/suggestions', icon: Lightbulb },
  { name: 'Push Notifications', href: '/admin/push-notifications', icon: Bell },
  { name: 'Webhooks', href: '/admin/webhooks', icon: Webhook },
  { name: 'Relatórios', href: '/admin/reports', icon: BarChart3 },
  { name: 'Configurações', href: '/admin/settings', icon: Settings },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [badges, setBadges] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const authChecked = useRef(false);

  const loadBadges = useCallback(async () => {
    try {
      const result = await getAdminUnreadCounts();
      setBadges(prev => ({
        ...prev,
        messages: result?.totalUnread || 0
      }));
    } catch (error) {
      console.log('Badges não disponíveis');
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    const scheduleLoad = () => {
      if (cancelled) return;
      loadBadges();
    };

    const browserWindow = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number;
      cancelIdleCallback?: (handle: number) => void;
    };

    if (browserWindow.requestIdleCallback) {
      const idleId = browserWindow.requestIdleCallback(scheduleLoad, { timeout: 1500 });
      const interval = browserWindow.setInterval(scheduleLoad, 120000);

      return () => {
        cancelled = true;
        browserWindow.clearInterval(interval);
        browserWindow.cancelIdleCallback?.(idleId);
      };
    }

    const timeout = browserWindow.setTimeout(scheduleLoad, 800);
    const interval = browserWindow.setInterval(scheduleLoad, 120000);

    return () => {
      cancelled = true;
      browserWindow.clearTimeout(timeout);
      browserWindow.clearInterval(interval);
    };
  }, [loadBadges]);

  useEffect(() => {
    if (authChecked.current) return;
    authChecked.current = true;

    const checkAdminAccess = async () => {
      try {
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser();

        if (authError || !user) {
          setLoading(false);
          router.replace('/login');
          return;
        }

        const { data: userData, error: userError } = await supabaseClient
          .from('users')
          .select('role')
          .eq('id', user.id)
          .maybeSingle();

        if (userError || (userData as any)?.role !== 'admin') {
          setLoading(false);
          router.replace('/dashboard');
          return;
        }

        setLoading(false);
      } catch (error) {
        console.error('Erro ao verificar acesso admin:', error);
        setLoading(false);
        router.replace('/login?error=admin_auth');
      }
    };

    checkAdminAccess();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    router.replace('/login');
  };

  if (loading) {
    return <LoadingSpinner fullScreen text="Carregando painel admin..." />;
  }

  // Componente de navegação reutilizável
  const NavigationContent = () => (
    <>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          const badgeCount = item.badgeKey ? badges[item.badgeKey] || 0 : 0;

          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${isActive
                  ? 'bg-poke-blue text-white'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
                }`}
            >
              <item.icon className="h-5 w-5" />
              <span className="flex-1">{item.name}</span>
              {badgeCount > 0 && (
                <Badge className="bg-red-500 text-white text-[10px] px-1.5 py-0 min-w-[20px] text-center animate-pulse">
                  {badgeCount > 99 ? '99+' : badgeCount}
                </Badge>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10">
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
    <div className="flex min-h-screen bg-background overflow-hidden">
      {/* Sidebar Desktop - Oculta em mobile */}
      <aside className="hidden lg:flex w-64 shrink-0 bg-poke-dark border-r border-poke-dark/50">
        <div className="flex flex-col h-full w-full">
          <div className="px-6 py-4 border-b border-white/10">
            <Logo size="sm" showText={true} />
            <Badge className="mt-2 bg-red-500 text-white border-0">
              <Shield className="h-3 w-3 mr-1" />
              Admin
            </Badge>
          </div>
          <NavigationContent />
        </div>
      </aside>

      {/* Menu Mobile */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 bg-poke-dark border-poke-dark/50 p-0 [&>button]:hidden">
          <div className="flex flex-col h-full pt-12">
            {/* Header com botão fechar */}
            <div className="flex items-center justify-between px-4 pb-4 border-b border-white/10">
              <div>
                <Logo size="sm" showText={true} />
                <Badge className="mt-2 bg-red-500 text-white border-0">
                  <Shield className="h-3 w-3 mr-1" />
                  Admin
                </Badge>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-3 rounded-xl bg-white/10 hover:bg-red-500/20 hover:text-red-400 transition-colors text-white/70"
                aria-label="Fechar menu"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <NavigationContent />
          </div>
        </SheetContent>
      </Sheet>

      {/* Conteúdo Principal */}
      <div className="flex-1 min-w-0 flex flex-col min-h-0">
        {/* Header Desktop - Visível apenas em desktop */}
        <header className="hidden lg:flex bg-card border-b border-border px-6 py-3 items-center justify-end sticky top-0 z-40">
          <ThemeToggle />
        </header>

        {/* Header Mobile - Visível apenas em mobile */}
        <header className="lg:hidden bg-poke-dark border-b border-poke-dark/50 px-4 py-3 pt-10 flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMobileMenuOpen(true)}
            className="text-white hover:bg-white/10 h-10 w-10 touch-target"
          >
            <Menu className="h-6 w-6" />
          </Button>
          <Logo size="sm" showText={true} />
          <ThemeToggle className="text-white" />
          <Badge className="ml-auto bg-red-500 text-white border-0 text-xs">
            <Shield className="h-3 w-3 mr-1" />
            Admin
          </Badge>
        </header>

        {/* Main Content */}
        <main className="flex-1 min-w-0 overflow-y-auto overflow-x-auto pb-6 lg:pb-0">
          <div className="mx-auto w-full min-w-0 max-w-7xl p-4 sm:p-6 lg:p-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
