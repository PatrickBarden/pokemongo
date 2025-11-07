'use client';

import { LayoutDashboard, Store, ShoppingBag, Users, AlertTriangle, DollarSign, Webhook, BarChart3, Settings, LogOut } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabaseClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';

const navigation = [
  { name: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { name: 'Mercado', href: '/admin/orders', icon: Store },
  { name: 'Serviços', href: '/admin/listings', icon: ShoppingBag },
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

  const handleLogout = async () => {
    await supabaseClient.auth.signOut();
    router.push('/login');
  };

  return (
    <div className="flex h-screen bg-poke-gray">
      <aside className="w-64 bg-poke-dark border-r border-poke-dark/50">
        <div className="flex flex-col h-full">
          <div className="flex items-center gap-2 px-6 py-4 border-b border-white/10">
            <div className="h-8 w-8 rounded-full bg-poke-blue flex items-center justify-center text-white font-bold text-sm">
              PI
            </div>
            <div>
              <h1 className="font-semibold text-sm text-white">Plataforma</h1>
              <p className="text-xs text-white/60">Intermediação</p>
            </div>
          </div>

          <nav className="flex-1 p-4 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-white/80 hover:bg-white/10 hover:text-white transition-colors"
              >
                <item.icon className="h-5 w-5" />
                {item.name}
              </Link>
            ))}
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
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
