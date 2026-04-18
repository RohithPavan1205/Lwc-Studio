import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { generateCodeVerifier, generateCodeChallenge } from '@/utils/crypto/pkce';
import crypto from 'crypto';

export async function POST() {
  try {
    // ── PKCE challenge pair ───────────────────────────────────────────────
    const verifier = generateCodeVerifier();
    const challenge = generateCodeChallenge(verifier);

    // ── CSRF state ────────────────────────────────────────────────────────
    const state = crypto.randomBytes(16).toString('hex');

    const clientId = process.env.SALESFORCE_CLIENT_ID;
    const redirectUri = process.env.SALESFORCE_CALLBACK_URL;
    const loginUrl = process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com';

    if (!clientId || !redirectUri) {
      throw new Error('Missing Salesforce configuration');
    }

    // Store verifier + state in secure HttpOnly cookies
    // SameSite='lax' required so cookies survive the cross-site redirect back
    const cookieJar = await cookies();
    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax' as const,
      maxAge: 60 * 10, // 10 minutes
      path: '/',
    };
    cookieJar.set('code_verifier', verifier, cookieOptions);
    cookieJar.set('oauth_state', state, cookieOptions);

    const authUrl = new URL(`${loginUrl}/services/oauth2/authorize`);
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('state', state); // random per-request, validated on callback
    authUrl.searchParams.set('code_challenge', challenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');
    authUrl.searchParams.set('prompt', 'login');

    return NextResponse.json({ authUrl: authUrl.toString() });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to initiate OAuth' },
      { status: 500 }
    );
  }
}
