'use client';

import { useState } from 'react';

export default function TestDeployPage() {
  const [status, setStatus] = useState<string>('Idle');
  const [details, setDetails] = useState<any>(null);

  const handleDeploy = async () => {
    setStatus('Deploying... (this takes up to 30s)');
    setDetails(null);

    const lwcName = 'helloWorldTester';

    const htmlContent = `<template>
    <lightning-card title="Hello World Tester">
        <div class="slds-m-around_medium">
            <p>This component was deployed via LWC Studio Next.js API!</p>
        </div>
    </lightning-card>
</template>`;

    const jsContent = `import { LightningElement } from 'lwc';

export default class HelloWorldTester extends LightningElement {
    connectedCallback() {
        console.log('Hello World deployed successfully!');
    }
}`;

    const cssContent = `p { color: #00a1e0; font-weight: bold; }`;

    try {
      const res = await fetch('/api/salesforce/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          componentName: lwcName,
          htmlContent,
          jsContent,
          cssContent
        })
      });

      const data = await res.json();
      
      if (res.ok) {
        setStatus('Success!');
        setDetails(data);
      } else {
        setStatus('Failed');
        setDetails(data);
      }
    } catch (err: any) {
      setStatus('Error');
      setDetails({ error: err.message });
    }
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-8 text-[var(--on-surface)]">
      <div className="max-w-2xl mx-auto space-y-6">
        <header>
          <h1 className="text-3xl font-bold text-[#00a1e0]">LWC Deploy Tester</h1>
          <p className="text-[var(--on-surface-variant)] mt-2">
            This will assemble a zip and push it to your connected org via the SOAP Metadata API.
          </p>
        </header>
        
        <div className="p-4 bg-[var(--surface-container)] rounded border border-[var(--outline-variant)] text-sm font-mono whitespace-pre overflow-x-auto text-[var(--on-surface-variant)]">
          {`<template>
    <lightning-card title="Hello World Tester">
        <div class="slds-m-around_medium">
            <p>This component was deployed via LWC Studio Next.js API!</p>
        </div>
    </lightning-card>
</template>`}
        </div>

        <button 
          onClick={handleDeploy}
          disabled={status.includes('Deploying')}
          className="px-6 py-3 bg-[#00a1e0] text-white rounded font-bold disabled:opacity-50 hover:bg-opacity-90 transition-all shadow-lg"
        >
          {status.includes('Deploying') ? 'Packaging & Deploying...' : 'Deploy Test Component'}
        </button>

        <div className="mt-8 p-6 border border-[var(--outline-variant)] rounded void-card">
          <h3 className="font-bold mb-4 text-lg">Status: <span className={status === 'Success!' ? 'text-[#4caf50]' : status === 'Failed' ? 'text-[var(--error)]' : ''}>{status}</span></h3>
          {details && (
            <pre className="p-4 bg-black rounded text-[#4caf50] text-xs overflow-x-auto border border-[#4caf50] border-opacity-30">
              {JSON.stringify(details, null, 2)}
            </pre>
          )}
        </div>
      </div>
    </div>
  );
}
