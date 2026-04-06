export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { generateCodeVerifier, generateCodeChallenge } from '@/utils/crypto/pkce';
import { cookies } from 'next/headers';

export async function GET() {
  const verifier = generateCodeVerifier();
  const challenge = generateCodeChallenge(verifier);

  const clientId = process.env.SALESFORCE_CLIENT_ID;
  const redirectUri = process.env.SALESFORCE_CALLBACK_URL;
  const loginUrl = process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com';

  if (!clientId || !redirectUri) {
    return NextResponse.json({ error: 'Missing Salesforce configuration' }, { status: 500 });
  }

  // Store the verifier in an HttpOnly cookie to be retrieved in the callback
  cookies().set('code_verifier', verifier, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10, // 10 minutes
  });

  const authUrl = new URL(`${loginUrl}/services/oauth2/authorize`);
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('code_challenge', challenge);
  authUrl.searchParams.set('code_challenge_method', 'S256');
  // Salesforce expects space-separated scopes. URLSearchParams.set will encode them.
  authUrl.searchParams.set('scope', 'api refresh_token openid profile email');

  return NextResponse.redirect(authUrl.toString());
}
