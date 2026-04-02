'use client';

import { useEffect, useState, useCallback } from 'react';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  TicketPercent,
  Plus,
  Search,
  Copy,
  BarChart2,
  Pencil,
  CheckCircle2,
  XCircle,
  Loader2,
  Users,
  Percent,
  DollarSign,
  Gift,
} from 'lucide-react';
import {
  listCoupons,
  createCoupon,
  updateCoupon,
  getCouponStats,
  searchUsers,
  Coupon,
} from '@/server/actions/coupons';
import { formatCurrency } from '@/lib/format';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';

const EMPTY_FORM = {
  code: '',
  description: '',
  owner_id: '',
  owner_search: '',
  discount_type: 'percentage' as 'percentage' | 'fixed',
  discount_value: '',
  reward_type: 'fixed' as 'percentage' | 'fixed',
  reward_value: '',
  min_order_value: '',
  max_discount: '',
  max_uses: '',
  expires_at: '',
};

export default function CouponsPage() {
  const { toast } = useToast();
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [loading, setLoading] = useState(true);
  const [createOpen, setCreateOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [selectedCoupon, setSelectedCoupon] = useState<Coupon | null>(null);
  const [stats, setStats] = useState<any>(null);
  const [statsLoading, setStatsLoading] = useState(false);
  const [userResults, setUserResults] = useState<Array<{ id: string; display_name: string; email: string }>>([]);
  const [userSearching, setUserSearching] = useState(false);
  const [filterText, setFilterText] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    const data = await listCoupons();
    setCoupons(data);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleUserSearch = async (q: string) => {
    setForm(f => ({ ...f, owner_search: q }));
    if (q.length < 2) { setUserResults([]); return; }
    setUserSearching(true);
    const results = await searchUsers(q);
    setUserResults(results);
    setUserSearching(false);
  };

  const handleCreate = async () => {
    if (!form.code || !form.discount_value) {
      toast({ title: 'Preencha código e valor do desconto.', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const result = await createCoupon({
      code: form.code,
      description: form.description || undefined,
      owner_id: form.owner_id || null,
      discount_type: form.discount_type,
      discount_value: parseFloat(form.discount_value),
      reward_type: form.owner_id ? form.reward_type : null,
      reward_value: form.owner_id && form.reward_value ? parseFloat(form.reward_value) : 0,
      min_order_value: form.min_order_value ? parseFloat(form.min_order_value) : 0,
      max_discount: form.max_discount ? parseFloat(form.max_discount) : null,
      max_uses: form.max_uses ? parseInt(form.max_uses) : null,
      expires_at: form.expires_at || null,
    });
    setSaving(false);
    if (result.success) {
      toast({ title: `Cupom ${result.coupon?.code} criado!` });
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      setUserResults([]);
      load();
    } else {
      toast({ title: result.error || 'Erro ao criar cupom.', variant: 'destructive' });
    }
  };

  const handleToggleActive = async (coupon: Coupon) => {
    await updateCoupon(coupon.id, { active: !coupon.active });
    load();
  };

  const handleViewStats = async (coupon: Coupon) => {
    setSelectedCoupon(coupon);
    setStatsOpen(true);
    setStatsLoading(true);
    const data = await getCouponStats(coupon.id);
    setStats(data);
    setStatsLoading(false);
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast({ title: `Código ${code} copiado!` });
  };

  const filtered = coupons.filter(c =>
    !filterText ||
    c.code.toLowerCase().includes(filterText.toLowerCase()) ||
    (c.owner as any)?.display_name?.toLowerCase().includes(filterText.toLowerCase())
  );

  const totalStats = {
    active: coupons.filter(c => c.active).length,
    uses: coupons.reduce((a, c) => a + c.uses_count, 0),
    withOwner: coupons.filter(c => c.owner_id).length,
  };

  if (loading) return <div className="flex justify-center p-20"><LoadingSpinner /></div>;

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            <TicketPercent className="h-6 w-6 text-poke-blue" />
            Cupons & Influenciadores
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Crie cupons de desconto para usuários e influenciadores escalarem a plataforma.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)} className="bg-poke-blue hover:bg-poke-blue/90">
          <Plus className="h-4 w-4 mr-2" />
          Novo Cupom
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Cupons Ativos</p>
            <p className="text-2xl font-bold text-emerald-500">{totalStats.active}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Total de Usos</p>
            <p className="text-2xl font-bold text-poke-blue">{totalStats.uses}</p>
          </CardContent>
        </Card>
        <Card className="col-span-2 md:col-span-1">
          <CardContent className="pt-4 pb-3">
            <p className="text-xs text-muted-foreground">Com Influenciador</p>
            <p className="text-2xl font-bold text-purple-500">{totalStats.withOwner}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filtro */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Filtrar por código ou influenciador..."
          className="pl-9"
          value={filterText}
          onChange={e => setFilterText(e.target.value)}
        />
      </div>

      {/* Tabela */}
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead className="hidden md:table-cell">Influenciador</TableHead>
                <TableHead>Desconto</TableHead>
                <TableHead className="hidden sm:table-cell">Recompensa</TableHead>
                <TableHead className="hidden lg:table-cell">Usos</TableHead>
                <TableHead className="hidden lg:table-cell">Validade</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 && (
                <TableRow>
                  <TableCell colSpan={8} className="text-center py-10 text-muted-foreground">
                    Nenhum cupom encontrado.
                  </TableCell>
                </TableRow>
              )}
              {filtered.map(coupon => (
                <TableRow key={coupon.id}>
                  <TableCell>
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono font-bold text-poke-blue text-sm">{coupon.code}</span>
                      <button onClick={() => copyCode(coupon.code)} className="text-muted-foreground hover:text-foreground">
                        <Copy className="h-3.5 w-3.5" />
                      </button>
                    </div>
                    {coupon.description && (
                      <p className="text-xs text-muted-foreground truncate max-w-[160px]">{coupon.description}</p>
                    )}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {(coupon.owner as any)?.display_name ? (
                      <div>
                        <p className="text-sm font-medium">{(coupon.owner as any).display_name}</p>
                        <p className="text-xs text-muted-foreground">{(coupon.owner as any).email}</p>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-xs">Plataforma</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="font-mono">
                      {coupon.discount_type === 'percentage'
                        ? `${coupon.discount_value}%`
                        : formatCurrency(coupon.discount_value)}
                    </Badge>
                    {coupon.min_order_value > 0 && (
                      <p className="text-xs text-muted-foreground mt-0.5">
                        Mín. {formatCurrency(coupon.min_order_value)}
                      </p>
                    )}
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    {coupon.reward_value > 0 ? (
                      <Badge className="bg-purple-500/15 text-purple-600 font-mono">
                        {coupon.reward_type === 'percentage'
                          ? `${coupon.reward_value}%`
                          : formatCurrency(coupon.reward_value)}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground text-xs">—</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    <span className="font-medium">{coupon.uses_count}</span>
                    {coupon.max_uses && (
                      <span className="text-muted-foreground text-xs"> / {coupon.max_uses}</span>
                    )}
                  </TableCell>
                  <TableCell className="hidden lg:table-cell">
                    {coupon.expires_at
                      ? format(new Date(coupon.expires_at), 'dd/MM/yy', { locale: ptBR })
                      : <span className="text-muted-foreground text-xs">Sem validade</span>}
                  </TableCell>
                  <TableCell>
                    <Switch
                      checked={coupon.active}
                      onCheckedChange={() => handleToggleActive(coupon)}
                      className="data-[state=checked]:bg-emerald-500"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleViewStats(coupon)}
                      title="Ver estatísticas"
                    >
                      <BarChart2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Modal Criar Cupom */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TicketPercent className="h-5 w-5 text-poke-blue" />
              Criar Novo Cupom
            </DialogTitle>
            <DialogDescription>
              Crie cupons para a plataforma ou vincule a um influenciador.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Código */}
            <div className="space-y-1.5">
              <Label>Código do Cupom *</Label>
              <Input
                placeholder="Ex: INFLUENCER10"
                value={form.code}
                onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))}
                className="font-mono uppercase"
              />
            </div>

            {/* Descrição */}
            <div className="space-y-1.5">
              <Label>Descrição (opcional)</Label>
              <Textarea
                placeholder="Cupom de 10% para seguidores do João"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
                rows={2}
              />
            </div>

            {/* Influenciador */}
            <div className="space-y-1.5">
              <Label className="flex items-center gap-1.5">
                <Users className="h-3.5 w-3.5" />
                Influenciador (opcional)
              </Label>
              <div className="relative">
                <Input
                  placeholder="Buscar por nome ou email..."
                  value={form.owner_search}
                  onChange={e => handleUserSearch(e.target.value)}
                />
                {userSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
                )}
              </div>
              {userResults.length > 0 && (
                <div className="border rounded-md shadow-sm bg-background divide-y">
                  {userResults.map(u => (
                    <button
                      key={u.id}
                      className="w-full text-left px-3 py-2 hover:bg-muted text-sm"
                      onClick={() => {
                        setForm(f => ({ ...f, owner_id: u.id, owner_search: `${u.display_name} (${u.email})` }));
                        setUserResults([]);
                      }}
                    >
                      <span className="font-medium">{u.display_name}</span>
                      <span className="text-muted-foreground ml-2 text-xs">{u.email}</span>
                    </button>
                  ))}
                </div>
              )}
              {form.owner_id && (
                <div className="flex items-center justify-between p-2 bg-purple-500/10 rounded-md text-sm">
                  <span className="text-purple-600 font-medium">{form.owner_search}</span>
                  <button
                    className="text-muted-foreground hover:text-destructive text-xs"
                    onClick={() => setForm(f => ({ ...f, owner_id: '', owner_search: '' }))}
                  >
                    remover
                  </button>
                </div>
              )}
            </div>

            {/* Tipo de Desconto */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Tipo de Desconto *</Label>
                <Select
                  value={form.discount_type}
                  onValueChange={v => setForm(f => ({ ...f, discount_type: v as any }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="percentage">Percentual (%)</SelectItem>
                    <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Valor do Desconto *</Label>
                <div className="relative">
                  {form.discount_type === 'percentage'
                    ? <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    : <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  }
                  <Input
                    type="number"
                    min="0"
                    step="0.01"
                    className="pl-9"
                    placeholder={form.discount_type === 'percentage' ? '10' : '5.00'}
                    value={form.discount_value}
                    onChange={e => setForm(f => ({ ...f, discount_value: e.target.value }))}
                  />
                </div>
              </div>
            </div>

            {/* Limite de desconto (apenas % ) */}
            {form.discount_type === 'percentage' && (
              <div className="space-y-1.5">
                <Label>Desconto máximo em R$ (opcional)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="Ex: 50 — limita o desconto a R$50"
                  value={form.max_discount}
                  onChange={e => setForm(f => ({ ...f, max_discount: e.target.value }))}
                />
              </div>
            )}

            {/* Recompensa para o influenciador */}
            {form.owner_id && (
              <div className="p-3 border border-purple-300 rounded-md space-y-3 bg-purple-500/5">
                <p className="text-sm font-medium flex items-center gap-1.5 text-purple-600">
                  <Gift className="h-4 w-4" />
                  Recompensa para o Influenciador
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label>Tipo de Recompensa</Label>
                    <Select
                      value={form.reward_type}
                      onValueChange={v => setForm(f => ({ ...f, reward_type: v as any }))}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="fixed">Valor fixo (R$)</SelectItem>
                        <SelectItem value="percentage">% do desconto dado</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1.5">
                    <Label>Valor da Recompensa</Label>
                    <div className="relative">
                      {form.reward_type === 'percentage'
                        ? <Percent className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        : <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      }
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        className="pl-9"
                        placeholder="2.00"
                        value={form.reward_value}
                        onChange={e => setForm(f => ({ ...f, reward_value: e.target.value }))}
                      />
                    </div>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  Creditado na carteira do influenciador a cada uso confirmado.
                </p>
              </div>
            )}

            {/* Configurações extras */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label>Pedido Mínimo (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  value={form.min_order_value}
                  onChange={e => setForm(f => ({ ...f, min_order_value: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Limite de Usos</Label>
                <Input
                  type="number"
                  min="1"
                  placeholder="Ilimitado"
                  value={form.max_uses}
                  onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))}
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label>Data de Validade (opcional)</Label>
              <Input
                type="datetime-local"
                value={form.expires_at}
                onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateOpen(false); setForm(EMPTY_FORM); setUserResults([]); }}>
              Cancelar
            </Button>
            <Button onClick={handleCreate} disabled={saving} className="bg-poke-blue hover:bg-poke-blue/90">
              {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Plus className="h-4 w-4 mr-2" />}
              Criar Cupom
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Estatísticas */}
      <Dialog open={statsOpen} onOpenChange={setStatsOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart2 className="h-5 w-5 text-poke-blue" />
              Estatísticas — {selectedCoupon?.code}
            </DialogTitle>
          </DialogHeader>

          {statsLoading ? (
            <div className="flex justify-center py-10"><LoadingSpinner /></div>
          ) : stats ? (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <Card>
                  <CardContent className="pt-3 pb-2 text-center">
                    <p className="text-xs text-muted-foreground">Total de Usos</p>
                    <p className="text-2xl font-bold text-poke-blue">{stats.totalUses}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-3 pb-2 text-center">
                    <p className="text-xs text-muted-foreground">Total Descontado</p>
                    <p className="text-xl font-bold text-emerald-500">{formatCurrency(stats.totalDiscount)}</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-3 pb-2 text-center">
                    <p className="text-xs text-muted-foreground">Recompensas Pagas</p>
                    <p className="text-xl font-bold text-purple-500">{formatCurrency(stats.totalReward)}</p>
                  </CardContent>
                </Card>
              </div>

              {stats.recentUsages.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Últimos usos</h3>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Usuário</TableHead>
                        <TableHead>Desconto</TableHead>
                        <TableHead>Recompensa</TableHead>
                        <TableHead>Data</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {stats.recentUsages.map((u: any) => (
                        <TableRow key={u.id}>
                          <TableCell>
                            <p className="text-sm font-medium">{u.used_by_user?.display_name}</p>
                            <p className="text-xs text-muted-foreground">{u.used_by_user?.email}</p>
                          </TableCell>
                          <TableCell className="font-mono text-emerald-600">{formatCurrency(u.discount_amount)}</TableCell>
                          <TableCell className="font-mono text-purple-600">
                            {u.reward_amount > 0 ? formatCurrency(u.reward_amount) : '—'}
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {format(new Date(u.created_at), "dd/MM 'às' HH:mm", { locale: ptBR })}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
