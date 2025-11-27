'use client';

import { useState, useEffect } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { getUserDetails, updateUserAdmin } from './user-actions';
import { Loader2, Save, User, Mail, MapPin, Phone, Shield, Ban, History, ShoppingBag, Package } from 'lucide-react';
import { formatCurrency, formatDateTime } from '@/lib/format';

interface UserDetailSheetProps {
  userId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function UserDetailSheet({ userId, isOpen, onClose, onUpdate }: UserDetailSheetProps) {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [data, setData] = useState<any>(null);
  const { toast } = useToast();

  // Form State
  const [formData, setFormData] = useState({
    display_name: '',
    role: '',
    reputation_score: 0,
    region: '',
    contact: '',
    is_banned: false
  });

  useEffect(() => {
    if (isOpen && userId) {
      fetchDetails();
    } else {
      setData(null); // Reset data on close
    }
  }, [isOpen, userId]);

  const fetchDetails = async () => {
    if (!userId) return;
    setLoading(true);
    const result = await getUserDetails(userId);
    
    if (result.error) {
      toast({
        title: 'Erro',
        description: 'Erro ao carregar detalhes do usuário.',
        variant: 'destructive'
      });
      onClose();
    } else {
      setData(result);
      setFormData({
        display_name: result.user.display_name,
        role: result.user.role,
        reputation_score: result.user.reputation_score,
        region: result.user.profile?.region || '',
        contact: result.user.profile?.contact || '',
        is_banned: !!result.user.banned_at
      });
    }
    setLoading(false);
  };

  const handleSave = async () => {
    if (!userId) return;
    setSaving(true);

    const result = await updateUserAdmin(userId, formData);

    if (result.error) {
      toast({
        title: 'Erro',
        description: 'Erro ao salvar alterações.',
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Sucesso',
        description: 'Usuário atualizado com sucesso.',
      });
      onUpdate();
      fetchDetails(); // Recarregar dados
    }
    setSaving(false);
  };

  if (!isOpen) return null;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto bg-white text-slate-900 p-0 border-l-2 border-poke-blue/20">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-8 w-8 animate-spin text-poke-blue" />
          </div>
        ) : data ? (
          <div className="flex flex-col h-full">
            {/* Header com Capa e Avatar */}
            <div className="relative bg-gradient-to-r from-poke-blue to-indigo-600 h-32 shrink-0">
              <div className="absolute -bottom-12 left-6 flex items-end gap-4">
                <Avatar className="h-24 w-24 border-4 border-white shadow-lg">
                  <AvatarImage src={data.user.profile?.avatar_url} />
                  <AvatarFallback className="text-2xl bg-slate-100 text-poke-blue font-bold">
                    {data.user.display_name.charAt(0).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="pb-1 mb-1">
                  <h2 className="text-2xl font-bold text-white drop-shadow-md flex items-center gap-2">
                    {formData.display_name}
                    {formData.is_banned && <Badge variant="destructive" className="text-xs">Banido</Badge>}
                  </h2>
                  <p className="text-white/90 text-sm font-medium drop-shadow-md">{data.user.email}</p>
                </div>
              </div>
            </div>

            <div className="mt-16 px-6 pb-6 flex-1">
              <Tabs defaultValue="profile" className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-3 mb-6">
                  <TabsTrigger value="profile">Perfil</TabsTrigger>
                  <TabsTrigger value="history">Histórico</TabsTrigger>
                  <TabsTrigger value="listings">Anúncios ({data.listings.length})</TabsTrigger>
                </TabsList>

                <TabsContent value="profile" className="space-y-6 flex-1">
                  <div className="grid gap-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="role">Função</Label>
                        <Select 
                          value={formData.role} 
                          onValueChange={(v) => setFormData({ ...formData, role: v })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a função" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="user">Usuário</SelectItem>
                            <SelectItem value="mod">Moderador</SelectItem>
                            <SelectItem value="admin">Administrador</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="reputation">Reputação</Label>
                        <Input 
                          id="reputation" 
                          type="number" 
                          value={formData.reputation_score}
                          onChange={(e) => setFormData({ ...formData, reputation_score: parseInt(e.target.value) })}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="name">Nome de Exibição</Label>
                      <Input 
                        id="name" 
                        value={formData.display_name}
                        onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="region">Região</Label>
                        <div className="relative">
                          <MapPin className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input 
                            id="region" 
                            value={formData.region}
                            onChange={(e) => setFormData({ ...formData, region: e.target.value })}
                            className="pl-8"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="contact">Contato</Label>
                        <div className="relative">
                          <Phone className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                          <Input 
                            id="contact" 
                            value={formData.contact}
                            onChange={(e) => setFormData({ ...formData, contact: e.target.value })}
                            className="pl-8"
                          />
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="status" className="text-red-600 font-semibold">Zona de Perigo</Label>
                      <div className="flex items-center gap-2 border border-red-100 bg-red-50 p-3 rounded-md">
                        <Ban className="h-5 w-5 text-red-600" />
                        <div className="flex-1">
                          <p className="text-sm font-medium text-red-900">Banir Usuário</p>
                          <p className="text-xs text-red-700">Impede o acesso à plataforma</p>
                        </div>
                        <Button 
                          variant={formData.is_banned ? "default" : "outline"}
                          size="sm"
                          className={formData.is_banned ? "bg-red-600 hover:bg-red-700" : "border-red-200 text-red-600 hover:bg-red-100"}
                          onClick={() => setFormData({ ...formData, is_banned: !formData.is_banned })}
                        >
                          {formData.is_banned ? "Desbanir" : "Banir"}
                        </Button>
                      </div>
                    </div>
                  </div>

                  <div className="pt-4">
                    <Button onClick={handleSave} disabled={saving} className="w-full bg-poke-blue hover:bg-poke-blue/90">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Salvar Alterações
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="history" className="space-y-4 h-full">
                  <ScrollArea className="h-[400px] pr-4">
                    {data.orders.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Nenhum pedido encontrado.</p>
                    ) : (
                      <div className="space-y-3">
                        {data.orders.map((order: any) => (
                          <div key={order.id} className="flex items-center justify-between p-3 border rounded-lg bg-slate-50">
                            <div className="flex items-center gap-3">
                              <div className={`p-2 rounded-full ${order.buyer_id === userId ? 'bg-blue-100 text-blue-600' : 'bg-green-100 text-green-600'}`}>
                                {order.buyer_id === userId ? <ShoppingBag className="h-4 w-4" /> : <History className="h-4 w-4" />}
                              </div>
                              <div>
                                <p className="text-sm font-medium">
                                  {order.buyer_id === userId ? 'Compra' : 'Venda'} #{order.order_number}
                                </p>
                                <p className="text-xs text-muted-foreground">{formatDateTime(order.created_at)}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-bold">{formatCurrency(order.total_amount)}</p>
                              <Badge variant="outline" className="text-[10px] h-5">{order.status}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="listings" className="space-y-4 h-full">
                  <ScrollArea className="h-[400px] pr-4">
                    {data.listings.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Nenhum anúncio encontrado.</p>
                    ) : (
                      <div className="grid grid-cols-1 gap-3">
                        {data.listings.map((listing: any) => (
                          <Card key={listing.id} className="overflow-hidden border hover:shadow-sm">
                            <CardContent className="p-3 flex items-center gap-3">
                              <div className="h-12 w-12 bg-slate-100 rounded-md flex items-center justify-center overflow-hidden">
                                {listing.photo_url ? (
                                  <img 
                                    src={listing.photo_url} 
                                    alt={listing.title} 
                                    className="h-full w-full object-cover"
                                    onError={(e) => {
                                      e.currentTarget.style.display = 'none';
                                    }}
                                  />
                                ) : null}
                                <Package className="h-6 w-6 text-slate-400" style={{ display: listing.photo_url ? 'none' : 'block' }} />
                              </div>
                              <div className="flex-1 min-w-0">
                                <h4 className="text-sm font-semibold truncate">{listing.title}</h4>
                                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                                  <Badge variant="secondary" className="text-[10px] h-5">{listing.category}</Badge>
                                  <span>{formatCurrency(listing.price_suggested)}</span>
                                </div>
                              </div>
                              <Badge className={listing.active ? "bg-green-500" : "bg-slate-500"}>
                                {listing.active ? "Ativo" : "Inativo"}
                              </Badge>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Usuário não encontrado
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
