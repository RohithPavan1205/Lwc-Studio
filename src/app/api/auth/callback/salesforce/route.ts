export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient, createAdminClient } from '@/utils/supabase/server';
import crypto from 'crypto';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const error = requestUrl.searchParams.get('error');

  const baseUrl = new URL('/dashboard', request.url);
  const loginUrlFull = new URL('/login', request.url);

  if (error || !code) {
    loginUrlFull.searchParams.set('error', error || 'missing_code');
    return NextResponse.redirect(loginUrlFull.toString());
  }

  const verifier = cookies().get('code_verifier')?.value;
  if (!verifier) {
    loginUrlFull.searchParams.set('error', 'missing_verifier');
    return NextResponse.redirect(loginUrlFull.toString());
  }

  const clientId = process.env.SALESFORCE_CLIENT_ID;
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
  const redirectUri = process.env.SALESFORCE_CALLBACK_URL;
  const sfLoginUrl = process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com';

  if (!clientId || !clientSecret || !redirectUri) {
    loginUrlFull.searchParams.set('error', 'server_configuration_missing');
    return NextResponse.redirect(loginUrlFull.toString());
  }

  try {
    console.log('[SF CALLBACK] Exchanging code for tokens...');
    const tokenResponse = await fetch(`${sfLoginUrl}/services/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
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
      console.error('[SF CALLBACK] Salesforce Token Error:', tokenData);
      loginUrlFull.searchParams.set('error', 'token_exchange_failed');
      return NextResponse.redirect(loginUrlFull.toString());
    }

    const { access_token, refresh_token, instance_url, id: identity_url } = tokenData;
    console.log('[SF CALLBACK] Tokens received. Identity URL:', identity_url);

    // Fetch user info from Salesforce Identity URL
    const userInfoResponse = await fetch(identity_url, {
      headers: { Authorization: `Bearer ${access_token}` },
    });
    const userInfo = await userInfoResponse.json();

    if (!userInfoResponse.ok) {
      console.error('[SF CALLBACK] Salesforce Identity Error:', userInfo);
      loginUrlFull.searchParams.set('error', 'user_info_failed');
      return NextResponse.redirect(loginUrlFull.toString());
    }

    const email = userInfo.email;
    const name = userInfo.display_name || userInfo.username;
    const sf_user_id = userInfo.user_id;
    const org_id = userInfo.organization_id;

    const adminClient = createAdminClient();
    const supabase = createClient();
    if (!adminClient || !supabase) throw new Error('Database clients failed to initialize');

    // ── STEP 1: Determine which user to link to ──────────────────────────
    let targetUserId: string | null = null;

    // Check if there is an active session already
    const { data: { user: currentUser } } = await supabase.auth.getUser();

    if (currentUser) {
      console.log('[SF CALLBACK] Found active session. Linking to existing user:', currentUser.id);
      targetUserId = currentUser.id;
    } else {
      // If no session, try to find a user by this email in our DB
      console.log('[SF CALLBACK] No session. Checking if email exists everywhere:', email);
      
      // 1. Check profiles
      const { data: profileByEmail } = await adminClient
        .from('profiles')
        .select('id')
        .eq('email', email)
        .maybeSingle();

      if (profileByEmail) {
        targetUserId = profileByEmail.id;
        console.log('[SF CALLBACK] Found existing user by profile:', targetUserId);
      } else {
        // 2. Check Auth system directly (just in case profile is missing but user exists)
        const { data: authUsers } = await adminClient.auth.admin.listUsers();
        const existingAuthUser = authUsers.users.find(u => u.email === email);

        if (existingAuthUser) {
          targetUserId = existingAuthUser.id;
          console.log('[SF CALLBACK] Found existing user by Auth ID:', targetUserId);
        } else {
          // 3. Create a new user if absolutely necessary
          console.log('[SF CALLBACK] Truly new user. Creating account...');
          const tempPassword = crypto.randomBytes(32).toString('hex') + 'A1!';
          const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
            email,
            password: tempPassword,
            email_confirm: true,
          });

          if (createError) throw createError;
          targetUserId = newUser.user.id;
          
          // Log them in immediately so the connection persists
          await supabase.auth.signInWithPassword({ email, password: tempPassword });
        }
      }
    }

    // ── STEP 2: Upsert Data ──────────────────────────────────────────────
    console.log('[SF CALLBACK] Finalizing profile and connection for user:', targetUserId);

    // Upsert Profile
    await adminClient.from('profiles').upsert({
      id: targetUserId,
      email,
      full_name: name,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' });

    // Upsert Connection
    const tokenExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    await adminClient.from('salesforce_connections').upsert({
      user_id: targetUserId,
      org_id: org_id || '',
      sf_user_id: sf_user_id || '',
      instance_url,
      access_token,
      refresh_token,
      token_expiry: tokenExpiry,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    cookies().delete('code_verifier');
    console.log('[SF CALLBACK] Success! Redirecting.');

    return NextResponse.redirect(baseUrl.toString());

  } catch (err: unknown) {
    console.error('[SF CALLBACK] Unexpected error details:', err);
    const loginUrlError = new URL('/login', request.url);
    const msg = err instanceof Error ? err.message : 'unknown_error';
    loginUrlError.searchParams.set('error', `callback_failed_${msg}`);
    return NextResponse.redirect(loginUrlError.toString());
  }
}
