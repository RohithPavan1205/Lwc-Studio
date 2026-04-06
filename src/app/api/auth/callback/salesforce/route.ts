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

    // Fetch user info from Salesforce using the identity URL provided in the token response.
    // This works even without openid/profile scopes.
    console.log('[SF CALLBACK] Fetching user info from Identity URL...');
    let userInfo;
    try {
      const userInfoResponse = await fetch(identity_url, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      userInfo = await userInfoResponse.json();

      if (!userInfoResponse.ok) {
        console.error('[SF CALLBACK] Salesforce Identity Error:', userInfo);
        loginUrlFull.searchParams.set('error', 'user_info_failed');
        return NextResponse.redirect(loginUrlFull.toString());
      }
    } catch (e) {
      console.error('[SF CALLBACK] Salesforce Identity Fetch Exception:', e);
      loginUrlFull.searchParams.set('error', 'user_info_failed');
      return NextResponse.redirect(loginUrlFull.toString());
    }

    // Map attributes from the Salesforce Identity response
    const email = userInfo.email;
    const name = userInfo.display_name || userInfo.username;
    const sf_user_id = userInfo.user_id;
    const org_id = userInfo.organization_id;

    console.log('[SF CALLBACK] User identified:', email, name);

    const adminClient = createAdminClient();
    if (!adminClient) {
      console.error('[SF CALLBACK] Supabase Admin Client Failed to Initialize');
      loginUrlFull.searchParams.set('error', 'supabase_admin_missing');
      return NextResponse.redirect(loginUrlFull.toString());
    }

    // 1. See if user exists and create or update password
    const tempPassword = crypto.randomBytes(32).toString('hex') + 'A1!';
    let userId = null;

    console.log('[SF CALLBACK] Checking for existing user in profiles...');
    const { data: existingProfile, error: profileError } = await adminClient
      .from('profiles')
      .select('user_id')
      .eq('email', email)
      .maybeSingle();

    if (profileError) {
      console.error('[SF CALLBACK] Profile Check Error:', profileError);
    }

    if (existingProfile && existingProfile.user_id) {
      userId = existingProfile.user_id;
      console.log('[SF CALLBACK] Found existing user:', userId);
      const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, { password: tempPassword });
      if (updateError) {
        console.error('[SF CALLBACK] Auth Update Error:', updateError);
        throw updateError;
      }
    } else {
      console.log('[SF CALLBACK] Creating new auth user for:', email);
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
      });
      if (createError) {
        console.error('[SF CALLBACK] Auth Creation Error:', createError);
        throw createError;
      }
      userId = newUser.user.id;
    }

    // 2. Sign in via SSR client to set cookies
    console.log('[SF CALLBACK] Establishing session...');
    const supabase = createClient();
    if (supabase) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: tempPassword,
      });
      if (signInError) {
        console.error('[SF CALLBACK] Session Establishment Error:', signInError);
        throw signInError;
      }
    }

    // 3. Upsert profiles
    console.log('[SF CALLBACK] Syncing profile and connection...');
    await adminClient.from('profiles').upsert({
      user_id: userId,
      email,
      full_name: name,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    // 4. Upsert salesforce_connections
    const tokenExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();
    await adminClient.from('salesforce_connections').upsert({
      user_id: userId,
      org_id: org_id || '',
      sf_user_id: sf_user_id || '',
      instance_url,
      access_token,
      refresh_token,
      token_expiry: tokenExpiry,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'user_id' });

    cookies().delete('code_verifier');
    console.log('[SF CALLBACK] Success! Redirecting to dashboard.');

    return NextResponse.redirect(baseUrl.toString());

  } catch (err) {
    console.error('[SF CALLBACK] Unexpected error:', err);
    loginUrlFull.searchParams.set('error', 'unexpected_error');
    return NextResponse.redirect(loginUrlFull.toString());
  }
}
