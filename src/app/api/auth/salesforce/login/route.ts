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
  authUrl.searchParams.append('client_id', clientId);
  authUrl.searchParams.append('redirect_uri', redirectUri);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('code_challenge', challenge);
  authUrl.searchParams.append('code_challenge_method', 'S256');
  authUrl.searchParams.append('scope', 'api refresh_token offline_access');
  authUrl.searchParams.append('prompt', 'login');

  return NextResponse.redirect(authUrl.toString());
}
