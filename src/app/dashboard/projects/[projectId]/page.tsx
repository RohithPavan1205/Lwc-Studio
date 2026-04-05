'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { formatDistanceToNow } from 'date-fns';
import { Code2, Plus, MoreHorizontal, Pencil, Trash2, X, AlertCircle, FileCode } from 'lucide-react';
import NavBar from '@/components/NavBar';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  name: string;
  description: string | null;
  user_id: string;
}

interface Component {
  id: string;
  name: string;
  project_id: string;
  updated_at: string;
}

interface UserProfile {
  fullName: string;
  email: string;
  isOrgConnected: boolean;
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5 animate-pulse">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-9 h-9 rounded-lg bg-[#21262d]" />
        <div className="h-4 bg-[#21262d] rounded w-2/5" />
      </div>
      <div className="h-3 bg-[#21262d] rounded w-1/3 mb-4" />
      <div className="h-8 bg-[#21262d] rounded-lg" />
    </div>
  );
}

// ─── Component Name Validation ────────────────────────────────────────────────

function validateComponentName(name: string): string | null {
  if (!name.trim()) return 'Component name is required.';
  if (!/^[A-Za-z][A-Za-z0-9]*$/.test(name.trim())) {
    return 'Letters and numbers only. Must start with a letter. No spaces or special characters.';
  }
  if (name.length > 80) return 'Name must be 80 characters or less.';
  return null;
}

// ─── Create Component Modal ───────────────────────────────────────────────────

interface CreateComponentModalProps {
  onClose: () => void;
  projectId: string;
  supabase: ReturnType<typeof createBrowserClient>;
  onCreated: (id: string) => void;
}

function CreateComponentModal({ onClose, projectId, supabase, onCreated }: CreateComponentModalProps) {
  const [name, setName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    const trimmedName = name.trim();
    const validationError = validateComponentName(trimmedName);
    if (validationError) {
      setError(validationError);
      return;
    }

    setIsCreating(true);
    setError('');

    const now = new Date().toISOString();
    const { data, error: dbError } = await supabase
      .from('components')
      .insert({
        project_id: projectId,
        name: trimmedName,
        html_content: `<template>\n  <div>\n    <h1>Hello from ${trimmedName}</h1>\n  </div>\n</template>`,
        js_content: `import { LightningElement } from 'lwc';\n\nexport default class ${trimmedName} extends LightningElement {\n\n}`,
        css_content: `/* Add your styles here */`,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    setIsCreating(false);

    if (dbError || !data) {
      console.error('[ProjectPage] Create component error:', dbError);
      setError(dbError?.message ?? 'Failed to create component.');
      return;
    }

    onCreated(data.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-md shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262d]">
          <h2 className="text-[#e6edf3] font-semibold text-base">New Component</h2>
          <button
            onClick={onClose}
            className="text-[#8b949e] hover:text-[#e6edf3] transition-colors p-1 rounded-md hover:bg-[#21262d]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-[#da3633]/10 border border-[#da3633]/20 rounded-lg text-[#f85149] text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#8b949e] uppercase tracking-wider mb-1.5">
              Component Name <span className="text-[#f85149]">*</span>
            </label>
            <input
              id="new-component-name-input"
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g. ContactCard"
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-2.5 text-sm text-[#e6edf3] placeholder:text-[#484f58] focus:outline-none focus:border-[#00a1e0] transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <div className="mt-2 p-3 bg-[#0d1117] rounded-lg border border-[#21262d]">
              <p className="text-xs text-[#8b949e] leading-relaxed">
                <span className="text-[#f0883e] font-medium">Salesforce requirement:</span>{' '}
                Letters and numbers only. No spaces or special characters. Must start with a letter.
              </p>
              <p className="text-xs text-[#484f58] mt-1">Example: <code className="text-[#79c0ff]">MyContactCard</code></p>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#21262d]">
          <button
            id="create-component-cancel-btn"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] transition-all"
          >
            Cancel
          </button>
          <button
            id="create-component-submit-btn"
            onClick={handleCreate}
            disabled={isCreating || !name.trim()}
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-[#00a1e0] hover:bg-[#0090c7] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isCreating ? 'Creating...' : 'Create & Open Editor'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Component Card ───────────────────────────────────────────────────────────

interface ComponentCardProps {
  component: Component;
  onRename: (id: string, newName: string) => void;
  onDelete: (id: string) => void;
}

function ComponentCard({ component, onRename, onDelete }: ComponentCardProps) {
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState(component.name);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const handleRenameSubmit = () => {
    const trimmed = renameValue.trim();
    if (!trimmed || trimmed === component.name) {
      setRenaming(false);
      setRenameValue(component.name);
      return;
    }
    const err = validateComponentName(trimmed);
    if (err) return;
    onRename(component.id, trimmed);
    setRenaming(false);
  };

  return (
    <div className="bg-[#161b22] border border-[#21262d] hover:border-[#30363d] rounded-xl p-5 transition-all duration-200 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-[#238636]/10 flex items-center justify-center flex-shrink-0">
          <Code2 className="w-4.5 h-4.5 text-[#3fb950]" size={18} />
        </div>
        <div className="flex-1 min-w-0">
          {renaming ? (
            <input
              autoFocus
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onBlur={handleRenameSubmit}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleRenameSubmit();
                if (e.key === 'Escape') { setRenaming(false); setRenameValue(component.name); }
              }}
              className="w-full bg-[#0d1117] border border-[#00a1e0] rounded-md px-2 py-1 text-sm text-[#e6edf3] focus:outline-none"
            />
          ) : (
            <p className="text-sm font-semibold text-[#e6edf3] truncate">{component.name}</p>
          )}
          <p className="text-xs text-[#484f58] mt-0.5">
            {component.updated_at
              ? formatDistanceToNow(new Date(component.updated_at), { addSuffix: true })
              : '—'}
          </p>
        </div>

        {/* Three-dot menu */}
        <div className="relative flex-shrink-0">
          <button
            onClick={() => setMenuOpen((v) => !v)}
            className="p-1 rounded-md text-[#484f58] hover:text-[#8b949e] hover:bg-[#21262d] transition-all"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>

          {menuOpen && (
            <div className="absolute right-0 top-full mt-1 w-36 bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl z-20 overflow-hidden">
              <button
                onClick={() => { setRenaming(true); setMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#e6edf3] hover:bg-[#21262d] transition-colors"
              >
                <Pencil className="w-3.5 h-3.5 text-[#8b949e]" />
                Rename
              </button>
              <button
                onClick={() => { setConfirmDelete(true); setMenuOpen(false); }}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-xs text-[#f85149] hover:bg-[#21262d] transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Delete confirmation */}
      {confirmDelete && (
        <div className="bg-[#da3633]/10 border border-[#da3633]/20 rounded-lg p-3">
          <p className="text-xs text-[#f85149] mb-3">Delete <strong>{component.name}</strong>? This cannot be undone.</p>
          <div className="flex gap-2">
            <button
              onClick={() => setConfirmDelete(false)}
              className="flex-1 py-1.5 rounded-md text-xs text-[#8b949e] bg-[#21262d] hover:bg-[#30363d] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => { onDelete(component.id); setConfirmDelete(false); }}
              className="flex-1 py-1.5 rounded-md text-xs text-white bg-[#da3633] hover:bg-[#b91c1c] transition-colors"
            >
              Delete
            </button>
          </div>
        </div>
      )}

      {/* Open Editor button */}
      <button
        onClick={() => router.push(`/dashboard/editor/${component.id}`)}
        className="w-full flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-semibold text-[#00a1e0] bg-[#00a1e0]/10 hover:bg-[#00a1e0]/20 border border-[#00a1e0]/20 hover:border-[#00a1e0]/40 transition-all"
      >
        <FileCode className="w-3.5 h-3.5" />
        Open Editor
      </button>
    </div>
  );
}

// ─── Main Project Page ─────────────────────────────────────────────────────────

export default function ProjectPage() {
  const params = useParams();
  const projectId = params.projectId as string;
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [project, setProject] = useState<Project | null>(null);
  const [components, setComponents] = useState<Component[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>({ fullName: '', email: '', isOrgConnected: false });
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      // Fetch project + verify ownership
      const { data: proj, error: projError } = await supabase
        .from('projects')
        .select('id, name, description, user_id')
        .eq('id', projectId)
        .single();

      if (projError || !proj) {
        router.push('/dashboard');
        return;
      }
      if (proj.user_id !== user.id) {
        router.push('/dashboard');
        return;
      }
      setProject(proj);

      // Parallel: profile, org, components
      const [profileResult, orgResult, componentsResult] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).single(),
        supabase.from('salesforce_connections').select('id').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('components')
          .select('id, name, project_id, updated_at')
          .eq('project_id', projectId)
          .order('updated_at', { ascending: false }),
      ]);

      setUserProfile({
        fullName: profileResult.data?.full_name ?? '',
        email: user.email ?? '',
        isOrgConnected: !!orgResult.data,
      });

      if (componentsResult.error) throw componentsResult.error;
      setComponents(componentsResult.data ?? []);
    } catch (err) {
      console.error('[ProjectPage] Load error:', err);
      setFetchError('Failed to load components. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [projectId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadData(); }, [loadData]);

  const handleComponentCreated = (newId: string) => {
    router.push(`/dashboard/editor/${newId}`);
  };

  const handleRename = async (id: string, newName: string) => {
    const { error } = await supabase
      .from('components')
      .update({ name: newName, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (error) {
      console.error('[ProjectPage] Rename error:', error);
      return;
    }
    setComponents((prev) =>
      prev.map((c) => (c.id === id ? { ...c, name: newName } : c))
    );
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('components').delete().eq('id', id);
    if (error) {
      console.error('[ProjectPage] Delete error:', error);
      return;
    }
    setComponents((prev) => prev.filter((c) => c.id !== id));
  };

  const breadcrumbs = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: project?.name ?? 'Project', href: `/dashboard/projects/${projectId}` },
  ];

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col">
      <NavBar
        userFullName={userProfile.fullName}
        userEmail={userProfile.email}
        isOrgConnected={userProfile.isOrgConnected}
        breadcrumbs={breadcrumbs}
      />

      <main className="flex-1 px-6 py-8 max-w-6xl mx-auto w-full">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            {isLoading ? (
              <div className="h-7 bg-[#21262d] rounded w-48 animate-pulse mb-2" />
            ) : (
              <h1 className="text-2xl font-bold text-[#e6edf3]">{project?.name}</h1>
            )}
            {project?.description && (
              <p className="text-[#8b949e] text-sm mt-1">{project.description}</p>
            )}
          </div>
          <button
            id="new-component-btn"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00a1e0] hover:bg-[#0090c7] text-white text-sm font-semibold transition-all shadow-lg shadow-[#00a1e0]/20"
          >
            <Plus className="w-4 h-4" />
            New Component
          </button>
        </div>

        {/* Error state */}
        {fetchError && (
          <div className="flex items-center justify-between p-4 bg-[#da3633]/10 border border-[#da3633]/20 rounded-xl text-[#f85149] mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0" />
              <span className="text-sm">{fetchError}</span>
            </div>
            <button
              onClick={loadData}
              className="text-sm font-medium underline hover:no-underline ml-4"
            >
              Try again
            </button>
          </div>
        )}

        {/* Loading skeletons */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {/* Empty state */}
        {!isLoading && !fetchError && components.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-[#161b22] border border-[#21262d] flex items-center justify-center mb-5">
              <Code2 className="w-9 h-9 text-[#484f58]" />
            </div>
            <p className="text-[#e6edf3] font-semibold text-lg mb-2">No components yet</p>
            <p className="text-[#8b949e] text-sm mb-6">Create your first LWC component to get started</p>
            <button
              id="empty-create-component-btn"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00a1e0] hover:bg-[#0090c7] text-white text-sm font-semibold transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Component
            </button>
          </div>
        )}

        {/* Component cards */}
        {!isLoading && components.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {components.map((comp) => (
              <ComponentCard
                key={comp.id}
                component={comp}
                onRename={handleRename}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </main>

      {/* Create Component Modal */}
      {showCreateModal && (
        <CreateComponentModal
          onClose={() => setShowCreateModal(false)}
          projectId={projectId}
          supabase={supabase}
          onCreated={handleComponentCreated}
        />
      )}
    </div>
  );
}
