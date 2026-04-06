'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { FolderOpen, ChevronRight, Plus, Box, X, AlertCircle } from 'lucide-react';
import NavBar from '@/components/NavBar';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Project {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
  componentCount?: number;
}

interface UserProfile {
  fullName: string;
  email: string;
  isOrgConnected: boolean;
}

// ─── Skeleton Card ─────────────────────────────────────────────────────────────

function SkeletonCard() {
  return (
    <div className="bg-[#161b22] border border-[#21262d] rounded-xl p-5 animate-pulse">
      <div className="h-5 bg-[#21262d] rounded w-2/3 mb-3" />
      <div className="h-3 bg-[#21262d] rounded w-full mb-1.5" />
      <div className="h-3 bg-[#21262d] rounded w-4/5 mb-5" />
      <div className="flex justify-between">
        <div className="h-3 bg-[#21262d] rounded w-20" />
        <div className="h-3 bg-[#21262d] rounded w-16" />
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────────────

function Toast({ message, onDone }: { message: string; onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 3000);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex items-center gap-3 bg-[#238636] text-white text-sm font-medium px-5 py-3 rounded-xl shadow-2xl shadow-black/40 animate-in slide-in-from-bottom-4">
      <div className="w-2 h-2 rounded-full bg-white" />
      {message}
    </div>
  );
}

// ─── Create Project Modal ─────────────────────────────────────────────────────

interface CreateProjectModalProps {
  onClose: () => void;
  onCreated: (project: Project) => void;
  userId: string;
  supabase: ReturnType<typeof createBrowserClient>;
}

function CreateProjectModal({ onClose, onCreated, userId, supabase }: CreateProjectModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Project name is required.');
      return;
    }
    if (trimmedName.length > 50) {
      setError('Name must be 50 characters or less.');
      return;
    }

    setIsCreating(true);
    setError('');

    const now = new Date().toISOString();
    const { data, error: dbError } = await supabase
      .from('projects')
      .insert({
        user_id: userId,
        name: trimmedName,
        description: description.trim() || null,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    setIsCreating(false);

    if (dbError || !data) {
      console.error('[Dashboard] Create project error:', dbError);
      setError(dbError?.message ?? 'Failed to create project. Please try again.');
      return;
    }

    onCreated({ ...data, componentCount: 0 });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262d]">
          <h2 className="text-[#e6edf3] font-semibold text-base">New Project</h2>
          <button
            onClick={onClose}
            className="text-[#8b949e] hover:text-[#e6edf3] transition-colors p-1 rounded-md hover:bg-[#21262d]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-5 space-y-4">
          {error && (
            <div className="flex items-start gap-2 px-3 py-2.5 bg-[#da3633]/10 border border-[#da3633]/20 rounded-lg text-[#f85149] text-sm">
              <AlertCircle className="w-4 h-4 flex-shrink-0 mt-0.5" />
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-[#8b949e] uppercase tracking-wider mb-1.5">
              Project Name <span className="text-[#f85149]">*</span>
            </label>
            <input
              id="new-project-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Customer Portal"
              maxLength={50}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-2.5 text-sm text-[#e6edf3] placeholder:text-[#484f58] focus:outline-none focus:border-[#00a1e0] transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
            <p className="text-xs text-[#484f58] mt-1 text-right">{name.length}/50</p>
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8b949e] uppercase tracking-wider mb-1.5">
              Description <span className="text-[#484f58]">(optional)</span>
            </label>
            <textarea
              id="new-project-description-input"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What is this project for?"
              maxLength={200}
              rows={3}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-2.5 text-sm text-[#e6edf3] placeholder:text-[#484f58] focus:outline-none focus:border-[#00a1e0] transition-colors resize-none"
            />
            <p className="text-xs text-[#484f58] mt-1 text-right">{description.length}/200</p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#21262d]">
          <button
            id="create-project-cancel-btn"
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] transition-all"
          >
            Cancel
          </button>
          <button
            id="create-project-submit-btn"
            onClick={handleCreate}
            disabled={isCreating || !name.trim()}
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-[#00a1e0] hover:bg-[#0090c7] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isCreating ? 'Creating...' : 'Create Project'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Dashboard Page ──────────────────────────────────────────────────────

export default function DashboardPage() {
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [profile, setProfile] = useState<UserProfile>({
    fullName: '',
    email: '',
    isOrgConnected: false,
  });
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userId, setUserId] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      // Auth check
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);

      // Profile + org connection (parallel)
      const [profileResult, orgResult, projectsResult] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).single(),
        supabase.from('salesforce_connections').select('id').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('projects')
          .select('id, name, description, created_at, updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false }),
      ]);

      setProfile({
        fullName: profileResult.data?.full_name ?? '',
        email: user.email ?? '',
        isOrgConnected: !!orgResult.data,
      });

      if (projectsResult.error) throw projectsResult.error;

      // For each project, get the component count
      const projectsWithCount = await Promise.all(
        (projectsResult.data ?? []).map(async (proj) => {
          const { count } = await supabase
            .from('components')
            .select('id', { count: 'exact', head: true })
            .eq('project_id', proj.id);
          return { ...proj, componentCount: count ?? 0 };
        })
      );

      setProjects(projectsWithCount);
    } catch (err) {
      console.error('[Dashboard] Load error:', err);
      setFetchError('Failed to load your projects. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleProjectCreated = (project: Project) => {
    setProjects((prev) => [project, ...prev]);
    setToast('Project created!');
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col">
      <NavBar
        userFullName={profile.fullName}
        userEmail={profile.email}
        isOrgConnected={profile.isOrgConnected}
      />

      <main className="flex-1 px-6 py-8 max-w-6xl mx-auto w-full">
        {/* Page Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-[#e6edf3]">
              {profile.fullName ? `Welcome back, ${profile.fullName.split(' ')[0]}` : 'Dashboard'}
            </h1>
            <p className="text-[#8b949e] text-sm mt-1">Manage your LWC projects and components</p>
          </div>
          <button
            id="new-project-btn"
            onClick={() => setShowCreateModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00a1e0] hover:bg-[#0090c7] text-white text-sm font-semibold transition-all shadow-lg shadow-[#00a1e0]/20"
          >
            <Plus className="w-4 h-4" />
            New Project
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
        {!isLoading && !fetchError && projects.length === 0 && (
          <div className="flex flex-col items-center justify-center py-24 text-center">
            <div className="w-20 h-20 rounded-2xl bg-[#161b22] border border-[#21262d] flex items-center justify-center mb-5">
              <Box className="w-9 h-9 text-[#484f58]" />
            </div>
            <p className="text-[#e6edf3] font-semibold text-lg mb-2">No projects yet</p>
            <p className="text-[#8b949e] text-sm mb-6">Create your first project to get started</p>
            <button
              id="empty-create-project-btn"
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00a1e0] hover:bg-[#0090c7] text-white text-sm font-semibold transition-all"
            >
              <Plus className="w-4 h-4" />
              Create Project
            </button>
          </div>
        )}

        {/* Projects grid */}
        {!isLoading && projects.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {projects.map((project) => (
              <Link
                key={project.id}
                href={`/dashboard/projects/${project.id}`}
                className="group bg-[#161b22] border border-[#21262d] hover:border-[#00a1e0]/50 rounded-xl p-5 transition-all duration-200 hover:shadow-lg hover:shadow-[#00a1e0]/5 flex flex-col gap-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="w-9 h-9 rounded-lg bg-[#00a1e0]/10 flex items-center justify-center flex-shrink-0">
                    <FolderOpen className="w-4.5 h-4.5 text-[#00a1e0]" size={18} />
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#484f58] group-hover:text-[#00a1e0] transition-colors flex-shrink-0 mt-1" />
                </div>

                <div className="flex-1">
                  <h3 className="font-semibold text-[#e6edf3] group-hover:text-[#00a1e0] transition-colors text-sm mb-1 truncate">
                    {project.name}
                  </h3>
                  {project.description ? (
                    <p className="text-[#8b949e] text-xs leading-relaxed line-clamp-2">
                      {project.description}
                    </p>
                  ) : (
                    <p className="text-[#484f58] text-xs italic">No description</p>
                  )}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-[#21262d] text-xs text-[#8b949e]">
                  <span>{project.componentCount ?? 0} component{project.componentCount !== 1 ? 's' : ''}</span>
                  <span>
                    {project.updated_at
                      ? formatDistanceToNow(new Date(project.updated_at), { addSuffix: true })
                      : '—'}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </main>

      {/* Create Project Modal */}
      {showCreateModal && userId && (
        <CreateProjectModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleProjectCreated}
          userId={userId}
          supabase={supabase}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
