'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ShoppingBag, 
  Search, 
  Eye,
  EyeOff,
  Loader2,
  Filter,
  CheckCircle2,
  XCircle
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { supabaseClient } from '@/lib/supabase-client';
import { formatCurrency, formatDateTime } from '@/lib/format';
import { toast } from 'sonner';
import { getMyPermissions, logModeratorAction, type ModeratorPermissions } from '@/server/actions/moderators';

interface Listing {
  id: string;
  title: string;
  description: string;
  category: string;
  price_suggested: number;
  active: boolean;
  created_at: string;
  owner: { display_name: string; email: string };
}

export default function ModeratorListingsPage() {
  const [listings, setListings] = useState<Listing[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [permissions, setPermissions] = useState<ModeratorPermissions | null>(null);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        setUserId(user.id);
        const perms = await getMyPermissions(user.id);
        setPermissions(perms);
      }

      let query = (supabaseClient as any)
        .from('listings')
        .select(`
          id,
          title,
          description,
          category,
          price_suggested,
          active,
          created_at,
          owner:owner_id(display_name, email)
        `)
        .order('created_at', { ascending: false })
        .limit(50);

      if (statusFilter === 'active') {
        query = query.eq('active', true);
      } else if (statusFilter === 'inactive') {
        query = query.eq('active', false);
      }

      const { data, error } = await query;

      if (error) throw error;
      setListings(data || []);
    } catch (error) {
      console.error('Erro ao carregar anúncios:', error);
    } finally {
      setLoading(false);
    }
  };

  const toggleListingStatus = async (listing: Listing) => {
    if (!permissions?.can_moderate_listings) {
      toast.error('Você não tem permissão para moderar anúncios');
      return;
    }

    try {
      const { error } = await (supabaseClient as any)
        .from('listings')
        .update({ active: !listing.active })
        .eq('id', listing.id);

      if (error) throw error;

      // Registrar ação
      await logModeratorAction(
        userId,
        listing.active ? 'deactivate_listing' : 'activate_listing',
        'listing',
        listing.id,
        `${listing.active ? 'Desativou' : 'Ativou'} anúncio: ${listing.title}`
      );

      toast.success(listing.active ? 'Anúncio desativado' : 'Anúncio ativado');
      loadData();
    } catch (error) {
      toast.error('Erro ao atualizar anúncio');
    }
  };

  const filteredListings = listings.filter(listing => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      listing.title?.toLowerCase().includes(searchLower) ||
      listing.owner?.display_name?.toLowerCase().includes(searchLower) ||
      listing.category?.toLowerCase().includes(searchLower)
    );
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-purple-500" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <ShoppingBag className="h-6 w-6 text-purple-500" />
          Anúncios
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Modere os anúncios da plataforma
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por título, vendedor ou categoria..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {filteredListings.length} anúncio{filteredListings.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredListings.length > 0 ? (
            <div className="space-y-3">
              {filteredListings.map((listing, index) => (
                <motion.div
                  key={listing.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.03 }}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${listing.active ? 'bg-emerald-500/10' : 'bg-gray-500/10'}`}>
                      {listing.active ? (
                        <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                      ) : (
                        <XCircle className="h-5 w-5 text-gray-500" />
                      )}
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{listing.title}</p>
                      <p className="text-sm text-muted-foreground">
                        {listing.owner?.display_name} • {listing.category}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="font-semibold">{formatCurrency(listing.price_suggested)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDateTime(listing.created_at).split(',')[0]}
                      </p>
                    </div>
                    <Badge variant={listing.active ? 'default' : 'secondary'}>
                      {listing.active ? 'Ativo' : 'Inativo'}
                    </Badge>
                    {permissions?.can_moderate_listings && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => toggleListingStatus(listing)}
                      >
                        {listing.active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </Button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <ShoppingBag className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-medium text-foreground">Nenhum anúncio encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
