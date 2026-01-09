'use client';

import { useEffect, useState } from 'react';
import { supabaseClient } from '@/lib/supabase-client';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { 
  Lightbulb, 
  Plus, 
  ThumbsUp, 
  MessageSquare, 
  Clock, 
  CheckCircle2,
  XCircle,
  Eye,
  Sparkles,
  Send,
  ChevronDown,
  Filter,
  TrendingUp
} from 'lucide-react';
import { 
  createSuggestion, 
  getPublicSuggestions, 
  getUserSuggestions,
  voteSuggestion,
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
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const categories = [
  { value: 'geral', label: 'Geral', icon: Lightbulb },
  { value: 'interface', label: 'Interface', icon: Eye },
  { value: 'funcionalidade', label: 'Nova Funcionalidade', icon: Sparkles },
  { value: 'bug', label: 'Reportar Bug', icon: XCircle },
  { value: 'outro', label: 'Outro', icon: MessageSquare },
];

const statusConfig: Record<string, { label: string; color: string; icon: any }> = {
  pending: { label: 'Pendente', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  reviewing: { label: 'Em Análise', color: 'bg-blue-100 text-blue-700', icon: Eye },
  approved: { label: 'Aprovada', color: 'bg-green-100 text-green-700', icon: CheckCircle2 },
  implemented: { label: 'Implementada', color: 'bg-purple-100 text-purple-700', icon: Sparkles },
  rejected: { label: 'Rejeitada', color: 'bg-red-100 text-red-700', icon: XCircle },
};

export default function SuggestionsPage() {
  const [userId, setUserId] = useState<string>('');
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [mySuggestions, setMySuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'community' | 'mine'>('community');
  const [filterCategory, setFilterCategory] = useState('all');
  
  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('geral');
  
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (!user) {
        setLoading(false);
        return;
      }
      
      setUserId(user.id);
      
      const [publicResult, userResult] = await Promise.all([
        getPublicSuggestions(user.id),
        getUserSuggestions(user.id)
      ]);
      
      setSuggestions(publicResult.data || []);
      setMySuggestions(userResult.data || []);
    } catch (error) {
      console.error('Erro ao carregar sugestões:', error);
      setSuggestions([]);
      setMySuggestions([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async () => {
    if (!title.trim() || !description.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha o título e a descrição da sugestão.',
        variant: 'destructive'
      });
      return;
    }

    setSubmitting(true);
    
    const { data, error } = await createSuggestion({
      user_id: userId,
      title,
      description,
      category
    });

    if (error) {
      toast({
        title: 'Erro',
        description: error,
        variant: 'destructive'
      });
    } else {
      toast({
        title: 'Sugestão enviada!',
        description: 'Obrigado por contribuir com sua ideia.',
      });
      setTitle('');
      setDescription('');
      setCategory('geral');
      setDialogOpen(false);
      loadData();
    }
    
    setSubmitting(false);
  };

  const handleVote = async (suggestionId: string) => {
    const { success, voted, error } = await voteSuggestion(suggestionId, userId);
    
    if (success) {
      // Atualizar localmente
      setSuggestions(prev => prev.map(s => {
        if (s.id === suggestionId) {
          return {
            ...s,
            has_voted: voted,
            votes_count: voted ? s.votes_count + 1 : s.votes_count - 1
          };
        }
        return s;
      }));
    } else {
      toast({
        title: 'Erro',
        description: error || 'Erro ao votar',
        variant: 'destructive'
      });
    }
  };

  const filteredSuggestions = suggestions.filter(s => 
    filterCategory === 'all' || s.category === filterCategory
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[50vh]">
        <div className="relative w-10 h-10">
          <div className="w-10 h-10 border-3 border-border rounded-full"></div>
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
          <h1 className="text-2xl sm:text-3xl font-bold text-foreground flex items-center gap-3">
            <div className="p-2 bg-poke-yellow/20 rounded-xl">
              <Lightbulb className="h-6 w-6 text-poke-yellow" />
            </div>
            Sugestões
          </h1>
          <p className="text-muted-foreground mt-1">
            Compartilhe suas ideias para melhorar o aplicativo
          </p>
        </div>
        
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="bg-poke-blue hover:bg-poke-blue/90 rounded-xl shadow-lg shadow-poke-blue/25">
              <Plus className="h-4 w-4 mr-2" />
              Nova Sugestão
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-lg">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-poke-yellow" />
                Enviar Sugestão
              </DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 mt-4">
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Categoria
                </label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat.value} value={cat.value}>
                        <div className="flex items-center gap-2">
                          <cat.icon className="h-4 w-4" />
                          {cat.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Título
                </label>
                <Input
                  placeholder="Resumo da sua sugestão..."
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="rounded-xl"
                  maxLength={200}
                />
              </div>
              
              <div>
                <label className="text-sm font-medium text-foreground mb-1.5 block">
                  Descrição
                </label>
                <Textarea
                  placeholder="Descreva sua sugestão em detalhes..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="rounded-xl min-h-[120px]"
                />
              </div>
              
              <Button 
                onClick={handleSubmit} 
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
                    Enviar Sugestão
                  </>
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 pb-2">
        <button
          onClick={() => setActiveTab('community')}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            activeTab === 'community'
              ? "bg-poke-blue text-white"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          <TrendingUp className="h-4 w-4 inline mr-2" />
          Comunidade ({suggestions.length})
        </button>
        <button
          onClick={() => setActiveTab('mine')}
          className={cn(
            "px-4 py-2 rounded-lg text-sm font-medium transition-all",
            activeTab === 'mine'
              ? "bg-poke-blue text-white"
              : "text-muted-foreground hover:bg-muted"
          )}
        >
          <Lightbulb className="h-4 w-4 inline mr-2" />
          Minhas ({mySuggestions.length})
        </button>
      </div>

      {/* Filtros */}
      {activeTab === 'community' && (
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select value={filterCategory} onValueChange={setFilterCategory}>
            <SelectTrigger className="w-48 rounded-xl">
              <SelectValue placeholder="Filtrar por categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas as categorias</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Lista de sugestões */}
      <div className="space-y-4">
        {activeTab === 'community' ? (
          filteredSuggestions.length > 0 ? (
            filteredSuggestions.map((suggestion) => (
              <SuggestionCard 
                key={suggestion.id} 
                suggestion={suggestion} 
                onVote={handleVote}
                showVotes
              />
            ))
          ) : (
            <EmptyState message="Nenhuma sugestão encontrada" />
          )
        ) : (
          mySuggestions.length > 0 ? (
            mySuggestions.map((suggestion) => (
              <SuggestionCard 
                key={suggestion.id} 
                suggestion={suggestion}
                showResponse
              />
            ))
          ) : (
            <EmptyState message="Você ainda não enviou nenhuma sugestão" />
          )
        )}
      </div>
    </div>
  );
}

// Componente de card de sugestão
function SuggestionCard({ 
  suggestion, 
  onVote,
  showVotes = false,
  showResponse = false
}: { 
  suggestion: Suggestion; 
  onVote?: (id: string) => void;
  showVotes?: boolean;
  showResponse?: boolean;
}) {
  const status = statusConfig[suggestion.status];
  const StatusIcon = status?.icon || Clock;
  const categoryInfo = categories.find(c => c.value === suggestion.category);
  const CategoryIcon = categoryInfo?.icon || Lightbulb;

  return (
    <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-5">
        <div className="flex items-start gap-4">
          {/* Votos */}
          {showVotes && onVote && (
            <button
              onClick={() => onVote(suggestion.id)}
              className={cn(
                "flex flex-col items-center p-2 rounded-xl transition-all",
                suggestion.has_voted
                  ? "bg-poke-blue/10 text-poke-blue"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              )}
            >
              <ThumbsUp className={cn("h-5 w-5", suggestion.has_voted && "fill-current")} />
              <span className="text-sm font-bold mt-1">{suggestion.votes_count}</span>
            </button>
          )}
          
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-center gap-2 flex-wrap mb-2">
              <Badge className={cn("border-0", status?.color)}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {status?.label}
              </Badge>
              <Badge variant="outline" className="text-muted-foreground">
                <CategoryIcon className="h-3 w-3 mr-1" />
                {categoryInfo?.label}
              </Badge>
            </div>
            
            {/* Título */}
            <h3 className="font-semibold text-foreground mb-1">{suggestion.title}</h3>
            
            {/* Descrição */}
            <p className="text-sm text-muted-foreground mb-3 line-clamp-2">{suggestion.description}</p>
            
            {/* Meta */}
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              {suggestion.user && (
                <span>por {(suggestion.user as any).display_name}</span>
              )}
              <span className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                {formatRelativeTime(suggestion.created_at)}
              </span>
            </div>
          </div>
        </div>
        
        {/* Resposta do admin */}
        {showResponse && suggestion.admin_response && (
          <div className="mt-4 p-4 bg-poke-blue/5 rounded-xl border border-poke-blue/10">
            <div className="flex items-center gap-2 mb-2">
              <MessageSquare className="h-4 w-4 text-poke-blue" />
              <span className="text-sm font-medium text-poke-blue">Resposta da Equipe</span>
            </div>
            <p className="text-sm text-foreground">{suggestion.admin_response}</p>
            {suggestion.responded_at && (
              <p className="text-xs text-muted-foreground mt-2">
                Respondido {formatRelativeTime(suggestion.responded_at)}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// Estado vazio
function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center py-12 bg-card rounded-2xl border border-border">
      <div className="w-16 h-16 bg-muted rounded-2xl flex items-center justify-center mx-auto mb-4">
        <Lightbulb className="h-8 w-8 text-muted-foreground" />
      </div>
      <p className="text-muted-foreground">{message}</p>
    </div>
  );
}
