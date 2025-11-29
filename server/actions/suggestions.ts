'use server';

import { createClient } from '@supabase/supabase-js';
import { revalidatePath } from 'next/cache';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export type Suggestion = {
  id: string;
  user_id: string;
  title: string;
  description: string;
  category: 'geral' | 'interface' | 'funcionalidade' | 'bug' | 'outro';
  status: 'pending' | 'reviewing' | 'approved' | 'implemented' | 'rejected';
  admin_response: string | null;
  responded_at: string | null;
  responded_by: string | null;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  votes_count: number;
  created_at: string;
  updated_at: string;
  user?: {
    display_name: string;
    email: string;
  };
  has_voted?: boolean;
};

export type CreateSuggestionInput = {
  user_id: string;
  title: string;
  description: string;
  category: string;
};

// Criar nova sugestão
export async function createSuggestion(input: CreateSuggestionInput): Promise<{ data: Suggestion | null; error: string | null }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('suggestions')
      .insert({
        user_id: input.user_id,
        title: input.title.trim(),
        description: input.description.trim(),
        category: input.category,
        status: 'pending',
        priority: 'normal',
        votes_count: 0
      })
      .select()
      .single();

    if (error) throw error;

    // Notificar admins sobre nova sugestão
    const { data: admins } = await supabaseAdmin
      .from('users')
      .select('id')
      .eq('role', 'admin');

    if (admins && admins.length > 0) {
      const notifications = admins.map((admin: any) => ({
        user_id: admin.id,
        type: 'system',
        title: 'Nova Sugestão Recebida',
        message: `${input.title}`,
        link: '/admin/suggestions',
        read: false
      }));

      await supabaseAdmin.from('user_notifications').insert(notifications);
    }

    revalidatePath('/dashboard/suggestions');
    revalidatePath('/admin/suggestions');

    return { data: data as Suggestion, error: null };
  } catch (error: any) {
    console.error('Erro ao criar sugestão:', error);
    return { data: null, error: error.message || 'Erro ao criar sugestão' };
  }
}

// Listar sugestões do usuário
export async function getUserSuggestions(userId: string): Promise<{ data: Suggestion[]; error: string | null }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('suggestions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    return { data: (data || []) as Suggestion[], error: null };
  } catch (error: any) {
    console.error('Erro ao buscar sugestões:', error);
    return { data: [], error: error.message };
  }
}

// Listar todas as sugestões (para admin)
export async function getAllSuggestions(filters?: {
  status?: string;
  category?: string;
  priority?: string;
}): Promise<{ data: Suggestion[]; error: string | null }> {
  try {
    let query = supabaseAdmin
      .from('suggestions')
      .select(`
        *,
        user:user_id(display_name, email)
      `)
      .order('created_at', { ascending: false });

    if (filters?.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }
    if (filters?.category && filters.category !== 'all') {
      query = query.eq('category', filters.category);
    }
    if (filters?.priority && filters.priority !== 'all') {
      query = query.eq('priority', filters.priority);
    }

    const { data, error } = await query;

    if (error) throw error;

    return { data: (data || []) as Suggestion[], error: null };
  } catch (error: any) {
    console.error('Erro ao buscar sugestões:', error);
    return { data: [], error: error.message };
  }
}

// Listar sugestões públicas (para comunidade)
export async function getPublicSuggestions(userId?: string): Promise<{ data: Suggestion[]; error: string | null }> {
  try {
    const { data, error } = await supabaseAdmin
      .from('suggestions')
      .select(`
        *,
        user:user_id(display_name)
      `)
      .in('status', ['pending', 'reviewing', 'approved', 'implemented'])
      .order('votes_count', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;

    let suggestions = (data || []) as Suggestion[];

    // Verificar se o usuário votou em cada sugestão
    if (userId) {
      const { data: votes } = await supabaseAdmin
        .from('suggestion_votes')
        .select('suggestion_id')
        .eq('user_id', userId);

      const votedIds = new Set((votes || []).map((v: any) => v.suggestion_id));
      suggestions = suggestions.map(s => ({
        ...s,
        has_voted: votedIds.has(s.id)
      }));
    }

    return { data: suggestions, error: null };
  } catch (error: any) {
    console.error('Erro ao buscar sugestões:', error);
    return { data: [], error: error.message };
  }
}

// Responder sugestão (admin)
export async function respondToSuggestion(
  suggestionId: string,
  adminId: string,
  response: string,
  status: string,
  priority?: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const updateData: any = {
      admin_response: response.trim(),
      responded_at: new Date().toISOString(),
      responded_by: adminId,
      status
    };

    if (priority) {
      updateData.priority = priority;
    }

    const { data: suggestion, error } = await supabaseAdmin
      .from('suggestions')
      .update(updateData)
      .eq('id', suggestionId)
      .select('user_id, title')
      .single();

    if (error) throw error;

    // Notificar o usuário sobre a resposta
    if (suggestion) {
      await supabaseAdmin.from('user_notifications').insert({
        user_id: (suggestion as any).user_id,
        type: 'system',
        title: 'Sua sugestão foi respondida',
        message: `A sugestão "${(suggestion as any).title}" recebeu uma resposta da equipe.`,
        link: '/dashboard/suggestions',
        read: false
      });
    }

    revalidatePath('/dashboard/suggestions');
    revalidatePath('/admin/suggestions');

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Erro ao responder sugestão:', error);
    return { success: false, error: error.message };
  }
}

// Votar em sugestão
export async function voteSuggestion(
  suggestionId: string,
  userId: string
): Promise<{ success: boolean; voted: boolean; error: string | null }> {
  try {
    // Verificar se já votou
    const { data: existingVote } = await supabaseAdmin
      .from('suggestion_votes')
      .select('id')
      .eq('suggestion_id', suggestionId)
      .eq('user_id', userId)
      .single();

    if (existingVote) {
      // Remover voto
      await supabaseAdmin
        .from('suggestion_votes')
        .delete()
        .eq('suggestion_id', suggestionId)
        .eq('user_id', userId);

      revalidatePath('/dashboard/suggestions');
      return { success: true, voted: false, error: null };
    } else {
      // Adicionar voto
      await supabaseAdmin
        .from('suggestion_votes')
        .insert({
          suggestion_id: suggestionId,
          user_id: userId
        });

      revalidatePath('/dashboard/suggestions');
      return { success: true, voted: true, error: null };
    }
  } catch (error: any) {
    console.error('Erro ao votar:', error);
    return { success: false, voted: false, error: error.message };
  }
}

// Atualizar status (admin)
export async function updateSuggestionStatus(
  suggestionId: string,
  status: string
): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabaseAdmin
      .from('suggestions')
      .update({ status })
      .eq('id', suggestionId);

    if (error) throw error;

    revalidatePath('/dashboard/suggestions');
    revalidatePath('/admin/suggestions');

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Erro ao atualizar status:', error);
    return { success: false, error: error.message };
  }
}

// Deletar sugestão
export async function deleteSuggestion(suggestionId: string): Promise<{ success: boolean; error: string | null }> {
  try {
    const { error } = await supabaseAdmin
      .from('suggestions')
      .delete()
      .eq('id', suggestionId);

    if (error) throw error;

    revalidatePath('/dashboard/suggestions');
    revalidatePath('/admin/suggestions');

    return { success: true, error: null };
  } catch (error: any) {
    console.error('Erro ao deletar sugestão:', error);
    return { success: false, error: error.message };
  }
}

// Estatísticas de sugestões (admin)
export async function getSuggestionStats(): Promise<{
  total: number;
  pending: number;
  reviewing: number;
  approved: number;
  implemented: number;
  rejected: number;
}> {
  try {
    const { data, error } = await supabaseAdmin
      .from('suggestions')
      .select('status');

    if (error) throw error;

    const stats = {
      total: data?.length || 0,
      pending: 0,
      reviewing: 0,
      approved: 0,
      implemented: 0,
      rejected: 0
    };

    (data || []).forEach((s: any) => {
      if (s.status in stats) {
        (stats as any)[s.status]++;
      }
    });

    return stats;
  } catch (error) {
    console.error('Erro ao buscar estatísticas:', error);
    return { total: 0, pending: 0, reviewing: 0, approved: 0, implemented: 0, rejected: 0 };
  }
}
