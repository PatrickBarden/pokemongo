import { NextResponse } from 'next/server';
import { runListingCreationTests } from '@/server/actions/test-listing-creation';

export async function GET() {
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
