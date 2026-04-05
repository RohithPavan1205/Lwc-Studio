import { NextResponse } from 'next/server';
import { checkAndRefreshToken } from '@/utils/salesforce';
import { createClient } from '@/utils/supabase/server';
import JSZip from 'jszip';

export async function POST(request: Request) {
  try {
    const { componentName, htmlContent, jsContent, cssContent } = await request.json();

    if (!componentName || !jsContent) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Safely get user
    const supabase = createClient();
    if (!supabase) throw new Error('No Supabase client');
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    // 1. Get access token
    const token = await checkAndRefreshToken(userId);
    if (!token) {
      return NextResponse.json({ error: 'Failed to retrieve valid Salesforce token. Org might be disconnected.' }, { status: 401 });
    }

    // Get instance URL
    const { data: conn } = await supabase.from('salesforce_connections').select('instance_url').eq('user_id', userId).single();
    if (!conn) return NextResponse.json({ error: 'No connection found' }, { status: 404 });

    // 2. Assemble LWC
    const zip = new JSZip();
    
    // package.xml
    zip.file('package.xml', `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>*</members>
        <name>LightningComponentBundle</name>
    </types>
    <version>58.0</version>
</Package>`);

    const folder = zip.folder(`lwc/${componentName}`);
    if (!folder) throw new Error('Zip folder creation failed');

    if (htmlContent) folder.file(`${componentName}.html`, htmlContent);
    if (cssContent) folder.file(`${componentName}.css`, cssContent);
    folder.file(`${componentName}.js`, jsContent);
    // 3. Create LightningComponentBundle meta
    folder.file(`${componentName}.js-meta.xml`, `<?xml version="1.0" encoding="UTF-8"?>
<LightningComponentBundle xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>58.0</apiVersion>
    <isExposed>true</isExposed>
    <targets>
        <target>lightning__AppPage</target>
        <target>lightning__RecordPage</target>
        <target>lightning__HomePage</target>
    </targets>
</LightningComponentBundle>`);

    // Generate Zip base64
    const zipBase64 = await zip.generateAsync({ type: 'base64' });

    // 4. Call Deploy
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

    const deployRes = await fetch(`${conn.instance_url}/services/Soap/m/58.0`, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/xml',
        'SOAPAction': 'deploy'
      },
      body: deploySoap
    });

    const deployText = await deployRes.text();
    const idMatch = deployText.match(/<id>([a-zA-Z0-9]+)<\/id>/);
    if (!idMatch) {
      console.error('Deploy request failed:', deployText);
      return NextResponse.json({ error: 'Deploy failed to initiate', details: deployText }, { status: 500 });
    }

    const processId = idMatch[1];
    
    // 5. Poll for status (max 30s)
    let status = 'InProgress';
    let deployResultStr = '';
    const MAX_POLL = 15; // 15 * 2s = 30s
    for (let i = 0; i < MAX_POLL; i++) {
      await new Promise(resolve => setTimeout(resolve, 2000));
      
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

      const statusRes = await fetch(`${conn.instance_url}/services/Soap/m/58.0`, {
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml',
          'SOAPAction': 'checkDeployStatus'
        },
        body: statusSoap
      });

      deployResultStr = await statusRes.text();
      const statusMatch = deployResultStr.match(/<status>([a-zA-Z]+)<\/status>/);
      if (statusMatch) status = statusMatch[1];

      if (status === 'Succeeded' || status === 'Failed' || status === 'Canceled') {
        break;
      }
    }

    if (status === 'Succeeded') {
      return NextResponse.json({ success: true, processId, status });
    } else {
      // Parse out the error message if possible
      const problemMatch = deployResultStr.match(/<problem>(.*?)<\/problem>/);
      const errorMsg = problemMatch ? problemMatch[1] : 'Unknown Deployment Error. Check Salesforce Deployment Status UI.';
      return NextResponse.json({ error: 'Deployment Failed', details: errorMsg, status, processId }, { status: 400 });
    }

  } catch (err: unknown) {
    console.error('Deploy crash:', err);
    const errorMessage = err instanceof Error ? err.message : 'Unknown Error';
    return NextResponse.json({ error: 'Server Crash', details: errorMessage }, { status: 500 });
  }
}
