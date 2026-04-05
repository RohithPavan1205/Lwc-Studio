import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');
  const errorDescription = requestUrl.searchParams.get('error_description');

  const baseUrl = new URL('/dashboard', request.url);

  if (error) {
    baseUrl.searchParams.set('error', error);
    if (errorDescription) baseUrl.searchParams.set('desc', errorDescription);
    return NextResponse.redirect(baseUrl.toString());
  }

  if (!code) {
    baseUrl.searchParams.set('error', 'missing_code');
    return NextResponse.redirect(baseUrl.toString());
  }

  const verifier = cookies().get('code_verifier')?.value;
  if (!verifier) {
    baseUrl.searchParams.set('error', 'missing_verifier');
    return NextResponse.redirect(baseUrl.toString());
  }

  const clientId = process.env.SALESFORCE_CLIENT_ID;
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
  const redirectUri = process.env.SALESFORCE_CALLBACK_URL;
  const loginUrl = process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com';

  if (!clientId || !clientSecret || !redirectUri) {
    baseUrl.searchParams.set('error', 'server_configuration_missing');
    return NextResponse.redirect(baseUrl.toString());
  }

  try {
    const tokenResponse = await fetch(`${loginUrl}/services/oauth2/token`, {
      method: 'POST',
      headers: {
         'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code_verifier: verifier
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error('Salesforce Token Error:', tokenData);
      baseUrl.searchParams.set('error', 'token_exchange_failed');
      baseUrl.searchParams.set('desc', tokenData.error_description || tokenData.error || 'Unknown error');
      return NextResponse.redirect(baseUrl.toString());
    }

    const { access_token, refresh_token, instance_url, id: identity_url } = tokenData;

    const supabase = createClient();
    if (!supabase) {
      baseUrl.searchParams.set('error', 'supabase_client_missing');
      return NextResponse.redirect(baseUrl.toString());
    }
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.redirect(new URL('/login?error=unauthorized_sf_connection', request.url));
    }

    // Identify org details
    let orgId = '';
    let sfUserId = '';
    if (identity_url) {
      const idParts = identity_url.split('/');
      orgId = idParts[idParts.length - 2] || '';
      sfUserId = idParts[idParts.length - 1] || '';
    }

    // Set initial expiry to 2 hours
    const tokenExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

    const { error: dbError } = await supabase
      .from('salesforce_connections')
      .upsert({
        user_id: user.id,
        org_id: orgId,
        sf_user_id: sfUserId,
        instance_url,
        access_token,
        refresh_token,
        token_expiry: tokenExpiry,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' }); // Assuming unique user constraint

    if (dbError) {
      console.error('Supabase DB Error:', dbError);
      baseUrl.searchParams.set('error', 'database_save_failed');
      return NextResponse.redirect(baseUrl.toString());
    }
    
    // Clear the verifier cookie
    cookies().delete('code_verifier');

    baseUrl.searchParams.set('success', 'true');
    return NextResponse.redirect(baseUrl.toString());

  } catch (err) {
    console.error('Unexpected error during SF callback:', err);
    baseUrl.searchParams.set('error', 'unexpected_error');
    return NextResponse.redirect(baseUrl.toString());
  }
}
