import { NextResponse } from 'next/server';
import { runListingCreationTests } from '@/server/actions/test-listing-creation';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET() {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Não autorizado.' }, { status: 401 });
  }

  const { data: userData } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .maybeSingle();

  if ((userData as any)?.role !== 'admin') {
    return NextResponse.json({ error: 'Acesso negado.' }, { status: 403 });
  }

  try {
    const results = await runListingCreationTests();
    const allPassed = results.every(r => r.passed);

    return NextResponse.json({
      status: allPassed ? 'ALL PASSED' : 'SOME FAILED',
      total: results.length,
      passed: results.filter(r => r.passed).length,
      failed: results.filter(r => !r.passed).length,
      results,
    });
  } catch (error: any) {
    return NextResponse.json(
      { status: 'ERROR', error: error.message },
      { status: 500 }
    );
  }
}
