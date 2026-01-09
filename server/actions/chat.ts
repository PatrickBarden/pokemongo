'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';
import { notifyNewMessage } from './push-notifications';

// Cliente Admin para operações privilegiadas - criado sob demanda (SEM tipagem para evitar problemas de cache)
function getSupabaseAdmin() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Missing Supabase env vars in chat.ts');
    throw new Error('Missing Supabase credentials');
  }
  
  return createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
    db: { schema: 'public' }
  });
}

// Alias para compatibilidade com código existente
const supabaseAdmin = {
  from: (table: string) => getSupabaseAdmin().from(table as any),
  rpc: (fn: string, params?: any) => getSupabaseAdmin().rpc(fn as any, params),
};

// Tipos
export type Conversation = {
  id: string;
  order_id: string | null;
  participant_1: string;
  participant_2: string;
  subject: string | null;
  status: 'ACTIVE' | 'CLOSED' | 'ARCHIVED';
  created_at: string;
  updated_at: string;
  last_message_at: string;
  other_user?: {
    id: string;
    display_name: string;
    email: string;
  };
  unread_count?: number;
  last_message?: string;
};

export type ChatMessage = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'FILE' | 'SYSTEM';
  file_url?: string | null;
  file_name?: string | null;
  file_type?: string | null;
  file_size?: number | null;
  read_at: string | null;
  created_at: string;
  sender?: {
    id: string;
    display_name: string;
  };
};

// =============================================
// CONVERSAS
// =============================================

/**
 * Buscar ou criar conversa entre dois usuários
 */
export async function getOrCreateConversation(
  userId: string,
  otherUserId: string,
  orderId?: string,
  subject?: string
): Promise<{ data: Conversation | null; error: string | null }> {
  try {
    // Verificar se já existe conversa entre os dois usuários (para esta ordem ou geral)
    let query = supabaseAdmin
      .from('conversations')
      .select('*')
      .or(`and(participant_1.eq.${userId},participant_2.eq.${otherUserId}),and(participant_1.eq.${otherUserId},participant_2.eq.${userId})`);

    if (orderId) {
      query = query.eq('order_id', orderId);
    }

    const { data: existing } = await query.maybeSingle();

    if (existing) {
      return { data: existing as Conversation, error: null };
    }

    // Criar nova conversa
    const { data: newConv, error } = await supabaseAdmin
      .from('conversations')
      .insert({
        participant_1: userId,
        participant_2: otherUserId,
        order_id: orderId || null,
        subject: subject || null,
        status: 'ACTIVE'
      } as any)
      .select()
      .single();

    if (error) throw error;

    // Adicionar mensagem de sistema
    await supabaseAdmin
      .from('chat_messages')
      .insert({
        conversation_id: newConv.id,
        sender_id: userId,
        content: 'Conversa iniciada',
        message_type: 'SYSTEM'
      } as any);

    return { data: newConv as Conversation, error: null };
  } catch (error: any) {
    console.error('Erro ao criar/buscar conversa:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Listar conversas de um usuário
 */
export async function getUserConversations(
  userId: string
): Promise<{ data: Conversation[]; error: string | null }> {
  try {
    console.log('getUserConversations - userId:', userId);
    
    const client = getSupabaseAdmin();
    const { data: conversations, error } = await client
      .from('conversations')
      .select('*')
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    console.log('getUserConversations - found:', conversations?.length, 'error:', error?.message);

    if (error) throw error;

    if (!conversations) return { data: [], error: null };

    // Buscar dados dos outros participantes e última mensagem
    const enrichedConversations = await Promise.all(
      (conversations as any[]).map(async (conv) => {
        const otherUserId = conv.participant_1 === userId ? conv.participant_2 : conv.participant_1;

        // Buscar dados do outro usuário
        const { data: otherUser } = await client
          .from('users')
          .select('id, display_name, email')
          .eq('id', otherUserId)
          .single();

        // Buscar última mensagem
        const { data: lastMsg } = await client
          .from('chat_messages')
          .select('content')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Contar mensagens não lidas
        const { count } = await client
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .neq('sender_id', userId)
          .is('read_at', null);

        return {
          ...conv,
          other_user: otherUser,
          last_message: (lastMsg as any)?.content,
          unread_count: count || 0
        };
      })
    );

    return { data: enrichedConversations, error: null };
  } catch (error: any) {
    console.error('Erro ao listar conversas:', error);
    return { data: [], error: error.message };
  }
}

/**
 * Buscar detalhes de uma conversa (para admin)
 */
export async function getConversationDetails(
  conversationId: string
): Promise<{ data: Conversation | null; error: string | null }> {
  try {
    const { data: conv, error } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .eq('id', conversationId)
      .single();

    if (error) throw error;

    // Buscar dados dos participantes
    const { data: users } = await supabaseAdmin
      .from('users')
      .select('id, display_name, email')
      .in('id', [(conv as any).participant_1, (conv as any).participant_2]);

    return {
      data: {
        ...conv,
        participants: users
      } as any,
      error: null
    };
  } catch (error: any) {
    console.error('Erro ao buscar conversa:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Listar todas as conversas (para admin) - APENAS order_conversations
 * As mensagens da conversa direta são mescladas automaticamente ao visualizar
 */
export async function getAllConversations(): Promise<{ data: any[]; error: string | null }> {
  try {
    const allConversations: any[] = [];

    // Buscar order_conversations (conversas de pedidos com 3 participantes)
    const { data: orderConversations, error: orderError } = await supabaseAdmin
      .from('order_conversations')
      .select('*')
      .order('updated_at', { ascending: false });

    if (orderError) throw orderError;

    if (orderConversations && orderConversations.length > 0) {
      const enrichedOrderConversations = await Promise.all(
        (orderConversations as any[]).map(async (conv) => {
          // Buscar todos os participantes (buyer, seller, admin)
          const participantIds = [conv.buyer_id, conv.seller_id, conv.admin_id].filter(Boolean);
          const { data: users } = await supabaseAdmin
            .from('users')
            .select('id, display_name, email, role')
            .in('id', participantIds);

          // Contar mensagens de order_conversation_messages
          const { count: orderMsgCount } = await supabaseAdmin
            .from('order_conversation_messages')
            .select('*', { count: 'exact', head: true })
            .eq('conversation_id', conv.id);

          // Também contar mensagens da conversa direta relacionada
          let directMsgCount = 0;
          let lastMessage = null;
          let lastMessageAt = conv.updated_at;

          const { data: relatedConv } = await supabaseAdmin
            .from('conversations')
            .select('id')
            .eq('order_id', conv.order_id)
            .single();

          if (relatedConv) {
            const { count } = await supabaseAdmin
              .from('chat_messages')
              .select('*', { count: 'exact', head: true })
              .eq('conversation_id', (relatedConv as any).id);
            directMsgCount = count || 0;

            // Buscar última mensagem (pode ser de qualquer tabela)
            const { data: lastDirectMsg } = await supabaseAdmin
              .from('chat_messages')
              .select('content, created_at')
              .eq('conversation_id', (relatedConv as any).id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (lastDirectMsg) {
              lastMessage = (lastDirectMsg as any).content;
              lastMessageAt = (lastDirectMsg as any).created_at;
            }
          }

          // Buscar última mensagem de order_conversation_messages se não tiver da direta
          if (!lastMessage) {
            const { data: lastOrderMsg } = await supabaseAdmin
              .from('order_conversation_messages')
              .select('content, created_at')
              .eq('conversation_id', conv.id)
              .order('created_at', { ascending: false })
              .limit(1)
              .single();

            if (lastOrderMsg) {
              lastMessage = (lastOrderMsg as any).content;
              lastMessageAt = (lastOrderMsg as any).created_at;
            }
          }

          const totalMessages = (orderMsgCount || 0) + directMsgCount;

          // Mapear para formato compatível com a UI
          const buyer = users?.find((u: any) => u.id === conv.buyer_id);
          const seller = users?.find((u: any) => u.id === conv.seller_id);

          return {
            id: conv.id,
            order_id: conv.order_id,
            participant_1: conv.buyer_id,
            participant_2: conv.seller_id,
            buyer_id: conv.buyer_id,
            seller_id: conv.seller_id,
            admin_id: conv.admin_id,
            subject: conv.subject || `Pedido - Suporte`,
            status: conv.status,
            created_at: conv.created_at,
            updated_at: conv.updated_at,
            last_message_at: lastMessageAt,
            conversation_type: 'order',
            participants: users,
            buyer,
            seller,
            last_message: lastMessage,
            message_count: totalMessages
          };
        })
      );
      allConversations.push(...enrichedOrderConversations);
    }

    // Ordenar por última atividade
    allConversations.sort((a, b) => 
      new Date(b.last_message_at || b.updated_at).getTime() - 
      new Date(a.last_message_at || a.updated_at).getTime()
    );

    return { data: allConversations, error: null };
  } catch (error: any) {
    console.error('Erro ao listar todas conversas:', error);
    return { data: [], error: error.message };
  }
}

// =============================================
// MENSAGENS
// =============================================

/**
 * Enviar mensagem (detecta automaticamente a tabela correta)
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  messageType: 'TEXT' | 'IMAGE' = 'TEXT'
): Promise<{ data: ChatMessage | null; error: string | null }> {
  try {
    const client = getSupabaseAdmin();
    
    // Verificar se é uma conversa normal ou de pedido
    const { data: normalConv } = await client
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .single();
    
    const isNormalConversation = !!normalConv;
    
    if (isNormalConversation) {
      // Inserir em chat_messages
      const { data: message, error } = await client
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content,
          message_type: messageType
        } as any)
        .select()
        .single();

      if (error) throw error;
      
      // Atualizar last_message_at na conversa
      await client
        .from('conversations')
        .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      // Enviar push notification para o destinatário
      try {
        const { data: conv } = await client
          .from('conversations')
          .select('participant_1, participant_2')
          .eq('id', conversationId)
          .single();
        
        if (conv) {
          const recipientId = (conv as any).participant_1 === senderId 
            ? (conv as any).participant_2 
            : (conv as any).participant_1;
          
          // Buscar nome do remetente
          const { data: sender } = await client
            .from('users')
            .select('display_name')
            .eq('id', senderId)
            .single();
          
          const senderName = (sender as any)?.display_name || 'Alguém';
          
          // Enviar push (não bloqueia o retorno)
          notifyNewMessage(recipientId, senderName, content, conversationId).catch(console.error);
        }
      } catch (pushError) {
        console.error('Erro ao enviar push de mensagem:', pushError);
      }

      revalidatePath('/dashboard/messages');
      return { data: message as ChatMessage, error: null };
    } else {
      // É uma order_conversation - inserir em order_conversation_messages
      const { data: message, error } = await client
        .from('order_conversation_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: senderId,
          content,
          message_type: messageType
        } as any)
        .select()
        .single();

      if (error) throw error;
      
      // Atualizar last_message_at na order_conversation
      await client
        .from('order_conversations')
        .update({ last_message_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        .eq('id', conversationId);

      revalidatePath('/dashboard/messages');
      return { data: message as ChatMessage, error: null };
    }
  } catch (error: any) {
    console.error('Erro ao enviar mensagem:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Buscar mensagens de uma conversa (suporta chat_messages e order_conversation_messages)
 * Para order_conversations, também busca mensagens da conversa direta relacionada
 */
export async function getConversationMessages(
  conversationId: string,
  limit: number = 100
): Promise<{ data: ChatMessage[]; error: string | null }> {
  try {
    // Criar cliente diretamente SEM tipagem (igual à API de teste que funcionou)
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: 'public' }
    });
    
    let allMessages: any[] = [];
    
    // 1. Verificar se é uma order_conversation
    const { data: orderConv, error: orderConvErr } = await client
      .from('order_conversations')
      .select('id, order_id, buyer_id, seller_id')
      .eq('id', conversationId)
      .single();
    
    if (orderConv) {
      // É uma order_conversation - buscar mensagens de order_conversation_messages
      const { data: orderMessages, error: orderErr } = await client
        .from('order_conversation_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });
      
      if (orderErr) {
        console.error('Erro ao buscar order_messages:', orderErr);
      }
      
      if (orderMessages) {
        allMessages.push(...orderMessages);
      }
      
      // TAMBÉM buscar mensagens da conversa direta relacionada ao mesmo pedido
      const { data: relatedConv } = await client
        .from('conversations')
        .select('id')
        .eq('order_id', (orderConv as any).order_id)
        .single();
      
      if (relatedConv) {
        const { data: directMessages } = await client
          .from('chat_messages')
          .select('*')
          .eq('conversation_id', (relatedConv as any).id)
          .order('created_at', { ascending: true });
        
        if (directMessages) {
          allMessages.push(...directMessages);
        }
      }
    } else {
      // É uma conversa normal - buscar de chat_messages
      const { data: chatMessages, error: chatErr } = await client
        .from('chat_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (chatErr) {
        console.error('Erro ao buscar chat_messages:', chatErr);
      }

      if (chatMessages) {
        allMessages = chatMessages;
      }
    }

    if (allMessages.length === 0) return { data: [], error: null };

    // Ordenar todas as mensagens por data
    allMessages.sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());

    // Buscar dados dos remetentes
    const senderIds = Array.from(new Set(allMessages.map(m => m.sender_id)));
    const { data: senders } = await client
      .from('users')
      .select('id, display_name')
      .in('id', senderIds);

    const sendersMap = new Map((senders as any[])?.map(s => [s.id, s]) || []);

    const enrichedMessages = allMessages.map(msg => ({
      ...msg,
      sender: sendersMap.get(msg.sender_id)
    }));

    return { data: enrichedMessages, error: null };
  } catch (error: any) {
    console.error('Erro ao buscar mensagens:', error);
    return { data: [], error: error.message };
  }
}

/**
 * Marcar mensagens como lidas
 */
export async function markMessagesAsRead(
  conversationId: string,
  userId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabaseAdmin
      .from('chat_messages')
      .update({ read_at: new Date().toISOString() } as any)
      .eq('conversation_id', conversationId)
      .neq('sender_id', userId)
      .is('read_at', null);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Erro ao marcar como lido:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Contar mensagens não lidas do usuário
 */
export async function getUnreadCount(
  userId: string
): Promise<{ count: number; error: string | null }> {
  try {
    // Buscar conversas do usuário
    const { data: conversations } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`);

    if (!conversations || conversations.length === 0) {
      return { count: 0, error: null };
    }

    const convIds = (conversations as any[]).map(c => c.id);

    // Contar mensagens não lidas
    const { count, error } = await supabaseAdmin
      .from('chat_messages')
      .select('*', { count: 'exact', head: true })
      .in('conversation_id', convIds)
      .neq('sender_id', userId)
      .is('read_at', null);

    if (error) throw error;

    return { count: count || 0, error: null };
  } catch (error: any) {
    console.error('Erro ao contar não lidas:', error);
    return { count: 0, error: error.message };
  }
}

/**
 * Encerra uma conversa (apenas admin)
 */
export async function closeConversation(
  conversationId: string,
  adminId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    // Criar cliente sem tipagem
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: 'public' }
    });

    // Verificar se é uma order_conversation
    const { data: orderConv } = await client
      .from('order_conversations')
      .select('id')
      .eq('id', conversationId)
      .single();

    if (orderConv) {
      // É uma order_conversation
      const { error: updateError } = await client
        .from('order_conversations')
        .update({ status: 'CLOSED' })
        .eq('id', conversationId);

      if (updateError) throw updateError;

      // Enviar mensagem de sistema
      const { error: msgError } = await client
        .from('order_conversation_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: adminId,
          content: '🔒 Esta conversa foi encerrada pela administração. Por favor, avalie sua experiência de negociação.',
          message_type: 'SYSTEM',
          read_by_buyer: false,
          read_by_seller: false,
          read_by_admin: true
        });

      if (msgError) throw msgError;
    } else {
      // É uma conversa normal
      const { error: updateError } = await client
        .from('conversations')
        .update({
          status: 'CLOSED',
          closed_at: new Date().toISOString(),
          closed_by: adminId
        })
        .eq('id', conversationId);

      if (updateError) throw updateError;

      // Enviar mensagem de sistema
      const { error: msgError } = await client
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: adminId,
          content: '🔒 Esta conversa foi encerrada pela administração. Por favor, avalie sua experiência de negociação.',
          message_type: 'SYSTEM'
        });

      if (msgError) throw msgError;
    }

    revalidatePath('/admin/chat');
    revalidatePath('/dashboard/messages');

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Erro ao encerrar conversa:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Reabre uma conversa (apenas admin)
 */
export async function reopenConversation(
  conversationId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    // Criar cliente sem tipagem
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: 'public' }
    });

    // Verificar se é uma order_conversation
    const { data: orderConv } = await client
      .from('order_conversations')
      .select('id, admin_id')
      .eq('id', conversationId)
      .single();

    if (orderConv) {
      // É uma order_conversation
      const { error } = await client
        .from('order_conversations')
        .update({ status: 'ACTIVE' })
        .eq('id', conversationId);

      if (error) throw error;

      // Mensagem de sistema
      await client
        .from('order_conversation_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: (orderConv as any).admin_id,
          content: '🔓 Esta conversa foi reaberta pela administração.',
          message_type: 'SYSTEM',
          read_by_buyer: false,
          read_by_seller: false,
          read_by_admin: true
        });
    } else {
      // É uma conversa normal
      const { error } = await client
        .from('conversations')
        .update({
          status: 'ACTIVE',
          closed_at: null,
          closed_by: null
        })
        .eq('id', conversationId);

      if (error) throw error;

      // Mensagem de sistema
      await client
        .from('chat_messages')
        .insert({
          conversation_id: conversationId,
          sender_id: '00000000-0000-0000-0000-000000000000',
          content: '🔓 Esta conversa foi reaberta pela administração.',
          message_type: 'SYSTEM'
        });
    }

    revalidatePath('/admin/chat');
    revalidatePath('/dashboard/messages');

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Erro ao reabrir conversa:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Salva avaliação do usuário sobre a conversa
 */
export async function submitConversationRating(
  conversationId: string,
  userId: string,
  rating: number,
  feedback?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    // Buscar conversa para saber se é buyer ou seller
    const { data: conv } = await supabaseAdmin
      .from('conversations')
      .select('participant_1, participant_2')
      .eq('id', conversationId)
      .single();

    if (!conv) throw new Error('Conversa não encontrada');

    // Determinar qual campo atualizar baseado no participante
    const isBuyer = (conv as any).participant_1 === userId;
    const updateData = isBuyer 
      ? { buyer_rating: rating, buyer_feedback: feedback }
      : { seller_rating: rating, seller_feedback: feedback };

    const { error } = await supabaseAdmin
      .from('conversations')
      .update(updateData as any)
      .eq('id', conversationId);

    if (error) throw error;

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Erro ao salvar avaliação:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Verifica se a conversa está encerrada
 */
export async function isConversationClosed(
  conversationId: string
): Promise<{ closed: boolean; error: string | null }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('conversations')
      .select('status')
      .eq('id', conversationId)
      .single();

    if (error) throw error;

    return { closed: (data as any)?.status === 'CLOSED', error: null };
  } catch (error: any) {
    return { closed: false, error: error.message };
  }
}

/**
 * Marcar mensagens como lidas pelo admin
 * Marca apenas mensagens de compradores/vendedores (não do admin)
 */
export async function markMessagesAsReadByAdmin(
  conversationId: string,
  adminId: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    // Criar cliente sem tipagem
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: 'public' }
    });
    
    // Marcar mensagens em order_conversation_messages (apenas de outros usuários)
    const { error } = await client
      .from('order_conversation_messages')
      .update({ read_by_admin: true })
      .eq('conversation_id', conversationId)
      .neq('sender_id', adminId)
      .or('read_by_admin.is.null,read_by_admin.eq.false');

    if (error) {
      console.error('Erro ao marcar mensagens:', error);
    }

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Erro ao marcar mensagens como lidas:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Obter contagem de mensagens não lidas para o admin
 * Conta apenas mensagens de compradores/vendedores que o admin ainda não leu
 */
export async function getAdminUnreadCounts(): Promise<{ 
  data: { conversationId: string; unreadCount: number }[]; 
  totalUnread: number;
  error: string | null 
}> {
  try {
    // Criar cliente sem tipagem
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const client = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: 'public' }
    });
    
    // Buscar todas as order_conversations com admin_id
    const { data: conversations } = await client
      .from('order_conversations')
      .select('id, admin_id');

    if (!conversations) return { data: [], totalUnread: 0, error: null };

    const counts: { conversationId: string; unreadCount: number }[] = [];
    let totalUnread = 0;

    for (const conv of conversations as any[]) {
      // Contar mensagens não lidas pelo admin, EXCLUINDO mensagens do próprio admin
      const { count } = await client
        .from('order_conversation_messages')
        .select('*', { count: 'exact', head: true })
        .eq('conversation_id', conv.id)
        .neq('sender_id', conv.admin_id) // Excluir mensagens do admin
        .or('read_by_admin.is.null,read_by_admin.eq.false');

      const unreadCount = count || 0;
      if (unreadCount > 0) {
        counts.push({ conversationId: conv.id, unreadCount });
        totalUnread += unreadCount;
      }
    }

    return { data: counts, totalUnread, error: null };
  } catch (error: any) {
    console.error('Erro ao buscar contagem de não lidas:', error);
    return { data: [], totalUnread: 0, error: error.message };
  }
}
