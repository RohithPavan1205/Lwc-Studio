'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Cloud,
  Eye,
  Loader2,
  AlertTriangle,
  ExternalLink,
  Rocket,
  Monitor,
  Check,
  Info,
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────

type PreviewState =
  | 'NOT_CONNECTED'
  | 'NOT_DEPLOYED'
  | 'IDLE'
  | 'CREATING_PREVIEW'
  | 'LOADING_PREVIEW'
  | 'SUCCESS'
  | 'ERROR';

interface PreviewError {
  type: 'SESSION_EXPIRED' | 'VF_PAGE_FAILED' | 'PREVIEW_TIMEOUT' | 'GENERIC';
  title: string;
  message: string;
}

// ─── Props ────────────────────────────────────────────────────────────────────

interface PreviewPanelProps {
  componentId: string;
  componentName: string;
  userId: string;
  isOrgConnected: boolean;
  isDeployed: boolean;
  /** Bump this counter from the parent to trigger a fresh preview after deploy */
  previewTrigger?: number;
}

// ─── Progress bar widths per state ───────────────────────────────────────────

const PROGRESS_MAP: Partial<Record<PreviewState, number>> = {
  CREATING_PREVIEW: 40,
  LOADING_PREVIEW: 85,
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function PreviewPanel({
  componentName,
  userId,
  isOrgConnected,
  isDeployed,
  previewTrigger = 0,
}: PreviewPanelProps) {
  const router = useRouter();

  // Derive initial state
  const getInitialState = (): PreviewState => {
    if (!isOrgConnected) return 'NOT_CONNECTED';
    if (!isDeployed) return 'NOT_DEPLOYED';
    return 'IDLE';
  };

  const [state, setState] = useState<PreviewState>(getInitialState);
  const [previewError, setPreviewError] = useState<PreviewError | null>(null);

  const progressPct = PROGRESS_MAP[state] ?? 0;

  // ─── Preview Flow ─────────────────────────────────────────────────────────

  const runPreviewFlow = useCallback(async () => {
    setPreviewError(null);
    setState('SUCCESS');
  }, []);

  const handleReset = useCallback(() => {
    setPreviewError(null);
    setState(isDeployed ? 'IDLE' : 'NOT_DEPLOYED');
  }, [isDeployed]);

  // ─── React to parent signalling a fresh deploy ────────────────────────────

  const prevTriggerRef = useRef(previewTrigger);
  useEffect(() => {
    if (previewTrigger !== prevTriggerRef.current) {
      prevTriggerRef.current = previewTrigger;
      if (['NOT_DEPLOYED', 'IDLE', 'SUCCESS', 'ERROR'].includes(state)) {
        runPreviewFlow();
      }
    }
  }, [previewTrigger, state, runPreviewFlow]);

  // ─── React to org/deploy status changes ──────────────────────────────────

  useEffect(() => {
    if (!isOrgConnected) {
      setState('NOT_CONNECTED');
    } else if (!isDeployed && state === 'NOT_CONNECTED') {
      setState('NOT_DEPLOYED');
    } else if (isDeployed && state === 'NOT_DEPLOYED') {
      setState('IDLE');
    }
  }, [isOrgConnected, isDeployed, state]);

  // ─── Shared progress bar ──────────────────────────────────────────────────

  const renderProgressBar = () => (
    <div className="w-full h-0.5 bg-[#21262d] overflow-hidden mb-6">
      <div
        className="h-full bg-gradient-to-r from-[#00a1e0] to-[#4fc3f7] transition-all duration-700 ease-out relative"
        style={{ width: `${progressPct}%` }}
      >
        <div className="absolute inset-0 animate-pulse opacity-50 bg-white" />
      </div>
    </div>
  );

  // ─── State UIs ─────────────────────────────────────────────────────────────

  if (state === 'NOT_CONNECTED') {
    return (
      <div className="flex h-full items-center justify-center p-8 bg-[#0d1117]">
        <div className="flex flex-col items-center text-center gap-5 max-w-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#161b22] border border-dashed border-[#30363d] flex items-center justify-center">
            <Cloud className="w-7 h-7 text-[#484f58]" />
          </div>
          <div>
            <p className="text-[#e6edf3] font-semibold mb-1">No Salesforce Org Connected</p>
            <p className="text-[#8b949e] text-sm leading-relaxed">
              Connect your Salesforce org to enable live preview.
            </p>
          </div>
          <button
            id="preview-connect-org-btn"
            onClick={() => router.push('/dashboard/settings')}
            className="px-5 py-2 rounded-lg bg-[#00a1e0] hover:bg-[#0090c7] text-white text-sm font-semibold transition-all"
          >
            Connect Org
          </button>
        </div>
      </div>
    );
  }

  if (state === 'NOT_DEPLOYED') {
    return (
      <div className="flex h-full items-center justify-center p-8 bg-[#0d1117]">
        <div className="flex flex-col items-center text-center gap-5 max-w-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#f0883e]/10 border border-dashed border-[#f0883e]/40 flex items-center justify-center">
            <Rocket className="w-7 h-7 text-[#f0883e]" />
          </div>
          <div>
            <p className="text-[#e6edf3] font-semibold mb-1">Deploy Your Component First</p>
            <p className="text-[#8b949e] text-sm leading-relaxed">
              Click <span className="text-[#00a1e0] font-medium">Deploy to Org</span> in the editor toolbar
              to push your component to Salesforce, then preview it here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'IDLE') {
    return (
      <div className="flex h-full items-center justify-center p-8 bg-[#0d1117]">
        <div className="flex flex-col items-center text-center gap-5 max-w-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#00a1e0]/10 border border-dashed border-[#00a1e0]/40 flex items-center justify-center">
            <Eye className="w-7 h-7 text-[#00a1e0]" />
          </div>
          <div>
            <p className="text-[#e6edf3] font-semibold mb-1">Ready to Preview</p>
            <p className="text-[#8b949e] text-sm leading-relaxed">
              Your component is deployed. Click the button below to render it in Salesforce.
            </p>
          </div>
          <button
            id="preview-component-btn"
            onClick={runPreviewFlow}
            className="flex items-center gap-2 px-6 py-2.5 rounded-lg bg-gradient-to-r from-[#00a1e0] to-[#1565c0] hover:opacity-90 text-white text-sm font-bold transition-all shadow-lg shadow-[#00a1e0]/20"
          >
            <Eye className="w-4 h-4" />
            Preview Component
          </button>
        </div>
      </div>
    );
  }

  if (state === 'CREATING_PREVIEW' || state === 'LOADING_PREVIEW') {
    return (
      <div className="flex h-full flex-col p-8 bg-[#0d1117]">
        {renderProgressBar()}
        <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
          <div className="w-14 h-14 rounded-full bg-[#00a1e0]/10 flex items-center justify-center">
            <Loader2 className="w-7 h-7 text-[#00a1e0] animate-spin" />
          </div>
          <div>
            <p className="text-[#e6edf3] font-semibold mb-1">Preparing Preview...</p>
            <p className="text-[#8b949e] text-xs">Synchronizing with Salesforce Master App...</p>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'SUCCESS') {
    const syncUrl = `/api/salesforce/preview-proxy?userId=${encodeURIComponent(userId)}&componentName=${encodeURIComponent(componentName)}&t=${Date.now()}`;

    return (
      <div className="flex h-full flex-col bg-[#0d1117] items-center justify-center p-12 text-center">
        <div className="max-w-md w-full space-y-8">
          <div className="relative mx-auto w-24 h-24">
            <div className="absolute inset-0 bg-[#00a1e0]/20 rounded-2xl rotate-6 blur-xl" />
            <div className="relative bg-[#161b22] border border-[#30363d] rounded-2xl w-full h-full flex items-center justify-center">
              <Monitor className="w-10 h-10 text-[#00a1e0]" />
            </div>
            <div className="absolute -bottom-2 -right-2 bg-[#26a641] w-6 h-6 rounded-full border-4 border-[#0d1117] flex items-center justify-center">
              <Check className="w-3 h-3 text-white" />
            </div>
          </div>

          <div className="space-y-4">
            <h3 className="text-2xl font-bold text-white tracking-tight">Preview Environment Ready</h3>
            <p className="text-[#8b949e] leading-relaxed">
              Salesforce security policies prevent components from being rendered directly inside frames. 
              We&apos;ve initialized a <span className="text-[#e6edf3] font-medium">Native Bridge</span> instead.
            </p>
          </div>

          <div className="p-4 bg-[#161b22] border border-[#30363d] rounded-xl space-y-3">
             <div className="flex items-center gap-2 text-[#79c0ff] text-sm font-medium">
                <Info className="w-4 h-4" />
                <span>Pro Debugging Tip</span>
             </div>
             <p className="text-[#8b949e] text-xs text-left leading-relaxed">
                For a professional setup, we recommend using <span className="text-white">Split Tabs</span> or a 
                secondary monitor to see your changes update in real-time after each deploy.
             </p>
          </div>
          
          <div className="pt-4 flex flex-col gap-3">
            <button
              onClick={() => {
                window.open(syncUrl, 'LWC_STUDIO_PREVIEW_WINDOW');
              }}
              className="group relative flex items-center justify-center gap-3 w-full py-4 px-6 bg-[#00a1e0] hover:bg-[#008cc2] text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-[#00a1e0]/20 transform hover:-translate-y-0.5 active:translate-y-0"
            >
              <ExternalLink className="w-5 h-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
              Launch / Sync Preview
            </button>
            
            <button
               onClick={runPreviewFlow}
               className="text-[#58a6ff] hover:text-[#79c0ff] text-sm font-medium transition-colors"
            >
               Re-sync Preview Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (state === 'ERROR') {
    return (
      <div className="flex h-full items-center justify-center p-8 bg-[#0d1117]">
        <div className="flex flex-col items-center text-center gap-5 max-w-xs">
          <div className="w-16 h-16 rounded-2xl bg-[#da3633]/10 border border-dashed border-[#da3633]/40 flex items-center justify-center">
            <AlertTriangle className="w-7 h-7 text-[#da3633]" />
          </div>
          <div>
            <p className="text-[#f85149] font-semibold mb-1">
              {previewError?.title ?? 'Preview Error'}
            </p>
            <p className="text-[#8b949e] text-sm leading-relaxed">
              {previewError?.message ?? 'An unknown error occurred.'}
            </p>
          </div>
          <div className="flex flex-col gap-2 w-full">
            <button
              onClick={handleReset}
              className="px-5 py-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] text-sm font-semibold transition-all"
            >
              Try Again
            </button>
            {previewError?.type === 'SESSION_EXPIRED' && (
              <button
                onClick={() => router.push('/dashboard/settings')}
                className="px-5 py-2 rounded-lg bg-[#00a1e0] hover:bg-[#0090c7] text-white text-sm font-semibold transition-all"
              >
                Reconnect Org
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return null;
}
