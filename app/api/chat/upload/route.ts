import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Tipos de arquivo permitidos
const ALLOWED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const ALLOWED_FILE_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'application/zip',
  'application/x-rar-compressed'
];

const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const conversationId = formData.get('conversationId') as string;
    const senderId = formData.get('senderId') as string;

    if (!file || !conversationId || !senderId) {
      return NextResponse.json(
        { error: 'Arquivo, conversationId e senderId são obrigatórios' },
        { status: 400 }
      );
    }

    // Verificar tamanho
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Arquivo muito grande. Máximo permitido: 50MB' },
        { status: 400 }
      );
    }

    // Determinar tipo de mensagem
    let messageType: 'IMAGE' | 'VIDEO' | 'FILE';
    if (ALLOWED_IMAGE_TYPES.includes(file.type)) {
      messageType = 'IMAGE';
    } else if (ALLOWED_VIDEO_TYPES.includes(file.type)) {
      messageType = 'VIDEO';
    } else if (ALLOWED_FILE_TYPES.includes(file.type)) {
      messageType = 'FILE';
    } else {
      return NextResponse.json(
        { error: 'Tipo de arquivo não permitido' },
        { status: 400 }
      );
    }

    // Gerar nome único para o arquivo
    const timestamp = Date.now();
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
    const fileName = `${conversationId}/${timestamp}_${sanitizedName}`;

    // Converter File para ArrayBuffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = new Uint8Array(arrayBuffer);

    // Upload para Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage
      .from('chat-files')
      .upload(fileName, buffer, {
        contentType: file.type,
        cacheControl: '3600',
        upsert: false
      });

    if (uploadError) {
      console.error('Erro no upload:', uploadError);
      return NextResponse.json(
        { error: 'Erro ao fazer upload do arquivo' },
        { status: 500 }
      );
    }

    // Obter URL pública
    const { data: urlData } = supabaseAdmin.storage
      .from('chat-files')
      .getPublicUrl(fileName);

    const fileUrl = urlData.publicUrl;

    // Verificar se é uma conversa normal ou order_conversation
    const { data: normalConv } = await supabaseAdmin
      .from('conversations')
      .select('id')
      .eq('id', conversationId)
      .single();

    const isNormalConversation = !!normalConv;
    const tableName = isNormalConversation ? 'chat_messages' : 'order_conversation_messages';

    // Inserir mensagem com arquivo
    const messageData = {
      conversation_id: conversationId,
      sender_id: senderId,
      content: file.name,
      message_type: messageType,
      file_url: fileUrl,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size
    };

    const { data: message, error: msgError } = await supabaseAdmin
      .from(tableName)
      .insert(messageData)
      .select()
      .single();

    if (msgError) {
      console.error('Erro ao salvar mensagem:', msgError);
      return NextResponse.json(
        { error: 'Erro ao salvar mensagem: ' + msgError.message },
        { status: 500 }
      );
    }

    // Atualizar last_message_at
    const updateTable = isNormalConversation ? 'conversations' : 'order_conversations';
    await supabaseAdmin
      .from(updateTable)
      .update({ 
        last_message_at: new Date().toISOString(), 
        updated_at: new Date().toISOString() 
      })
      .eq('id', conversationId);

    return NextResponse.json({
      success: true,
      message: {
        ...message,
        file_url: fileUrl
      }
    });

  } catch (error: any) {
    console.error('Erro no upload:', error);
    return NextResponse.json(
      { error: error.message || 'Erro interno do servidor' },
      { status: 500 }
    );
  }
}
