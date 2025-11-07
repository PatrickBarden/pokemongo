'use client';

import { useState } from 'react';
import { LayoutDashboard, Store, ShoppingBag, Users, AlertTriangle, DollarSign, Webhook, BarChart3, Settings, LogOut, Menu, Shield } from 'lucide-react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Logo } from '@/components/Logo';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Mercado', href: '/admin/orders', icon: Store },
  { name: 'Troca', href: '/admin/listings', icon: ShoppingBag },
  { name: 'Usuários', href: '/admin/users', icon: Users },
  { name: 'Disputas', href: '/admin/disputes', icon: AlertTriangle },
  { name: 'Payouts', href: '/admin/payouts', icon: DollarSign },
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

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    router.push('/login');
  };

  // Componente de navegação reutilizável
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
                  ? 'bg-poke-blue text-white'
                  : 'text-white/80 hover:bg-white/10 hover:text-white'
              }`}
            >
              <item.icon className="h-5 w-5" />
              {item.name}
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
    <div className="flex h-screen bg-poke-gray">
      {/* Sidebar Desktop - Oculta em mobile */}
      <aside className="hidden lg:flex w-64 bg-poke-dark border-r border-poke-dark/50">
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
        <SheetContent side="left" className="w-64 bg-poke-dark border-poke-dark/50 p-0">
          <div className="flex flex-col h-full">
            <div className="px-6 py-4 border-b border-white/10">
              <Logo size="sm" showText={true} />
              <Badge className="mt-2 bg-red-500 text-white border-0">
                <Shield className="h-3 w-3 mr-1" />
                Admin
              </Badge>
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
          <Badge className="ml-auto bg-red-500 text-white border-0 text-xs">
            <Shield className="h-3 w-3 mr-1" />
            Admin
          </Badge>
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
