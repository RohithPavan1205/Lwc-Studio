import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { decryptToken } from '@/utils/crypto/tokens';
import { SF_METADATA_URL } from '@/utils/salesforce-constants';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const processId = searchParams.get('id');
    const codeHash = searchParams.get('hash');
    const componentId = searchParams.get('componentId');

    // FIX 1 — read credentials from headers (never from URL params)
    const instanceUrl = request.headers.get('x-sf-instance-url');
    // FIX 2 — resolve real credentials via server-side session cache
    const sessionRef = request.headers.get('x-sf-session-ref');

    if (!processId) {
      return NextResponse.json({ error: 'Process ID required' }, { status: 400 });
    }

    let accessToken: string | null = null;
    let resolvedInstanceUrl = instanceUrl;

    if (sessionRef) {
      try {
        const decryptedStr = decryptToken(sessionRef);
        const cached = JSON.parse(decryptedStr);

        if (!cached || Date.now() > cached.exp) {
          return NextResponse.json(
            { error: 'Session expired or invalid. Please re-deploy.' },
            { status: 401 }
          );
        }
        accessToken = cached.accessToken;
        resolvedInstanceUrl = cached.instanceUrl;
      } catch {
        return NextResponse.json(
          { error: 'Invalid session reference. Please re-deploy.' },
          { status: 401 }
        );
      }
    } else {
      // Fallback: instanceUrl passed via header (no token → reject)
      return NextResponse.json(
        { error: 'Missing session reference. Please re-deploy.' },
        { status: 401 }
      );
    }

    if (!resolvedInstanceUrl || !accessToken) {
      return NextResponse.json({ error: 'Could not resolve Salesforce credentials.' }, { status: 401 });
    }

    const statusSoap = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:met="http://soap.sforce.com/2006/04/metadata">
  <soapenv:Header>
    <met:SessionHeader>
      <met:sessionId>${accessToken}</met:sessionId>
    </met:SessionHeader>
  </soapenv:Header>
  <soapenv:Body>
    <met:checkDeployStatus>
      <met:asyncProcessId>${processId}</met:asyncProcessId>
      <met:includeDetails>true</met:includeDetails>
    </met:checkDeployStatus>
  </soapenv:Body>
</soapenv:Envelope>`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const statusRes = await fetch(SF_METADATA_URL(resolvedInstanceUrl), {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
        SOAPAction: 'checkDeployStatus',
      },
      body: statusSoap,
      signal: controller.signal
    });
    clearTimeout(timeoutId);

    const deployResultStr = await statusRes.text();
    const statusMatch = deployResultStr.match(/<status>([a-zA-Z]+)<\/status>/);
    const deployStatus = statusMatch ? statusMatch[1] : 'Unknown';

    if (deployStatus === 'Pending' || deployStatus === 'InProgress') {
      return NextResponse.json({ done: false, status: deployStatus });
    }

    if (deployStatus === 'Succeeded') {
      // Store the hash on confirmed success — only DB call in this route
      if (codeHash && componentId) {
        const supabase = createClient();
        if (supabase) {
          const {
            data: { user },
          } = await supabase.auth.getUser();
          if (user) {
            await supabase
              .from('components')
              .update({
                last_deploy_hash: codeHash,
                updated_at: new Date().toISOString(),
              })
              .eq('id', componentId)
              .eq('user_id', user.id);
          }
        }
      }
      return NextResponse.json({ done: true, status: 'Succeeded' });
    } else {
      // Failed or Canceled
      let errorMsg = 'Deployment failed. Check Salesforce Setup → Deployment Status.';

      const problemMatch = deployResultStr.match(/<problem>([\s\S]*?)<\/problem>/);
      const faultMatch = deployResultStr.match(/<faultstring>([\s\S]*?)<\/faultstring>/);

      // Extract structured errors
      const structuredErrors: { fileName: string; problem: string; lineNumber: number; columnNumber: number }[] = [];
      const failureMatches = Array.from(deployResultStr.matchAll(/<componentFailures>([\s\S]*?)<\/componentFailures>/g));

      for (const match of failureMatches) {
        const failureStr = match[1];
        const fileName = (failureStr.match(/<fileName>([\s\S]*?)<\/fileName>/)?.[1] || '').trim();
        const problem = (failureStr.match(/<problem>([\s\S]*?)<\/problem>/)?.[1] || '').trim();
        const lineNumber = parseInt(failureStr.match(/<lineNumber>([\s\S]*?)<\/lineNumber>/)?.[1] || '0', 10);
        const columnNumber = parseInt(failureStr.match(/<columnNumber>([\s\S]*?)<\/columnNumber>/)?.[1] || '0', 10);

        structuredErrors.push({ fileName, problem, lineNumber, columnNumber });
      }

      if (problemMatch) {
        errorMsg = problemMatch[1];
      } else if (faultMatch) {
        errorMsg = faultMatch[1];
      } else {
        console.error('[Deploy Status] Raw error response:', deployResultStr);
      }

      return NextResponse.json({ done: true, status: deployStatus, error: errorMsg, errors: structuredErrors });
    }
  } catch (err: unknown) {
    console.error('[Deploy Status] Crash:', err);
    return NextResponse.json({ error: 'Server Exception' }, { status: 500 });
  }
}
