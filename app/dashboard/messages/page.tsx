'use client';

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { 
  MessageCircle, 
  Search, 
  Send, 
  Loader2,
  ArrowLeft,
  Clock,
  CheckCheck,
  Lock,
  Star,
  Paperclip,
  Image as ImageIcon,
  Video,
  FileText,
  Download,
  X
} from 'lucide-react';
import { 
  getUserConversations, 
  getConversationMessages,
  sendMessage,
  markMessagesAsRead,
  submitConversationRating,
  Conversation,
  ChatMessage
} from '@/server/actions/chat';
import { supabaseClient } from '@/lib/supabase-client';
import { formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [initialLoadingMessages, setInitialLoadingMessages] = useState(false);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserName, setCurrentUserName] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [avatars, setAvatars] = useState<Record<string, string>>({});
  const [rating, setRating] = useState<number>(0);
  const [feedback, setFeedback] = useState('');
  const [ratingSubmitted, setRatingSubmitted] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [previewFile, setPreviewFile] = useState<{ url: string; type: string; name: string } | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    loadCurrentUser();
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (currentUserId) {
      loadConversations();
      // Poll silencioso para novas conversas
      const interval = setInterval(loadConversationsSilent, 10000);
      return () => clearInterval(interval);
    }
  }, [currentUserId]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessagesInitial(selectedConversation.id);
      markMessagesAsRead(selectedConversation.id, currentUserId);
      // Resetar estados de avaliação
      setRating(0);
      setFeedback('');
      setRatingSubmitted(false);
      // Carregar avatar do outro usuário se não tiver
      if (selectedConversation.other_user?.id && !avatars[selectedConversation.other_user.id]) {
        loadAvatar(selectedConversation.other_user.id);
      }
      // Poll silencioso para novas mensagens
      const interval = setInterval(() => loadMessagesSilent(selectedConversation.id), 3000);
      return () => clearInterval(interval);
    }
  }, [selectedConversation]);

  const loadCurrentUser = async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data: userData } = await supabaseClient.from('users').select('display_name').eq('id', user.id).maybeSingle();
        if (userData) setCurrentUserName((userData as any).display_name || 'Usuário');
        const { data: profile } = await supabaseClient.from('profiles').select('avatar_url').eq('user_id', user.id).maybeSingle();
        if (profile && (profile as any).avatar_url) setAvatars(prev => ({ ...prev, [user.id]: (profile as any).avatar_url }));
      } else {
        setLoading(false);
      }
    } catch (error) {
      console.error('Erro ao carregar usuário:', error);
      setLoading(false);
    }
  };

  const loadConversations = async () => {
    if (!currentUserId) {
      setLoading(false);
      return;
    }
    try {
      const { data, error } = await getUserConversations(currentUserId);
      if (error) {
        console.error('Erro ao carregar conversas:', error);
      }
      if (data) {
        setConversations(data);
        for (const conv of data) {
          if (conv.other_user?.id && !avatars[conv.other_user.id]) loadAvatar(conv.other_user.id);
        }
      }
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConversationsSilent = async () => {
    if (!currentUserId) return;
    const { data } = await getUserConversations(currentUserId);
    if (data) setConversations(data);
  };

  const loadAvatar = async (userId: string) => {
    if (!userId || avatars[userId]) return; // Evitar chamadas duplicadas
    try {
      const { data: profile } = await supabaseClient
        .from('profiles')
        .select('avatar_url')
        .eq('user_id', userId)
        .maybeSingle();
      if (profile && (profile as any).avatar_url) {
        setAvatars(prev => ({ ...prev, [userId]: (profile as any).avatar_url }));
      }
    } catch (err) {
      console.log('Erro ao carregar avatar:', err);
    }
  };

  const loadMessagesInitial = async (conversationId: string) => {
    setInitialLoadingMessages(true);
    const { data } = await getConversationMessages(conversationId);
    if (data) setMessages(data);
    setInitialLoadingMessages(false);
  };

  const loadMessagesSilent = async (conversationId: string) => {
    const { data } = await getConversationMessages(conversationId);
    if (data && data.length !== messages.length) setMessages(data);
  };


  const handleSend = async () => {
    if (!newMessage.trim() || sending || !selectedConversation) return;

    setSending(true);
    const { data } = await sendMessage(selectedConversation.id, currentUserId, newMessage.trim());
    
    if (data) {
      setMessages(prev => [...prev, data]);
      setNewMessage('');
    }
    setSending(false);
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !selectedConversation) return;

    // Validar tamanho (50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert('Arquivo muito grande. Máximo permitido: 50MB');
      return;
    }

    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('conversationId', selectedConversation.id);
      formData.append('senderId', currentUserId);

      const response = await fetch('/api/chat/upload', {
        method: 'POST',
        body: formData
      });

      const result = await response.json();

      if (result.success && result.message) {
        setMessages(prev => [...prev, result.message]);
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
        <div className="space-y-2">
          <img 
            src={msg.file_url} 
            alt={msg.file_name || 'Imagem'}
            className="max-w-full rounded-lg cursor-pointer hover:opacity-90 transition-opacity"
            style={{ maxHeight: '300px' }}
            onClick={() => setPreviewFile({ url: msg.file_url!, type: 'image', name: msg.file_name || 'Imagem' })}
          />
          <p className="text-xs opacity-70">{msg.file_name}</p>
        </div>
      );
    }

    if (isVideo && msg.file_url) {
      return (
        <div className="space-y-2">
          <video 
            src={msg.file_url} 
            controls
            className="max-w-full rounded-lg"
            style={{ maxHeight: '300px' }}
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
          className="flex items-center gap-3 p-3 bg-white/10 rounded-lg hover:bg-white/20 transition-colors"
        >
          <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
            <FileText className="h-5 w-5" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{msg.file_name}</p>
            <p className="text-xs opacity-70">{formatFileSize(msg.file_size || 0)}</p>
          </div>
          <Download className="h-4 w-4 opacity-70" />
        </a>
      );
    }

    return <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>;
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const filteredConversations = conversations.filter(conv =>
    conv.other_user?.display_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    conv.subject?.toLowerCase().includes(searchTerm.toLowerCase())
  );

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
        <h1 className="text-3xl font-bold text-foreground">Mensagens</h1>
        <p className="text-muted-foreground mt-1">
          Converse com vendedores e compradores
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[70vh]">
        {/* Lista de Conversas */}
        <Card className={cn(
          "lg:col-span-1 flex flex-col",
          selectedConversation && "hidden lg:flex"
        )}>
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar conversas..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 p-0">
            <ScrollArea className="h-full">
              {filteredConversations.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <MessageCircle className="h-12 w-12 mb-4 opacity-30" />
                  <p className="text-sm">Nenhuma conversa ainda</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredConversations.map((conv) => (
                    <div
                      key={conv.id}
                      className={cn(
                        "p-4 cursor-pointer hover:bg-accent transition-colors",
                        selectedConversation?.id === conv.id && "bg-poke-blue/10 dark:bg-poke-blue/20 border-l-4 border-l-poke-blue"
                      )}
                      onClick={() => setSelectedConversation(conv)}
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-10 w-10">
                          {avatars[conv.other_user?.id || ''] && (
                            <AvatarImage src={avatars[conv.other_user?.id || '']} />
                          )}
                          <AvatarFallback className="bg-poke-blue/10 text-poke-blue">
                            {conv.other_user?.display_name?.charAt(0).toUpperCase() || '?'}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-1">
                            <p className="font-semibold text-sm truncate">
                              {conv.other_user?.display_name || 'Usuário'}
                            </p>
                            <span className="text-[10px] text-muted-foreground whitespace-nowrap">
                              {formatRelativeTime(conv.last_message_at)}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground truncate">
                            {conv.last_message || 'Conversa iniciada'}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            {conv.subject && (
                              <Badge variant="secondary" className="text-[10px]">
                                {conv.subject}
                              </Badge>
                            )}
                            {(conv.unread_count || 0) > 0 && (
                              <Badge className="bg-poke-blue text-white text-[10px]">
                                {conv.unread_count} nova{conv.unread_count! > 1 ? 's' : ''}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>

        {/* Área de Chat */}
        <Card className={cn(
          "lg:col-span-2 flex flex-col",
          !selectedConversation && "hidden lg:flex"
        )}>
          {selectedConversation ? (
            <>
              {/* Header do Chat */}
              <CardHeader className="pb-3 border-b">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="lg:hidden"
                    onClick={() => setSelectedConversation(null)}
                  >
                    <ArrowLeft className="h-5 w-5" />
                  </Button>
                  <Avatar className="h-10 w-10">
                    {avatars[selectedConversation.other_user?.id || ''] && (
                      <AvatarImage src={avatars[selectedConversation.other_user?.id || '']} />
                    )}
                    <AvatarFallback className="bg-poke-blue text-white">
                      {selectedConversation.other_user?.display_name?.charAt(0).toUpperCase() || '?'}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="font-semibold">
                      {selectedConversation.other_user?.display_name || 'Usuário'}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {selectedConversation.other_user?.email}
                    </p>
                  </div>
                </div>
              </CardHeader>

              {/* Mensagens */}
              <CardContent className="flex-1 p-4 overflow-hidden">
                <ScrollArea className="h-full pr-4">
                  {initialLoadingMessages ? (
                    <div className="flex items-center justify-center h-full">
                      <Loader2 className="h-6 w-6 animate-spin text-poke-blue" />
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
                      <MessageCircle className="h-12 w-12 mb-2 opacity-30" />
                      <p className="text-sm">Nenhuma mensagem ainda</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {messages.map((msg) => {
                        const isMe = msg.sender_id === currentUserId;
                        const isSystem = msg.message_type === 'SYSTEM';
                        const senderName = isMe ? currentUserName : selectedConversation.other_user?.display_name;
                        const senderAvatar = avatars[msg.sender_id];

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
                              "flex items-end gap-2",
                              isMe ? "justify-end" : "justify-start"
                            )}
                          >
                            {/* Avatar do outro usuário (esquerda) */}
                            {!isMe && (
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                {senderAvatar && <AvatarImage src={senderAvatar} />}
                                <AvatarFallback className="bg-muted text-muted-foreground text-xs">
                                  {senderName?.charAt(0).toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                            )}

                            <div
                              className={cn(
                                "max-w-[65%] rounded-2xl px-4 py-3",
                                isMe 
                                  ? "bg-poke-blue text-white rounded-br-md" 
                                  : "bg-muted text-foreground rounded-bl-md"
                              )}
                            >
                              {renderMessageContent(msg)}
                              <div className={cn(
                                "flex items-center gap-1 mt-1",
                                isMe ? "justify-end" : "justify-start"
                              )}>
                                <Clock className="h-3 w-3 opacity-50" />
                                <span className={cn(
                                  "text-[10px]",
                                  isMe ? "text-white/70" : "text-muted-foreground"
                                )}>
                                  {formatRelativeTime(msg.created_at)}
                                </span>
                                {isMe && msg.read_at && (
                                  <CheckCheck className="h-3 w-3 text-green-300 ml-1" />
                                )}
                              </div>
                            </div>

                            {/* Avatar do usuário atual (direita) */}
                            {isMe && (
                              <Avatar className="h-8 w-8 flex-shrink-0">
                                {senderAvatar && <AvatarImage src={senderAvatar} />}
                                <AvatarFallback className="bg-poke-blue text-white text-xs">
                                  {senderName?.charAt(0).toUpperCase() || '?'}
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        );
                      })}
                      <div ref={messagesEndRef} />
                    </div>
                  )}
                </ScrollArea>
              </CardContent>

              {/* Input ou Avaliação */}
              {(selectedConversation as any)?.status === 'CLOSED' ? (
                <div className="p-4 border-t bg-muted/50">
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-center gap-2 mb-3">
                      <Lock className="h-4 w-4 text-amber-600" />
                      <span className="font-medium text-amber-800">Conversa encerrada</span>
                    </div>
                    
                    {!ratingSubmitted ? (
                      <div className="space-y-3">
                        <p className="text-sm text-amber-700">
                          Como foi sua experiência nesta negociação?
                        </p>
                        <div className="flex gap-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <button
                              key={star}
                              onClick={() => setRating(star)}
                              className="p-1 hover:scale-110 transition-transform"
                            >
                              <Star 
                                className={cn(
                                  "h-6 w-6",
                                  star <= rating 
                                    ? "fill-yellow-400 text-yellow-400" 
                                    : "text-gray-300"
                                )}
                              />
                            </button>
                          ))}
                        </div>
                        {rating > 0 && (
                          <>
                            <Input
                              placeholder="Deixe um comentário (opcional)"
                              value={feedback}
                              onChange={(e) => setFeedback(e.target.value)}
                              className="bg-white"
                            />
                            <Button
                              size="sm"
                              className="bg-amber-600 hover:bg-amber-700"
                              onClick={async () => {
                                if (selectedConversation && currentUserId) {
                                  await submitConversationRating(
                                    selectedConversation.id,
                                    currentUserId,
                                    rating,
                                    feedback || undefined
                                  );
                                  setRatingSubmitted(true);
                                }
                              }}
                            >
                              Enviar Avaliação
                            </Button>
                          </>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-green-700">
                        ✓ Obrigado pela sua avaliação!
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                <div className="p-4 border-t bg-muted/50">
                  <div className="flex gap-2 items-center">
                    {/* Input de arquivo oculto */}
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.zip,.rar"
                      className="hidden"
                    />
                    
                    {/* Botão de anexo */}
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploading || sending}
                      className="text-slate-500 hover:text-poke-blue hover:bg-poke-blue/10"
                      title="Enviar arquivo"
                    >
                      {uploading ? (
                        <Loader2 className="h-5 w-5 animate-spin" />
                      ) : (
                        <Paperclip className="h-5 w-5" />
                      )}
                    </Button>
                    
                    <Input
                      placeholder="Digite sua mensagem..."
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      disabled={sending || uploading}
                      className="flex-1"
                    />
                    <Button 
                      onClick={handleSend} 
                      disabled={!newMessage.trim() || sending || uploading}
                      className="bg-poke-blue hover:bg-poke-blue/90"
                    >
                      {sending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-1 ml-10">
                    Imagens, vídeos e documentos (máx. 50MB)
                  </p>
                </div>
              )}
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
              <MessageCircle className="h-16 w-16 mb-4 opacity-30" />
              <p className="text-lg font-medium">Selecione uma conversa</p>
              <p className="text-sm">Escolha uma conversa para começar a trocar mensagens</p>
            </div>
          )}
        </Card>
      </div>

      {/* Modal de preview de imagem */}
      {previewFile && (
        <div 
          className="fixed inset-0 bg-black/80 z-50 flex items-center justify-center p-4"
          onClick={() => setPreviewFile(null)}
        >
          <div className="relative max-w-4xl max-h-[90vh]">
            <Button
              variant="ghost"
              size="icon"
              className="absolute -top-12 right-0 text-white hover:bg-white/20"
              onClick={() => setPreviewFile(null)}
            >
              <X className="h-6 w-6" />
            </Button>
            <img 
              src={previewFile.url} 
              alt={previewFile.name}
              className="max-w-full max-h-[85vh] object-contain rounded-lg"
            />
            <p className="text-white text-center mt-2 text-sm">{previewFile.name}</p>
          </div>
        </div>
      )}
    </div>
  );
}
