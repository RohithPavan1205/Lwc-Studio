'use client';
import { useState, useEffect } from 'react';
import { useEditorStore } from '@/store/editorStore';

interface PreviewPanelProps {
  isConnected: boolean;
  onConnectClick?: () => void;
}

export default function PreviewPanel({ isConnected, onConnectClick }: PreviewPanelProps) {
  const { currentComponent } = useEditorStore();
  
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isDeploying, setIsDeploying] = useState(false);
  const [loadingPhase, setLoadingPhase] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const handleDeployAndPreview = async () => {
    if (!currentComponent.id || !currentComponent.name) {
      setErrorMsg('Component not loaded properly.');
      return;
    }
    
    setIsDeploying(true);
    setErrorMsg(null);

    try {
      // Phase 1: Deploy Component Source
      setLoadingPhase('Deploying LWC... (1/2) \\n ~15 seconds remaining');
      const deployRes = await fetch('/api/salesforce/deploy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          componentName: currentComponent.name,
          htmlContent: currentComponent.htmlContent,
          jsContent: currentComponent.jsContent,
          cssContent: currentComponent.cssContent
        }),
        cache: 'no-store'
      });
      
      const deployData = await deployRes.json();
      if (!deployRes.ok) throw new Error(deployData.details || deployData.error || 'Deploy failed');

      // Phase 2: Create/Update Wrapper Page
      setLoadingPhase('Creating Wrapper Page... (2/2) \\n ~10 seconds remaining');
      const wrapperRes = await fetch('/api/salesforce/create-preview-page', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ componentName: currentComponent.name }),
        cache: 'no-store'
      });

      const wrapperData = await wrapperRes.json();
      if (!wrapperRes.ok) throw new Error(wrapperData.details || wrapperData.error || 'Wrapper generation failed');

      setPreviewUrl(wrapperData.previewUrl);
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setIsDeploying(false);
      setLoadingPhase('');
    }
  };

  if (!isConnected) {
    return (
      <div className="flex-1 h-full flex flex-col items-center justify-center p-8 bg-[var(--surface-container)] border-l border-[var(--outline-variant)]">
        <svg className="w-16 h-16 text-[var(--on-surface-variant)] mb-4 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1"></path></svg>
        <h2 className="text-xl font-bold mb-2 text-[var(--on-surface)]">Salesforce Disconnected</h2>
        <p className="text-[var(--on-surface-variant)] text-center mb-6 max-w-sm">
          Connect your Salesforce org to instantly preview and test your Lightning Web Components.
        </p>
        <button 
          onClick={onConnectClick}
          className="px-6 py-2 bg-[#00a1e0] text-white font-bold rounded shadow hover:bg-opacity-90 transition-all"
        >
          Connect Org
        </button>
      </div>
    );
  }

  return (
    <div className="flex-1 h-full flex flex-col bg-[var(--background)] border-l border-[var(--outline-variant)] relative">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--outline-variant)] bg-[var(--surface-container-high)]">
        <div className="flex items-center">
          <svg className="w-4 h-4 text-[#00a1e0] mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
          <span className="font-bold text-sm tracking-widest uppercase text-[var(--on-surface)]">Live Org Preview</span>
        </div>
        
        <div className="space-x-2">
          {previewUrl && (
             <button 
                onClick={handleDeployAndPreview}
                disabled={isDeploying}
                className="px-4 py-1.5 border border-[var(--outline-variant)] text-[var(--on-surface-variant)] bg-[var(--surface-container)] hover:bg-[var(--surface-container-high)] text-xs font-bold rounded uppercase tracking-wider disabled:opacity-50 transition-colors"
             >
                Refresh
             </button>
          )}
          {!previewUrl && (
             <button 
                 onClick={handleDeployAndPreview}
                 disabled={isDeploying}
                 className="px-4 py-1.5 bg-[#00a1e0] text-white text-xs font-bold rounded uppercase tracking-wider hover:bg-opacity-90 disabled:opacity-50 transition-transform active:scale-95"
             >
                 Generate Preview
             </button>
          )}
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="flex-1 relative bg-white overflow-hidden flex flex-col">
          {errorMsg && (
            <div className="m-4 p-4 bg-red-900 bg-opacity-20 border border-red-500 rounded text-red-200 text-sm overflow-auto max-h-40">
               <span className="font-bold flex items-center mb-1"><svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg> Deployment Error</span>
               {errorMsg}
            </div>
          )}

          {isDeploying && (
             <div className="absolute inset-0 z-10 bg-[var(--background)] bg-opacity-80 backdrop-blur-sm flex flex-col items-center justify-center">
                 <div className="w-10 h-10 border-4 border-[#00a1e0] border-t-transparent rounded-full animate-spin mb-6"></div>
                 <div className="text-[#00a1e0] font-mono text-sm tracking-wide text-center whitespace-pre-line leading-relaxed">
                    {loadingPhase}
                 </div>
             </div>
          )}

          {!previewUrl && !isDeploying && !errorMsg && (
            <div className="flex-1 flex items-center justify-center bg-[var(--surface-container-low)]">
                <p className="text-[var(--on-surface-variant)] font-mono text-xs uppercase tracking-widest opacity-60">Canvas Empty</p>
            </div>
          )}

          {previewUrl && (
             <iframe 
                src={previewUrl}
                className="w-full h-full border-none bg-white"
                title="Salesforce Preview"
                sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
             />
          )}
      </div>
    </div>
  );
}
