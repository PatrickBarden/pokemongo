'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  AlertTriangle, 
  Search, 
  Eye,
  CheckCircle2,
  XCircle,
  Loader2,
  MessageCircle,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { supabaseClient } from '@/lib/supabase-client';
import { formatCurrency, formatDateTime, formatRelativeTime } from '@/lib/format';
import { toast } from 'sonner';
import Link from 'next/link';
import { getMyPermissions, logModeratorAction, type ModeratorPermissions } from '@/server/actions/moderators';

interface Dispute {
  id: string;
  order_number: string;
  status: string;
  total_amount: number;
  created_at: string;
  updated_at: string;
  buyer: { id: string; display_name: string; email: string };
  seller_id: string;
  listing: { title: string };
}

export default function ModeratorDisputesPage() {
  const [disputes, setDisputes] = useState<Dispute[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [permissions, setPermissions] = useState<ModeratorPermissions | null>(null);
  const [userId, setUserId] = useState('');
  
  // Dialog states
  const [resolveDialogOpen, setResolveDialogOpen] = useState(false);
  const [selectedDispute, setSelectedDispute] = useState<Dispute | null>(null);
  const [resolution, setResolution] = useState<'buyer' | 'seller' | 'split'>('buyer');
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        setUserId(user.id);
        const perms = await getMyPermissions(user.id);
        setPermissions(perms);
      }

      const { data, error } = await (supabaseClient as any)
        .from('orders')
        .select(`
          id,
          order_number,
          status,
          total_amount,
          created_at,
          updated_at,
          seller_id,
          buyer:buyer_id(id, display_name, email),
          listing:listing_id(title)
        `)
        .eq('status', 'DISPUTE')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setDisputes(data || []);
    } catch (error) {
      console.error('Erro ao carregar disputas:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleResolveDispute = async () => {
    if (!selectedDispute || !notes.trim()) {
      toast.error('Informe a resolução da disputa');
      return;
    }

    if (!permissions?.can_resolve_disputes) {
      toast.error('Você não tem permissão para resolver disputas');
      return;
    }

    setProcessing(true);
    try {
      // Atualizar status do pedido
      const newStatus = resolution === 'buyer' ? 'CANCELLED' : 'COMPLETED';
      
      await (supabaseClient as any)
        .from('orders')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', selectedDispute.id);

      // Registrar evento
      await (supabaseClient as any)
        .from('order_events')
        .insert({
          order_id: selectedDispute.id,
          type: 'DISPUTE_RESOLVED',
          actor_id: userId,
          data: {
            resolution,
            notes,
            resolved_by: 'moderator'
          }
        });

      // Registrar ação do moderador
      await logModeratorAction(
        userId,
        'resolve_dispute',
        'order',
        selectedDispute.id,
        `Resolveu disputa #${selectedDispute.order_number} a favor do ${
          resolution === 'buyer' ? 'comprador' : resolution === 'seller' ? 'vendedor' : 'ambos (dividido)'
        }`,
        { resolution, notes }
      );

      toast.success('Disputa resolvida com sucesso!');
      setResolveDialogOpen(false);
      setSelectedDispute(null);
      setNotes('');
      setResolution('buyer');
      loadData();
    } catch (error) {
      console.error('Erro ao resolver disputa:', error);
      toast.error('Erro ao resolver disputa');
    } finally {
      setProcessing(false);
    }
  };

  const filteredDisputes = disputes.filter(dispute => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      dispute.order_number?.toLowerCase().includes(searchLower) ||
      dispute.buyer?.display_name?.toLowerCase().includes(searchLower) ||
      dispute.listing?.title?.toLowerCase().includes(searchLower)
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
          <AlertTriangle className="h-6 w-6 text-red-500" />
          Disputas
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Resolva disputas entre compradores e vendedores
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <Card className="border-red-500/20">
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{disputes.length}</p>
                <p className="text-xs text-muted-foreground">Disputas Abertas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <Clock className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {disputes.length > 0 ? formatRelativeTime(disputes[0].updated_at) : '-'}
                </p>
                <p className="text-xs text-muted-foreground">Mais Antiga</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Busca */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Buscar por número do pedido, comprador ou produto..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-red-500" />
            {filteredDisputes.length} disputa{filteredDisputes.length !== 1 ? 's' : ''} pendente{filteredDisputes.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredDisputes.length > 0 ? (
            <div className="space-y-3">
              {filteredDisputes.map((dispute, index) => (
                <motion.div
                  key={dispute.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 bg-red-500/5 border border-red-500/20 rounded-xl hover:bg-red-500/10 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-red-500/10 rounded-lg flex items-center justify-center">
                      <AlertTriangle className="h-5 w-5 text-red-500" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">
                        Pedido #{dispute.order_number}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {dispute.listing?.title || 'Produto'}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Comprador: {dispute.buyer?.display_name}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-4">
                    <div className="text-right hidden sm:block">
                      <p className="font-semibold">{formatCurrency(dispute.total_amount)}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(dispute.updated_at)}
                      </p>
                    </div>
                    
                    <div className="flex gap-2">
                      <Link href={`/admin/orders/${dispute.id}`}>
                        <Button variant="outline" size="sm">
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                      </Link>
                      {permissions?.can_resolve_disputes && (
                        <Button 
                          size="sm"
                          onClick={() => { setSelectedDispute(dispute); setResolveDialogOpen(true); }}
                          className="bg-purple-600 hover:bg-purple-700"
                        >
                          <CheckCircle2 className="h-4 w-4 mr-1" />
                          Resolver
                        </Button>
                      )}
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mx-auto mb-4" />
              <p className="font-medium text-foreground">Nenhuma disputa aberta!</p>
              <p className="text-sm text-muted-foreground mt-1">
                Todas as disputas foram resolvidas 🎉
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Resolver Disputa */}
      <Dialog open={resolveDialogOpen} onOpenChange={setResolveDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-purple-500" />
              Resolver Disputa
            </DialogTitle>
            <DialogDescription>
              Pedido #{selectedDispute?.order_number} - {formatCurrency(selectedDispute?.total_amount || 0)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-3">
              <Label>Resolução</Label>
              <RadioGroup value={resolution} onValueChange={(v) => setResolution(v as any)}>
                <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                  <RadioGroupItem value="buyer" id="buyer" />
                  <Label htmlFor="buyer" className="flex-1 cursor-pointer">
                    <p className="font-medium">A favor do Comprador</p>
                    <p className="text-xs text-muted-foreground">Reembolso total ao comprador</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                  <RadioGroupItem value="seller" id="seller" />
                  <Label htmlFor="seller" className="flex-1 cursor-pointer">
                    <p className="font-medium">A favor do Vendedor</p>
                    <p className="text-xs text-muted-foreground">Pagamento liberado ao vendedor</p>
                  </Label>
                </div>
                <div className="flex items-center space-x-2 p-3 bg-muted/50 rounded-lg">
                  <RadioGroupItem value="split" id="split" />
                  <Label htmlFor="split" className="flex-1 cursor-pointer">
                    <p className="font-medium">Dividir</p>
                    <p className="text-xs text-muted-foreground">Reembolso parcial para ambos</p>
                  </Label>
                </div>
              </RadioGroup>
            </div>

            <div className="space-y-2">
              <Label>Justificativa</Label>
              <Textarea
                placeholder="Descreva o motivo da resolução..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setResolveDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleResolveDispute}
              disabled={processing || !notes.trim()}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Confirmar Resolução
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
