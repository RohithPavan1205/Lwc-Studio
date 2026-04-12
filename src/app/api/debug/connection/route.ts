import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/utils/supabase/server';

/**
 * Temporary diagnostic endpoint to debug the "org disconnected" issue.
 * DELETE THIS FILE once the issue is resolved.
 */
export async function GET() {
  const diagnostics: Record<string, unknown> = {};

  try {
    const supabase = createClient();
    diagnostics.supabaseClientCreated = !!supabase;
    if (!supabase) {
      diagnostics.error = 'Supabase client could not be created';
      return NextResponse.json(diagnostics);
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    diagnostics.userAuthenticated = !!user;
    diagnostics.userId = user?.id ?? null;
    diagnostics.userEmail = user?.email ?? null;
    diagnostics.authError = authError?.message ?? null;

    if (!user) {
      diagnostics.conclusion = 'NO_SESSION';
      return NextResponse.json(diagnostics);
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      diagnostics.conclusion = 'NO_ADMIN_CLIENT';
      return NextResponse.json(diagnostics);
    }

    // 1. Check what columns the table has by querying with select('*')
    const { data: allRows, error: schemaError } = await adminClient
      .from('salesforce_connections')
      .select('*')
      .limit(1);

    diagnostics.tableQueryError = schemaError?.message ?? null;
    diagnostics.tableColumns = allRows && allRows.length > 0 ? Object.keys(allRows[0]) : 'TABLE_EMPTY_OR_NO_ROWS';

    // 2. Check if a row exists for this user
    const { data: existingRow, error: selectError } = await adminClient
      .from('salesforce_connections')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle();

    diagnostics.existingRow = existingRow ? 'EXISTS' : 'DOES_NOT_EXIST';
    diagnostics.selectError = selectError?.message ?? null;

    // 3. Try a test upsert with the exact same shape the callback uses
    const testData = {
      user_id: user.id,
      org_id: 'test_org_debug',
      sf_user_id: 'test_sf_user_debug',
      instance_url: 'https://test.salesforce.com',
      access_token: 'test_encrypted_token',
      refresh_token: 'test_encrypted_refresh',
      token_expiry: new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString(),
      preview_page_url: '/lightning/n/LWC_Studio_Preview',
      updated_at: new Date().toISOString(),
    };

    const { data: upsertResult, error: upsertError } = await adminClient
      .from('salesforce_connections')
      .upsert(testData, { onConflict: 'user_id' })
      .select();

    diagnostics.testUpsert = {
      success: !upsertError,
      error: upsertError?.message ?? null,
      errorDetails: upsertError?.details ?? null,
      errorHint: upsertError?.hint ?? null,
      errorCode: upsertError?.code ?? null,
      resultCount: upsertResult?.length ?? 0,
    };

    // 4. If the upsert succeeded, clean it up
    if (!upsertError) {
      await adminClient
        .from('salesforce_connections')
        .delete()
        .eq('user_id', user.id)
        .eq('org_id', 'test_org_debug');
      diagnostics.testCleanedUp = true;
    }

    // 5. Check the profiles table for this user
    const { data: profileRow, error: profileError } = await adminClient
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .maybeSingle();

    diagnostics.profile = {
      exists: !!profileRow,
      error: profileError?.message ?? null,
      email: profileRow?.email ?? null,
    };

    // 6. Check Vercel logs would show — what does the callback URL see
    diagnostics.envCheck = {
      callbackUrl: process.env.SALESFORCE_CALLBACK_URL ?? 'NOT SET',
      hasEncryptionKey: !!process.env.TOKEN_ENCRYPTION_KEY,
      encryptionKeyLength: process.env.TOKEN_ENCRYPTION_KEY?.length ?? 0,
    };

    // Conclusion
    if (upsertError) {
      diagnostics.conclusion = `UPSERT_FAILS: ${upsertError.message}. The table schema doesn't match the code.`;
    } else {
      diagnostics.conclusion = 'TABLE_SCHEMA_OK: The test upsert worked. The issue is in the OAuth callback flow itself. Check Vercel Function Logs for [SF CALLBACK] errors.';
    }

  } catch (e) {
    diagnostics.fatalError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json(diagnostics, { status: 200 });
}
