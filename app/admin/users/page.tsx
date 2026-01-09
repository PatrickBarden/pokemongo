'use client';

import { useEffect, useState, useMemo } from 'react';
import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabaseClient } from '@/lib/supabase-client';
import { ColumnDef } from '@tanstack/react-table';
import { formatDateTime } from '@/lib/format';
import { Shield, ShieldAlert, User, Ban, CheckCircle, MoreHorizontal, Eye } from 'lucide-react';
// Server Action removido - usando API Route
import { useToast } from '@/hooks/use-toast';
import { UserDetailSheet } from './user-detail-sheet';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

type UserData = {
  id: string;
  email: string;
  display_name: string;
  role: 'user' | 'admin' | 'mod';
  reputation_score: number;
  banned_at: string | null;
  created_at: string;
  profile?: {
    region: string | null;
    contact: string | null;
  } | null;
};

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      // Usar API Route em vez de Server Action
      const response = await fetch('/api/admin/users');
      const result = await response.json();

      if (result.users) {
        setUsers(result.users as any);
      } else if (result.error) {
        console.warn('Erro na API:', result.error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar a lista de usuários.",
          variant: "destructive",
        });
      }
    } catch (error: any) {
      console.error('Erro fatal ao buscar usuários:', error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar a lista de usuários.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const openUserDetail = (userId: string) => {
    setSelectedUserId(userId);
    setIsSheetOpen(true);
  };

  const columns = useMemo<ColumnDef<UserData>[]>(() => [
    {
      accessorKey: 'display_name',
      header: 'Nome',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-poke-blue/20 text-poke-blue font-semibold">
              {user.display_name.charAt(0).toUpperCase()}
            </div>
            <div className="flex flex-col">
              <span className="font-medium text-sm">{user.display_name}</span>
              <span className="text-xs text-muted-foreground hidden sm:inline">{user.email}</span>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'email',
      header: 'Email',
      cell: ({ row }) => <span className="text-xs">{row.getValue('email')}</span>
    },
    {
      accessorKey: 'role',
      header: 'Função',
      cell: ({ row }) => {
        const role = row.getValue<string>('role');
        const roleConfig = {
          admin: { label: 'Admin', icon: Shield, color: 'bg-red-500' },
          mod: { label: 'Moderador', icon: ShieldAlert, color: 'bg-orange-500' },
          user: { label: 'Usuário', icon: User, color: 'bg-blue-500' },
        };
        const config = roleConfig[role as keyof typeof roleConfig] || roleConfig.user;
        const Icon = config.icon;
        
        return (
          <Badge className={`${config.color} text-white border-0`}>
            <Icon className="h-3 w-3 mr-1" />
            {config.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'reputation_score',
      header: 'Reputação',
      cell: ({ row }) => {
        const score = row.getValue<number>('reputation_score');
        return (
          <div className="flex items-center gap-1">
            <span className="font-bold text-poke-yellow">{score}</span>
          </div>
        );
      },
    },
    {
      accessorKey: 'banned_at',
      header: 'Status',
      cell: ({ row }) => {
        const bannedAt = row.getValue<string | null>('banned_at');
        return bannedAt ? (
          <Badge variant="destructive" className="text-[10px] px-2">Banido</Badge>
        ) : (
          <Badge variant="outline" className="text-[10px] px-2 border-green-500 text-green-600 bg-green-50">Ativo</Badge>
        );
      },
    },
    {
      accessorKey: 'created_at',
      header: 'Cadastro',
      cell: ({ row }) => formatDateTime(row.getValue('created_at')),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const user = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Abrir menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Ações</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => openUserDetail(user.id)}>
                <Eye className="mr-2 h-4 w-4" />
                Ver Detalhes / Editar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ], []);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Usuários</h1>
          <p className="text-muted-foreground mt-1">
            Gerencie todos os usuários da plataforma
          </p>
        </div>
        <Badge variant="outline" className="border-poke-blue text-poke-blue">
          {users.length} usuários
        </Badge>
      </div>

      <DataTable
        columns={columns}
        data={users}
        searchKey="display_name"
        searchPlaceholder="Pesquisar por nome..."
        exportFilename="usuarios.csv"
      />

      <UserDetailSheet
        userId={selectedUserId}
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        onUpdate={() => {
          fetchUsers(); // Recarrega a lista após edição
        }}
      />
    </div>
  );
}
