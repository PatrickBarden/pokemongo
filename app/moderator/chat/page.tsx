'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { 
  MessageCircle, 
  Search, 
  Send,
  Loader2,
  User,
  Clock
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { supabaseClient } from '@/lib/supabase-client';
import { formatRelativeTime } from '@/lib/format';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Conversation {
  id: string;
  subject: string;
  status: string;
  created_at: string;
  updated_at: string;
  order_id: string;
  buyer: { display_name: string };
  seller: { display_name: string };
  last_message?: string;
}

interface Message {
  id: string;
  content: string;
  message_type: string;
  created_at: string;
  sender: { display_name: string };
}

export default function ModeratorChatPage() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [selectedConversation, setSelectedConversation] = useState<Conversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [userId, setUserId] = useState('');

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation.id);
    }
  }, [selectedConversation]);

  const loadConversations = async () => {
    try {
      const { data: { user } } = await supabaseClient.auth.getUser();
      if (user) setUserId(user.id);

      const { data, error } = await (supabaseClient as any)
        .from('order_conversations')
        .select(`
          id,
          subject,
          status,
          created_at,
          updated_at,
          order_id,
          buyer:buyer_id(display_name),
          seller:seller_id(display_name)
        `)
        .eq('status', 'ACTIVE')
        .order('updated_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Erro ao carregar conversas:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data, error } = await (supabaseClient as any)
        .from('order_conversation_messages')
        .select(`
          id,
          content,
          message_type,
          created_at,
          sender:sender_id(display_name)
        `)
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMessages(data || []);
    } catch (error) {
      console.error('Erro ao carregar mensagens:', error);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !userId) return;

    setSending(true);
    try {
      const { error } = await (supabaseClient as any)
        .from('order_conversation_messages')
        .insert({
          conversation_id: selectedConversation.id,
          sender_id: userId,
          content: newMessage.trim(),
          message_type: 'MODERATOR',
        });

      if (error) throw error;

      setNewMessage('');
      loadMessages(selectedConversation.id);
      toast.success('Mensagem enviada');
    } catch (error) {
      console.error('Erro ao enviar mensagem:', error);
      toast.error('Erro ao enviar mensagem');
    } finally {
      setSending(false);
    }
  };

  const filteredConversations = conversations.filter(conv => {
    if (!search) return true;
    const searchLower = search.toLowerCase();
    return (
      conv.subject?.toLowerCase().includes(searchLower) ||
      conv.buyer?.display_name?.toLowerCase().includes(searchLower) ||
      conv.seller?.display_name?.toLowerCase().includes(searchLower)
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
          <MessageCircle className="h-6 w-6 text-purple-500" />
          Mensagens
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Acompanhe e responda conversas de pedidos
        </p>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 h-[calc(100vh-250px)]">
        {/* Lista de Conversas */}
        <Card className="lg:col-span-1 flex flex-col">
          <CardHeader className="pb-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardHeader>
          <CardContent className="flex-1 overflow-auto p-0">
            {filteredConversations.length > 0 ? (
              <div className="divide-y divide-border">
                {filteredConversations.map((conv) => (
                  <motion.div
                    key={conv.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    onClick={() => setSelectedConversation(conv)}
                    className={cn(
                      'p-4 cursor-pointer hover:bg-muted/50 transition-colors',
                      selectedConversation?.id === conv.id && 'bg-purple-500/10'
                    )}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate">{conv.subject}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {conv.buyer?.display_name} ↔ {conv.seller?.display_name}
                        </p>
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {conv.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      {formatRelativeTime(conv.updated_at)}
                    </p>
                  </motion.div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 px-4">
                <MessageCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma conversa</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Chat */}
        <Card className="lg:col-span-2 flex flex-col">
          {selectedConversation ? (
            <>
              <CardHeader className="border-b">
                <CardTitle className="text-base">{selectedConversation.subject}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {selectedConversation.buyer?.display_name} ↔ {selectedConversation.seller?.display_name}
                </p>
              </CardHeader>
              
              <CardContent className="flex-1 overflow-auto p-4 space-y-4">
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={cn(
                      'max-w-[80%] p-3 rounded-xl',
                      msg.message_type === 'SYSTEM' 
                        ? 'mx-auto bg-muted text-center max-w-full text-sm'
                        : msg.message_type === 'MODERATOR'
                        ? 'ml-auto bg-purple-500 text-white'
                        : 'bg-muted'
                    )}
                  >
                    {msg.message_type !== 'SYSTEM' && (
                      <p className="text-xs font-medium mb-1 opacity-70">
                        {msg.sender?.display_name}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap">{msg.content}</p>
                    <p className="text-xs opacity-50 mt-1">
                      {formatRelativeTime(msg.created_at)}
                    </p>
                  </div>
                ))}
              </CardContent>

              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Textarea
                    placeholder="Digite sua mensagem..."
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    className="min-h-[60px] max-h-[120px]"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        handleSendMessage();
                      }
                    }}
                  />
                  <Button 
                    onClick={handleSendMessage}
                    disabled={sending || !newMessage.trim()}
                    className="bg-purple-600 hover:bg-purple-700"
                  >
                    {sending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Send className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <MessageCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="font-medium text-foreground">Selecione uma conversa</p>
                <p className="text-sm text-muted-foreground">
                  Clique em uma conversa para ver as mensagens
                </p>
              </div>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
