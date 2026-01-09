'use client';

import { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  Store, 
  ShoppingBag, 
  Users, 
  AlertTriangle, 
  MessageCircle, 
  LogOut, 
  Menu, 
  Shield,
  Settings,
  X
} from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { ThemeToggle } from '@/components/theme-toggle';
import { getMyPermissions, type ModeratorPermissions } from '@/server/actions/moderators';

type NavItem = {
  name: string;
  href: string;
  icon: any;
  permissionKey?: keyof ModeratorPermissions;
};

const allNavigation: NavItem[] = [
  { name: 'Dashboard', href: '/moderator', icon: LayoutDashboard },
  { name: 'Pedidos', href: '/moderator/orders', icon: Store, permissionKey: 'can_view_orders' },
  { name: 'Anúncios', href: '/moderator/listings', icon: ShoppingBag, permissionKey: 'can_view_listings' },
  { name: 'Usuários', href: '/moderator/users', icon: Users, permissionKey: 'can_view_users' },
  { name: 'Disputas', href: '/moderator/disputes', icon: AlertTriangle, permissionKey: 'can_resolve_disputes' },
  { name: 'Mensagens', href: '/moderator/chat', icon: MessageCircle, permissionKey: 'can_view_chats' },
];

export default function ModeratorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [permissions, setPermissions] = useState<ModeratorPermissions | null>(null);
  const [loading, setLoading] = useState(true);
  const [userName, setUserName] = useState('');

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      // Verificar role do usuário
      const { data: userData } = await (supabaseClient as any)
        .from('users')
        .select('role, display_name')
        .eq('id', user.id)
        .single();

      if (!userData || (userData.role !== 'mod' && userData.role !== 'admin')) {
        router.push('/dashboard');
        return;
      }

      setUserName(userData.display_name);

      // Admin tem todas as permissões
      if (userData.role === 'admin') {
        setPermissions({
          can_view_orders: true,
          can_manage_orders: true,
          can_resolve_disputes: true,
          can_view_users: true,
          can_ban_users: true,
          can_warn_users: true,
          can_view_listings: true,
          can_moderate_listings: true,
          can_delete_listings: true,
          can_view_chats: true,
          can_respond_chats: true,
          can_view_finances: true,
          can_process_payouts: true,
        });
      } else {
        // Buscar permissões do moderador
        const perms = await getMyPermissions(user.id);
        if (!perms) {
          router.push('/dashboard');
          return;
        }
        setPermissions(perms);
      }
    } catch (error) {
      console.error('Erro ao verificar acesso:', error);
      router.push('/login');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    router.push('/login');
  };

  // Filtrar navegação baseado nas permissões
  const navigation = allNavigation.filter(item => {
    if (!item.permissionKey) return true;
    return permissions?.[item.permissionKey];
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const NavigationContent = () => (
    <>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigation.map((item) => {
          const isActive = pathname === item.href;
          
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={() => setMobileMenuOpen(false)}
              className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                isActive
                  ? 'bg-purple-600 text-white'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon className="h-5 w-5" />
              <span>{item.name}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/10 space-y-2">
        <div className="px-3 py-2 text-xs text-white/50">
          Logado como: <span className="text-white/70">{userName}</span>
        </div>
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
    <div className="flex h-screen bg-background">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:flex w-64 bg-gradient-to-b from-purple-900 to-purple-950 border-r border-purple-800/50">
        <div className="flex flex-col h-full w-full">
          <div className="px-6 py-4 border-b border-white/10">
            <Logo size="sm" showText={true} />
            <Badge className="mt-2 bg-purple-500 text-white border-0">
              <Shield className="h-3 w-3 mr-1" />
              Moderador
            </Badge>
          </div>
          <NavigationContent />
        </div>
      </aside>

      {/* Menu Mobile */}
      <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
        <SheetContent side="left" className="w-64 bg-gradient-to-b from-purple-900 to-purple-950 border-purple-800/50 p-0 [&>button]:hidden">
          <div className="flex flex-col h-full pt-12">
            {/* Header com botão fechar */}
            <div className="flex items-center justify-between px-4 pb-4 border-b border-white/10">
              <div>
                <Logo size="sm" showText={true} />
                <Badge className="mt-2 bg-purple-500 text-white border-0">
                  <Shield className="h-3 w-3 mr-1" />
                  Moderador
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
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header Desktop */}
        <header className="hidden lg:flex bg-card border-b border-border px-6 py-3 items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-purple-600 border-purple-300">
              <Shield className="h-3 w-3 mr-1" />
              Painel do Moderador
            </Badge>
          </div>
          <ThemeToggle />
        </header>

        {/* Header Mobile */}
        <header className="lg:hidden bg-gradient-to-r from-purple-900 to-purple-800 border-b border-purple-700/50 px-4 py-3 pt-10 flex items-center gap-3">
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
          <Badge className="ml-auto bg-purple-500 text-white border-0 text-xs">
            <Shield className="h-3 w-3 mr-1" />
            Mod
          </Badge>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden pb-6 lg:pb-0">
          <div className="p-4 sm:p-6 lg:p-8 max-w-full">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
