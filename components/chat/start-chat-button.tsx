'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { MessageCircle, Loader2 } from 'lucide-react';
import { getOrCreateConversation } from '@/server/actions/chat';
import { useToast } from '@/hooks/use-toast';

interface StartChatButtonProps {
  currentUserId: string;
  otherUserId: string;
  otherUserName: string;
  orderId?: string;
  subject?: string;
  variant?: 'default' | 'outline' | 'ghost' | 'secondary';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  className?: string;
  showText?: boolean;
}

export function StartChatButton({
  currentUserId,
  otherUserId,
  otherUserName,
  orderId,
  subject,
  variant = 'outline',
  size = 'sm',
  className = '',
  showText = true
}: StartChatButtonProps) {
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const { toast } = useToast();

  const handleStartChat = async () => {
    if (currentUserId === otherUserId) {
      toast({
        title: 'Ação inválida',
        description: 'Você não pode iniciar uma conversa consigo mesmo.',
        variant: 'destructive'
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await getOrCreateConversation(
        currentUserId,
        otherUserId,
        orderId,
        subject || `Conversa com ${otherUserName}`
      );

      if (error) {
        console.error('Erro ao criar conversa:', error);
        toast({
          title: 'Erro ao iniciar conversa',
          description: error.includes('does not exist') 
            ? 'Sistema de chat ainda não configurado. Execute a migration no Supabase.'
            : 'Não foi possível iniciar a conversa. Tente novamente.',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      if (!data) {
        toast({
          title: 'Erro',
          description: 'Não foi possível criar a conversa.',
          variant: 'destructive'
        });
        setLoading(false);
        return;
      }

      toast({
        title: 'Conversa iniciada!',
        description: `Você pode agora conversar com ${otherUserName}.`
      });

      // Redirecionar para a página de mensagens
      router.push('/dashboard/messages');
    } catch (err) {
      console.error('Erro:', err);
      toast({
        title: 'Erro',
        description: 'Ocorreu um erro inesperado. Verifique se o sistema de chat está configurado.',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleStartChat}
      disabled={loading}
      className={className}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <MessageCircle className="h-4 w-4" />
      )}
      {showText && (
        <span className="ml-2">
          {loading ? 'Iniciando...' : 'Conversar'}
        </span>
      )}
    </Button>
  );
}
