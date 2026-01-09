'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Bell, 
  Send, 
  Users, 
  Target, 
  Clock, 
  CheckCircle2, 
  XCircle,
  TrendingUp,
  Smartphone,
  Plus,
  History,
  Filter,
  Search,
  Loader2,
  MessageSquare,
  Megaphone
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { 
  sendPushToAll, 
  sendPushBySegment,
  listPushCampaigns,
  createPushCampaign
} from '@/server/actions/push-notifications';

interface Campaign {
  id: string;
  title: string;
  body: string;
  target_type: string;
  status: string;
  total_recipients: number;
  successful_sends: number;
  failed_sends: number;
  created_at: string;
  sent_at: string | null;
  created_by_user?: { display_name: string };
}

interface Stats {
  totalDevices: number;
  androidDevices: number;
  iosDevices: number;
  totalSent: number;
  deliveryRate: number;
}

export default function PushNotificationsPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [stats, setStats] = useState<Stats>({
    totalDevices: 0,
    androidDevices: 0,
    iosDevices: 0,
    totalSent: 0,
    deliveryRate: 0
  });
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showNewDialog, setShowNewDialog] = useState(false);
  
  // Form state
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [targetType, setTargetType] = useState<'all' | 'segment'>('all');
  const [segment, setSegment] = useState<string>('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const campaignsData = await listPushCampaigns(20);
      setCampaigns(campaignsData);
      
      // Calcular stats das campanhas
      const totalSent = campaignsData.reduce((acc, c) => acc + (c.successful_sends || 0), 0);
      const totalFailed = campaignsData.reduce((acc, c) => acc + (c.failed_sends || 0), 0);
      const deliveryRate = totalSent + totalFailed > 0 
        ? (totalSent / (totalSent + totalFailed)) * 100 
        : 0;
      
      setStats(prev => ({
        ...prev,
        totalSent,
        deliveryRate
      }));

      // Buscar stats de dispositivos via API
      const response = await fetch('/api/admin/push-stats');
      if (response.ok) {
        const deviceStats = await response.json();
        setStats(prev => ({
          ...prev,
          totalDevices: deviceStats.total || 0,
          androidDevices: deviceStats.android || 0,
          iosDevices: deviceStats.ios || 0
        }));
      }
    } catch (error) {
      console.error('Erro ao carregar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendNotification = async () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Preencha o título e a mensagem');
      return;
    }

    setSending(true);
    try {
      let result;
      
      if (targetType === 'all') {
        result = await sendPushToAll({ title, body });
      } else if (segment) {
        result = await sendPushBySegment(
          segment as 'sellers' | 'buyers' | 'verified_sellers' | 'new_users',
          { title, body }
        );
      } else {
        toast.error('Selecione um segmento');
        setSending(false);
        return;
      }

      if (result.success) {
        toast.success(`Notificação enviada para ${result.successCount} dispositivos!`);
        setShowNewDialog(false);
        setTitle('');
        setBody('');
        loadData();
      } else {
        toast.error(result.errors?.[0] || 'Erro ao enviar notificação');
      }
    } catch (error) {
      console.error('Erro ao enviar:', error);
      toast.error('Erro ao enviar notificação');
    } finally {
      setSending(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const config: Record<string, { label: string; className: string }> = {
      draft: { label: 'Rascunho', className: 'bg-muted text-muted-foreground' },
      scheduled: { label: 'Agendada', className: 'bg-blue-500/20 text-blue-500' },
      sending: { label: 'Enviando', className: 'bg-yellow-500/20 text-yellow-500' },
      sent: { label: 'Enviada', className: 'bg-green-500/20 text-green-500' },
      cancelled: { label: 'Cancelada', className: 'bg-red-500/20 text-red-500' }
    };
    const { label, className } = config[status] || config.draft;
    return <Badge className={className}>{label}</Badge>;
  };

  const getTargetLabel = (type: string) => {
    const labels: Record<string, string> = {
      all: 'Todos os usuários',
      segment: 'Segmento',
      specific_users: 'Usuários específicos'
    };
    return labels[type] || type;
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
            <Bell className="h-8 w-8 text-poke-blue" />
            Push Notifications
          </h1>
          <p className="text-muted-foreground mt-1">
            Envie notificações para os dispositivos dos usuários
          </p>
        </div>
        <Button onClick={() => setShowNewDialog(true)} className="gap-2">
          <Plus className="h-4 w-4" />
          Nova Notificação
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/20">
                <Smartphone className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalDevices}</p>
                <p className="text-xs text-muted-foreground">Dispositivos</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <div className="h-5 w-5 text-green-500 flex items-center justify-center font-bold text-xs">
                  A
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.androidDevices}</p>
                <p className="text-xs text-muted-foreground">Android</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-muted">
                <div className="h-5 w-5 text-muted-foreground flex items-center justify-center font-bold text-xs">
                  🍎
                </div>
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.iosDevices}</p>
                <p className="text-xs text-muted-foreground">iOS</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/20">
                <Send className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.totalSent}</p>
                <p className="text-xs text-muted-foreground">Enviadas</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-card border-border">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <TrendingUp className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">{stats.deliveryRate.toFixed(1)}%</p>
                <p className="text-xs text-muted-foreground">Taxa Entrega</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quick Send */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <Megaphone className="h-5 w-5 text-poke-blue" />
            Envio Rápido
          </CardTitle>
          <CardDescription>
            Envie uma notificação rápida para um segmento de usuários
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col gap-2"
              onClick={() => {
                setTargetType('all');
                setShowNewDialog(true);
              }}
            >
              <Users className="h-6 w-6 text-blue-500" />
              <span className="text-sm">Todos</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col gap-2"
              onClick={() => {
                setTargetType('segment');
                setSegment('sellers');
                setShowNewDialog(true);
              }}
            >
              <Target className="h-6 w-6 text-green-500" />
              <span className="text-sm">Vendedores</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col gap-2"
              onClick={() => {
                setTargetType('segment');
                setSegment('buyers');
                setShowNewDialog(true);
              }}
            >
              <Target className="h-6 w-6 text-purple-500" />
              <span className="text-sm">Compradores</span>
            </Button>
            <Button 
              variant="outline" 
              className="h-auto py-4 flex flex-col gap-2"
              onClick={() => {
                setTargetType('segment');
                setSegment('new_users');
                setShowNewDialog(true);
              }}
            >
              <Target className="h-6 w-6 text-orange-500" />
              <span className="text-sm">Novos Usuários</span>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Campaign History */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-foreground">
            <History className="h-5 w-5 text-poke-blue" />
            Histórico de Campanhas
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          ) : campaigns.length === 0 ? (
            <div className="text-center py-8">
              <Bell className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">Nenhuma campanha encontrada</p>
              <p className="text-sm text-muted-foreground">
                Envie sua primeira notificação push!
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {campaigns.map((campaign) => (
                <motion.div
                  key={campaign.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-4 bg-muted/30 rounded-xl border border-border"
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold text-foreground truncate">
                          {campaign.title}
                        </h4>
                        {getStatusBadge(campaign.status)}
                      </div>
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
                        {campaign.body}
                      </p>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Target className="h-3 w-3" />
                          {getTargetLabel(campaign.target_type)}
                        </span>
                        {campaign.sent_at && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {new Date(campaign.sent_at).toLocaleDateString('pt-BR')}
                          </span>
                        )}
                        {campaign.total_recipients > 0 && (
                          <>
                            <span className="flex items-center gap-1 text-green-500">
                              <CheckCircle2 className="h-3 w-3" />
                              {campaign.successful_sends}
                            </span>
                            {campaign.failed_sends > 0 && (
                              <span className="flex items-center gap-1 text-red-500">
                                <XCircle className="h-3 w-3" />
                                {campaign.failed_sends}
                              </span>
                            )}
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New Notification Dialog */}
      <Dialog open={showNewDialog} onOpenChange={setShowNewDialog}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-poke-blue" />
              Nova Notificação Push
            </DialogTitle>
            <DialogDescription>
              Preencha os dados da notificação que será enviada aos usuários
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Título</label>
              <Input
                placeholder="Ex: 🎉 Nova promoção!"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                maxLength={50}
              />
              <p className="text-xs text-muted-foreground">{title.length}/50 caracteres</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Mensagem</label>
              <Textarea
                placeholder="Ex: Confira as novidades do marketplace!"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={3}
                maxLength={200}
              />
              <p className="text-xs text-muted-foreground">{body.length}/200 caracteres</p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Destinatários</label>
              <Select value={targetType} onValueChange={(v) => setTargetType(v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o público" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os usuários</SelectItem>
                  <SelectItem value="segment">Segmento específico</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {targetType === 'segment' && (
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Segmento</label>
                <Select value={segment} onValueChange={setSegment}>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione o segmento" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sellers">Vendedores</SelectItem>
                    <SelectItem value="buyers">Compradores</SelectItem>
                    <SelectItem value="verified_sellers">Vendedores Verificados</SelectItem>
                    <SelectItem value="new_users">Novos Usuários (30 dias)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Preview */}
            <div className="space-y-2">
              <label className="text-sm font-medium text-foreground">Preview</label>
              <div className="p-4 bg-muted rounded-xl border border-border">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-lg bg-poke-blue flex items-center justify-center text-white font-bold">
                    TGP
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-foreground text-sm">
                      {title || 'Título da notificação'}
                    </p>
                    <p className="text-xs text-muted-foreground line-clamp-2">
                      {body || 'Mensagem da notificação aparecerá aqui'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowNewDialog(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSendNotification} disabled={sending}>
              {sending ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Enviando...
                </>
              ) : (
                <>
                  <Send className="h-4 w-4 mr-2" />
                  Enviar Agora
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
