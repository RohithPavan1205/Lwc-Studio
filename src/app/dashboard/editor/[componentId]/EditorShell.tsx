'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { useEditorStore } from '@/store/editorStore';
import LwcEditor from '@/components/Editor';
import PreviewPanel from '@/components/PreviewPanel';
import NavBar from '@/components/NavBar';
import { Save, Loader2, CheckCircle, XCircle, Rocket } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface EditorShellProps {
  componentId: string;
  componentName: string;
  projectId: string;
  projectName: string;
  htmlContent: string;
  jsContent: string;
  cssContent: string;
  userId: string;
  userFullName: string;
  userEmail: string;
  isOrgConnected: boolean;
}

export default function EditorShell({
  componentId,
  componentName,
  projectId,
  projectName,
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
    setDeployStatus,
    setLastDeployedAt,
    isDeployed,
  } = useEditorStore();

  // ── Local UI state for preview trigger ────────────────────────────────────
  const [previewTrigger, setPreviewTrigger] = useState(0);

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

  // ── Deploy handler ─────────────────────────────────────────────────────────
  const handleDeploy = useCallback(async () => {
    if (deployStatus === 'deploying') return;

    const name = currentComponent.name;
    console.log('[Deploy] Starting deploy for component:', name);

    // Step 1: Save first so the latest code is in DB
    if (isDirty) {
      await saveComponent();
    }

    // Step 2: Deploy to Salesforce
    setDeployStatus('deploying');

    try {
      const res = await fetch('/api/salesforce/deploy', {
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

      const data = await res.json();
      console.log('[Deploy] Deploy response:', res.status, JSON.stringify(data));

      if (res.ok && data.success) {
        console.log('[Deploy] Deploy successful for:', name);
        setLastDeployedAt(new Date());

        // Auto-clear success status after 4 seconds
        setTimeout(() => {
          setDeployStatus('idle');
        }, 4000);

        // Bump previewTrigger so PreviewPanel knows a fresh deploy happened
        setPreviewTrigger((p) => p + 1);
      } else {
        const errMsg = data.details || data.error || 'Deploy failed';
        console.error('[Deploy] Deploy failed:', errMsg);
        setDeployStatus('error', errMsg);

        // Auto-clear error after 8 seconds
        setTimeout(() => {
          setDeployStatus('idle');
        }, 8000);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Network error during deploy';
      console.error('[Deploy] Deploy crashed:', err);
      setDeployStatus('error', msg);
      setTimeout(() => {
        setDeployStatus('idle');
      }, 8000);
    }
  }, [currentComponent, isDirty, saveComponent, setDeployStatus, setLastDeployedAt, deployStatus]);

  // ── Breadcrumbs ────────────────────────────────────────────────────────────
  const breadcrumbs = [
    { label: projectName, href: `/dashboard/projects/${projectId}` },
    { label: componentName, href: `/dashboard/editor/${componentId}` },
  ];

  // ── Deploy button rendering ────────────────────────────────────────────────
  const renderDeployButton = () => {
    if (deployStatus === 'deploying') {
      return (
        <button
          disabled
          className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-[#00a1e0]/70 text-white text-xs font-semibold cursor-not-allowed"
        >
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
          Deploying...
        </button>
      );
    }
    if (deployStatus === 'success') {
      return (
        <button
          disabled
          className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-[#238636]/80 text-white text-xs font-semibold cursor-not-allowed"
        >
          <CheckCircle className="w-3.5 h-3.5" />
          Deployed ✓
        </button>
      );
    }
    if (deployStatus === 'error') {
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
    // idle
    return (
      <button
        id="editor-deploy-btn"
        onClick={handleDeploy}
        disabled={!isOrgConnected}
        title={!isOrgConnected ? 'Connect a Salesforce org first' : 'Deploy component to Salesforce'}
        className="flex items-center gap-2 px-4 py-1.5 rounded-md bg-[#00a1e0] hover:bg-[#0090c7] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-semibold transition-all shadow-sm shadow-[#00a1e0]/20"
      >
        <Rocket className="w-3.5 h-3.5" />
        Deploy to Org
      </button>
    );
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
