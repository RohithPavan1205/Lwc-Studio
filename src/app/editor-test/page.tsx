'use client';
import { useEffect } from 'react';
import LwcEditor from '@/components/Editor';
import { useEditorStore } from '@/store/editorStore';
import { formatDistanceToNow } from 'date-fns';

export default function EditorTestPage() {
  const { 
    currentComponent, 
    isDirty, 
    isSaving, 
    lastSavedAt, 
    setHtml, 
    setJs, 
    setCss, 
    saveComponent, 
    loadComponent 
  } = useEditorStore();

  useEffect(() => {
    async function initEditor() {
      // 1. Try to find an existing component to test with
      try {
        const bootstrapRes = await fetch('/api/components/bootstrap', { 
          method: 'POST',
          cache: 'no-store' 
        });
        const data = await bootstrapRes.json();
        if (data.componentId) {
          await loadComponent(data.componentId);
        }
      } catch (err) {
        console.error('Bootstrap failed', err);
      }
    }
    initEditor();
  }, [loadComponent]);

  const handleEditorChange = (type: 'html' | 'js' | 'css', value: string) => {
    if (type === 'html') setHtml(value);
    if (type === 'js') setJs(value);
    if (type === 'css') setCss(value);
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
            onClick={saveComponent}
            disabled={!isDirty || isSaving}
            className="px-6 py-3 bg-[#00a1e0] text-white font-bold uppercase tracking-wider rounded text-xs hover:bg-opacity-90 shadow-lg disabled:opacity-50 transition-all"
          >
            {isSaving ? 'Saving...' : 'Save File (Cmd+S)'}
          </button>
        </header>

        {!currentComponent.id ? (
          <div className="flex-1 flex flex-col items-center justify-center bg-[var(--surface-container)] border border-x-[var(--outline-variant)]">
             <div className="w-12 h-12 border-4 border-[#00a1e0] border-t-transparent rounded-full animate-spin mb-4"></div>
             <p className="text-sm font-mono uppercase tracking-widest text-[#00a1e0] animate-pulse">Initializing LWC Environment...</p>
          </div>
        ) : (
          <div className="flex-1 overflow-hidden border border-x-[var(--outline-variant)] shadow-2xl relative">
            <LwcEditor 
              htmlCode={currentComponent.htmlContent}
              jsCode={currentComponent.jsContent}
              cssCode={currentComponent.cssContent}
              onChange={handleEditorChange}
            />
          </div>
        )}

        {/* Dynamic Status Bar */}
        <div className="flex items-center px-6 py-3 bg-[#111] border border-[var(--outline-variant)] rounded-b-md text-xs font-mono select-none">
          <div className="flex-1 flex items-center space-x-2 text-[var(--on-surface-variant)]">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
            <span>{currentComponent.name}</span>
          </div>
          
          <div className="flex items-center space-x-3">
             {isSaving && (
                <div className="flex items-center text-[#00a1e0]">
                  <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-[#00a1e0]" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Saving...
                </div>
             )}
             
             {!isSaving && isDirty && (
                <span className="text-[#ff9800] flex items-center">
                  <span className="w-2 h-2 rounded-full bg-[#ff9800] mr-2 animate-pulse"></span>
                  Unsaved changes
                </span>
             )}
             
             {!isSaving && !isDirty && lastSavedAt && (
                <span className="text-[#4caf50] flex items-center">
                  <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path></svg>
                  Saved {formatDistanceToNow(lastSavedAt, { addSuffix: true })}
                </span>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
