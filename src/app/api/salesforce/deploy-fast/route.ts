import { NextResponse } from 'next/server';
import { checkAndRefreshToken } from '@/utils/salesforce';
import { createClient } from '@/utils/supabase/server';
import { SF_METADATA_URL } from '@/utils/salesforce-constants';
import JSZip from 'jszip';

export const dynamic = 'force-dynamic';

const LWC_NAME_REGEX = /^[a-z][a-zA-Z0-9]*$/;

/**
 * POST /api/salesforce/deploy-fast
 *
 * Synchronous "first deploy" for a newly created component.
 * Initiates + polls the Salesforce Metadata API until done (or timeout).
 * Designed to be called from the editor background, not the modal.
 *
 * Body: { componentName, htmlContent, jsContent, cssContent }
 * Returns: { success: true, duration: number } | { error: string }
 */
export async function POST(request: Request) {
  const startTime = Date.now();

  try {
    const { componentName, htmlContent, jsContent, cssContent } = await request.json();

    if (!componentName || !jsContent) {
      return NextResponse.json({ error: 'Missing required fields: componentName and jsContent' }, { status: 400 });
    }

    if (!LWC_NAME_REGEX.test(componentName)) {
      return NextResponse.json(
        { error: 'Invalid component name. Must start with a lowercase letter and contain only alphanumeric characters.' },
        { status: 400 }
      );
    }

    // ── Auth ──────────────────────────────────────────────────────────────────
    const supabase = createClient();
    if (!supabase) throw new Error('No Supabase client');

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Fetch component metadata for meta XML ─────────────────────────────────
    const { data: component } = await supabase
      .from('components')
      .select('id, master_label, is_exposed, targets, api_version, description, meta_xml')
      .eq('name', componentName)
      .eq('user_id', user.id)
      .maybeSingle();

    if (!component) {
      return NextResponse.json(
        { error: 'Component not found in database. Ensure it was saved before deploying.' },
        { status: 404 }
      );
    }

    // ── Get valid Salesforce token ─────────────────────────────────────────────
    const token = await checkAndRefreshToken(user.id);
    if (!token) {
      return NextResponse.json(
        { error: 'No valid Salesforce token. Please reconnect your org.' },
        { status: 401 }
      );
    }

    const { data: conn } = await supabase
      .from('salesforce_connections')
      .select('instance_url')
      .eq('user_id', user.id)
      .single();

    if (!conn) {
      return NextResponse.json({ error: 'No Salesforce connection found.' }, { status: 404 });
    }

    const apiVersion = component.api_version || '62.0';

    // ── Build LWC metadata zip ────────────────────────────────────────────────
    const zip = new JSZip();

    zip.file(
      'package.xml',
      `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>${componentName}</members>
        <name>LightningComponentBundle</name>
    </types>
    <types>
        <members>LWC_Studio_Preview</members>
        <name>ApexPage</name>
    </types>
    <types>
        <members>LWC_Studio_Out</members>
        <name>AuraDefinitionBundle</name>
    </types>
    <version>${apiVersion}</version>
</Package>`
    );

    // Aura Lightning Out container (needed for VF preview)
    const auraAppXML = `<aura:application access="GLOBAL" extends="ltng:outApp" />`;
    const auraAppMetaXML = `<?xml version="1.0" encoding="UTF-8"?>
<AuraDefinitionBundle xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>62.0</apiVersion>
    <description>LWC Studio Lightning Out Container</description>
    <type>Application</type>
</AuraDefinitionBundle>`;

    const vfPageXML = `<apex:page showHeader="false" sidebar="false" standardStylesheets="false" applyHtmlTag="true" applyBodyTag="true">
    <html>
        <head>
            <meta name="viewport" content="width=device-width, initial-scale=1.0" />
            <style>
                body { margin: 0; padding: 0; background-color: #ffffff; height: 100vh; overflow: auto; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
                #lightning { width: 100%; height: 100%; padding: 16px; box-sizing: border-box; }
            </style>
        </head>
        <body>
            <apex:includeLightning />
            <div id="lightning"></div>
            <script>
                const urlParams = new URLSearchParams(window.location.search);
                const cmpName = urlParams.get('c');
                if (cmpName) {
                    $Lightning.use("c:LWC_Studio_Out", function() {
                        $Lightning.createComponent("c:" + cmpName, {}, "lightning", function(cmp) {
                            console.log('LWC Studio: Component rendered.');
                        });
                    });
                } else {
                    document.getElementById('lightning').innerHTML = '<h2>Error: No component name provided.</h2>';
                }
            </script>
        </body>
    </html>
</apex:page>`;

    const vfPageMetaXML = `<?xml version="1.0" encoding="UTF-8"?>
<ApexPage xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>62.0</apiVersion>
    <availableInTouch>true</availableInTouch>
    <confirmationTokenRequired>false</confirmationTokenRequired>
    <label>LWC Studio Preview Utility</label>
</ApexPage>`;

    zip.folder('aura/LWC_Studio_Out')?.file('LWC_Studio_Out.app', auraAppXML);
    zip.folder('aura/LWC_Studio_Out')?.file('LWC_Studio_Out.app-meta.xml', auraAppMetaXML);
    zip.folder('pages')?.file('LWC_Studio_Preview.page', vfPageXML);
    zip.folder('pages')?.file('LWC_Studio_Preview.page-meta.xml', vfPageMetaXML);

    const folder = zip.folder(`lwc/${componentName}`);
    if (!folder) throw new Error('Failed to create zip folder');

    if (htmlContent) folder.file(`${componentName}.html`, htmlContent);
    if (cssContent) folder.file(`${componentName}.css`, cssContent);
    folder.file(`${componentName}.js`, jsContent);

    // Build meta XML
    let metaXmlContent = component.meta_xml;
    if (!metaXmlContent) {
      const isExposed = component.is_exposed !== false;
      const masterLabel =
        component.master_label ||
        componentName.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (c: string) => c.toUpperCase());
      const description = component.description
        ? `    <description>${component.description}</description>\n`
        : '';

      let targetXml = '';
      if (Array.isArray(component.targets) && component.targets.length > 0) {
        targetXml =
          '    <targets>\n' +
          (component.targets as string[]).map((t) => `        <target>${t}</target>`).join('\n') +
          '\n    </targets>';
      } else {
        targetXml = '    <targets>\n        <target>lightning__AppPage</target>\n    </targets>';
      }

      metaXmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>${apiVersion}</apiVersion>
    <isExposed>${isExposed}</isExposed>
    <masterLabel>${masterLabel}</masterLabel>
${description}${targetXml}
</LightningComponentBundle>`;
    }
    folder.file(`${componentName}.js-meta.xml`, metaXmlContent);

    const zipBase64 = await zip.generateAsync({ type: 'base64' });

    // ── Initiate SOAP deploy ──────────────────────────────────────────────────
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

    const deployRes = await fetch(SF_METADATA_URL(conn.instance_url), {
      method: 'POST',
      headers: { 'Content-Type': 'text/xml', SOAPAction: 'deploy' },
      body: deploySoap,
    });

    const deployText = await deployRes.text();
    const idMatch = deployText.match(/<id>([a-zA-Z0-9]+)<\/id>/);
    if (!idMatch) {
      return NextResponse.json(
        { error: 'Deploy failed to initiate. Check org permissions.' },
        { status: 500 }
      );
    }

    const processId = idMatch[1];

    // ── Poll for completion (server-side, shorter timeout for "fast" deploy) ──
    const POLL_TIMEOUT_MS = 90_000; // 90s max
    let isDone = false;
    let isSuccess = false;
    let finalError = 'Deployment timed out';
    let pollInterval = 2000;

    const checkStatusSoap = (pid: string) => `<?xml version="1.0" encoding="utf-8"?>
<soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:met="http://soap.sforce.com/2006/04/metadata">
  <soapenv:Header>
    <met:SessionHeader>
      <met:sessionId>${token}</met:sessionId>
    </met:SessionHeader>
  </soapenv:Header>
  <soapenv:Body>
    <met:checkDeployStatus>
      <met:asyncProcessId>${pid}</met:asyncProcessId>
      <met:includeDetails>true</met:includeDetails>
    </met:checkDeployStatus>
  </soapenv:Body>
</soapenv:Envelope>`;

    while (!isDone && Date.now() - startTime < POLL_TIMEOUT_MS) {
      await new Promise<void>((resolve) => setTimeout(resolve, pollInterval));
      pollInterval = Math.min(pollInterval * 1.4, 8000);

      try {
        const statusRes = await fetch(SF_METADATA_URL(conn.instance_url), {
          method: 'POST',
          headers: { 'Content-Type': 'text/xml', SOAPAction: 'checkDeployStatus' },
          body: checkStatusSoap(processId),
        });

        const statusText = await statusRes.text();

        const doneMatch = statusText.match(/<done>(\w+)<\/done>/);
        const statusMatch = statusText.match(/<status>(\w+)<\/status>/);

        const done = doneMatch?.[1] === 'true';
        const status = statusMatch?.[1];



        if (done) {
          isDone = true;
          if (status === 'Succeeded') {
            isSuccess = true;
          } else {
            // Extract error details from Salesforce response
            const problemMatch = statusText.match(/<problem>([\s\S]*?)<\/problem>/);
            const errorMsg = problemMatch
              ? problemMatch[1].trim()
              : `Deployment failed with status: ${status}`;
            finalError = errorMsg;
          }
        }
      } catch (pollErr) {
        isDone = true;
        finalError = pollErr instanceof Error ? pollErr.message : 'Status check failed';
      }
    }

    const duration = Date.now() - startTime;

    if (isSuccess) {
      return NextResponse.json({ success: true, duration });
    } else {
      return NextResponse.json({ error: finalError }, { status: 500 });
    }
  } catch (err: unknown) {
    const duration = Date.now() - startTime;
    const msg = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json({ error: msg, duration }, { status: 500 });
  }
}
