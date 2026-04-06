import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { checkAndRefreshToken } from '@/utils/salesforce';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    const componentName = searchParams.get('componentName');

    if (!userId || !componentName) {
      return NextResponse.json(
        { error: 'Missing required query params: userId and componentName' },
        { status: 400 }
      );
    }

    // 1. Create service-role Supabase client
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
       return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const adminSupabase = createClient(supabaseUrl, serviceRoleKey);

    // 3. Get connection info
    const { data: connection, error: connError } = await adminSupabase
      .from('salesforce_connections')
      .select('instance_url')
      .eq('user_id', userId)
      .single();

    if (connError || !connection) {
       return NextResponse.json({ error: 'Salesforce org not connected.' }, { status: 404 });
    }

    const { instance_url } = connection;

    // 4. Get valid token
    const accessToken = await checkAndRefreshToken(userId);
    if (!accessToken) {
       return NextResponse.json({ error: 'SESSION_EXPIRED' }, { status: 401 });
    }

    // 5. Generate the Master Preview URL (Stability Redirect)
    const retURL = `/c/LwcStudio_PreviewEngine.app?c__componentName=${componentName}`;
    const frontdoorUrl = `${instance_url}/secur/frontdoor.jsp?sid=${accessToken}&retURL=${encodeURIComponent(retURL)}`;

    console.log('[preview-proxy] Redirecting to Master Preview Engine:', frontdoorUrl);
    
    // Perform 302 Redirect
    return NextResponse.redirect(frontdoorUrl);

  } catch (err: unknown) {
    console.error('[preview-proxy] Crash:', err);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

