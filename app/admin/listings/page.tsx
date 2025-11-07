'use client';

import { useEffect, useState } from 'react';
import { DataTable } from '@/components/data-table';
import { Badge } from '@/components/ui/badge';
import { supabase } from '@/lib/supabase';
import { ColumnDef } from '@tanstack/react-table';
import { formatCurrency, formatDateTime } from '@/lib/format';

type Listing = {
  id: string;
  title: string;
  category: string;
  price_suggested: number;
  active: boolean;
  created_at: string;
  owner: { display_name: string } | null;
};

const columns: ColumnDef<Listing>[] = [
  {
    accessorKey: 'title',
    header: 'Título',
  },
  {
    accessorKey: 'category',
    header: 'Categoria',
  },
  {
    accessorKey: 'owner',
    header: 'Proprietário',
    cell: ({ row }) => {
      const owner = row.getValue('owner') as any;
      return owner?.display_name || 'N/A';
    },
  },
  {
    accessorKey: 'price_suggested',
    header: 'Preço Sugerido',
    cell: ({ row }) => formatCurrency(row.getValue('price_suggested')),
  },
  {
    accessorKey: 'active',
    header: 'Status',
    cell: ({ row }) => {
      const active = row.getValue<boolean>('active');
      return active ? (
        <Badge variant="default">Ativo</Badge>
      ) : (
        <Badge variant="outline">Inativo</Badge>
      );
    },
  },
  {
    accessorKey: 'created_at',
    header: 'Criado em',
    cell: ({ row }) => formatDateTime(row.getValue('created_at')),
  },
];

export default function ListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchListings() {
      const { data } = await supabase
        .from('listings')
        .select('*, owner:owner_id(display_name)')
        .order('created_at', { ascending: false });

      if (data) {
        setListings(data as any);
      }
      setLoading(false);
    }

    fetchListings();
  }, []);

  if (loading) {
    return <div className="flex items-center justify-center h-64">Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Serviços</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie os serviços anunciados na plataforma
        </p>
      </div>

      <DataTable
        columns={columns}
        data={listings}
        searchKey="title"
        searchPlaceholder="Pesquisar por título..."
        exportFilename="servicos.csv"
      />
    </div>
  );
}
