'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  MessageCircle, 
  Search, 
  Loader2,
  Download,
  Eye,
  Users,
  Clock,
  FileText,
  X,
  Lock,
  Unlock,
  AlertTriangle
} from 'lucide-react';
import { 
  getAllConversations, 
  getConversationMessages,
  closeConversation,
  reopenConversation,
  ChatMessage
} from '@/server/actions/chat';
import { formatRelativeTime, formatDateTime } from '@/lib/format';
import { cn } from '@/lib/utils';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';

export default function AdminChatPage() {
  const [conversations, setConversations] = useState<any[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<any>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewModalOpen, setViewModalOpen] = useState(false);
  const [closeModalOpen, setCloseModalOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [adminId, setAdminId] = useState<string>('');

  useEffect(() => {
    loadConversations();
    loadAdminId();
  }, []);

  const loadAdminId = async () => {
    const { supabaseClient } = await import('@/lib/supabase-client');
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) setAdminId(user.id);
  };

  const loadConversations = async () => {
    const { data } = await getAllConversations();
    if (data) {
      setConversations(data);
    }
    setLoading(false);
  };

  const handleCloseConversation = async () => {
    if (!selectedConversation || !adminId) return;
    setActionLoading(true);
    const { success, error } = await closeConversation(selectedConversation.id, adminId);
    if (success) {
      await loadConversations();
      await loadMessages(selectedConversation.id);
      setCloseModalOpen(false);
    } else {
      alert('Erro ao encerrar: ' + error);
    }
    setActionLoading(false);
  };

  const handleReopenConversation = async (convId: string) => {
    setActionLoading(true);
    const { success, error } = await reopenConversation(convId);
    if (success) {
      await loadConversations();
      if (selectedConversation?.id === convId) {
        await loadMessages(convId);
      }
    } else {
      alert('Erro ao reabrir: ' + error);
    }
    setActionLoading(false);
  };

  const loadMessages = async (conversationId: string) => {
    setLoadingMessages(true);
    const { data } = await getConversationMessages(conversationId);
    if (data) {
      setMessages(data);
    }
    setLoadingMessages(false);
  };

  const openConversation = async (conv: any) => {
    setSelectedConversation(conv);
    await loadMessages(conv.id);
    setViewModalOpen(true);
  };

  const exportToPDF = () => {
    if (!selectedConversation || messages.length === 0) return;

    // Criar conteúdo HTML para o PDF
    const participant1 = selectedConversation.participants?.find((p: any) => p.id === selectedConversation.participant_1);
    const participant2 = selectedConversation.participants?.find((p: any) => p.id === selectedConversation.participant_2);

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Conversa - ${selectedConversation.id.slice(0, 8)}</title>
        <style>
          body { font-family: Arial, sans-serif; padding: 40px; max-width: 800px; margin: 0 auto; }
          .header { border-bottom: 2px solid #3B82F6; padding-bottom: 20px; margin-bottom: 30px; }
          .header h1 { color: #1E3A5F; margin: 0 0 10px 0; }
          .header p { color: #666; margin: 5px 0; }
          .participants { display: flex; gap: 40px; margin-bottom: 20px; }
          .participant { background: #f5f5f5; padding: 15px; border-radius: 8px; flex: 1; }
          .participant h3 { margin: 0 0 5px 0; color: #333; }
          .participant p { margin: 0; color: #666; font-size: 14px; }
          .messages { margin-top: 30px; }
          .message { margin-bottom: 15px; padding: 15px; border-radius: 8px; }
          .message.sent { background: #3B82F6; color: white; margin-left: 20%; }
          .message.received { background: #f0f0f0; margin-right: 20%; }
          .message.system { background: #FEF3C7; text-align: center; font-style: italic; }
          .message-header { display: flex; justify-content: space-between; margin-bottom: 8px; font-size: 12px; opacity: 0.8; }
          .message-content { line-height: 1.5; }
          .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; text-align: center; color: #999; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Histórico de Conversa</h1>
          <p><strong>ID:</strong> ${selectedConversation.id}</p>
          <p><strong>Assunto:</strong> ${selectedConversation.subject || 'Sem assunto'}</p>
          <p><strong>Status:</strong> ${selectedConversation.status}</p>
          <p><strong>Iniciada em:</strong> ${formatDateTime(selectedConversation.created_at)}</p>
        </div>

        <div class="participants">
          <div class="participant">
            <h3>Participante 1</h3>
            <p>${participant1?.display_name || 'N/A'}</p>
            <p>${participant1?.email || ''}</p>
          </div>
          <div class="participant">
            <h3>Participante 2</h3>
            <p>${participant2?.display_name || 'N/A'}</p>
            <p>${participant2?.email || ''}</p>
          </div>
        </div>

        <div class="messages">
          <h2>Mensagens (${messages.length})</h2>
          ${messages.map(msg => {
            const sender = selectedConversation.participants?.find((p: any) => p.id === msg.sender_id);
            const isSystem = msg.message_type === 'SYSTEM';
            return `
              <div class="message ${isSystem ? 'system' : msg.sender_id === selectedConversation.participant_1 ? 'sent' : 'received'}">
                <div class="message-header">
                  <span>${sender?.display_name || 'Sistema'}</span>
                  <span>${formatDateTime(msg.created_at)}</span>
                </div>
                <div class="message-content">${msg.content}</div>
              </div>
            `;
          }).join('')}
        </div>

        <div class="footer">
          <p>Exportado em ${formatDateTime(new Date().toISOString())} | Plataforma de Intermediação Pokémon GO</p>
        </div>
      </body>
      </html>
    `;

    // Abrir em nova janela para impressão/PDF
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
      setTimeout(() => {
        printWindow.print();
      }, 500);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    const p1Name = conv.participants?.find((p: any) => p.id === conv.participant_1)?.display_name || '';
    const p2Name = conv.participants?.find((p: any) => p.id === conv.participant_2)?.display_name || '';
    return p1Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           p2Name.toLowerCase().includes(searchTerm.toLowerCase()) ||
           conv.subject?.toLowerCase().includes(searchTerm.toLowerCase());
  });

  // Estatísticas
  const stats = {
    total: conversations.length,
    active: conversations.filter(c => c.status === 'ACTIVE').length,
    closed: conversations.filter(c => c.status === 'CLOSED').length,
    totalMessages: conversations.reduce((acc, c) => acc + (c.message_count || 0), 0)
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-poke-blue" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-poke-dark">Central de Mensagens</h1>
        <p className="text-muted-foreground mt-1">
          Monitore e gerencie todas as conversas da plataforma
        </p>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card className="border-l-4 border-l-poke-blue">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total de Conversas</p>
                <p className="text-2xl font-bold text-poke-blue">{stats.total}</p>
              </div>
              <MessageCircle className="h-8 w-8 text-poke-blue/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-green-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Ativas</p>
                <p className="text-2xl font-bold text-green-600">{stats.active}</p>
              </div>
              <Users className="h-8 w-8 text-green-500/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-slate-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Encerradas</p>
                <p className="text-2xl font-bold text-slate-600">{stats.closed}</p>
              </div>
              <Clock className="h-8 w-8 text-slate-500/30" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Total de Mensagens</p>
                <p className="text-2xl font-bold text-purple-600">{stats.totalMessages}</p>
              </div>
              <FileText className="h-8 w-8 text-purple-500/30" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filtro */}
      <Card>
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por participante ou assunto..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>
        </CardContent>
      </Card>

      {/* Tabela de Conversas */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <MessageCircle className="h-5 w-5" />
            Conversas ({filteredConversations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Participantes</TableHead>
                <TableHead>Assunto</TableHead>
                <TableHead>Mensagens</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Última Atividade</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredConversations.map((conv) => {
                const p1 = conv.participants?.find((p: any) => p.id === conv.participant_1);
                const p2 = conv.participants?.find((p: any) => p.id === conv.participant_2);
                
                return (
                  <TableRow key={conv.id} className="hover:bg-slate-50">
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <div className="flex -space-x-2">
                          <Avatar className="h-8 w-8 border-2 border-white">
                            <AvatarFallback className="bg-poke-blue/10 text-poke-blue text-xs">
                              {p1?.display_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <Avatar className="h-8 w-8 border-2 border-white">
                            <AvatarFallback className="bg-poke-yellow/20 text-poke-dark text-xs">
                              {p2?.display_name?.charAt(0) || '?'}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div>
                          <p className="text-sm font-medium">{p1?.display_name || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">{p2?.display_name || 'N/A'}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <p className="text-sm">{conv.subject || '-'}</p>
                      {conv.last_message && (
                        <p className="text-xs text-muted-foreground truncate max-w-[200px]">
                          {conv.last_message}
                        </p>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary">{conv.message_count || 0}</Badge>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(
                        "border-0",
                        conv.status === 'ACTIVE' && "bg-green-100 text-green-700",
                        conv.status === 'CLOSED' && "bg-slate-100 text-slate-700",
                        conv.status === 'ARCHIVED' && "bg-yellow-100 text-yellow-700"
                      )}>
                        {conv.status === 'ACTIVE' ? 'Ativa' : conv.status === 'CLOSED' ? 'Encerrada' : 'Arquivada'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(conv.last_message_at)}
                      </p>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openConversation(conv)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Ver
                        </Button>
                        {conv.status === 'ACTIVE' ? (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                            onClick={() => {
                              setSelectedConversation(conv);
                              setCloseModalOpen(true);
                            }}
                          >
                            <Lock className="h-4 w-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 border-green-200 hover:bg-green-50"
                            onClick={() => handleReopenConversation(conv.id)}
                            disabled={actionLoading}
                          >
                            <Unlock className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          {filteredConversations.length === 0 && (
            <div className="text-center py-12 text-muted-foreground">
              <MessageCircle className="h-12 w-12 mx-auto mb-4 opacity-30" />
              <p>Nenhuma conversa encontrada</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modal de Visualização */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <MessageCircle className="h-5 w-5" />
                Visualizar Conversa
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={exportToPDF}
                className="mr-8"
              >
                <Download className="h-4 w-4 mr-1" />
                Exportar PDF
              </Button>
            </DialogTitle>
          </DialogHeader>

          {selectedConversation && (
            <div className="flex-1 overflow-hidden flex flex-col">
              {/* Info dos participantes */}
              <div className="grid grid-cols-2 gap-4 mb-4">
                {selectedConversation.participants?.map((p: any, idx: number) => (
                  <div key={p.id} className="bg-slate-50 p-3 rounded-lg">
                    <p className="text-xs text-muted-foreground">Participante {idx + 1}</p>
                    <p className="font-medium">{p.display_name}</p>
                    <p className="text-xs text-muted-foreground">{p.email}</p>
                  </div>
                ))}
              </div>

              {/* Mensagens */}
              <ScrollArea className="flex-1 border rounded-lg p-4">
                {loadingMessages ? (
                  <div className="flex items-center justify-center h-40">
                    <Loader2 className="h-6 w-6 animate-spin text-poke-blue" />
                  </div>
                ) : (
                  <div className="space-y-3">
                    {messages.map((msg) => {
                      const sender = selectedConversation.participants?.find((p: any) => p.id === msg.sender_id);
                      const isSystem = msg.message_type === 'SYSTEM';
                      const isP1 = msg.sender_id === selectedConversation.participant_1;

                      if (isSystem) {
                        return (
                          <div key={msg.id} className="flex justify-center">
                            <Badge variant="secondary" className="text-xs font-normal">
                              {msg.content}
                            </Badge>
                          </div>
                        );
                      }

                      return (
                        <div
                          key={msg.id}
                          className={cn(
                            "flex",
                            isP1 ? "justify-start" : "justify-end"
                          )}
                        >
                          <div
                            className={cn(
                              "max-w-[70%] rounded-xl px-4 py-2",
                              isP1 
                                ? "bg-poke-blue text-white" 
                                : "bg-slate-100 text-slate-900"
                            )}
                          >
                            <p className={cn(
                              "text-xs font-medium mb-1",
                              isP1 ? "text-white/80" : "text-slate-600"
                            )}>
                              {sender?.display_name || 'Desconhecido'}
                            </p>
                            <p className="text-sm">{msg.content}</p>
                            <p className={cn(
                              "text-[10px] mt-1",
                              isP1 ? "text-white/60" : "text-slate-400"
                            )}>
                              {formatDateTime(msg.created_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </ScrollArea>

              {/* Botão de encerrar dentro do modal */}
              {selectedConversation?.status === 'ACTIVE' && (
                <div className="mt-4 pt-4 border-t">
                  <Button
                    variant="destructive"
                    className="w-full"
                    onClick={() => setCloseModalOpen(true)}
                  >
                    <Lock className="h-4 w-4 mr-2" />
                    Encerrar Conversa
                  </Button>
                </div>
              )}

              {selectedConversation?.status === 'CLOSED' && (
                <div className="mt-4 pt-4 border-t">
                  <div className="bg-slate-100 rounded-lg p-3 text-center text-sm text-slate-600">
                    <Lock className="h-4 w-4 inline mr-2" />
                    Esta conversa foi encerrada
                  </div>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Modal de Confirmação de Encerramento */}
      <Dialog open={closeModalOpen} onOpenChange={setCloseModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              Encerrar Conversa
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <p className="text-sm text-amber-800 mb-2">
                <strong>Atenção:</strong> Ao encerrar esta conversa:
              </p>
              <ul className="text-sm text-amber-700 list-disc list-inside space-y-1">
                <li>Os usuários não poderão mais enviar mensagens</li>
                <li>Uma mensagem de sistema será enviada</li>
                <li>Os usuários serão convidados a avaliar a negociação</li>
              </ul>
            </div>

            {selectedConversation && (
              <div className="bg-slate-50 rounded-lg p-3">
                <p className="text-xs text-muted-foreground">Conversa entre:</p>
                <p className="font-medium">
                  {selectedConversation.participants?.map((p: any) => p.display_name).join(' e ')}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Assunto: {selectedConversation.subject || 'Sem assunto'}
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-3 mt-4">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setCloseModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive"
              className="flex-1"
              onClick={handleCloseConversation}
              disabled={actionLoading}
            >
              {actionLoading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Encerrando...
                </>
              ) : (
                <>
                  <Lock className="h-4 w-4 mr-2" />
                  Confirmar Encerramento
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
