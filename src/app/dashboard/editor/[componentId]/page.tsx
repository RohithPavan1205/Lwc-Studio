'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import LwcEditor from '@/components/Editor';
import PreviewPanel from '@/components/PreviewPanel';
import { useEditorStore } from '@/store/editorStore';
import { formatDistanceToNow } from 'date-fns';

export default function LwcStudioEditorPage({ params }: { params: { componentId: string } }) {
  const router = useRouter();
  const { 
    currentComponent, 
    isDirty, 
    isSaving, 
    lastSavedAt, 
    setHtml, 
    setJs, 
    setCss, 
    setXml,
    saveComponent, 
    loadComponent 
  } = useEditorStore();

  const [isConnected, setIsConnected] = useState(false);
  const [checkingSF, setCheckingSF] = useState(true);

  useEffect(() => {
    // Check if user has an active Salesforce connection
    fetch('/api/salesforce/status')
      .then(res => res.json())
      .then(data => {
        setIsConnected(!!data.isConnected);
        setCheckingSF(false);
      })
      .catch(() => setCheckingSF(false));

    // Fetch component source code from Supabase
    loadComponent(params.componentId);
  }, [params.componentId, loadComponent]);

  const handleEditorChange = (type: 'html' | 'js' | 'css' | 'xml', value: string) => {
    if (type === 'html') setHtml(value);
    if (type === 'js') setJs(value);
    if (type === 'css') setCss(value);
    if (type === 'xml') setXml(value);
  };

  const handleConnectClick = () => {
    // Redirect to dashboard to initiate OAuth flow
    router.push('/dashboard');
  };

  // Prevent Monaco from mounting with blank state
  if (!currentComponent.id || checkingSF) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-[#00a1e0] border-t-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-sm font-mono uppercase tracking-widest text-[#00a1e0] animate-pulse">Initializing Studio Workspace...</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen bg-[var(--background)] flex flex-col text-[var(--on-surface)] overflow-hidden">
      {/* Studio Header */}
      <header className="h-14 bg-[var(--surface-container)] flex items-center justify-between px-6 border-b border-[var(--outline-variant)]">
         <div className="flex items-center space-x-4">
             <button onClick={() => router.push('/dashboard')} className="text-[var(--on-surface-variant)] hover:text-[#00a1e0]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 19l-7-7m0 0l7-7m-7 7h18"></path></svg>
             </button>
             <h1 className="font-bold tracking-widest text-sm flex items-center">
                <span className="text-[#00a1e0] mr-2">LWC STUDIO</span> / {currentComponent.name}
             </h1>
         </div>
         
         <div className="flex items-center space-x-4">
             {/* Saved State Indicator */}
             <div className="text-xs font-mono select-none hidden md:flex items-center">
               {isSaving && (
                  <span className="text-[#00a1e0] flex items-center"><svg className="animate-spin -ml-1 mr-2 h-3 w-3" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>Saving...</span>
               )}
               {!isSaving && isDirty && (
                  <span className="text-[#ff9800] flex items-center"><span className="w-2 h-2 rounded-full bg-[#ff9800] mr-2 animate-pulse"></span> Unsaved</span>
               )}
               {!isSaving && !isDirty && lastSavedAt && (
                  <span className="text-[#4caf50] opacity-80">Saved {formatDistanceToNow(lastSavedAt, { addSuffix: true })}</span>
               )}
             </div>

             <button 
               onClick={saveComponent}
               disabled={!isDirty || isSaving}
               className="bg-[#00a1e0] text-white text-xs font-bold uppercase tracking-wider px-6 py-2 rounded hover:bg-opacity-90 disabled:opacity-50 transition-all active:scale-95 shadow"
             >
               Save Code
             </button>
         </div>
      </header>

      {/* Main Workspace Split */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Panel: Monaco Editor (40%) */}
        <div className="w-[40%] flex flex-col h-full bg-[var(--surface-container)]">
           <LwcEditor 
              htmlCode={currentComponent.htmlContent}
              jsCode={currentComponent.jsContent}
              cssCode={currentComponent.cssContent}
              xmlCode={currentComponent.xmlContent}
              onChange={handleEditorChange}
           />
        </div>

        {/* Right Panel: Preview (60%) */}
        <div className="w-[60%] h-full flex flex-col">
           <PreviewPanel 
              isConnected={isConnected} 
              onConnectClick={handleConnectClick} 
           />
        </div>
        
      </div>
    </div>
  );
}
