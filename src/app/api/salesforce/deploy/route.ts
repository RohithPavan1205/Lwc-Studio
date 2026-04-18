import { NextResponse } from 'next/server';
import { checkAndRefreshToken } from '@/utils/salesforce';
import { createClient } from '@/utils/supabase/server';
import { SF_METADATA_URL } from '@/utils/salesforce-constants';
import { encryptToken } from '@/utils/crypto/tokens';
import JSZip from 'jszip';
import crypto from 'crypto';

// LWC component name rules (matching creation logic)
const LWC_NAME_REGEX = /^[a-z][a-zA-Z0-9]*$/;

export async function POST(request: Request) {
  try {
    const { componentName, htmlContent, jsContent, cssContent } = await request.json();

    if (!componentName || !jsContent) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Validate LWC component naming rules
    if (!LWC_NAME_REGEX.test(componentName)) {
      return NextResponse.json(
        {
          error:
            'Invalid component name. Must start with lowercase letter and contain only alphanumeric characters and underscores.',
        },
        { status: 400 }
      );
    }

    const supabase = createClient();
    if (!supabase) throw new Error('No Supabase client');

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // ── CODE HASH CHECK (scoped to this user) ────────────────────────────
    const codeHash = crypto
      .createHash('sha256')
      .update((jsContent ?? '') + (htmlContent ?? '') + (cssContent ?? ''))
      .digest('hex');

    // Filter by both name AND user_id to prevent cross-user hash collision
    // Fetch full metadata for the bundle
    const { data: component } = await supabase
      .from('components')
      .select('id, last_deploy_hash, master_label, is_exposed, targets, api_version, description, meta_xml')
      .eq('name', componentName)
      .eq('user_id', userId)
      .maybeSingle();

    // FIX 3 — null guard: reject if component not yet persisted
    if (!component) {
      return NextResponse.json(
        { error: 'Component not found. Save the component before deploying.' },
        { status: 404 }
      );
    }

    /* 
    if (component.last_deploy_hash === codeHash) {
      console.log('[Deploy] Code unchanged, skipping deployment');
      return NextResponse.json({
        success: true,
        processId: 'skipped',
        duration: 0,
        message: 'Code unchanged — deployment skipped',
      });
    }
    */

    // ── Get valid Salesforce token ────────────────────────────────────────
    const token = await checkAndRefreshToken(userId);
    if (!token) {
      return NextResponse.json(
        { error: 'Failed to retrieve valid Salesforce token. Org might be disconnected.' },
        { status: 401 }
      );
    }

    const { data: conn } = await supabase
      .from('salesforce_connections')
      .select('instance_url')
      .eq('user_id', userId)
      .single();
    if (!conn) return NextResponse.json({ error: 'No Salesforce connection found' }, { status: 404 });

    // ── Build LWC metadata zip ────────────────────────────────────────────
    const zip = new JSZip();

    const apiVersion = component.api_version || '62.0';

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

    // Inject a pristine Visualforce + Lightning Out preview container
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
                            console.log('LWC Studio: Component successfully rendered.');
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
    if (!folder) throw new Error('Zip folder creation failed');

    if (htmlContent) folder.file(`${componentName}.html`, htmlContent);
    if (cssContent) folder.file(`${componentName}.css`, cssContent);
    folder.file(`${componentName}.js`, jsContent);
    // Generate dynamic meta XML based on stored component settings
    let metaXmlContent = component.meta_xml;
    
    if (!metaXmlContent) {
      const isExposed = component.is_exposed !== false; // default true
      const masterLabel = component.master_label || 
        componentName.replace(/([a-z0-9])([A-Z])/g, '$1 $2').replace(/^./, (c: string) => c.toUpperCase());
      const description = component.description ? `    <description>${component.description}</description>\n` : '';
      
      let targetXml = '';
      if (Array.isArray(component.targets) && component.targets.length > 0) {
        targetXml = '    <targets>\n' + 
          (component.targets as string[]).map(t => `        <target>${t}</target>`).join('\n') + 
          '\n    </targets>';
      } else {
        // Fallback target if none specified
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

    // ── Initiate Metadata API deploy ─────────────────────────────────────
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
      headers: {
        'Content-Type': 'text/xml',
        SOAPAction: 'deploy',
      },
      body: deploySoap,
    });

    const deployText = await deployRes.text();
    const idMatch = deployText.match(/<id>([a-zA-Z0-9]+)<\/id>/);
    if (!idMatch) {
      return NextResponse.json(
        { error: 'Deploy failed to initiate', details: deployText },
        { status: 500 }
      );
    }

    const processId = idMatch[1];

    // FIX 2 — Create a stateless encrypted session token.
    // In-memory Maps fail across API routes in Next.js Serverless/Dev environments.
    // Encrypting the payload is secure as the client receives ciphertext only.
    const sessionPayload = JSON.stringify({ instanceUrl: conn.instance_url, accessToken: token, exp: Date.now() + 10 * 60 * 1000 });
    const sessionRef = encryptToken(sessionPayload);

    // We do NOT poll on the server to avoid Vercel 10s/15s serverless timeouts.
    // Instead, return immediately and the client polls via /status route.
    return NextResponse.json({
      success: true,
      processId,
      codeHash,
      componentId: component.id,
      instanceUrl: conn.instance_url,
      sessionRef, // Encrypted stateless credential reference
    });

  } catch (err: unknown) {
    if (err instanceof Error && err.name === 'REAUTH_REQUIRED') {
      return NextResponse.json({ error: 'REAUTH_REQUIRED' }, { status: 401 });
    }
    const errorMessage = err instanceof Error ? err.message : 'Unknown Server Error';
    return NextResponse.json({ error: 'Server Exception', details: errorMessage }, { status: 500 });
  }
}
