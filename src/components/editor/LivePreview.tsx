import React, { useState, useEffect, useMemo } from 'react';
import { ExternalLink, AlertTriangle, Loader2 } from 'lucide-react';
import { transformLWCToPreview, LWCFiles } from '@/lib/lwcPreviewTransformer';

// Generic debounce isolated logic
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function debounce<T extends (...args: any[]) => void>(func: T, wait: number): T {
  let timeout: NodeJS.Timeout;
  return ((...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  }) as T;
}

interface LivePreviewProps {
  files: LWCFiles;
  componentName: string;
  onOpenInOrg: () => void;
  isDeploying: boolean;
}

export default function LivePreview({ files, componentName, onOpenInOrg, isDeploying }: LivePreviewProps) {
  const [previewHtml, setPreviewHtml] = useState<string>('');
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isBannerVisible, setIsBannerVisible] = useState(true);

  // Debounce transformation (prevents re-render on every keystroke)
  const debouncedTransform = useMemo(
    () => debounce((currentFiles: LWCFiles) => {
      const result = transformLWCToPreview(currentFiles);
      setPreviewHtml(result.html);
      setWarnings(result.warnings);
    }, 300),
    []
  );

  useEffect(() => {
    debouncedTransform(files);
  }, [files.html, files.js, files.css, debouncedTransform]);

  return (
    <div className="flex flex-col h-full w-full bg-[#f8fafc] border-l border-slate-200">
      {/* 1. Header Bar */}
      <div className="flex justify-between items-center px-4 py-3 bg-white border-b border-slate-200 shrink-0">
        <h2 className="text-[13px] font-bold text-slate-700 tracking-wider">PREVIEW</h2>
        <button
          onClick={onOpenInOrg}
          disabled={isDeploying}
          className="flex items-center gap-2 px-3 py-1.5 text-[13px] font-semibold text-white bg-[#0176D3] hover:bg-[#014486] transition-colors disabled:opacity-50 disabled:cursor-not-allowed rounded shadow-sm"
        >
          {isDeploying ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Deploying...
            </>
          ) : (
            <>
              <ExternalLink className="w-4 h-4" />
              Open in Org
            </>
          )}
        </button>
      </div>

      {/* 2. Approximation Setup Banner */}
      {isBannerVisible && (
        <div className="flex bg-[#FFF3CD] border-b border-[#FFEEBA] text-[#856404] px-4 py-2.5 text-xs shrink-0">
          <AlertTriangle className="w-4 h-4 mr-2.5 shrink-0 mt-[1px] text-[#856404]" />
          <div className="flex-1">
            <span className="font-semibold mr-1">Approximation —</span> 
            Open in Org for exact rendering with real data.
            <button 
              onClick={() => setIsBannerVisible(false)}
              className="ml-3 font-medium underline opacity-80 hover:opacity-100"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}

      {/* 3. Render Sandbox Panel */}
      <div className="relative flex-1 bg-white overflow-hidden">
        {/* Deploying Overlay Notice inside iframe area */}
        {isDeploying && (
          <div className="absolute inset-0 z-10 bg-white/70 backdrop-blur-[2px] flex items-center justify-center animate-in fade-in duration-200">
            <div className="bg-white px-8 py-6 rounded-xl shadow-xl border border-slate-200 flex flex-col items-center max-w-sm text-center">
              <Loader2 className="w-10 h-10 animate-spin text-[#0176D3] mb-4" />
              <h3 className="text-base font-bold text-slate-800 mb-1">
                Deploying to your Salesforce org...
              </h3>
              <p className="text-sm text-slate-500 font-medium tracking-tight">
                This usually takes 10-20 seconds
              </p>
            </div>
          </div>
        )}

        {/* IFrame Host Area */}
        {!previewHtml ? (
          <div className="flex h-full items-center justify-center">
            <Loader2 className="w-6 h-6 animate-spin text-slate-300" />
          </div>
        ) : (
          <iframe
            key={componentName}
            srcDoc={previewHtml}
            sandbox="allow-scripts allow-same-origin"
            className="w-full h-full border-0 block"
            title="Component Preview"
          />
        )}
      </div>

      {/* 4. Discovered Warnings (Collapsible) */}
      {warnings.length > 0 && (
        <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 max-h-40 overflow-y-auto shrink-0 shadow-inner">
          <p className="text-xs font-bold text-slate-600 mb-1.5 uppercase tracking-wider">Preview Limitations Context</p>
          <ul className="text-xs text-slate-500 space-y-1 list-disc pl-5">
            {warnings.map((warning, idx) => (
              <li key={idx} className="font-medium">{warning}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
