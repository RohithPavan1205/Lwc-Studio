import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/utils/supabase/server';

/**
 * Temporary diagnostic endpoint to debug the "org disconnected" issue.
 * DELETE THIS FILE once the issue is resolved.
 */
export async function GET() {
  const diagnostics: Record<string, unknown> = {};

  try {
    // 1. Check if Supabase client is available
    const supabase = createClient();
    diagnostics.supabaseClientCreated = !!supabase;

    if (!supabase) {
      diagnostics.error = 'Supabase client could not be created (missing env vars?)';
      return NextResponse.json(diagnostics);
    }

    // 2. Check if user has a valid session
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    diagnostics.userAuthenticated = !!user;
    diagnostics.userId = user?.id ?? null;
    diagnostics.userEmail = user?.email ?? null;
    diagnostics.authError = authError?.message ?? null;

    if (!user) {
      diagnostics.conclusion = 'NO_SESSION: User is not authenticated. The session cookie is missing or invalid.';
      return NextResponse.json(diagnostics);
    }

    // 3. Try to read salesforce_connections with the ANON client (RLS applies)
    const { data: anonData, error: anonError } = await supabase
      .from('salesforce_connections')
      .select('id, user_id, instance_url, created_at')
      .eq('user_id', user.id)
      .maybeSingle();

    diagnostics.anonQuery = {
      data: anonData ? { id: anonData.id, instance_url: anonData.instance_url, created_at: anonData.created_at } : null,
      error: anonError?.message ?? null,
      errorCode: anonError?.code ?? null,
    };

    // 4. Try to read with the ADMIN client (bypasses RLS)
    const adminClient = createAdminClient();
    diagnostics.adminClientCreated = !!adminClient;

    if (adminClient) {
      const { data: adminData, error: adminError } = await adminClient
        .from('salesforce_connections')
        .select('id, user_id, instance_url, created_at')
        .eq('user_id', user.id)
        .maybeSingle();

      diagnostics.adminQuery = {
        data: adminData ? { id: adminData.id, instance_url: adminData.instance_url, created_at: adminData.created_at } : null,
        error: adminError?.message ?? null,
      };

      // 5. Determine the root cause
      if (adminData && !anonData) {
        diagnostics.conclusion = 'RLS_BLOCKING: The row EXISTS in the database, but RLS policies are blocking the anon/authenticated client from reading it. You need to add a SELECT policy on salesforce_connections.';
      } else if (!adminData && !anonData) {
        diagnostics.conclusion = 'NO_ROW: No salesforce_connections row exists for this user. The OAuth callback upsert is failing silently.';
      } else if (adminData && anonData) {
        diagnostics.conclusion = 'ALL_OK: Both clients can read the connection. The issue might be a session/cookie problem on the dashboard page.';
      }
    }

    // 6. Check environment sanity
    diagnostics.envCheck = {
      hasCallbackUrl: !!process.env.SALESFORCE_CALLBACK_URL,
      callbackUrl: process.env.SALESFORCE_CALLBACK_URL ?? 'NOT SET',
      hasClientId: !!process.env.SALESFORCE_CLIENT_ID,
      hasClientSecret: !!process.env.SALESFORCE_CLIENT_SECRET,
      hasEncryptionKey: !!process.env.TOKEN_ENCRYPTION_KEY,
    };

  } catch (e) {
    diagnostics.fatalError = e instanceof Error ? e.message : String(e);
  }

  return NextResponse.json(diagnostics, { status: 200 });
}
