'use client';

import { useState, useEffect, useRef } from 'react';
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
  AlertTriangle,
  Send,
  Shield,
  Paperclip,
  Image as ImageIcon,
  Video
} from 'lucide-react';
import { 
  getAllConversations, 
  getConversationMessages,
  closeConversation,
  reopenConversation,
  sendMessage,
  markMessagesAsReadByAdmin,
  getAdminUnreadCounts,
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
import { Textarea } from '@/components/ui/textarea';

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
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [unreadCounts, setUnreadCounts] = useState<Map<string, number>>(new Map());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadConversations();
    loadAdminId();
    loadUnreadCounts();
  }, []);

  const loadUnreadCounts = async () => {
    const { data } = await getAdminUnreadCounts();
    const countsMap = new Map<string, number>();
    data.forEach(item => countsMap.set(item.conversationId, item.unreadCount));
    setUnreadCounts(countsMap);
  };

  const loadAdminId = async () => {
    const { supabaseClient } = await import('@/lib/supabase-client');
    const { data: { user } } = await supabaseClient.auth.getUser();
    if (user) setAdminId(user.id);
  };

  const loadConversations = async () => {
    try {
      const response = await fetch('/api/admin/chat');
      const result = await response.json();
      if (result.conversations) {
        setConversations(result.conversations);
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
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
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
    setLoadingMessages(false);
  };

  const openConversation = async (conv: any) => {
    setSelectedConversation(conv);
    setNewMessage('');
    await loadMessages(conv.id);
    setViewModalOpen(true);
    
    // Marcar mensagens como lidas pelo admin
    if (adminId) {
      await markMessagesAsReadByAdmin(conv.id, adminId);
      // Atualizar contagem local
      setUnreadCounts(prev => {
        const newMap = new Map(prev);
        newMap.delete(conv.id);
        return newMap;
      });
    }
  };

  // Enviar mensagem como admin
  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending || !selectedConversation || !adminId) return;
    
    setSending(true);
    const { data, error } = await sendMessage(selectedConversation.id, adminId, newMessage.trim());
    
    if (!error && data) {
      setNewMessage('');
      // Adicionar mensagem diretamente ao estado para atualização imediata
      setMessages(prev => [...prev, data]);
      // Scroll para o final
      setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    } else if (error) {
      alert('Erro ao enviar mensagem: ' + error);
    }
    setSending(false);
  };

  // Upload de arquivo pelo admin
  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedConversation || !adminId) return;

    if (file.size > 50 * 1024 * 1024) {
      alert('Arquivo muito grande. Máximo permitido: 50MB');
      return;
    }

    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', selectedConversation.id);
      formData.append('senderId', adminId);

      const response = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success && result.message) {
        // Adicionar mensagem diretamente ao estado para atualização imediata
        setMessages(prev => [...prev, result.message]);
        // Scroll para o final
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      } else {
        alert(result.error || 'Erro ao enviar arquivo');
      }
    } catch (error) {
      console.error('Erro no upload:', error);
      alert('Erro ao enviar arquivo');
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const renderMessageContent = (msg: ChatMessage) => {
    const isImage = msg.message_type === 'IMAGE';
    const isVideo = msg.message_type === 'VIDEO';
    const isFile = msg.message_type === 'FILE';

    if (isImage && msg.file_url) {
      return (
        <div className="space-y-1">
          <img 
            src={msg.file_url} 
            alt={msg.file_name || 'Imagem'}
            className="max-w-full rounded-lg"
            style={{ maxHeight: '200px' }}
          />
          <p className="text-xs opacity-70">{msg.file_name}</p>
        </div>
      );
    }

    if (isVideo && msg.file_url) {
      return (
        <div className="space-y-1">
          <video 
            src={msg.file_url} 
            controls
            className="max-w-full rounded-lg"
            style={{ maxHeight: '200px' }}
          />
          <p className="text-xs opacity-70">{msg.file_name}</p>
        </div>
      );
    }

    if (isFile && msg.file_url) {
      return (
        <a 
          href={msg.file_url} 
          target="_blank" 
          rel="noopener noreferrer"
          className="flex items-center gap-2 p-2 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
        >
          <FileText className="h-4 w-4" />
          <div className="flex-1 min-w-0">
            <p className="text-xs font-medium truncate">{msg.file_name}</p>
            <p className="text-[10px] opacity-70">{formatFileSize(msg.file_size || 0)}</p>
          </div>
          <Download className="h-3 w-3 opacity-70" />
        </a>
      );
    }

    return <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>;
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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Central de Mensagens</h1>
          <p className="text-muted-foreground mt-1">
            Monitore e gerencie todas as conversas da plataforma
          </p>
        </div>
        {stats.active > 0 && (
          <div className="flex items-center gap-2 bg-green-500/10 text-green-500 px-4 py-2 rounded-full border border-green-500/20 animate-pulse">
            <span className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
            </span>
            <span className="text-sm font-semibold">{stats.active} Conversas Ativas</span>
          </div>
        )}
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
                const isOrderConversation = conv.conversation_type === 'order' || conv.order_id;
                
                return (
                  <TableRow key={conv.id} className={cn(
                    "hover:bg-muted/50",
                    conv.status === 'ACTIVE' && "bg-blue-500/10"
                  )}>
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
                          {/* Badge de admin se for conversa de pedido */}
                          {isOrderConversation && conv.admin_id && (
                            <Avatar className="h-8 w-8 border-2 border-white">
                              <AvatarFallback className="bg-purple-100 text-purple-600 text-xs">
                                <Shield className="h-4 w-4" />
                              </AvatarFallback>
                            </Avatar>
                          )}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium">{p1?.display_name || 'N/A'}</p>
                            {isOrderConversation && (
                              <Badge className="bg-purple-100 text-purple-700 text-[10px] px-1.5 py-0">
                                Pedido
                              </Badge>
                            )}
                          </div>
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
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{conv.message_count || 0}</Badge>
                        {unreadCounts.get(conv.id) && unreadCounts.get(conv.id)! > 0 && (
                          <Badge className="bg-red-500 text-white text-[10px] px-1.5 py-0 animate-pulse">
                            {unreadCounts.get(conv.id)} nova{unreadCounts.get(conv.id)! > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge className={cn(
                        "border-0",
                        conv.status === 'ACTIVE' && "bg-green-500/20 text-green-500",
                        conv.status === 'CLOSED' && "bg-muted text-muted-foreground",
                        conv.status === 'ARCHIVED' && "bg-yellow-500/20 text-yellow-500"
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

      {/* Modal de Visualização - Design Profissional */}
      <Dialog open={viewModalOpen} onOpenChange={setViewModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] p-0 gap-0 overflow-hidden">
          {selectedConversation && (
            <div className="flex flex-col h-[85vh]">
              {/* Header do Chat */}
              <div className="bg-gradient-to-r from-poke-blue to-blue-600 text-white p-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
                      <MessageCircle className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg">{selectedConversation.subject || 'Conversa'}</h3>
                      <div className="flex items-center gap-2 text-white/80 text-xs">
                        <Badge className={cn(
                          "text-[10px] px-2 py-0 border-0",
                          selectedConversation.status === 'ACTIVE' 
                            ? "bg-green-500/30 text-green-100" 
                            : "bg-white/20 text-white/80"
                        )}>
                          {selectedConversation.status === 'ACTIVE' ? '● Ativa' : '○ Encerrada'}
                        </Badge>
                        <span>•</span>
                        <span>{messages.length} mensagens</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={exportToPDF}
                      className="text-white hover:bg-white/20"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                </div>
                
                {/* Participantes em linha */}
                <div className="flex items-center gap-2 flex-wrap">
                  {selectedConversation.participants?.map((p: any, idx: number) => {
                    const isAdmin = p.role === 'admin';
                    const isBuyer = p.id === selectedConversation.participant_1 || p.id === selectedConversation.buyer_id;
                    
                    return (
                      <div 
                        key={p.id} 
                        className={cn(
                          "flex items-center gap-2 px-3 py-1.5 rounded-full text-xs",
                          isAdmin ? "bg-purple-500/30" : isBuyer ? "bg-blue-500/30" : "bg-amber-500/30"
                        )}
                      >
                        <Avatar className="h-6 w-6 border border-white/30">
                          <AvatarFallback className={cn(
                            "text-[10px] text-white",
                            isAdmin ? "bg-purple-600" : isBuyer ? "bg-blue-600" : "bg-amber-600"
                          )}>
                            {isAdmin ? <Shield className="h-3 w-3" /> : p.display_name?.charAt(0)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                          <span className="font-medium text-white">{p.display_name}</span>
                          <span className="text-white/60 text-[10px]">
                            {isAdmin ? 'Admin' : isBuyer ? 'Comprador' : 'Vendedor'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Área de Mensagens */}
              <div className="flex-1 overflow-hidden bg-gradient-to-b from-slate-50 to-white">
                <ScrollArea className="h-full p-4">
                  {loadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center">
                        <Loader2 className="h-8 w-8 animate-spin text-poke-blue mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Carregando mensagens...</p>
                      </div>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                      <div className="text-center text-muted-foreground">
                        <MessageCircle className="h-12 w-12 mx-auto mb-2 opacity-30" />
                        <p>Nenhuma mensagem ainda</p>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-4 pb-4">
                      {messages.map((msg, index) => {
                        // Usar o sender que já vem enriquecido da mensagem, ou buscar nos participants
                        const sender = msg.sender || selectedConversation.participants?.find((p: any) => p.id === msg.sender_id);
                        const isSystem = msg.message_type === 'SYSTEM';
                        const isAdmin = msg.sender_id === adminId || sender?.role === 'admin';
                        const isBuyer = msg.sender_id === selectedConversation.participant_1 || msg.sender_id === selectedConversation.buyer_id;
                        
                        // Verificar se é uma nova data
                        const msgDate = new Date(msg.created_at).toLocaleDateString('pt-BR');
                        const prevMsgDate = index > 0 ? new Date(messages[index - 1].created_at).toLocaleDateString('pt-BR') : null;
                        const showDateDivider = msgDate !== prevMsgDate;

                        return (
                          <div key={msg.id}>
                            {/* Divisor de data */}
                            {showDateDivider && (
                              <div className="flex items-center justify-center my-4">
                                <div className="bg-slate-200 text-slate-600 text-xs px-3 py-1 rounded-full">
                                  {msgDate === new Date().toLocaleDateString('pt-BR') ? 'Hoje' : msgDate}
                                </div>
                              </div>
                            )}
                            
                            {isSystem ? (
                              <div className="flex justify-center my-3">
                                <div className="bg-amber-50 border border-amber-200 text-amber-800 text-xs px-4 py-2 rounded-lg max-w-[80%] text-center">
                                  <span className="mr-1">🔔</span>
                                  {msg.content}
                                </div>
                              </div>
                            ) : (
                              <div className={cn(
                                "flex gap-2",
                                isAdmin ? "justify-center" : isBuyer ? "justify-start" : "justify-end"
                              )}>
                                {/* Avatar à esquerda para comprador */}
                                {isBuyer && !isAdmin && (
                                  <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                                    <AvatarFallback className="bg-blue-100 text-blue-600 text-xs">
                                      {sender?.display_name?.charAt(0) || '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                
                                <div className={cn(
                                  "max-w-[70%] rounded-2xl px-4 py-3 shadow-sm",
                                  isAdmin 
                                    ? "bg-gradient-to-r from-purple-500 to-purple-600 text-white" 
                                    : isBuyer 
                                      ? "bg-white border border-slate-200 text-slate-800" 
                                      : "bg-gradient-to-r from-poke-blue to-blue-600 text-white"
                                )}>
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={cn(
                                      "text-xs font-semibold",
                                      isAdmin || !isBuyer ? "text-white/90" : "text-slate-600"
                                    )}>
                                      {sender?.display_name || 'Desconhecido'}
                                    </span>
                                    {isAdmin && (
                                      <Badge className="bg-white/20 text-white text-[9px] px-1.5 py-0 border-0">
                                        Admin
                                      </Badge>
                                    )}
                                  </div>
                                  {renderMessageContent(msg)}
                                  <p className={cn(
                                    "text-[10px] mt-2 text-right",
                                    isAdmin || !isBuyer ? "text-white/60" : "text-slate-400"
                                  )}>
                                    {new Date(msg.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                                
                                {/* Avatar à direita para vendedor */}
                                {!isBuyer && !isAdmin && (
                                  <Avatar className="h-8 w-8 mt-1 flex-shrink-0">
                                    <AvatarFallback className="bg-amber-100 text-amber-600 text-xs">
                                      {sender?.display_name?.charAt(0) || '?'}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>
              </div>

              {/* Footer - Input de mensagem */}
              {selectedConversation?.status === 'ACTIVE' ? (
                <div className="border-t bg-white p-4">
                  {/* Input de arquivo oculto */}
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileUpload}
                    accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                    className="hidden"
                  />
                  
                  <div className="flex items-center gap-2 mb-3 text-xs">
                    <div className="flex items-center gap-1.5 bg-purple-50 text-purple-700 px-3 py-1.5 rounded-full">
                      <Shield className="h-3.5 w-3.5" />
                      <span>Enviando como <strong>Administrador</strong></span>
                    </div>
                  </div>
                  <div className="flex gap-3 items-end">
                    {/* Botão de anexo */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || sending}
                      className="h-[50px] w-[50px] text-slate-500 hover:text-purple-600 hover:bg-purple-50 rounded-xl"
                      title="Enviar arquivo"
                    >
                      {uploading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Paperclip className="h-5 w-5" />
                      )}
                    </Button>
                    
                    <div className="flex-1 relative">
                      <Textarea
                        placeholder="Digite sua mensagem..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && !e.shiftKey) {
                            e.preventDefault();
                            handleSendMessage();
                          }
                        }}
                        className="min-h-[50px] max-h-[120px] resize-none rounded-xl border-slate-200 focus:border-purple-300 focus:ring-purple-200"
                      />
                    </div>
                    <div className="flex flex-col gap-2">
                      <Button
                        onClick={handleSendMessage}
                        disabled={(!newMessage.trim() && !uploading) || sending}
                        className="h-[50px] px-5 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 rounded-xl shadow-lg shadow-purple-200"
                      >
                        {sending ? (
                          <Loader2 className="h-5 w-5 animate-spin" />
                        ) : (
                          <Send className="h-5 w-5" />
                        )}
                      </Button>
                    </div>
                  </div>
                  <div className="flex justify-end mt-3">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600 hover:bg-red-50"
                      onClick={() => setCloseModalOpen(true)}
                    >
                      <Lock className="h-4 w-4 mr-1" />
                      Encerrar Conversa
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="border-t bg-slate-50 p-4">
                  <div className="flex items-center justify-center gap-2 text-slate-500">
                    <Lock className="h-4 w-4" />
                    <span className="text-sm">Esta conversa foi encerrada</span>
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
