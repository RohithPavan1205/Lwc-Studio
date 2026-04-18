'use client';

import { useEffect, useState, useCallback, useMemo, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import {
  Zap,
  Plus,
  Search,
  Trash2,
  Loader2,
  AlertCircle,
  X,
  CheckCircle,
  AlertTriangle,
  LayoutGrid,
  Download,
  LayoutTemplate,
  List
} from 'lucide-react';
import DashboardNavbar from '@/components/navigation/DashboardNavbar';
import CreateComponentModal from '@/components/CreateComponentModal';
import ImportModal from '@/components/ImportModal';
import ComponentCard from '@/components/dashboard/ComponentCard';
import ComponentListRow from '@/components/dashboard/ComponentListRow';
import { useResponsiveColumns } from '@/hooks/useResponsiveColumns';

// ─── Types ───────────────────────────────────────────────────────────────────

interface Component {
  id: string;
  name: string;
  master_label?: string;
  api_version?: string;
  created_at: string;
  updated_at: string;
  html_content?: string;
  css_content?: string;
}

interface UserProfile {
  fullName: string;
  email: string;
  userId: string;
}

type DeployStatus = 'synced' | 'draft' | 'error' | 'deploying' | 'org-only';
type FilterTab = 'all' | 'deployed' | 'draft';
type ViewMode = 'grid' | 'list';

// ─── Deploy Status Pill ───────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-unused-vars
function DeployStatusPill({ status }: { status: DeployStatus }) {
  const configs: Record<DeployStatus, { label: string; cls: string }> = {
    synced: {
      label: 'Deployed',
      cls: 'inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border bg-[#10B981]/10 text-[#10B981] border-[#10B981]/20',
    },
    draft: {
      label: 'Draft',
      cls: 'inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border bg-[#F59E0B]/10 text-[#F59E0B] border-[#F59E0B]/20',
    },
    error: {
      label: 'Error',
      cls: 'inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border bg-[#EF4444]/10 text-[#EF4444] border-[#EF4444]/20',
    },
    deploying: {
      label: 'Deploying',
      cls: 'inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border bg-[#3B82F6]/10 text-[#3B82F6] border-[#3B82F6]/20 animate-forge-pulse',
    },
    'org-only': {
      label: 'Org Only',
      cls: 'inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full border bg-[#4B5563]/15 text-[#9CA3AF] border-[#4B5563]/20',
    },
  };

  const dotColors: Record<DeployStatus, string> = {
    synced: '#10B981',
    draft: '#F59E0B',
    error: '#EF4444',
    deploying: '#3B82F6',
    'org-only': '#4B5563',
  };

  const { label, cls } = configs[status];
  return (
    <span className={cls}>
      <span
        style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: dotColors[status],
          display: 'inline-block',
          flexShrink: 0,
        }}
      />
      {label}
    </span>
  );
}

// ─── Preview Strip ────────────────────────────────────────────────────────────

const PREVIEW_PATTERNS = [
  // pattern 0 – wide bar + 2 short
  [
    { w: '75%', h: 6, accent: true },
    { w: '45%', h: 6, accent: false },
    { w: '60%', h: 6, accent: false },
  ],
  // pattern 1 – two-col row feel
  [
    { w: '55%', h: 6, accent: false },
    { w: '30%', h: 6, accent: true },
    { w: '70%', h: 6, accent: false },
  ],
  // pattern 2 – table row-ish
  [
    { w: '80%', h: 6, accent: false },
    { w: '50%', h: 6, accent: false },
    { w: '35%', h: 6, accent: true },
  ],
  // pattern 3 – narrow + wide
  [
    { w: '35%', h: 6, accent: true },
    { w: '65%', h: 6, accent: false },
    { w: '50%', h: 6, accent: false },
  ],
];

// eslint-disable-next-line @typescript-eslint/no-unused-vars, @typescript-eslint/no-explicit-any
function ComponentPreviewStrip({ metadata }: { metadata: any }) {
  const pattern = PREVIEW_PATTERNS[0 % PREVIEW_PATTERNS.length];
  return (
    <div
      className="rounded-lg mb-4 px-3 py-3 flex flex-col gap-1.5"
      style={{
        background: 'var(--bg-void)',
        border: '0.5px solid var(--border-subtle)',
        height: 56,
        justifyContent: 'center',
      }}
    >
      {pattern.map((bar, i) => (
        <div
          key={i}
          style={{
            width: bar.w,
            height: bar.h,
            borderRadius: 3,
            background: bar.accent ? 'rgba(249,115,22,0.35)' : 'rgba(255,255,255,0.06)',
          }}
        />
      ))}
    </div>
  );
}

// ─── Skeleton Card ────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="forge-card component-card rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div className="skeleton h-9 w-9 rounded-lg" />
        <div className="skeleton h-5 w-16 rounded-full" />
      </div>
      <div className="skeleton h-12 w-full rounded-lg mb-3" />
      <div className="skeleton h-4 w-3/4 rounded mb-2" />
      <div className="skeleton h-3 w-1/2 rounded mb-4" />
      <div className="flex justify-between items-center pt-3 border-t border-[var(--border-subtle)]">
        <div className="skeleton h-3 w-16 rounded" />
        <div className="skeleton h-5 w-12 rounded-md" />
      </div>
    </div>
  );
}

// Deprecated inline ComponentCard and ComponentRow replaced with standard imports,
// Keeping SkeletonCard untouched for loading states.

// ─── Stats Row ────────────────────────────────────────────────────────────────

function StatsRow({ components, isOrgConnected }: { components: Component[]; isOrgConnected: boolean }) {
  // Without real deploy status from DB, derive totals from what we have
  const total = components.length;
  // Treat "synced" as any component deployed; for now all are draft until you wire real status
  const deployed = 0;
  const drafts = total;
  const apiVersion = components[0]?.api_version ?? '—';

  const stats = [
    { label: 'Total', value: total, sub: 'Components' },
    { label: 'Deployed', value: deployed, sub: isOrgConnected ? 'In org' : 'Org disconnected' },
    { label: 'Drafts', value: drafts, sub: 'Pending deploy' },
    { label: 'API Version', value: apiVersion ? `v${apiVersion}` : '—', sub: 'Spring \'25' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
      {stats.map((s) => (
        <div
          key={s.label}
          className="rounded-xl px-4 py-3.5"
          style={{ background: 'var(--bg-elevated)', border: '0.5px solid var(--border-subtle)' }}
        >
          <p className="text-[10px] font-semibold text-[var(--text-tertiary)] uppercase tracking-widest mb-1.5">
            {s.label}
          </p>
          <p className="text-2xl font-bold text-[var(--text-primary)] leading-none tracking-tight mb-1">
            {s.value}
          </p>
          <p className="text-[11px] text-[var(--text-tertiary)]">{s.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Empty State ──────────────────────────────────────────────────────────────

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 text-center">
      <div className="relative mb-6">
        <div className="w-20 h-20 rounded-2xl bg-[var(--forge-fire)] flex items-center justify-center">
          <Zap size={36} className="text-[var(--forge-primary)]" />
        </div>
        <div
          className="absolute inset-0 rounded-2xl animate-forge-pulse"
          style={{ boxShadow: '0 0 0 0 rgba(247,127,0,0.4)' }}
        />
      </div>
      <h3 className="text-lg font-semibold text-[var(--text-primary)] mb-2">No components yet</h3>
      <p className="text-sm text-[var(--text-secondary)] max-w-xs leading-relaxed mb-6">
        Create your first LWC component and start building without the wait.
      </p>
      <button
        id="empty-create-component-btn"
        onClick={onCreateClick}
        className="btn-forge-primary onboarding-pulse"
      >
        <Plus size={16} />
        Create Your First Component
      </button>
      <p className="mt-4 text-sm text-[var(--text-tertiary)]">
        Or explore our{' '}
        <Link
          href="/templates"
          className="text-[var(--forge-primary)] hover:text-[var(--forge-glow)] underline underline-offset-2"
        >
          Template Gallery →
        </Link>
      </p>
    </div>
  );
}

// ─── Delete Modal ─────────────────────────────────────────────────────────────

function DeleteModal({
  componentName,
  onConfirm,
  onCancel,
  isDeleting,
}: {
  componentName: string;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}) {
  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onCancel()}>
      <div className="modal-content max-w-sm">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-[var(--error-subtle)] flex items-center justify-center flex-shrink-0">
              <Trash2 size={18} className="text-[var(--error)]" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">Delete Component</h2>
              <p className="text-xs text-[var(--text-secondary)]">This action cannot be undone</p>
            </div>
          </div>
          <p className="text-sm text-[var(--text-secondary)] mb-6">
            Permanently delete{' '}
            <span className="text-[var(--text-primary)] font-medium">{componentName}</span>?
            This removes all code and version history.
          </p>
          <p className="text-xs text-[var(--text-tertiary)] mb-6">
            Note: This does NOT delete the component from your Salesforce org.
          </p>
          <div className="flex gap-3 justify-end">
            <button
              onClick={onCancel}
              disabled={isDeleting}
              className="btn-ghost px-4 py-2 text-sm"
            >
              Cancel
            </button>
            <button
              id="confirm-delete-btn"
              onClick={onConfirm}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold bg-[var(--error)] hover:bg-red-500 text-white disabled:opacity-50 transition-colors"
            >
              {isDeleting ? (
                <Loader2 size={14} className="animate-forge-spin" />
              ) : (
                <Trash2 size={14} />
              )}
              {isDeleting ? 'Deleting...' : 'Delete'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({
  message,
  type = 'success',
  onDone,
}: {
  message: string;
  type?: 'success' | 'error';
  onDone: () => void;
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 3500);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed bottom-6 right-6 z-[600] flex items-center gap-3 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl px-4 py-3 shadow-[var(--shadow-lg)] toast-enter">
      {type === 'success' ? (
        <CheckCircle size={16} className="text-[var(--success)]" />
      ) : (
        <AlertCircle size={16} className="text-[var(--error)]" />
      )}
      <span className="text-sm text-[var(--text-primary)]">{message}</span>
      <button onClick={onDone} className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] ml-1">
        <X size={13} />
      </button>
    </div>
  );
}

// ─── Org Disconnected Banner ──────────────────────────────────────────────────

function OrgDisconnectedBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;
  return (
    <div className="inline-banner warning flex-shrink-0">
      <AlertTriangle size={15} className="flex-shrink-0" />
      <span className="text-sm flex-1">
        <strong>Your Salesforce org is disconnected.</strong> Previews and deploys are unavailable.
      </span>
      <Link
        href="/dashboard/settings"
        className="text-xs font-semibold underline underline-offset-2 whitespace-nowrap"
      >
        Reconnect Org →
      </Link>
      <button onClick={() => setDismissed(true)} className="ml-2">
        <X size={13} />
      </button>
    </div>
  );
}

// ─── Dashboard Inner ──────────────────────────────────────────────────────────

function DashboardContent() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [profile, setProfile] = useState<UserProfile>({ fullName: '', email: '', userId: '' });
  const [components, setComponents] = useState<Component[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isOrgConnected, setIsOrgConnected] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [apiUsage, setApiUsage] = useState<{ used: number; limit: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<FilterTab>('all');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Component | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isRefreshing, setIsRefreshing] = useState(false);
  const cols = useResponsiveColumns();

  useEffect(() => {
    if (searchParams.get('new') === '1') setShowCreateModal(true);
  }, [searchParams]);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/'); return; }

      const [profileRes, orgRes, componentsRes] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).single(),
        supabase.from('salesforce_connections').select('id').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('components')
          .select('id, name, master_label, api_version, created_at, updated_at, html_content, css_content')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false }),
      ]);

      setProfile({ fullName: profileRes.data?.full_name ?? '', email: user.email ?? '', userId: user.id });
      setIsOrgConnected(!!orgRes.data);
      setComponents(componentsRes.data ?? []);

      if (orgRes.data) {
        fetch('/api/salesforce/api-limits', { cache: 'no-store' })
          .then((r) => r.json())
          .then((d) => { if (d.used !== undefined) setApiUsage({ used: d.used, limit: d.limit }); })
          .catch(() => {});
      }
    } catch {
      // Load failed — user sees empty state
    } finally {
      setIsLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleComponentCreated = useCallback(
    (componentId: string) => { router.push(`/dashboard/editor/${componentId}`); },
    [router]
  );

  const handleDeleteConfirm = useCallback(async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/components/load/${deleteTarget.id}`, { method: 'DELETE' });
      if (res.ok) {
        setComponents((prev) => prev.filter((c) => c.id !== deleteTarget.id));
        setToast({ message: 'Component deleted', type: 'success' });
      } else {
        const data = await res.json();
        setToast({ message: data.error ?? 'Failed to delete', type: 'error' });
      }
    } catch {
      setToast({ message: 'Network error', type: 'error' });
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  }, [deleteTarget]);

  // Derive a simple deterministic status per component
  // Once you have a real `status` column in your DB, replace this
  const getComponentStatus = useCallback(
    (component: Component, index: number): DeployStatus => {
      if (!isOrgConnected) return 'draft';
      // First 3 components are treated as "synced" as a placeholder
      // Replace with real DB field: component.deploy_status
      if (index < 3) return 'synced';
      return 'draft';
    },
    [isOrgConnected]
  );

  const filteredComponents = useMemo(() => {
    return components.filter((c, i) => {
      const status = getComponentStatus(c, i);
      const matchesSearch =
        !searchQuery ||
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (c.master_label ?? '').toLowerCase().includes(searchQuery.toLowerCase());

      const matchesFilter =
        activeFilter === 'all' ||
        (activeFilter === 'deployed' && status === 'synced') ||
        (activeFilter === 'draft' && status === 'draft');

      return matchesSearch && matchesFilter;
    });
  }, [components, searchQuery, activeFilter, getComponentStatus]);

  const filterCounts = useMemo(() => ({
    all: components.length,
    deployed: components.filter((_, i) => getComponentStatus(_, i) === 'synced').length,
    draft: components.filter((_, i) => getComponentStatus(_, i) === 'draft').length,
  }), [components, getComponentStatus]);

  const user = profile.email ? { name: profile.fullName, email: profile.email } : undefined;

  return (
    <div className="min-h-screen bg-[var(--bg-void)] flex flex-col">
      {!isLoading && !isOrgConnected && <OrgDisconnectedBanner />}

      <DashboardNavbar
        user={user}
        orgStatus={isOrgConnected ? 'connected' : 'disconnected'}
      />

      <main className="flex-1 px-4 sm:px-6 py-8 max-w-6xl mx-auto w-full">

        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
          <div>
            <h1 className="text-xl font-bold text-[var(--text-primary)]">
              {profile.fullName ? `${profile.fullName.split(' ')[0]}'s Components` : 'My Components'}
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mt-0.5">
              Manage your Lightning Web Components
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              onClick={() => setShowImportModal(true)}
              className="btn-ghost text-sm px-3 py-2"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Import</span>
            </button>
            <Link
              href="/templates"
              className="btn-ghost text-sm px-3 py-2"
            >
              <LayoutTemplate size={14} />
              <span className="hidden sm:inline">Templates</span>
            </Link>
            <button
              id="new-component-btn"
              onClick={() => setShowCreateModal(true)}
              className="btn-forge-primary text-sm px-4 py-2"
            >
              <Plus size={15} />
              New Component
            </button>
          </div>
        </div>

        {/* Stats row — only when we have components */}
        {!isLoading && components.length > 0 && (
          <StatsRow components={components} isOrgConnected={isOrgConnected} />
        )}

        {/* Toolbar: search + filter tabs + view toggle */}
        {components.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-6">
            {/* Search */}
            <div className="relative flex-shrink-0">
              <Search
                size={14}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] pointer-events-none z-10"
              />
              <input
                id="dashboard-search"
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search components..."
                className="forge-input py-2 text-sm w-52"
                style={{ paddingLeft: '2.25rem' }}
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Filter tabs */}
            <div
              className="flex items-center gap-0.5 p-1 rounded-lg flex-shrink-0"
              style={{ background: 'var(--bg-elevated)', border: '0.5px solid var(--border-subtle)' }}
            >
              {(['all', 'deployed', 'draft'] as FilterTab[]).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveFilter(tab)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-all capitalize"
                  style={{
                    background: activeFilter === tab ? 'var(--bg-overlay)' : 'transparent',
                    color: activeFilter === tab ? 'var(--text-primary)' : 'var(--text-tertiary)',
                  }}
                >
                  {tab === 'all' ? 'All' : tab === 'deployed' ? 'Deployed' : 'Draft'}
                  <span
                    className="text-[10px] px-1 py-0 rounded-sm"
                    style={{
                      background: activeFilter === tab ? 'var(--forge-fire)' : 'transparent',
                      color: activeFilter === tab ? 'var(--forge-primary)' : 'var(--text-tertiary)',
                    }}
                  >
                    {filterCounts[tab]}
                  </span>
                </button>
              ))}
            </div>

            {/* Spacer */}
            <div className="flex-1" />

            {/* View toggle */}
            <div
              className="flex items-center gap-0.5 p-1 rounded-lg flex-shrink-0"
              style={{ background: 'var(--bg-elevated)', border: '0.5px solid var(--border-subtle)' }}
            >
              <button
                onClick={() => setViewMode('grid')}
                className="p-1.5 rounded-md transition-all"
                style={{
                  background: viewMode === 'grid' ? 'var(--bg-overlay)' : 'transparent',
                  color: viewMode === 'grid' ? 'var(--forge-primary)' : 'var(--text-tertiary)',
                }}
                aria-label="Grid view"
              >
                <LayoutGrid size={14} />
              </button>
              <button
                onClick={() => setViewMode('list')}
                className="p-1.5 rounded-md transition-all"
                style={{
                  background: viewMode === 'list' ? 'var(--bg-overlay)' : 'transparent',
                  color: viewMode === 'list' ? 'var(--forge-primary)' : 'var(--text-tertiary)',
                }}
                aria-label="List view"
              >
                <List size={14} />
              </button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div>
            <div className="text-xs font-semibold text-[#4B5563] uppercase tracking-widest mb-4">
              Studio Components
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={i} />)}
            </div>
          </div>
        )}

        {/* Components */}
        {!isLoading && (
          <>
            {/* No search results */}
            {searchQuery && filteredComponents.length === 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <Search size={32} className="text-[var(--text-tertiary)] mb-4" />
                <p className="text-[var(--text-primary)] font-medium mb-2">
                  No components match &ldquo;{searchQuery}&rdquo;
                </p>
                <button
                  onClick={() => setSearchQuery('')}
                  className="btn-ghost text-sm px-4 py-2 mt-2"
                >
                  Clear Search
                </button>
              </div>
            )}

            {/* Empty state */}
            {!searchQuery && components.length === 0 && (
              <EmptyState onCreateClick={() => setShowCreateModal(true)} />
            )}

            {/* Components grid / list */}
            {filteredComponents.length > 0 && (
              <div className="mb-10">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xs font-semibold text-[#4B5563] uppercase tracking-widest">
                    Studio Components
                    <span className="ml-2 normal-case font-normal tracking-normal">
                      ({filteredComponents.length})
                    </span>
                  </h2>
                </div>

                {viewMode === 'grid' ? (
                  <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: '16px', alignItems: 'start', width: '100%' }}>
                    {Array.from({ length: cols }).map((_, colIndex) => {
                      const colItems = filteredComponents.filter((_, i) => i % cols === colIndex);
                      return (
                        <div key={colIndex} className="flex flex-col gap-4 w-full min-w-0">
                          {colItems.map((c, i) => (
                            <ComponentCard
                              key={c.id}
                              component={c}
                              onDelete={setDeleteTarget}
                              index={colIndex + i * cols}
                              status={getComponentStatus(c, components.indexOf(c))}
                            />
                          ))}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex flex-col gap-2">
                    {filteredComponents.map((c, i) => (
                      <ComponentListRow
                        key={c.id}
                        component={c}
                        onDelete={setDeleteTarget}
                        index={i}
                        status={getComponentStatus(c, components.indexOf(c))}
                      />
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Filter empty state */}
            {!searchQuery && filteredComponents.length === 0 && components.length > 0 && (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <p className="text-[var(--text-primary)] font-medium mb-2">
                  No {activeFilter} components
                </p>
                <button
                  onClick={() => setActiveFilter('all')}
                  className="btn-ghost text-sm px-4 py-2 mt-2"
                >
                  Show All
                </button>
              </div>
            )}
          </>
        )}
      </main>

      {/* Modals */}
      {showCreateModal && (
        <CreateComponentModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleComponentCreated}
        />
      )}
      {deleteTarget && (
        <DeleteModal
          componentName={deleteTarget.name}
          onConfirm={handleDeleteConfirm}
          onCancel={() => setDeleteTarget(null)}
          isDeleting={isDeleting}
        />
      )}
      {toast && (
        <Toast message={toast.message} type={toast.type} onDone={() => setToast(null)} />
      )}


      <ImportModal
        isOpen={showImportModal}
        onClose={() => setShowImportModal(false)}
        onComplete={loadData}
        existingComponentNames={components.map((c) => c.name)}
      />
    </div>
  );
}

export default function DashboardPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg-void)] flex items-center justify-center">
          <Loader2 size={28} className="animate-forge-spin text-[var(--forge-primary)]" />
        </div>
      }
    >
      <DashboardContent />
    </Suspense>
  );
}