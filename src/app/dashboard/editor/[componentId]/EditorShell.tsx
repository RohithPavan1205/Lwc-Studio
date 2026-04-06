'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useEditorStore } from '@/store/editorStore';
import LwcEditor from '@/components/Editor';
import PreviewPanel from '@/components/PreviewPanel';
import NavBar from '@/components/NavBar';
import { Save, Loader2, CheckCircle, XCircle, Zap, X, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface EditorShellProps {
  componentId: string;
  componentName: string;
  htmlContent: string;
  jsContent: string;
  cssContent: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  isOrgConnected: boolean;
}

interface DeployFastResponse {
  success?: boolean;
  method?: 'update' | 'first-deploy';
  duration?: number;
  error?: string;
}

export default function EditorShell({
  componentId,
  componentName,
  htmlContent,
  jsContent,
  cssContent,
  userId,
  userFullName,
  userEmail,
  isOrgConnected,
}: EditorShellProps) {
  const {
    setComponentDefinition,
    setHtml,
    setJs,
    setCss,
    saveComponent,
    isDirty,
    isSaving,
    lastSavedAt,
    currentComponent,
    deployStatus,
    deployError,
    lastDeployedAt,
    lastDeployMethod,
    lastDeployDuration,
    setDeployStatus,
    setLastDeployedAt,
    isDeployed,
    setupBanner,
    setupBannerError,
    setSetupBanner,
    dismissSetupBanner,
  } = useEditorStore();

  // ── Local UI state for preview trigger ────────────────────────────────────
  const [previewTrigger, setPreviewTrigger] = useState(0);
  // Track if background setup was already attempted for this componentId
  const backgroundDeployAttempted = useRef(false);

  // ── Seed Zustand store once on mount ──────────────────────────────────────
  useEffect(() => {
    setComponentDefinition({
      id: componentId,
      name: componentName,
      htmlContent,
      jsContent,
      cssContent,
    });
  }, [componentId]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── TASK 3: Background first-deploy on mount ───────────────────────────────
  useEffect(() => {
    // Only trigger if org is connected, never deployed yet, and not already attempted
    if (!isOrgConnected || backgroundDeployAttempted.current) return;
    if (isDeployed()) return; // already deployed in this session

    backgroundDeployAttempted.current = true;
    void runBackgroundSetupDeploy();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOrgConnected]);

  const runBackgroundSetupDeploy = useCallback(async () => {
    setSetupBanner('in-progress');
    console.log('[BackgroundDeploy] Starting background setup for:', componentName);

    try {
      const res = await fetch('/api/salesforce/deploy-fast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          componentName,
          htmlContent,
          jsContent,
          cssContent,
        }),
      });

      const data = (await res.json()) as DeployFastResponse;

      if (res.ok && data.success) {
        console.log('[BackgroundDeploy] Setup complete via:', data.method);
        setLastDeployedAt(new Date(), data.method, data.duration);
        setSetupBanner('success');
        setPreviewTrigger((p) => p + 1);

        // Auto-dismiss success banner after 4 seconds
        setTimeout(() => dismissSetupBanner(), 4000);
      } else {
        const errMsg = data.error ?? 'Background setup failed';
        console.error('[BackgroundDeploy] Failed:', errMsg);
        setSetupBanner('error', errMsg);
      }
    } catch (err) {
      console.error('[BackgroundDeploy] Network error:', err);
      const msg = err instanceof Error ? err.message : 'Network error during background setup';
      setSetupBanner('error', msg);
    }
  }, [componentName, htmlContent, jsContent, cssContent, setSetupBanner, setLastDeployedAt, dismissSetupBanner]);

  // ── Draggable divider ──────────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null);
  const [editorWidthPct, setEditorWidthPct] = useState(45);
  const isDragging = useRef(false);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isDragging.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const newPct = ((e.clientX - rect.left) / rect.width) * 100;
      setEditorWidthPct(Math.min(75, Math.max(25, newPct)));
    };
    const handleMouseUp = () => {
      isDragging.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  // ── Ctrl/Cmd+S → save (NOT deploy) ────────────────────────────────────────
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        if (isDirty) saveComponent();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isDirty, saveComponent]);

  // ── TASK 2: Refresh preview tab after deploy ───────────────────────────────
  // IMPORTANT: The named preview window has navigated to Salesforce's domain
  // (cross-origin), so `.location.reload()` will SILENTLY FAIL due to browser
  // security. Instead, we re-navigate through our same-origin preview-proxy,
  // which triggers a fresh frontdoor.jsp redirect with the recompiled component.
  const refreshPreviewTab = useCallback(() => {
    try {
      const syncUrl = `/api/salesforce/preview-proxy?userId=${encodeURIComponent(userId)}&componentName=${encodeURIComponent(componentName)}&t=${Date.now()}`;
      const previewWin = window.open(syncUrl, 'LWC_STUDIO_PREVIEW_WINDOW');
      if (!previewWin || previewWin.closed) {
        console.log('[Preview] Preview window not open — skipping refresh');
      } else {
        console.log('[Preview] Refreshing preview via proxy redirect');
      }
    } catch (err) {
      console.error('[Preview] Failed to refresh preview tab:', err);
    }
  }, [userId, componentName]);

  // ── TASK 4: Deploy handler using deploy-fast ───────────────────────────────
  const handleDeploy = useCallback(async () => {
    if (deployStatus === 'deploying') return;

    const name = currentComponent.name;
    console.log('[Deploy] Starting fast deploy for component:', name);

    if (isDirty) await saveComponent();

    setDeployStatus('deploying');

    try {
      const res = await fetch('/api/salesforce/deploy-fast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          componentName: name,
          htmlContent: currentComponent.htmlContent,
          jsContent: currentComponent.jsContent,
          cssContent: currentComponent.cssContent,
        }),
      });

      const data = (await res.json()) as DeployFastResponse;
      console.log('[Deploy] Response:', res.status, data);

      if (res.ok && data.success) {
        console.log('[Deploy] Successful via:', data.method, `in ${((data.duration ?? 0) / 1000).toFixed(1)}s`);
        setLastDeployedAt(new Date(), data.method, data.duration);

        // Auto-clear success status after 4 seconds
        setTimeout(() => setDeployStatus('idle'), 4000);

        // Bump preview trigger so PreviewPanel knows a fresh deploy happened
        setPreviewTrigger((p) => p + 1);

        // TASK 2: Refresh the named preview tab
        refreshPreviewTab();
      } else {
        const errMsg = data.error ?? 'Deploy failed';
        console.error('[Deploy] Failed:', errMsg);
        setDeployStatus('error', errMsg);
        setTimeout(() => setDeployStatus('idle'), 8000);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error during deploy';
      console.error('[Deploy] Crashed:', err);
      setDeployStatus('error', msg);
      setTimeout(() => setDeployStatus('idle'), 8000);
    }
  }, [currentComponent, isDirty, saveComponent, setDeployStatus, setLastDeployedAt, deployStatus, refreshPreviewTab]);

  // ── Breadcrumbs ────────────────────────────────────────────────────────────
  const breadcrumbs = [
    { label: componentName, href: `/dashboard/editor/${componentId}` },
  ];

  // ── Deploy button text with method/duration ────────────────────────────────
  const deploySuccessLabel = (() => {
    if (!lastDeployMethod || !lastDeployDuration) return 'Deployed ✓';
    const secs = (lastDeployDuration / 1000).toFixed(1);
    // Honest labels: 'update' is the lean Metadata deploy, 'first-deploy' is the full one
    return lastDeployMethod === 'update'
      ? `Fast Update · ${secs}s ✓`
      : `First Deploy · ${secs}s ✓`;
  })();

  // ── Deploy button rendering ────────────────────────────────────────────────
  const renderDeployButton = () => {
    if (deployStatus === 'deploying') {
      return (
        <button
          disabled
          className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-[#00a1e0]/70 text-white text-xs font-semibold cursor-not-allowed"
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Compiling...
        </button>
      );
    }
    // success — only show if NOT dirty and NOT idle
    if (deployStatus === 'success' && !isDirty) {
      return (
        <button
          onClick={handleDeploy}
          className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-[#238636]/80 hover:bg-[#21732e] text-white text-xs font-semibold transition-all"
        >
          <CheckCircle className="w-3.5 h-3.5" />
          {deploySuccessLabel}
        </button>
      );
    }
    if (deployStatus === 'error' && !isDirty) {
      return (
        <button
          onClick={handleDeploy}
          title={deployError ?? 'Deploy failed — click to retry'}
          className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-[#da3633] hover:bg-[#b91c1c] text-white text-xs font-semibold transition-all"
        >
          <XCircle className="w-3.5 h-3.5" />
          Retry Deploy
        </button>
      );
    }
    // idle — disabled if setup banner is still in progress
    const isSetupPending = setupBanner === 'in-progress';
    return (
      <button
        id="editor-deploy-btn"
        onClick={handleDeploy}
        disabled={!isOrgConnected || isSetupPending}
        title={
          !isOrgConnected
            ? 'Connect a Salesforce org first'
            : isSetupPending
            ? 'Setting up component in Salesforce, please wait...'
            : 'Deploy component to Salesforce'
        }
        className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-[#00a1e0] hover:bg-[#0090c7] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-all shadow-sm shadow-[#00a1e0]/20"
      >
        <Zap className="w-3.5 h-3.5" />
        Deploy to Org
      </button>
    );
  };

  // ── Setup banner rendering (Task 3) ────────────────────────────────────────
  const renderSetupBanner = () => {
    if (setupBanner === 'hidden') return null;

    if (setupBanner === 'in-progress') {
      return (
        <div className="flex items-center gap-3 px-4 py-2.5 bg-[#00a1e0]/10 border-b border-[#00a1e0]/20 flex-shrink-0">
          <Loader2 className="w-3.5 h-3.5 text-[#00a1e0] animate-spin flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[#00a1e0] text-xs font-semibold">⚡ Setting up your component in Salesforce...</span>
            {/* Animated progress bar */}
            <div className="w-full h-0.5 bg-[#21262d] rounded-full mt-1.5 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-[#00a1e0] to-[#4fc3f7] animate-pulse rounded-full w-3/4" />
            </div>
            <span className="text-[#8b949e] text-[10px]">You can start coding now</span>
          </div>
        </div>
      );
    }

    if (setupBanner === 'success') {
      return (
        <div className="flex items-center justify-between gap-3 px-4 py-2 bg-[#238636]/10 border-b border-[#238636]/20 flex-shrink-0">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-3.5 h-3.5 text-[#3fb950] flex-shrink-0" />
            <span className="text-[#3fb950] text-xs font-semibold">✅ Component ready · Preview is now available</span>
          </div>
          <button onClick={dismissSetupBanner} className="text-[#484f58] hover:text-[#8b949e] transition-colors">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }

    if (setupBanner === 'error') {
      return (
        <div className="flex items-center justify-between gap-3 px-4 py-2 bg-[#da3633]/10 border-b border-[#da3633]/20 flex-shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <AlertTriangle className="w-3.5 h-3.5 text-[#f85149] flex-shrink-0" />
            <span className="text-[#f85149] text-xs font-semibold truncate">
              ⚠️ Setup failed: {setupBannerError}
            </span>
          </div>
          <button
            onClick={() => void runBackgroundSetupDeploy()}
            className="flex-shrink-0 text-xs text-[#f85149] hover:text-white border border-[#da3633]/40 hover:border-[#da3633] rounded px-2 py-0.5 transition-all"
          >
            Retry
          </button>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex flex-col h-screen bg-[#0d1117] overflow-hidden">

      {/* ── NavBar row + action buttons ────────────────────────────────────── */}
      <div className="flex items-center border-b border-[#21262d] bg-[#0d1117] flex-shrink-0 pr-4">
        <div className="flex-1 min-w-0">
          <NavBar
            userFullName={userFullName}
            userEmail={userEmail}
            isOrgConnected={isOrgConnected}
            breadcrumbs={breadcrumbs}
          />
        </div>

        {/* Toolbar buttons — right side of NavBar row */}
        <div className="flex items-center gap-2 flex-shrink-0">
          {/* Unsaved badge */}
          {isDirty && (
            <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#f0883e]/10 text-[#f0883e] border border-[#f0883e]/20">
              Unsaved
            </span>
          )}

          {/* Save button */}
          <button
            id="editor-save-btn"
            onClick={() => saveComponent()}
            disabled={!isDirty || isSaving}
            className="flex items-center gap-2 px-4 py-1.5 rounded-md border border-[#30363d] bg-[#21262d] hover:bg-[#30363d] disabled:opacity-40 disabled:cursor-not-allowed text-[#e6edf3] text-xs font-semibold transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Saving...' : 'Save'}
          </button>

          {/* Deploy button */}
          {renderDeployButton()}

          {/* Deploy error tooltip */}
          {deployStatus === 'error' && deployError && (
            <span
              className="hidden lg:block text-[#f85149] text-xs max-w-[180px] truncate"
              title={deployError}
            >
              {deployError}
            </span>
          )}
        </div>
      </div>

      {/* ── Setup Banner (Task 3) ────────────────────────────────────────────── */}
      {renderSetupBanner()}

      {/* ── Main Split Pane ─────────────────────────────────────────────────── */}
      <div ref={containerRef} className="flex flex-1 overflow-hidden">

        {/* Left: Monaco Editor */}
        <div
          className="flex flex-col overflow-hidden"
          style={{ width: `${editorWidthPct}%`, minWidth: 0 }}
        >
          <LwcEditor
            htmlCode={currentComponent.htmlContent}
            jsCode={currentComponent.jsContent}
            cssCode={currentComponent.cssContent}
            onChange={(type, value) => {
              if (type === 'html') setHtml(value);
              else if (type === 'js') setJs(value);
              else setCss(value);
            }}
          />

          {/* ── Status bar at bottom of editor ────────────────────────────── */}
          <div className="flex items-center justify-between px-4 py-1.5 bg-[#0d1117] border-t border-[#21262d] flex-shrink-0 text-[11px] text-[#484f58] font-mono">
            <span>
              {isSaving
                ? '● Saving...'
                : isDirty
                  ? '● Unsaved changes'
                  : lastSavedAt
                    ? `✓ Saved ${formatDistanceToNow(lastSavedAt, { addSuffix: true })}`
                    : ''}
            </span>
            <span>
              {deployStatus === 'deploying'
                ? '⟳ Deploying to Salesforce...'
                : lastDeployedAt
                  ? `✓ Deployed ${formatDistanceToNow(lastDeployedAt, { addSuffix: true })}`
                  : setupBanner === 'in-progress'
                  ? '⟳ Setting up...'
                  : 'Not deployed yet'}
            </span>
          </div>
        </div>

        {/* Draggable Divider */}
        <div
          onMouseDown={handleMouseDown}
          className="flex-shrink-0 w-1 bg-[#30363d] hover:bg-[#00a1e0] cursor-col-resize transition-colors duration-150 relative group"
          title="Drag to resize"
        >
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 flex flex-col justify-center items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {[0, 1, 2].map((i) => (
              <div key={i} className="w-1 h-1 rounded-full bg-[#00a1e0]" />
            ))}
          </div>
        </div>

        {/* Right: Preview Panel */}
        <div
          className="flex flex-col overflow-hidden"
          style={{ width: `${100 - editorWidthPct}%`, minWidth: 0 }}
        >
          <PreviewPanel
            componentId={componentId}
            componentName={componentName}
            userId={userId}
            isOrgConnected={isOrgConnected}
            isDeployed={isDeployed()}
            previewTrigger={previewTrigger}
          />
        </div>
      </div>
    </div>
  );
}
