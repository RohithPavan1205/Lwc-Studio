import { NextResponse } from 'next/server';
import { createClient as createServiceClient } from '@supabase/supabase-js';
import { checkAndRefreshToken } from '@/utils/salesforce';
import JSZip from 'jszip';

export const dynamic = 'force-dynamic';

interface DeployFastBody {
  componentName: string;
  htmlContent: string;
  jsContent: string;
  cssContent: string;
}

interface ToolingQueryResult {
  records: Array<{ Id: string }>;
  totalSize: number;
}

async function toolingGet<T>(instanceUrl: string, token: string, path: string): Promise<T> {
  const res = await fetch(`${instanceUrl}/services/data/v58.0/tooling/${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Tooling GET failed [${res.status}]: ${errText}`);
  }
  return res.json() as Promise<T>;
}

// ── Metadata API SOAP deploy (shared logic) ──────────────────────────────────
async function metadataDeploy(
  instanceUrl: string,
  token: string,
  zipBase64: string,
): Promise<{ success: boolean; processId: string; error?: string }> {
  const deploySoap = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:met="http://soap.sforce.com/2006/04/metadata">
  <soapenv:Header>
    <met:SessionHeader>
      <met:sessionId>${token}</met:sessionId>
    </met:SessionHeader>
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
        <met:rollbackOnError>true</met:rollbackOnError>
        <met:singlePackage>true</met:singlePackage>
        <met:testLevel>NoTestRun</met:testLevel>
      </met:DeployOptions>
    </met:deploy>
  </soapenv:Body>
</soapenv:Envelope>`;

  const deployRes = await fetch(`${instanceUrl}/services/Soap/m/58.0`, {
    method: 'POST',
    headers: { 'Content-Type': 'text/xml', SOAPAction: 'deploy' },
    body: deploySoap,
  });

  const deployText = await deployRes.text();
  const idMatch = deployText.match(/<id>([a-zA-Z0-9]+)<\/id>/);
  if (!idMatch) {
    return { success: false, processId: '', error: `Deploy failed to initiate: ${deployText.substring(0, 300)}` };
  }
  const processId = idMatch[1];

  // Poll for completion (max 30s = 15 polls × 2s)
  let status = 'InProgress';
  let resultText = '';
  for (let i = 0; i < 15; i++) {
    await new Promise((r) => setTimeout(r, 2000));

    const statusSoap = `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:met="http://soap.sforce.com/2006/04/metadata">
  <soapenv:Header>
    <met:SessionHeader>
      <met:sessionId>${token}</met:sessionId>
    </met:SessionHeader>
  </soapenv:Header>
  <soapenv:Body>
    <met:checkDeployStatus>
      <met:asyncProcessId>${processId}</met:asyncProcessId>
      <met:includeDetails>true</met:includeDetails>
    </met:checkDeployStatus>
  </soapenv:Body>
</soapenv:Envelope>`;

    const statusRes = await fetch(`${instanceUrl}/services/Soap/m/58.0`, {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml', SOAPAction: 'checkDeployStatus' },
      body: statusSoap,
    });

    resultText = await statusRes.text();
    const statusMatch = resultText.match(/<status>([a-zA-Z]+)<\/status>/);
    if (statusMatch) status = statusMatch[1];

    if (['Succeeded', 'Failed', 'Canceled'].includes(status)) break;
  }

  if (status === 'Succeeded') {
    const failCheck = resultText.match(/<success>false<\/success>/);
    if (failCheck) {
      const problemMatch = resultText.match(/<problem>(.*?)<\/problem>/);
      return { success: false, processId, error: problemMatch?.[1] ?? 'Compilation error' };
    }
    return { success: true, processId };
  }

  const problemMatch = resultText.match(/<problem>(.*?)<\/problem>/);
  return { success: false, processId, error: problemMatch?.[1] ?? `Deploy ended with status: ${status}` };
}

export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const body = (await request.json()) as DeployFastBody;
    const { componentName, htmlContent, jsContent, cssContent } = body;

    if (!componentName || !jsContent) {
      return NextResponse.json({ error: 'Missing required fields: componentName and jsContent' }, { status: 400 });
    }

    // ── Auth ──────────────────────────────────────────────────────────────────
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceKey) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    const adminSupabase = createServiceClient(supabaseUrl, serviceKey);
    const { createClient } = await import('@/utils/supabase/server');
    const supabase = createClient();
    if (!supabase) return NextResponse.json({ error: 'Failed to create Supabase client' }, { status: 500 });

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    const userId = user.id;

    // ── Token + Instance URL ──────────────────────────────────────────────────
    const token = await checkAndRefreshToken(userId);
    if (!token) return NextResponse.json({ error: 'Salesforce token expired. Reconnect your org.' }, { status: 401 });

    const { data: conn } = await adminSupabase
      .from('salesforce_connections')
      .select('instance_url')
      .eq('user_id', userId)
      .single();

    if (!conn?.instance_url) return NextResponse.json({ error: 'No Salesforce connection.' }, { status: 404 });
    const { instance_url } = conn;

    // ── Step 1: Check if bundle already exists (fast Tooling API query) ───────
    console.log(`[DeployFast] Checking if component exists: ${componentName}`);

    let componentExists = false;
    try {
      const queryStr = `SELECT Id FROM LightningComponentBundle WHERE DeveloperName = '${componentName}'`;
      console.log(`[DeployFast] Running SOQL: ${queryStr}`);
      const existingQuery = await toolingGet<ToolingQueryResult>(
        instance_url,
        token,
        `query?q=${encodeURIComponent(queryStr)}`
      );
      componentExists = existingQuery.totalSize > 0;
      console.log(`[DeployFast] Query result: totalSize=${existingQuery.totalSize}, exists=${componentExists}`);
      if (componentExists) {
        console.log(`[DeployFast] Found bundle ID: ${existingQuery.records[0].Id}`);
      }
    } catch (queryErr) {
      // Don't silently fallback — log the full error
      console.error('[DeployFast] ⚠️  Tooling query FAILED. Falling back to full deploy. Error:', queryErr);
      componentExists = false;
    }

    // ── Step 2: Build ZIP package ─────────────────────────────────────────────
    const zip = new JSZip();

    // LWC Bundle (always included)
    const lwcFolder = zip.folder(`lwc/${componentName}`);
    if (!lwcFolder) throw new Error('Zip folder creation failed');

    if (htmlContent) lwcFolder.file(`${componentName}.html`, htmlContent);
    lwcFolder.file(`${componentName}.js`, jsContent);
    if (cssContent) lwcFolder.file(`${componentName}.css`, cssContent);
    lwcFolder.file(`${componentName}.js-meta.xml`, `<?xml version="1.0" encoding="UTF-8"?>
<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>58.0</apiVersion>
    <isExposed>true</isExposed>
    <targets>
        <target>lightning__AppPage</target>
        <target>lightning__RecordPage</target>
        <target>lightning__HomePage</target>
    </targets>
</LightningComponentBundle>`);

    if (componentExists) {
      // ── FAST PATH: Component exists → deploy LWC only (skip Aura app) ──────
      console.log('[DeployFast] Fast path: deploying LWC bundle only (no Aura app)');

      zip.file('package.xml', `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>${componentName}</members>
        <name>LightningComponentBundle</name>
    </types>
    <version>58.0</version>
</Package>`);

    } else {
      // ── FIRST DEPLOY: Include Aura Preview Engine ──────────────────────────
      console.log('[DeployFast] First deploy: including Aura Preview Engine');

      const auraAppName = 'LwcStudio_PreviewEngine';
      const auraFolder = zip.folder(`aura/${auraAppName}`);

      if (auraFolder) {
        auraFolder.file(`${auraAppName}.app`, `<aura:application access="GLOBAL" extends="force:slds">
    <aura:attribute name="c__componentName" type="String" />
    <aura:handler name="init" value="{!this}" action="{!c.doInit}"/>
    
    <div class="slds-p-around_medium">
        {!v.body}
    </div>
</aura:application>`);

        auraFolder.file(`${auraAppName}Controller.js`, `({
    doInit: function(component, event, helper) {
        var compName = component.get("v.c__componentName");
        console.log('[Lwc-Studio] Preview Engine initializing:', compName);
        
        if (compName) {
            $A.createComponent(
                "c:" + compName, 
                {}, 
                function(newCmp, status, errorMessage) {
                    if (status === "SUCCESS") {
                        component.set("v.body", newCmp);
                    } else {
                        console.error("[Lwc-Studio] Failed to load [c:" + compName + "]: " + errorMessage);
                    }
                }
            );
        }
    }
})`);

        auraFolder.file(`${auraAppName}.app-meta.xml`, `<?xml version="1.0" encoding="UTF-8"?>
<AuraDefinitionBundle xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>58.0</apiVersion>
    <description>Universal LWC Studio Preview Engine</description>
</AuraDefinitionBundle>`);
      }

      zip.file('package.xml', `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>${componentName}</members>
        <name>LightningComponentBundle</name>
    </types>
    <types>
        <members>LwcStudio_PreviewEngine</members>
        <name>AuraDefinitionBundle</name>
    </types>
    <version>58.0</version>
</Package>`);
    }

    // ── Step 3: Deploy via Metadata API (guarantees LWC recompilation) ─────────
    const zipBase64 = await zip.generateAsync({ type: 'base64' });
    // Honest label: 'update' = lean LWC-only package, 'first-deploy' = full package with Aura app
    const deployMethod: 'update' | 'first-deploy' = componentExists ? 'update' : 'first-deploy';
    console.log(`[DeployFast] Deploying via Metadata API [${deployMethod}] (${componentExists ? 'LWC-only' : 'LWC + Aura'})...`);

    const result = await metadataDeploy(instance_url, token, zipBase64);
    const duration = Date.now() - startTime;

    if (!result.success) {
      console.error(`[DeployFast] Deploy FAILED in ${(duration / 1000).toFixed(1)}s:`, result.error);
      return NextResponse.json({ error: result.error }, { status: 500 });
    }

    console.log(`[DeployFast] ✅ Completed in ${(duration / 1000).toFixed(1)}s [${deployMethod}]`);
    return NextResponse.json({ success: true, method: deployMethod, duration });

  } catch (err: unknown) {
    console.error('[DeployFast] Crash:', err);
    const msg = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
