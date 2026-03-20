'use server';

import { getSupabaseAdminSingleton } from '@/lib/supabase-admin';

type TestResult = {
  test: string;
  passed: boolean;
  error?: string;
};

/**
 * Test flow to verify listing creation works for both admin and user paths.
 * Creates temporary listings and deletes them after testing.
 *
 * Run via: import { runListingCreationTests } from '@/server/actions/test-listing-creation';
 */
export async function runListingCreationTests(): Promise<TestResult[]> {
  const results: TestResult[] = [];
  const db = getSupabaseAdminSingleton();
  const listings = db.from('listings') as any;
  const accountListings = db.from('account_listings') as any;
  const users = db.from('users') as any;
  const cleanupIds: string[] = [];

  try {
    // ── Setup: get admin and regular user ──
    const { data: adminUser } = await users
      .select('id, email, role')
      .eq('role', 'admin')
      .limit(1)
      .single();

    const { data: regularUser } = await users
      .select('id, email, role')
      .neq('role', 'admin')
      .limit(1)
      .single();

    if (!adminUser || !regularUser) {
      return [{ test: 'Setup', passed: false, error: 'Need at least 1 admin and 1 regular user' }];
    }

    // ── TEST 1: User creates own listing (server action path, service role) ──
    {
      const { data, error } = await listings
        .insert({
          owner_id: regularUser.id,
          title: '__TEST__ User Pokemon Listing',
          description: 'Test: user creates own listing via server action',
          category: 'pokemon',
          pokemon_type: 'normal',
          price_suggested: 1,
          active: false,
          admin_approved: false,
        })
        .select('id')
        .single();

      results.push({
        test: '1. User creates own listing (service role key)',
        passed: !error && !!data,
        error: error?.message,
      });
      if (data) cleanupIds.push(data.id);
    }

    // ── TEST 2: Admin creates listing on behalf of another user ──
    {
      const { data, error } = await listings
        .insert({
          owner_id: regularUser.id,
          title: '__TEST__ Admin Creates for User',
          description: 'Test: admin creates listing for another user',
          category: 'pokemon',
          pokemon_type: 'fire',
          price_suggested: 2,
          active: true,
          admin_approved: true,
          approved_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      results.push({
        test: '2. Admin creates listing for another user',
        passed: !error && !!data,
        error: error?.message,
      });
      if (data) cleanupIds.push(data.id);
    }

    // ── TEST 3: Approval columns exist ──
    {
      const { data, error } = await listings
        .select('admin_approved, approved_at, rejected_at, rejection_reason')
        .limit(1);

      results.push({
        test: '3. Listing table has approval columns',
        passed: !error,
        error: error?.message,
      });
    }

    // ── TEST 4: Account listing full creation + cleanup ──
    {
      const { data: listing, error: listingError } = await listings
        .insert({
          owner_id: regularUser.id,
          title: '__TEST__ Account Listing',
          description: 'Test: account listing base',
          category: 'account',
          pokemon_type: 'account',
          price_suggested: 100,
          active: false,
          admin_approved: false,
          tags: ['account_sale'],
        })
        .select('id')
        .single();

      if (listingError || !listing) {
        results.push({
          test: '4. Account listing creation',
          passed: false,
          error: listingError?.message || 'No listing returned',
        });
      } else {
        cleanupIds.push(listing.id);

        const { error: accountError } = await accountListings.insert({
          listing_id: listing.id,
          account_level: 40,
          team: 'mystic',
          updated_at: new Date().toISOString(),
        });

        if (accountError) {
          results.push({
            test: '4. Account listing creation (details)',
            passed: false,
            error: accountError.message,
          });
        } else {
          await accountListings.delete().eq('listing_id', listing.id);
          results.push({
            test: '4. Account listing full creation + cleanup',
            passed: true,
          });
        }
      }
    }

    // ── TEST 5: Approve and reject flow ──
    {
      const { data: pending, error: e1 } = await listings
        .insert({
          owner_id: regularUser.id,
          title: '__TEST__ Pending Listing',
          description: 'Test: approve/reject flow',
          category: 'pokemon',
          pokemon_type: 'water',
          price_suggested: 5,
          active: false,
          admin_approved: false,
        })
        .select('id')
        .single();

      if (e1 || !pending) {
        results.push({ test: '5. Approve/reject flow', passed: false, error: e1?.message });
      } else {
        cleanupIds.push(pending.id);

        // Approve
        const { error: approveErr } = await listings
          .update({
            admin_approved: true,
            active: true,
            approved_at: new Date().toISOString(),
          })
          .eq('id', pending.id);

        // Verify
        const { data: approved } = await listings
          .select('admin_approved, active')
          .eq('id', pending.id)
          .single();

        results.push({
          test: '5. Approve listing flow',
          passed: !approveErr && approved?.admin_approved === true && approved?.active === true,
          error: approveErr?.message,
        });

        // Reject
        const { error: rejectErr } = await listings
          .update({
            admin_approved: false,
            active: false,
            rejected_at: new Date().toISOString(),
            rejection_reason: 'Test rejection',
          })
          .eq('id', pending.id);

        const { data: rejected } = await listings
          .select('admin_approved, active, rejected_at, rejection_reason')
          .eq('id', pending.id)
          .single();

        results.push({
          test: '6. Reject listing flow',
          passed: !rejectErr && rejected?.active === false && !!rejected?.rejected_at,
          error: rejectErr?.message,
        });
      }
    }

    // ── TEST 7: Marketplace query with owner join ──
    {
      // Create a listing owned by regularUser
      const { data: mktListing, error: mktErr } = await listings
        .insert({
          owner_id: regularUser.id,
          title: '__TEST__ Marketplace Query',
          description: 'Test: marketplace join with owner',
          category: 'pokemon',
          pokemon_type: 'electric',
          price_suggested: 10,
          active: true,
          admin_approved: true,
          approved_at: new Date().toISOString(),
        })
        .select('id')
        .single();

      if (mktErr || !mktListing) {
        results.push({ test: '7. Marketplace query with owner join', passed: false, error: mktErr?.message });
      } else {
        cleanupIds.push(mktListing.id);

        // Query exactly like the marketplace does
        const { data: mktData, error: mktQueryErr } = await db
          .from('listings')
          .select(`*, owner:owner_id(id, display_name, email, reputation_score, seller_level, verified_seller)`)
          .eq('active', true)
          .eq('id', mktListing.id)
          .single();

        results.push({
          test: '7. Marketplace query with owner join',
          passed: !mktQueryErr && !!mktData && !!(mktData as any).owner,
          error: mktQueryErr?.message || (!mktData ? 'No data returned' : !(mktData as any).owner ? 'Owner join returned null (users RLS blocking)' : undefined),
        });
      }
    }

  } finally {
    // Cleanup all test listings
    if (cleanupIds.length > 0) {
      await listings.delete().in('id', cleanupIds);
    }
  }

  return results;
}
