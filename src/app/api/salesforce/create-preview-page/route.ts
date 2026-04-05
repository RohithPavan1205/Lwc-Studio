import { NextResponse } from 'next/server';
import { checkAndRefreshToken } from '@/utils/salesforce';
import { createClient } from '@/utils/supabase/server';
import JSZip from 'jszip';

export async function POST(request: Request) {
  try {
    const { componentName } = await request.json();

    if (!componentName) {
      return NextResponse.json({ error: 'Missing componentName' }, { status: 400 });
    }

    const supabase = createClient();
    if (!supabase) throw new Error('No Supabase client');
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = user.id;

    const token = await checkAndRefreshToken(userId);
    if (!token) {
      return NextResponse.json({ error: 'Salesforce token missing. Please reconnect.' }, { status: 401 });
    }

    const { data: conn } = await supabase.from('salesforce_connections').select('instance_url').eq('user_id', userId).single();
    if (!conn) return NextResponse.json({ error: 'No Salesforce connection found' }, { status: 404 });

    const zip = new JSZip();
    
    zip.file('package.xml', `<?xml version="1.0" encoding="UTF-8"?>
<Package xmlns="http://soap.sforce.com/2006/04/metadata">
    <types>
        <members>LwcPreviewApp_${componentName}</members>
        <name>AuraDefinitionBundle</name>
    </types>
    <types>
        <members>LwcPreviewPage_${componentName}</members>
        <name>ApexPage</name>
    </types>
    <version>58.0</version>
</Package>`);

    // Aura App
    const auraFolder = zip.folder(`aura/LwcPreviewApp_${componentName}`);
    if (auraFolder) {
      auraFolder.file(`LwcPreviewApp_${componentName}.app`, `<aura:application access="GLOBAL" extends="ltng:outApp">
    <aura:dependency resource="c:${componentName}"/>
</aura:application>`);
      auraFolder.file(`LwcPreviewApp_${componentName}.app-meta.xml`, `<?xml version="1.0" encoding="UTF-8"?>
<AuraDefinitionBundle xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>58.0</apiVersion>
    <description>LWC Studio generated preview app</description>
</AuraDefinitionBundle>`);
    }

    // VF Page
    const pagesFolder = zip.folder('pages');
    if (pagesFolder) {
      pagesFolder.file(`LwcPreviewPage_${componentName}.page`, `<apex:page showHeader="false" sidebar="false" standardStylesheets="false" applyHtmlTag="false" applyBodyTag="false">
    <head>
      <meta charset="utf-8" />
      <meta name="viewport" content="width=device-width, initial-scale=1" />
    </head>
    <body style="margin: 0; padding: 0; background: transparent; overflow: hidden;">
      <apex:includeLightning />
      <div id="lightning" style="width:100%; height:100vh; overflow:auto;" />
      <script>
          $Lightning.use("c:LwcPreviewApp_${componentName}", function() {
              $Lightning.createComponent("c:${componentName}", {}, "lightning", function(cmp) {
                  console.log("preview component rendered");
              });
          });
      </script>
    </body>
</apex:page>`);
      pagesFolder.file(`LwcPreviewPage_${componentName}.page-meta.xml`, `<?xml version="1.0" encoding="UTF-8"?>
<ApexPage xmlns="http://soap.sforce.com/2006/04/metadata">
    <apiVersion>58.0</apiVersion>
    <availableInTouch>true</availableInTouch>
    <confirmationTokenRequired>false</confirmationTokenRequired>
    <label>LwcPreviewPage_${componentName}</label>
</ApexPage>`);
    }

    const zipBase64 = await zip.generateAsync({ type: 'base64' });

    // Call Deploy
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
      console.error('Preview deploy failed:', deployText);
      return NextResponse.json({ error: 'Deploy failed to initiate' }, { status: 500 });
    }

    const processId = idMatch[1];
    
    // Poll for status
    let status = 'InProgress';
    let deployResultStr = '';
    const MAX_POLL = 15;
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
        headers: { 'Content-Type': 'text/xml', 'SOAPAction': 'checkDeployStatus' },
        body: statusSoap
      });

      deployResultStr = await statusRes.text();
      const statusMatch = deployResultStr.match(/<status>([a-zA-Z]+)<\/status>/);
      if (statusMatch) status = statusMatch[1];

      if (status === 'Succeeded' || status === 'Failed' || status === 'Canceled') break;
    }

    if (status === 'Succeeded') {
      const previewUrl = `${conn.instance_url}/apex/LwcPreviewPage_${componentName}`;
      return NextResponse.json({ success: true, previewUrl });
    } else {
      const problemMatch = deployResultStr.match(/<problem>(.*?)<\/problem>/);
      const errorMsg = problemMatch ? problemMatch[1] : 'Unknown Preview Deploy Error.';
      return NextResponse.json({ error: 'Preview Deployment Failed', details: errorMsg }, { status: 400 });
    }

  } catch (err: any) {
    console.error('Preview crash:', err);
    return NextResponse.json({ error: 'Server Crash', details: err.message }, { status: 500 });
  }
}
