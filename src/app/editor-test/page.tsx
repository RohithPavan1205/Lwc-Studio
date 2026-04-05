'use client';
import { useState } from 'react';
import LwcEditor from '@/components/Editor';

export default function EditorTestPage() {
  const [htmlCode, setHtmlCode] = useState(`<template>
    <div class="slds-box slds-theme_default">
        <h1 class="slds-text-heading_medium">{title}</h1>
    </div>
</template>`);

  const [jsCode, setJsCode] = useState(`import { LightningElement, api } from 'lwc';

export default class MyComp extends LightningElement {
    @api title = 'Hello World';
}`);

  const [cssCode, setCssCode] = useState(`.slds-box {
    padding: 16px;
    background-color: #1e1e1e;
    color: white;
    border-radius: 8px;
}`);

  const handleEditorChange = (type: 'html' | 'js' | 'css', value: string) => {
    if (type === 'html') setHtmlCode(value);
    if (type === 'js') setJsCode(value);
    if (type === 'css') setCssCode(value);
  };

  const handleSave = () => {
    console.log('--- SAVED LWC COMPONENT ---');
    console.log('[HTML]:\\n', htmlCode);
    console.log('[JS]:\\n', jsCode);
    console.log('[CSS]:\\n', cssCode);
    alert('Component logged to console! Check DevTools.');
  };

  return (
    <div className="min-h-screen bg-[var(--background)] flex flex-col pt-8 px-8 pb-0 text-[var(--on-surface)]">
      <div className="max-w-6xl mx-auto w-full flex flex-col h-[calc(100vh-4rem)] space-y-4">
        
        <header className="flex justify-between items-end pb-4 border-b border-[var(--outline-variant)]">
          <div>
            <h1 className="text-3xl font-bold text-[#00a1e0]">LWC IDE Editor</h1>
            <p className="text-sm text-[var(--on-surface-variant)] mt-1">
              Test Monaco Editor with LWC specific snippets (@api, @wire, import) and multi-file tracking.
            </p>
          </div>
          <button 
            onClick={handleSave}
            className="px-6 py-3 bg-[#00a1e0] text-white font-bold uppercase tracking-wider rounded text-xs hover:bg-opacity-90 shadow-lg transition-transform hover:scale-105 active:scale-95"
          >
            Save to Console
          </button>
        </header>

        <div className="flex-1 rounded-t-md overflow-hidden border border-b-0 border-[var(--outline-variant)] shadow-2xl relative">
          <LwcEditor 
            htmlCode={htmlCode}
            jsCode={jsCode}
            cssCode={cssCode}
            onChange={handleEditorChange}
          />
        </div>
      </div>
    </div>
  );
}
