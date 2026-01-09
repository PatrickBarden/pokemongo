import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

export async function GET() {
  try {
    // Buscar contagem de dispositivos por plataforma
    const { data: androidData } = await supabaseAdmin
      .from('device_tokens')
      .select('id', { count: 'exact', head: true })
      .eq('platform', 'android')
      .eq('is_active', true);

    const { data: iosData } = await supabaseAdmin
      .from('device_tokens')
      .select('id', { count: 'exact', head: true })
      .eq('platform', 'ios')
      .eq('is_active', true);

    const { data: webData } = await supabaseAdmin
      .from('device_tokens')
      .select('id', { count: 'exact', head: true })
      .eq('platform', 'web')
      .eq('is_active', true);

    // Contar totais
    const { count: androidCount } = await supabaseAdmin
      .from('device_tokens')
      .select('id', { count: 'exact', head: true })
      .eq('platform', 'android')
      .eq('is_active', true);

    const { count: iosCount } = await supabaseAdmin
      .from('device_tokens')
      .select('id', { count: 'exact', head: true })
      .eq('platform', 'ios')
      .eq('is_active', true);

    const { count: webCount } = await supabaseAdmin
      .from('device_tokens')
      .select('id', { count: 'exact', head: true })
      .eq('platform', 'web')
      .eq('is_active', true);

    return NextResponse.json({
      total: (androidCount || 0) + (iosCount || 0) + (webCount || 0),
      android: androidCount || 0,
      ios: iosCount || 0,
      web: webCount || 0
    });
  } catch (error) {
    console.error('Erro ao buscar stats:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
