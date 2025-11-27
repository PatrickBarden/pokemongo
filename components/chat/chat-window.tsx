'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { 
  Send, 
  Loader2, 
  MessageCircle,
  X,
  Minimize2,
  Maximize2
} from 'lucide-react';
import { 
  getConversationMessages, 
  sendMessage, 
  markMessagesAsRead,
  ChatMessage 
} from '@/server/actions/chat';
import { formatRelativeTime } from '@/lib/format';
import { cn } from '@/lib/utils';

interface ChatWindowProps {
  conversationId: string;
  currentUserId: string;
  otherUserName: string;
  onClose?: () => void;
  isMinimized?: boolean;
  onToggleMinimize?: () => void;
}

export function ChatWindow({
  conversationId,
  currentUserId,
  otherUserName,
  onClose,
  isMinimized = false,
  onToggleMinimize
}: ChatWindowProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Carregar mensagens
  useEffect(() => {
    loadMessages();
    // Poll para novas mensagens a cada 5 segundos
    const interval = setInterval(loadMessages, 5000);
    return () => clearInterval(interval);
  }, [conversationId]);

  // Scroll para o final quando novas mensagens chegam
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  // Marcar como lido quando abrir
  useEffect(() => {
    if (!isMinimized) {
      markMessagesAsRead(conversationId, currentUserId);
    }
  }, [isMinimized, conversationId, currentUserId]);

  const loadMessages = async () => {
    const { data } = await getConversationMessages(conversationId);
    if (data) {
      setMessages(data);
    }
    setLoading(false);
  };

  const handleSend = async () => {
    if (!newMessage.trim() || sending) return;

    setSending(true);
    const { data, error } = await sendMessage(conversationId, currentUserId, newMessage.trim());
    
    if (data) {
      setMessages(prev => [...prev, data]);
      setNewMessage('');
      inputRef.current?.focus();
    }
    setSending(false);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  if (isMinimized) {
    return (
      <div 
        className="fixed bottom-4 right-4 bg-poke-blue text-white rounded-full p-4 shadow-lg cursor-pointer hover:bg-poke-blue/90 transition-all z-50"
        onClick={onToggleMinimize}
      >
        <MessageCircle className="h-6 w-6" />
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
          {messages.filter(m => m.sender_id !== currentUserId && !m.read_at).length || ''}
        </span>
      </div>
    );
  }

  return (
    <div className="fixed bottom-4 right-4 w-96 bg-white rounded-xl shadow-2xl border overflow-hidden z-50 flex flex-col max-h-[500px]">
      {/* Header */}
      <div className="bg-poke-blue text-white p-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Avatar className="h-8 w-8 border-2 border-white/30">
            <AvatarFallback className="bg-white/20 text-white text-sm">
              {otherUserName.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div>
            <p className="font-semibold text-sm">{otherUserName}</p>
            <p className="text-xs text-white/70">Online</p>
          </div>
        </div>
        <div className="flex items-center gap-1">
          {onToggleMinimize && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={onToggleMinimize}
            >
              <Minimize2 className="h-4 w-4" />
            </Button>
          )}
          {onClose && (
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-white hover:bg-white/20"
              onClick={onClose}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      {/* Messages */}
      <ScrollArea className="flex-1 p-4 h-80" ref={scrollRef as any}>
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <Loader2 className="h-6 w-6 animate-spin text-poke-blue" />
          </div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-muted-foreground">
            <MessageCircle className="h-12 w-12 mb-2 opacity-30" />
            <p className="text-sm">Nenhuma mensagem ainda</p>
            <p className="text-xs">Envie a primeira mensagem!</p>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((msg) => {
              const isMe = msg.sender_id === currentUserId;
              const isSystem = msg.message_type === 'SYSTEM';

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
                    isMe ? "justify-end" : "justify-start"
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-2xl px-4 py-2",
                      isMe 
                        ? "bg-poke-blue text-white rounded-br-md" 
                        : "bg-slate-100 text-slate-900 rounded-bl-md"
                    )}
                  >
                    <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>
                    <p className={cn(
                      "text-[10px] mt-1",
                      isMe ? "text-white/70" : "text-slate-500"
                    )}>
                      {formatRelativeTime(msg.created_at)}
                      {isMe && msg.read_at && " • Lido"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <div className="p-3 border-t bg-slate-50">
        <div className="flex gap-2">
          <Input
            ref={inputRef}
            placeholder="Digite sua mensagem..."
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            disabled={sending}
            className="flex-1"
          />
          <Button 
            onClick={handleSend} 
            disabled={!newMessage.trim() || sending}
            className="bg-poke-blue hover:bg-poke-blue/90"
          >
            {sending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
