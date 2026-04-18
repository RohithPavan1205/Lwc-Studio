export const dynamic = 'force-dynamic';

import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createClient, createAdminClient } from '@/utils/supabase/server';
import { encryptToken } from '@/utils/crypto/tokens';
import { SF_API_VERSION } from '@/utils/salesforce-constants';
import crypto from 'crypto';
import JSZip from 'jszip';

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get('code');
  const stateParam = requestUrl.searchParams.get('state');
  const error = requestUrl.searchParams.get('error');

  const baseUrl = new URL('/dashboard', request.url);
  const errorUrl = new URL('/', request.url);

  // ── Error from Salesforce ─────────────────────────────────────────────────
  if (error || !code) {
    errorUrl.searchParams.set('error', error || 'missing_code');
    return NextResponse.redirect(errorUrl.toString());
  }

  const cookieStore = cookies();

  // ── CSRF state validation ─────────────────────────────────────────────────
  const storedState = cookieStore.get('oauth_state')?.value;
  if (!storedState || storedState !== stateParam) {
    errorUrl.searchParams.set('error', 'invalid_state');
    return NextResponse.redirect(errorUrl.toString());
  }

  // ── PKCE verifier ─────────────────────────────────────────────────────────
  const verifier = cookieStore.get('code_verifier')?.value;
  if (!verifier) {
    errorUrl.searchParams.set('error', 'missing_verifier');
    return NextResponse.redirect(errorUrl.toString());
  }

  const clientId = process.env.SALESFORCE_CLIENT_ID;
  const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
  const redirectUri = process.env.SALESFORCE_CALLBACK_URL;
  const sfLoginUrl = process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com';

  if (!clientId || !clientSecret || !redirectUri) {
    errorUrl.searchParams.set('error', 'server_configuration_missing');
    return NextResponse.redirect(errorUrl.toString());
  }

  try {
    // ── Exchange code for tokens ──────────────────────────────────────────
    const tokenResponse = await fetch(`${sfLoginUrl}/services/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        code_verifier: verifier,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      errorUrl.searchParams.set('error', 'token_exchange_failed');
      return NextResponse.redirect(errorUrl.toString());
    }

    const { access_token, refresh_token, instance_url, id: identity_url } = tokenData;

    // ── Fetch Salesforce user identity ────────────────────────────────────
    let userInfo;
    try {
      const userInfoResponse = await fetch(identity_url, {
        headers: { Authorization: `Bearer ${access_token}` },
      });
      userInfo = await userInfoResponse.json();

      if (!userInfoResponse.ok) {
        errorUrl.searchParams.set('error', 'user_info_failed');
        return NextResponse.redirect(errorUrl.toString());
      }
    } catch (e) {
      void e;
      errorUrl.searchParams.set('error', 'user_info_failed');
      return NextResponse.redirect(errorUrl.toString());
    }

    const email = userInfo.email as string;
    const name = (userInfo.display_name || userInfo.username) as string;
    const sf_user_id = userInfo.user_id as string;
    const org_id = userInfo.organization_id as string;

    if (!email) {
      errorUrl.searchParams.set('error', 'no_email');
      return NextResponse.redirect(errorUrl.toString());
    }



    const adminClient = createAdminClient();
    if (!adminClient) {
      errorUrl.searchParams.set('error', 'supabase_admin_missing');
      return NextResponse.redirect(errorUrl.toString());
    }

    // ── Find or create Supabase user ───
    const tempPassword = crypto.randomBytes(32).toString('hex') + 'A1!';
    let userId: string | null = null;

    // Fast check: Query profiles table by email 
    const { data: existingProfile } = await adminClient
      .from('profiles')
      .select('id')
      .eq('email', email)
      .maybeSingle();

    if (existingProfile?.id) {
      userId = existingProfile.id;
    } else {
       // Fallback: If they were created but profile upsert failed before, they might be in auth.users
       const { data: usersData } = await adminClient.auth.admin.listUsers();
       const existingAuthUser = usersData?.users.find(u => u.email === email);
       if (existingAuthUser) {
         userId = existingAuthUser.id;
       }
    }

    if (userId) {
      // Rotate the shadow password so we can sign in fresh
      const { error: updateError } = await adminClient.auth.admin.updateUserById(userId, {
        password: tempPassword,
        email_confirm: true,
      });
      if (updateError) {
        throw updateError;
      }
    } else {
      const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
        email,
        password: tempPassword,
        email_confirm: true,
      });
      if (createError) {
        throw createError;
      }
      userId = newUser.user.id;
    }

    // ── Establish SSR session via cookie ──────────────────────────────────
    const supabase = createClient();
    if (supabase) {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password: tempPassword,
      });
      if (signInError) {
        throw signInError;
      }
    }

    // ── Upsert profile ────────────────────────────────────────────────────
    await adminClient
      .from('profiles')
      .upsert({ id: userId, email, full_name: name }, { onConflict: 'id' });

    // ── Upsert Salesforce connection ──────────────────────────────────────
    // Token expiry: Salesforce tokens are valid for the org's session timeout
    // Default is 2 hours but derive from issued_at if present
    const issuedAt = tokenData.issued_at
      ? new Date(parseInt(tokenData.issued_at, 10))
      : new Date();
    const tokenExpiry = new Date(issuedAt.getTime() + 2 * 60 * 60 * 1000).toISOString();

    const previewPageUrl = '/lightning/n/LWC_Studio_Preview';

    // ── Deploy Lightning App Page (LWC_Studio_Preview) ────────────────────
    try {
      const zip = new JSZip();
      
      const flexipageXML = `<?xml version="1.0" encoding="UTF-8"?>
<FlexiPage xmlns="http://soap.sforce.com/2006/04/metadata">
    <flexiPageRegions>
        <name>main</name>
        <type>Region</type>
    </flexiPageRegions>
    <masterLabel>LWC Studio Preview</masterLabel>
    <template>
        <name>flexipage:defaultAppHomeTemplate</name>
    </template>
    <type>AppPage</type>
</FlexiPage>`;

      const tabXML = `<?xml version="1.0" encoding="UTF-8"?>
<CustomTab xmlns="http://soap.sforce.com/2006/04/metadata">
    <customObject>true</customObject>
    <flexiPage>LWC_Studio_Preview</flexiPage>
    <motif>Custom3: Sun</motif>
</CustomTab>`;

      const packageXML = `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>LWC_Studio_Preview</members>
        <name>FlexiPage</name>
    </types>
    <types>
        <members>LWC_Studio_Preview</members>
        <name>CustomTab</name>
    </types>
    <version>${SF_API_VERSION}</version>
</Package>`;

      zip.folder('flexipages')?.file('LWC_Studio_Preview.flexipage', flexipageXML);
      zip.folder('tabs')?.file('LWC_Studio_Preview.tab', tabXML);
      zip.file('package.xml', packageXML);

      const zipBase64 = await zip.generateAsync({ type: 'base64' });

      const deploySoap = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:met="http://soap.sforce.com/2006/04/metadata">
  <soapenv:Header>
    <met:SessionHeader><met:sessionId>${access_token}</met:sessionId></met:SessionHeader>
  </soapenv:Header>
  <soapenv:Body>
    <met:deploy>
      <met:ZipFile>${zipBase64}</met:ZipFile>
      <met:DeployOptions>
        <met:allowMissingFiles>false</met:allowMissingFiles>
        <met:autoUpdatePackage>false</met:autoUpdatePackage>
        <met:checkOnly>false</met:checkOnly>
        <met:ignoreWarnings>true</met:ignoreWarnings>
        <met:performRetrieve>false</met:performRetrieve>
        <met:purgeOnDelete>false</met:purgeOnDelete>
        <met:rollbackOnError>false</met:rollbackOnError>
        <met:singlePackage>true</met:singlePackage>
        <met:testLevel>NoTestRun</met:testLevel>
      </met:DeployOptions>
    </met:deploy>
  </soapenv:Body>
</soapenv:Envelope>`;

      // Fire and forget — uses SF_API_VERSION from centralized constants
      fetch(`${instance_url}/services/Soap/m/${SF_API_VERSION}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml',
          SOAPAction: 'deploy',
        },
        body: deploySoap,
      }).catch(() => { /* fire-and-forget: non-critical preview deploy */ });

    } catch {
      // Non-critical: preview page deployment failure doesn't block auth
    }

    await adminClient.from('salesforce_connections').upsert(
      {
        user_id: userId,
        org_id: org_id || '',
        sf_user_id: sf_user_id || '',
        instance_url,
        access_token: encryptToken(access_token),
        refresh_token: refresh_token ? encryptToken(refresh_token) : null,
        token_expiry: tokenExpiry,
        preview_page_url: previewPageUrl,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );

    // ── Clean up PKCE and CSRF cookies ────────────────────────────────────
    cookieStore.delete('code_verifier');
    cookieStore.delete('oauth_state');

    const response = NextResponse.redirect(baseUrl.toString());
    
    // Crucial Bugfix: explicitly attach session cookies to the redirect header to ensure it's not discarded.
    cookieStore.getAll().forEach(cookie => {
      response.cookies.set(cookie.name, cookie.value, cookie);
    });

    return response;
  } catch {
    errorUrl.searchParams.set('error', 'unexpected_error');
    return NextResponse.redirect(errorUrl.toString());
  }
}
