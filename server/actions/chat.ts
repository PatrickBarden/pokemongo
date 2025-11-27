'use server';

import { createClient } from '@supabase/supabase-js';
import { Database } from '@/lib/database.types';
import { revalidatePath } from 'next/cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

// Cliente Admin para operações privilegiadas
const supabaseAdmin = createClient<Database>(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

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
  message_type: 'TEXT' | 'IMAGE' | 'SYSTEM';
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
    const { data: conversations, error } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .or(`participant_1.eq.${userId},participant_2.eq.${userId}`)
      .order('last_message_at', { ascending: false });

    if (error) throw error;

    if (!conversations) return { data: [], error: null };

    // Buscar dados dos outros participantes e última mensagem
    const enrichedConversations = await Promise.all(
      (conversations as any[]).map(async (conv) => {
        const otherUserId = conv.participant_1 === userId ? conv.participant_2 : conv.participant_1;

        // Buscar dados do outro usuário
        const { data: otherUser } = await supabaseAdmin
          .from('users')
          .select('id, display_name, email')
          .eq('id', otherUserId)
          .single();

        // Buscar última mensagem
        const { data: lastMsg } = await supabaseAdmin
          .from('chat_messages')
          .select('content')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        // Contar mensagens não lidas
        const { count } = await supabaseAdmin
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id)
          .neq('sender_id', userId)
          .is('read_at', null);

        return {
          ...conv,
          other_user: otherUser,
          last_message: lastMsg?.content,
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
 * Listar todas as conversas (para admin)
 */
export async function getAllConversations(): Promise<{ data: any[]; error: string | null }> {
  try {
    const { data: conversations, error } = await supabaseAdmin
      .from('conversations')
      .select('*')
      .order('last_message_at', { ascending: false });

    if (error) throw error;

    if (!conversations) return { data: [], error: null };

    // Enriquecer com dados dos participantes
    const enrichedConversations = await Promise.all(
      (conversations as any[]).map(async (conv) => {
        const { data: users } = await supabaseAdmin
          .from('users')
          .select('id, display_name, email')
          .in('id', [conv.participant_1, conv.participant_2]);

        const { data: lastMsg } = await supabaseAdmin
          .from('chat_messages')
          .select('content, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .single();

        const { count } = await supabaseAdmin
          .from('chat_messages')
          .select('*', { count: 'exact', head: true })
          .eq('conversation_id', conv.id);

        return {
          ...conv,
          participants: users,
          last_message: lastMsg?.content,
          message_count: count || 0
        };
      })
    );

    return { data: enrichedConversations, error: null };
  } catch (error: any) {
    console.error('Erro ao listar todas conversas:', error);
    return { data: [], error: error.message };
  }
}

// =============================================
// MENSAGENS
// =============================================

/**
 * Enviar mensagem
 */
export async function sendMessage(
  conversationId: string,
  senderId: string,
  content: string,
  messageType: 'TEXT' | 'IMAGE' = 'TEXT'
): Promise<{ data: ChatMessage | null; error: string | null }> {
  try {
    const { data: message, error } = await supabaseAdmin
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

    revalidatePath('/dashboard/messages');
    return { data: message as ChatMessage, error: null };
  } catch (error: any) {
    console.error('Erro ao enviar mensagem:', error);
    return { data: null, error: error.message };
  }
}

/**
 * Buscar mensagens de uma conversa
 */
export async function getConversationMessages(
  conversationId: string,
  limit: number = 50
): Promise<{ data: ChatMessage[]; error: string | null }> {
  try {
    const { data: messages, error } = await supabaseAdmin
      .from('chat_messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true })
      .limit(limit);

    if (error) throw error;

    if (!messages) return { data: [], error: null };

    // Buscar dados dos remetentes
    const senderIds = Array.from(new Set((messages as any[]).map(m => m.sender_id)));
    const { data: senders } = await supabaseAdmin
      .from('users')
      .select('id, display_name')
      .in('id', senderIds);

    const sendersMap = new Map((senders as any[])?.map(s => [s.id, s]) || []);

    const enrichedMessages = (messages as any[]).map(msg => ({
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
    // Atualizar status da conversa
    const { error: updateError } = await supabaseAdmin
      .from('conversations')
      .update({
        status: 'CLOSED',
        closed_at: new Date().toISOString(),
        closed_by: adminId
      } as any)
      .eq('id', conversationId);

    if (updateError) throw updateError;

    // Enviar mensagem de sistema informando o encerramento
    const { error: msgError } = await supabaseAdmin
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: adminId,
        content: '🔒 Esta conversa foi encerrada pela administração. Por favor, avalie sua experiência de negociação.',
        message_type: 'SYSTEM'
      } as any);

    if (msgError) throw msgError;

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
    const { error } = await supabaseAdmin
      .from('conversations')
      .update({
        status: 'ACTIVE',
        closed_at: null,
        closed_by: null
      } as any)
      .eq('id', conversationId);

    if (error) throw error;

    // Mensagem de sistema
    await supabaseAdmin
      .from('chat_messages')
      .insert({
        conversation_id: conversationId,
        sender_id: '00000000-0000-0000-0000-000000000000',
        content: '🔓 Esta conversa foi reaberta pela administração.',
        message_type: 'SYSTEM'
      } as any);

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
