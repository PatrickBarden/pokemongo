'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import {
  Users,
  Search,
  AlertTriangle,
  Ban,
  Loader2,
  Filter,
  CheckCircle2,
  Shield,
  Mail
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { supabaseClient } from '@/lib/supabase-client';
import { formatDateTime } from '@/lib/format';
import { toast } from 'sonner';
import { getMyPermissions, logModeratorAction, type ModeratorPermissions } from '@/server/actions/moderators';

interface User {
  id: string;
  email: string;
  display_name: string;
  role: string;
  reputation_score: number;
  banned_at: string | null;
  created_at: string;
}

export default function ModeratorUsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [permissions, setPermissions] = useState<ModeratorPermissions | null>(null);
  const [userId, setUserId] = useState('');

  // Dialog states
  const [warnDialogOpen, setWarnDialogOpen] = useState(false);
  const [banDialogOpen, setBanDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    loadData();
  }, [roleFilter]);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        setUserId(user.id);
        const perms = await getMyPermissions(user.id);
        setPermissions(perms);
      }

      let query = (supabaseClient as any)
        .from('users')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (roleFilter !== 'all') {
        query = query.eq('role', roleFilter);
      }

      const { data, error } = await query;

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error('Erro ao carregar usuários:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleWarnUser = async () => {
    if (!selectedUser || !reason.trim()) {
      toast.error('Informe o motivo do aviso');
      return;
    }

    setProcessing(true);
    try {
      // Reduzir reputação
      const newScore = Math.max(0, selectedUser.reputation_score - 10);

      await (supabaseClient as any)
        .from('users')
        .update({ reputation_score: newScore })
        .eq('id', selectedUser.id);

      // Registrar ação
      await logModeratorAction(
        userId,
        'warn_user',
        'user',
        selectedUser.id,
        `Avisou usuário ${selectedUser.display_name}: ${reason}`,
        { reason, old_score: selectedUser.reputation_score, new_score: newScore }
      );

      toast.success('Aviso enviado ao usuário');
      setWarnDialogOpen(false);
      setReason('');
      setSelectedUser(null);
      loadData();
    } catch (error) {
      toast.error('Erro ao enviar aviso');
    } finally {
      setProcessing(false);
    }
  };

  const handleBanUser = async () => {
    if (!selectedUser || !reason.trim()) {
      toast.error('Informe o motivo do banimento');
      return;
    }

    setProcessing(true);
    try {
      const isBanned = selectedUser.banned_at !== null;

      await (supabaseClient as any)
        .from('users')
        .update({
          banned_at: isBanned ? null : new Date().toISOString()
        })
        .eq('id', selectedUser.id);

      // Registrar ação
      await logModeratorAction(
        userId,
        isBanned ? 'unban_user' : 'ban_user',
        'user',
        selectedUser.id,
        `${isBanned ? 'Desbaniu' : 'Baniu'} usuário ${selectedUser.display_name}: ${reason}`,
        { reason }
      );

      toast.success(isBanned ? 'Usuário desbanido' : 'Usuário banido');
      setBanDialogOpen(false);
      setReason('');
      setSelectedUser(null);
      loadData();
    } catch (error) {
      toast.error('Erro ao processar banimento');
    } finally {
      setProcessing(false);
    }
  };

  const filteredUsers = users.filter(user => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      user.display_name?.toLowerCase().includes(searchLower) ||
      user.email?.toLowerCase().includes(searchLower)
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
          <Users className="h-6 w-6 text-purple-500" />
          Usuários
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Gerencie os usuários da plataforma
        </p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Buscar por nome ou email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={roleFilter} onValueChange={setRoleFilter}>
          <SelectTrigger className="w-full sm:w-[150px]">
            <Filter className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Função" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="user">Usuários</SelectItem>
            <SelectItem value="mod">Moderadores</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Lista */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {filteredUsers.length} usuário{filteredUsers.length !== 1 ? 's' : ''}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredUsers.length > 0 ? (
            <div className="space-y-3">
              {filteredUsers.map((user, index) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.02 }}
                  className={`flex items-center justify-between p-4 rounded-xl transition-colors ${user.banned_at ? 'bg-red-500/10 hover:bg-red-500/20' : 'bg-muted/50 hover:bg-muted'
                    }`}
                >
                  <div className="flex items-center gap-4">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${user.role === 'admin' ? 'bg-red-500/10' :
                        user.role === 'mod' ? 'bg-purple-500/10' : 'bg-blue-500/10'
                      }`}>
                      {user.role === 'admin' ? (
                        <Shield className="h-5 w-5 text-red-500" />
                      ) : user.role === 'mod' ? (
                        <Shield className="h-5 w-5 text-purple-500" />
                      ) : (
                        <Users className="h-5 w-5 text-blue-500" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="font-semibold text-foreground">{user.display_name}</p>
                        {user.banned_at && (
                          <Badge variant="destructive" className="text-xs">Banido</Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Mail className="h-3 w-3" />
                        {user.email}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-right hidden sm:block">
                      <Badge variant="outline">{user.role}</Badge>
                      <p className="text-xs text-muted-foreground mt-1">
                        Rep: {user.reputation_score}
                      </p>
                    </div>

                    {user.role === 'user' && (
                      <div className="flex gap-1">
                        {permissions?.can_warn_users && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setSelectedUser(user); setWarnDialogOpen(true); }}
                            title="Avisar"
                          >
                            <AlertTriangle className="h-4 w-4 text-amber-500" />
                          </Button>
                        )}
                        {permissions?.can_ban_users && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => { setSelectedUser(user); setBanDialogOpen(true); }}
                            title={user.banned_at ? 'Desbanir' : 'Banir'}
                          >
                            <Ban className={`h-4 w-4 ${user.banned_at ? 'text-emerald-500' : 'text-red-500'}`} />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="font-medium text-foreground">Nenhum usuário encontrado</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Dialog Avisar */}
      <Dialog open={warnDialogOpen} onOpenChange={setWarnDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-600">
              <AlertTriangle className="h-5 w-5" />
              Avisar Usuário
            </DialogTitle>
            <DialogDescription>
              Enviar um aviso para <strong>{selectedUser?.display_name}</strong>.
              Isso reduzirá 10 pontos de reputação.
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Motivo do aviso..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setWarnDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleWarnUser}
              disabled={processing}
              className="bg-amber-500 hover:bg-amber-600"
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Enviar Aviso
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog Banir */}
      <Dialog open={banDialogOpen} onOpenChange={setBanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Ban className="h-5 w-5" />
              {selectedUser?.banned_at ? 'Desbanir' : 'Banir'} Usuário
            </DialogTitle>
            <DialogDescription>
              {selectedUser?.banned_at
                ? `Desbanir ${selectedUser?.display_name}?`
                : `Banir ${selectedUser?.display_name} da plataforma?`
              }
            </DialogDescription>
          </DialogHeader>
          <Textarea
            placeholder="Motivo..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            rows={3}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setBanDialogOpen(false)}>
              Cancelar
            </Button>
            <Button
              variant={selectedUser?.banned_at ? 'default' : 'destructive'}
              onClick={handleBanUser}
              disabled={processing}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              {selectedUser?.banned_at ? 'Desbanir' : 'Banir'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
