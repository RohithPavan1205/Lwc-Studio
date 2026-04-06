export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { generateCodeVerifier, generateCodeChallenge } from '@/utils/crypto/pkce';
import { cookies } from 'next/headers';

export async function GET() {
  console.log('[DEBUG] Initiating Salesforce OAuth at /api/auth/salesforce...');
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

  const authUrl = `${loginUrl}/services/oauth2/authorize?` + 
    new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      response_type: 'code',
      code_challenge: challenge,
      code_challenge_method: 'S256',
    }).toString() + 
    `&scope=${encodeURIComponent('api refresh_token')}`;

  return NextResponse.redirect(authUrl);
}
