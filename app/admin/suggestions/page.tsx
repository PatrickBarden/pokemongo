'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { 
  Lightbulb, 
  ThumbsUp, 
  MessageSquare, 
  Clock, 
  CheckCircle2,
  XCircle,
  Eye,
  Sparkles,
  Send,
  Filter,
  TrendingUp,
  AlertTriangle,
  Trash2,
  ChevronDown,
  RefreshCw,
  BarChart3
} from 'lucide-react';
import { 
  getAllSuggestions, 
  respondToSuggestion,
  updateSuggestionStatus,
  deleteSuggestion,
  getSuggestionStats,
  Suggestion 
} from '@/server/actions/suggestions';
import { useToast } from '@/hooks/use-toast';
import { formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { supabaseClient } from '@/lib/supabase-client';

const categories = [
  { value: 'geral', label: 'Geral', icon: Lightbulb },
  { value: 'interface', label: 'Interface', icon: Eye },
  { value: 'funcionalidade', label: 'Funcionalidade', icon: Sparkles },
  { value: 'bug', label: 'Bug', icon: XCircle },
  { value: 'outro', label: 'Outro', icon: MessageSquare },
];

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  reviewing: { label: 'Em Análise', color: 'bg-blue-100 text-blue-700', icon: Eye },
  approved: { label: 'Aprovada', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  implemented: { label: 'Implementada', color: 'bg-purple-100 text-purple-700', icon: Sparkles },
  rejected: { label: 'Rejeitada', color: 'bg-red-100 text-red-700', icon: XCircle },
};

const priorityConfig: Record<string, { label: string; color: string }> = {
  low: { label: 'Baixa', color: 'bg-slate-100 text-slate-600' },
  normal: { label: 'Normal', color: 'bg-blue-100 text-blue-600' },
  high: { label: 'Alta', color: 'bg-orange-100 text-orange-600' },
  urgent: { label: 'Urgente', color: 'bg-red-100 text-red-600' },
};

export default function AdminSuggestionsPage() {
  const [adminId, setAdminId] = useState<string>('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  
  // Modal state
  const [selectedSuggestion, setSelectedSuggestion] = useState<Suggestion | null>(null);
  const [responseText, setResponseText] = useState('');
  const [responseStatus, setResponseStatus] = useState('');
  const [responsePriority, setResponsePriority] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [suggestionToDelete, setSuggestionToDelete] = useState<string | null>(null);
  
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, [filterStatus, filterCategory]);

  const loadData = async () => {
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) setAdminId(user.id);
    
    const [suggestionsResult, statsResult] = await Promise.all([
      getAllSuggestions({ status: filterStatus, category: filterCategory }),
      getSuggestionStats()
    ]);
    
    setSuggestions(suggestionsResult.data);
    setStats(statsResult);
    setLoading(false);
  };

  const handleOpenResponse = (suggestion: Suggestion) => {
    setSelectedSuggestion(suggestion);
    setResponseText(suggestion.admin_response || '');
    setResponseStatus(suggestion.status);
    setResponsePriority(suggestion.priority);
  };

  const handleSubmitResponse = async () => {
    if (!selectedSuggestion || !responseText.trim()) {
      toast({
        title: 'Erro',
        description: 'Digite uma resposta.',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);
    
    const { success, error } = await respondToSuggestion(
      selectedSuggestion.id,
      adminId,
      responseText,
      responseStatus,
      responsePriority
    );

    if (success) {
      toast({
        title: 'Resposta enviada!',
        description: 'O usuário será notificado.',
      });
      setSelectedSuggestion(null);
      loadData();
    } else {
      toast({
        title: 'Erro',
        description: error || 'Erro ao enviar resposta',
        variant: 'destructive'
      });
    }
    
    setSubmitting(false);
  };

  const handleQuickStatusChange = async (suggestionId: string, status: string) => {
    const { success, error } = await updateSuggestionStatus(suggestionId, status);
    
    if (success) {
      toast({ title: 'Status atualizado!' });
      loadData();
    } else {
      toast({
        title: 'Erro',
        description: error || 'Erro ao atualizar status',
        variant: 'destructive'
      });
    }
  };

  const handleDelete = async () => {
    if (!suggestionToDelete) return;
    
    const { success, error } = await deleteSuggestion(suggestionToDelete);
    
    if (success) {
      toast({ title: 'Sugestão deletada!' });
      loadData();
    } else {
      toast({
        title: 'Erro',
        description: error || 'Erro ao deletar',
        variant: 'destructive'
      });
    }
    
    setDeleteDialogOpen(false);
    setSuggestionToDelete(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="relative w-10 h-10">
          <div className="w-10 h-10 border-3 border-slate-200 rounded-full"></div>
          <div className="w-10 h-10 border-3 border-poke-blue border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 flex items-center gap-3">
            <div className="p-2 bg-poke-yellow/20 rounded-xl">
              <Lightbulb className="h-6 w-6 text-poke-yellow" />
            </div>
            Sugestões dos Usuários
          </h1>
          <p className="text-slate-500 mt-1">
            Gerencie as sugestões e feedbacks da comunidade
          </p>
        </div>
        
        <Button onClick={loadData} variant="outline" className="rounded-xl">
          <RefreshCw className="h-4 w-4 mr-2" />
          Atualizar
        </Button>
      </div>

      {/* Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard label="Total" value={stats.total} icon={BarChart3} color="bg-slate-100 text-slate-600" />
          <StatCard label="Pendentes" value={stats.pending} icon={Clock} color="bg-yellow-100 text-yellow-600" />
          <StatCard label="Em Análise" value={stats.reviewing} icon={Eye} color="bg-blue-100 text-blue-600" />
          <StatCard label="Aprovadas" value={stats.approved} icon={CheckCircle2} color="bg-green-100 text-green-600" />
          <StatCard label="Implementadas" value={stats.implemented} icon={Sparkles} color="bg-purple-100 text-purple-600" />
          <StatCard label="Rejeitadas" value={stats.rejected} icon={XCircle} color="bg-red-100 text-red-600" />
        </div>
      )}

      {/* Filtros */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-white rounded-xl border border-slate-200">
        <Filter className="h-4 w-4 text-slate-400" />
        <Select value={filterStatus} onValueChange={setFilterStatus}>
          <SelectTrigger className="w-40 rounded-lg">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {Object.entries(statusConfig).map(([key, config]) => (
              <SelectItem key={key} value={key}>{config.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        
        <Select value={filterCategory} onValueChange={setFilterCategory}>
          <SelectTrigger className="w-40 rounded-lg">
            <SelectValue placeholder="Categoria" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas categorias</SelectItem>
            {categories.map((cat) => (
              <SelectItem key={cat.value} value={cat.value}>{cat.label}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Lista de sugestões */}
      <div className="space-y-4">
        {suggestions.length > 0 ? (
          suggestions.map((suggestion) => {
            const status = statusConfig[suggestion.status];
            const priority = priorityConfig[suggestion.priority];
            const StatusIcon = status?.icon || Clock;
            const categoryInfo = categories.find(c => c.value === suggestion.category);
            
            return (
              <div 
                key={suggestion.id} 
                className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
              >
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      {/* Badges */}
                      <div className="flex items-center gap-2 flex-wrap mb-2">
                        <Badge className={cn("border-0", status?.color)}>
                          <StatusIcon className="h-3 w-3 mr-1" />
                          {status?.label}
                        </Badge>
                        <Badge className={cn("border-0", priority?.color)}>
                          {priority?.label}
                        </Badge>
                        <Badge variant="outline" className="text-slate-600">
                          {categoryInfo?.label}
                        </Badge>
                        <Badge variant="outline" className="text-slate-500">
                          <ThumbsUp className="h-3 w-3 mr-1" />
                          {suggestion.votes_count} votos
                        </Badge>
                      </div>
                      
                      {/* Título */}
                      <h3 className="font-semibold text-slate-900 mb-1">{suggestion.title}</h3>
                      
                      {/* Descrição */}
                      <p className="text-sm text-slate-600 mb-3">{suggestion.description}</p>
                      
                      {/* Meta */}
                      <div className="flex items-center gap-3 text-xs text-slate-500">
                        <span>
                          por <strong>{(suggestion.user as any)?.display_name || 'Usuário'}</strong>
                        </span>
                        <span>•</span>
                        <span>{(suggestion.user as any)?.email}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {formatRelativeTime(suggestion.created_at)}
                        </span>
                      </div>
                      
                      {/* Resposta existente */}
                      {suggestion.admin_response && (
                        <div className="mt-3 p-3 bg-poke-blue/5 rounded-lg border border-poke-blue/10">
                          <p className="text-sm text-slate-700">{suggestion.admin_response}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            Respondido {formatRelativeTime(suggestion.responded_at || '')}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Ações */}
                    <div className="flex flex-col gap-2">
                      <Button 
                        size="sm" 
                        onClick={() => handleOpenResponse(suggestion)}
                        className="bg-poke-blue hover:bg-poke-blue/90 rounded-lg"
                      >
                        <MessageSquare className="h-4 w-4 mr-1" />
                        Responder
                      </Button>
                      
                      <Select 
                        value={suggestion.status} 
                        onValueChange={(value) => handleQuickStatusChange(suggestion.id, value)}
                      >
                        <SelectTrigger className="h-8 text-xs rounded-lg">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {Object.entries(statusConfig).map(([key, config]) => (
                            <SelectItem key={key} value={key}>{config.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      <Button 
                        size="sm" 
                        variant="ghost"
                        className="text-red-500 hover:text-red-600 hover:bg-red-50 rounded-lg"
                        onClick={() => {
                          setSuggestionToDelete(suggestion.id);
                          setDeleteDialogOpen(true);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        ) : (
          <div className="text-center py-12 bg-white rounded-2xl border border-slate-100">
            <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lightbulb className="h-8 w-8 text-slate-400" />
            </div>
            <p className="text-slate-500">Nenhuma sugestão encontrada</p>
          </div>
        )}
      </div>

      {/* Modal de resposta */}
      <Dialog open={!!selectedSuggestion} onOpenChange={() => setSelectedSuggestion(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-poke-blue" />
              Responder Sugestão
            </DialogTitle>
          </DialogHeader>
          
          {selectedSuggestion && (
            <div className="space-y-4 mt-4">
              <div className="p-4 bg-slate-50 rounded-xl">
                <h4 className="font-medium text-slate-900 mb-1">{selectedSuggestion.title}</h4>
                <p className="text-sm text-slate-600">{selectedSuggestion.description}</p>
              </div>
              
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">Status</label>
                  <Select value={responseStatus} onValueChange={setResponseStatus}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(statusConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <label className="text-sm font-medium text-slate-700 mb-1.5 block">Prioridade</label>
                  <Select value={responsePriority} onValueChange={setResponsePriority}>
                    <SelectTrigger className="rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(priorityConfig).map(([key, config]) => (
                        <SelectItem key={key} value={key}>{config.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <div>
                <label className="text-sm font-medium text-slate-700 mb-1.5 block">Resposta</label>
                <Textarea
                  placeholder="Digite sua resposta para o usuário..."
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  className="rounded-xl min-h-[120px]"
                />
              </div>
              
              <Button 
                onClick={handleSubmitResponse} 
                disabled={submitting}
                className="w-full bg-poke-blue hover:bg-poke-blue/90 rounded-xl"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Enviar Resposta
                  </>
                )}
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Dialog de confirmação de delete */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Deletar Sugestão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja deletar esta sugestão? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-500 hover:bg-red-600">
              Deletar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Componente de card de estatística
function StatCard({ label, value, icon: Icon, color }: { label: string; value: number; icon: any; color: string }) {
  return (
    <div className="bg-white rounded-xl p-4 border border-slate-100">
      <div className={cn("w-8 h-8 rounded-lg flex items-center justify-center mb-2", color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="text-2xl font-bold text-slate-900">{value}</div>
      <div className="text-xs text-slate-500">{label}</div>
    </div>
  );
}
