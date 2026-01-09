'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Shield, 
  UserPlus, 
  Search, 
  MoreVertical, 
  Edit, 
  Trash2, 
  Eye,
  ShoppingBag,
  Users,
  MessageCircle,
  DollarSign,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { formatDateTime } from '@/lib/format';
import { 
  listModerators, 
  findUserByEmail, 
  createModerator, 
  updateModeratorPermissions, 
  removeModerator,
  type Moderator,
  type ModeratorPermissions
} from '@/server/actions/moderators';
import { supabaseClient } from '@/lib/supabase-client';

const defaultPermissions: ModeratorPermissions = {
  can_view_orders: true,
  can_manage_orders: false,
  can_resolve_disputes: false,
  can_view_users: true,
  can_ban_users: false,
  can_warn_users: true,
  can_view_listings: true,
  can_moderate_listings: true,
  can_delete_listings: false,
  can_view_chats: true,
  can_respond_chats: true,
  can_view_finances: false,
  can_process_payouts: false,
};

const permissionGroups = [
  {
    title: 'Pedidos',
    icon: ShoppingBag,
    permissions: [
      { key: 'can_view_orders', label: 'Visualizar pedidos' },
      { key: 'can_manage_orders', label: 'Gerenciar pedidos' },
      { key: 'can_resolve_disputes', label: 'Resolver disputas' },
    ]
  },
  {
    title: 'Usuários',
    icon: Users,
    permissions: [
      { key: 'can_view_users', label: 'Visualizar usuários' },
      { key: 'can_warn_users', label: 'Avisar usuários' },
      { key: 'can_ban_users', label: 'Banir usuários' },
    ]
  },
  {
    title: 'Anúncios',
    icon: Eye,
    permissions: [
      { key: 'can_view_listings', label: 'Visualizar anúncios' },
      { key: 'can_moderate_listings', label: 'Moderar anúncios' },
      { key: 'can_delete_listings', label: 'Excluir anúncios' },
    ]
  },
  {
    title: 'Chat',
    icon: MessageCircle,
    permissions: [
      { key: 'can_view_chats', label: 'Visualizar chats' },
      { key: 'can_respond_chats', label: 'Responder chats' },
    ]
  },
  {
    title: 'Finanças',
    icon: DollarSign,
    permissions: [
      { key: 'can_view_finances', label: 'Visualizar finanças' },
      { key: 'can_process_payouts', label: 'Processar pagamentos' },
    ]
  },
];

export default function ModeratorsPage() {
  const [moderators, setModerators] = useState<Moderator[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchEmail, setSearchEmail] = useState('');
  const [foundUser, setFoundUser] = useState<any>(null);
  const [searching, setSearching] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  
  // Dialog states
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedModerator, setSelectedModerator] = useState<Moderator | null>(null);
  
  // Form states
  const [permissions, setPermissions] = useState<ModeratorPermissions>(defaultPermissions);
  const [notes, setNotes] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) setCurrentUserId(user.id);
      
      // Usar API Route em vez de Server Action para evitar problemas de CORS
      const response = await fetch('/api/admin/moderators');
      const result = await response.json();
      setModerators(result.moderators || []);
    } catch (error) {
      console.error('Erro ao carregar moderadores:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearchUser = async () => {
    if (!searchEmail.trim()) return;
    
    setSearching(true);
    setFoundUser(null);
    
    try {
      const { user, error } = await findUserByEmail(searchEmail.trim());
      if (error) {
        toast.error(error);
      } else {
        setFoundUser(user);
      }
    } catch (error) {
      toast.error('Erro ao buscar usuário');
    } finally {
      setSearching(false);
    }
  };

  const handleCreateModerator = async () => {
    if (!foundUser) return;
    
    setProcessing(true);
    try {
      const result = await createModerator(foundUser.id, permissions, notes, currentUserId);
      if (result.success) {
        toast.success(`${foundUser.display_name} agora é moderador!`);
        setCreateDialogOpen(false);
        setFoundUser(null);
        setSearchEmail('');
        setPermissions(defaultPermissions);
        setNotes('');
        loadData();
      } else {
        toast.error(result.error || 'Erro ao criar moderador');
      }
    } catch (error) {
      toast.error('Erro ao criar moderador');
    } finally {
      setProcessing(false);
    }
  };

  const handleEditModerator = async () => {
    if (!selectedModerator) return;
    
    setProcessing(true);
    try {
      const result = await updateModeratorPermissions(selectedModerator.id, permissions, notes);
      if (result.success) {
        toast.success('Permissões atualizadas!');
        setEditDialogOpen(false);
        setSelectedModerator(null);
        loadData();
      } else {
        toast.error(result.error || 'Erro ao atualizar');
      }
    } catch (error) {
      toast.error('Erro ao atualizar permissões');
    } finally {
      setProcessing(false);
    }
  };

  const handleDeleteModerator = async () => {
    if (!selectedModerator) return;
    
    setProcessing(true);
    try {
      const result = await removeModerator(selectedModerator.id);
      if (result.success) {
        toast.success(`${selectedModerator.display_name} não é mais moderador`);
        setDeleteDialogOpen(false);
        setSelectedModerator(null);
        loadData();
      } else {
        toast.error(result.error || 'Erro ao remover');
      }
    } catch (error) {
      toast.error('Erro ao remover moderador');
    } finally {
      setProcessing(false);
    }
  };

  const openEditDialog = (mod: Moderator) => {
    setSelectedModerator(mod);
    if (mod.permissions) {
      setPermissions({
        can_view_orders: mod.permissions.can_view_orders,
        can_manage_orders: mod.permissions.can_manage_orders,
        can_resolve_disputes: mod.permissions.can_resolve_disputes,
        can_view_users: mod.permissions.can_view_users,
        can_ban_users: mod.permissions.can_ban_users,
        can_warn_users: mod.permissions.can_warn_users,
        can_view_listings: mod.permissions.can_view_listings,
        can_moderate_listings: mod.permissions.can_moderate_listings,
        can_delete_listings: mod.permissions.can_delete_listings,
        can_view_chats: mod.permissions.can_view_chats,
        can_respond_chats: mod.permissions.can_respond_chats,
        can_view_finances: mod.permissions.can_view_finances,
        can_process_payouts: mod.permissions.can_process_payouts,
      });
      setNotes(mod.permissions.notes || '');
    } else {
      setPermissions(defaultPermissions);
      setNotes('');
    }
    setEditDialogOpen(true);
  };

  const countActivePermissions = (perms?: ModeratorPermissions) => {
    if (!perms) return 0;
    return Object.values(perms).filter(v => v === true).length;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <Loader2 className="h-8 w-8 animate-spin text-poke-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-poke-blue" />
            Moderadores
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            Gerencie a equipe de moderação da plataforma
          </p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)} className="bg-poke-blue hover:bg-poke-blue/90">
          <UserPlus className="h-4 w-4 mr-2" />
          Novo Moderador
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-500/10 rounded-lg flex items-center justify-center">
                <Shield className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{moderators.length}</p>
                <p className="text-xs text-muted-foreground">Total de Mods</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-emerald-500/10 rounded-lg flex items-center justify-center">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{moderators.filter(m => m.permissions).length}</p>
                <p className="text-xs text-muted-foreground">Configurados</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-purple-500/10 rounded-lg flex items-center justify-center">
                <Eye className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {moderators.filter(m => m.permissions?.can_resolve_disputes).length}
                </p>
                <p className="text-xs text-muted-foreground">Podem Resolver Disputas</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-amber-500/10 rounded-lg flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {moderators.filter(m => m.permissions?.can_ban_users).length}
                </p>
                <p className="text-xs text-muted-foreground">Podem Banir</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Moderadores */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Equipe de Moderação</CardTitle>
        </CardHeader>
        <CardContent>
          {moderators.length > 0 ? (
            <div className="space-y-3">
              {moderators.map((mod, index) => (
                <motion.div
                  key={mod.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="flex items-center justify-between p-4 bg-muted/50 rounded-xl hover:bg-muted transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-poke-blue/10 rounded-full flex items-center justify-center">
                      <Shield className="h-5 w-5 text-poke-blue" />
                    </div>
                    <div>
                      <p className="font-semibold text-foreground">{mod.display_name}</p>
                      <p className="text-sm text-muted-foreground">{mod.email}</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="hidden sm:block text-right">
                      <Badge variant="outline" className="mb-1">
                        {countActivePermissions(mod.permissions as ModeratorPermissions)} permissões
                      </Badge>
                      <p className="text-xs text-muted-foreground">
                        Desde {formatDateTime(mod.created_at).split(',')[0]}
                      </p>
                    </div>
                    
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openEditDialog(mod)}>
                          <Edit className="h-4 w-4 mr-2" />
                          Editar Permissões
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => { setSelectedModerator(mod); setDeleteDialogOpen(true); }}
                          className="text-red-600"
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Remover Moderador
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Shield className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-medium text-foreground">Nenhum moderador cadastrado</p>
              <p className="text-sm text-muted-foreground mt-1">
                Adicione moderadores para ajudar na gestão da plataforma
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Criar Moderador */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-poke-blue" />
              Novo Moderador
            </DialogTitle>
            <DialogDescription>
              Busque um usuário por email para promovê-lo a moderador
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Busca de usuário */}
            <div className="space-y-3">
              <Label>Buscar Usuário</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="Digite o email do usuário..."
                  value={searchEmail}
                  onChange={(e) => setSearchEmail(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearchUser()}
                />
                <Button onClick={handleSearchUser} disabled={searching}>
                  {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </Button>
              </div>
              
              {foundUser && (
                <div className="flex items-center gap-3 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-lg">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <div>
                    <p className="font-medium">{foundUser.display_name}</p>
                    <p className="text-sm text-muted-foreground">{foundUser.email}</p>
                  </div>
                </div>
              )}
            </div>

            {foundUser && (
              <>
                {/* Permissões */}
                <div className="space-y-4">
                  <Label>Permissões</Label>
                  {permissionGroups.map((group) => (
                    <div key={group.title} className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <group.icon className="h-4 w-4" />
                        {group.title}
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6">
                        {group.permissions.map((perm) => (
                          <div key={perm.key} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                            <Label className="text-sm cursor-pointer">{perm.label}</Label>
                            <Switch
                              checked={permissions[perm.key as keyof ModeratorPermissions]}
                              onCheckedChange={(checked) => 
                                setPermissions(prev => ({ ...prev, [perm.key]: checked }))
                              }
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Notas */}
                <div className="space-y-2">
                  <Label>Observações (opcional)</Label>
                  <Textarea
                    placeholder="Adicione notas sobre este moderador..."
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                  />
                </div>
              </>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCreateModerator} 
              disabled={!foundUser || processing}
              className="bg-poke-blue hover:bg-poke-blue/90"
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Criar Moderador
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Editar Permissões */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit className="h-5 w-5 text-poke-blue" />
              Editar Permissões
            </DialogTitle>
            <DialogDescription>
              {selectedModerator?.display_name} ({selectedModerator?.email})
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-4">
            {/* Permissões */}
            <div className="space-y-4">
              {permissionGroups.map((group) => (
                <div key={group.title} className="space-y-2">
                  <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
                    <group.icon className="h-4 w-4" />
                    {group.title}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pl-6">
                    {group.permissions.map((perm) => (
                      <div key={perm.key} className="flex items-center justify-between p-2 bg-muted/50 rounded-lg">
                        <Label className="text-sm cursor-pointer">{perm.label}</Label>
                        <Switch
                          checked={permissions[perm.key as keyof ModeratorPermissions]}
                          onCheckedChange={(checked) => 
                            setPermissions(prev => ({ ...prev, [perm.key]: checked }))
                          }
                        />
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            {/* Notas */}
            <div className="space-y-2">
              <Label>Observações</Label>
              <Textarea
                placeholder="Adicione notas sobre este moderador..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={handleEditModerator} 
              disabled={processing}
              className="bg-poke-blue hover:bg-poke-blue/90"
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Confirmar Exclusão */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="h-5 w-5" />
              Remover Moderador
            </DialogTitle>
            <DialogDescription>
              Tem certeza que deseja remover <strong>{selectedModerator?.display_name}</strong> da equipe de moderação?
              O usuário voltará a ser um usuário comum.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDeleteModerator} 
              disabled={processing}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Sim, Remover
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
