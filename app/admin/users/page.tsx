'use client';

import { useEffect, useState } from 'react';
import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { ColumnDef } from '@tanstack/react-table';
import { formatDateTime } from '@/lib/format';
import { Shield, ShieldAlert, User, Ban, CheckCircle } from 'lucide-react';

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

const columns: ColumnDef<UserData>[] = [
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
          <span className="font-medium">{user.display_name}</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'email',
    header: 'Email',
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
      const config = roleConfig[role as keyof typeof roleConfig];
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
        <div className="flex items-center gap-2">
          <span className="font-semibold text-poke-yellow">{score}</span>
          <span className="text-xs text-muted-foreground">pontos</span>
        </div>
      );
    },
  },
  {
    accessorKey: 'profile',
    header: 'Região',
    cell: ({ row }) => {
      const profile = row.getValue('profile') as any;
      return profile?.region || '-';
    },
  },
  {
    accessorKey: 'banned_at',
    header: 'Status',
    cell: ({ row }) => {
      const bannedAt = row.getValue<string | null>('banned_at');
      return bannedAt ? (
        <Badge variant="destructive">
          <Ban className="h-3 w-3 mr-1" />
          Banido
        </Badge>
      ) : (
        <Badge className="bg-green-500 text-white border-0">
          <CheckCircle className="h-3 w-3 mr-1" />
          Ativo
        </Badge>
      );
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Cadastro',
    cell: ({ row }) => formatDateTime(row.getValue('created_at')),
  },
];

export default function UsersPage() {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const { data } = await supabase
      .from('users')
      .select(`
        *,
        profile:profiles(region, contact)
      `)
      .order('created_at', { ascending: false });

    if (data) {
      setUsers(data as any);
    }
    setLoading(false);
  };

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
    </div>
  );
}
