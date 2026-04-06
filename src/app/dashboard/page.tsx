'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { FileCode2, Plus, X, AlertCircle, Cloud, Loader2, RefreshCw } from 'lucide-react';
import NavBar from '@/components/NavBar';

// ─── Types ────────────────────────────────────────────────────────────────────

interface LwcComponent {
  id: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

interface OrgComponent {
  id: string;
  name: string;
  description: string;
  lastModified: string;
  htmlContent: string;
  jsContent: string;
  cssContent: string;
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
        <div className="h-8 bg-[#21262d] rounded w-24" />
        <div className="h-3 bg-[#21262d] rounded w-16 self-end" />
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

// ─── Create Component Modal ─────────────────────────────────────────────────────

interface CreateComponentModalProps {
  onClose: () => void;
  onCreated: (comp: LwcComponent) => void;
  userId: string;
  supabase: ReturnType<typeof createBrowserClient>;
}

function CreateComponentModal({ onClose, onCreated, userId, supabase }: CreateComponentModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Component name is required.');
      return;
    }
    if (!/^[a-zA-Z0-9_]+$/.test(trimmedName)) {
      setError('Component name can only contain alphanumeric characters and underscores.');
      return;
    }

    setIsCreating(true);
    setError('');

    const now = new Date().toISOString();
    
    // Create boilerplate files
    const htmlBoilerplate = `<template>\n  <div class="container">\n    <!-- ${trimmedName} -->\n  </div>\n</template>`;
    const jsBoilerplate = `import { LightningElement } from 'lwc';\n\nexport default class ${trimmedName.charAt(0).toUpperCase() + trimmedName.slice(1)} extends LightningElement {\n  // Logic here\n}`;
    const cssBoilerplate = `.container {\n  padding: 1rem;\n}`;

    const { data, error: dbError } = await supabase
      .from('components')
      .insert({
        user_id: userId,
        name: trimmedName,
        description: description.trim() || null,
        html_content: htmlBoilerplate,
        js_content: jsBoilerplate,
        css_content: cssBoilerplate,
        created_at: now,
        updated_at: now,
      })
      .select()
      .single();

    setIsCreating(false);

    if (dbError || !data) {
      console.error('[Dashboard] Create component error:', dbError);
      setError(dbError?.message ?? 'Failed to create component. Please try again.');
      return;
    }

    onCreated(data);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-md shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262d]">
          <h2 className="text-[#e6edf3] font-semibold text-base">New LWC Component</h2>
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
              Component Name <span className="text-[#f85149]">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. dataTable"
              maxLength={40}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-2.5 text-sm text-[#e6edf3] placeholder:text-[#484f58] focus:outline-none focus:border-[#00a1e0] transition-colors"
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              autoFocus
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[#8b949e] uppercase tracking-wider mb-1.5">
              Description <span className="text-[#484f58]">(optional)</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What does this component do?"
              maxLength={200}
              rows={3}
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-lg px-4 py-2.5 text-sm text-[#e6edf3] placeholder:text-[#484f58] focus:outline-none focus:border-[#00a1e0] transition-colors resize-none"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#21262d]">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] transition-all"
          >
            Cancel
          </button>
          <button
            onClick={handleCreate}
            disabled={isCreating || !name.trim()}
            className="px-5 py-2 rounded-lg text-sm font-semibold bg-[#00a1e0] hover:bg-[#0090c7] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            {isCreating ? 'Creating...' : 'Create Component'}
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

  const [components, setComponents] = useState<LwcComponent[]>([]);
  const [orgComponents, setOrgComponents] = useState<OrgComponent[]>([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [isOrgLoading, setIsOrgLoading] = useState(false);
  const [importingId, setImportingId] = useState<string | null>(null);

  const [fetchError, setFetchError] = useState<string | null>(null);
  const [orgError, setOrgError] = useState<string | null>(null);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [userId, setUserId] = useState('');
  const [toast, setToast] = useState<string | null>(null);

  const loadLocalData = async () => {
    setIsLoading(true);
    setFetchError(null);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);

      const [profileResult, orgResult, componentsResult] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).single(),
        supabase.from('salesforce_connections').select('id').eq('user_id', user.id).maybeSingle(),
        supabase
          .from('components')
          .select('id, name, description, created_at, updated_at')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false }),
      ]);

      console.log('[Dashboard] Results:', { profileResult, orgResult, componentsResult });

      if (profileResult.error) console.error('[Dashboard] Profile Error:', profileResult.error);
      if (orgResult.error) console.error('[Dashboard] Org Error:', orgResult.error);
      if (componentsResult.error) {
        console.error('[Dashboard] Components Error:', componentsResult.error);
        throw new Error(componentsResult.error.message);
      }

      const isConnected = !!orgResult.data;

      setProfile({
        fullName: profileResult.data?.full_name ?? '',
        email: user.email ?? '',
        isOrgConnected: isConnected,
      });

      setComponents(componentsResult.data ?? []);

      // If org is connected, fetch org components
      if (isConnected) {
        fetchOrgComponents();
      }
    } catch (err: unknown) {
      console.error('[Dashboard] Load error details:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setFetchError(`Failed to load components: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchOrgComponents = async () => {
    setIsOrgLoading(true);
    setOrgError(null);
    try {
      const res = await fetch('/api/salesforce/org-components');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to fetch org components');
      
      setOrgComponents(data.components || []);
    } catch (err: unknown) {
      console.error('Org fetch error:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      setOrgError(msg);
    } finally {
      setIsOrgLoading(false);
    }
  };

  const importComponent = async (orgComp: OrgComponent) => {
    setImportingId(orgComp.id);
    try {
      const res = await fetch('/api/salesforce/import-component', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salesforceId: orgComp.id,
          name: orgComp.name,
          htmlContent: orgComp.htmlContent,
          jsContent: orgComp.jsContent,
          cssContent: orgComp.cssContent,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to import component');

      setToast(`Imported ${orgComp.name} successfully!`);
      // Redirect directly to the editor for this new/updated component
      router.push(`/dashboard/editor/${data.componentId}`);
      
    } catch (err: unknown) {
      console.error('Import error:', err);
      const msg = err instanceof Error ? err.message : 'Unknown error';
      alert('Failed to import: ' + msg);
    } finally {
      setImportingId(null);
    }
  };

  useEffect(() => {
    loadLocalData();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleComponentCreated = (comp: LwcComponent) => {
    setComponents((prev) => [comp, ...prev]);
    setToast('Component created!');
    router.push(`/dashboard/editor/${comp.id}`);
  };

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col">
      <NavBar
        userFullName={profile.fullName}
        userEmail={profile.email}
        isOrgConnected={profile.isOrgConnected}
      />

      <main className="flex-1 px-6 py-8 max-w-7xl mx-auto w-full flex flex-col space-y-12">
        
        {/* SECTION: YOUR COMPONENTS */}
        <section>
          {/* Header */}
          <div className="flex items-center justify-between mb-6 border-b border-[#21262d] pb-4">
            <div>
              <h2 className="text-xl font-bold text-[#e6edf3] flex items-center gap-2">
                <FileCode2 className="w-5 h-5 text-[#00a1e0]" />
                Your Components
              </h2>
              <p className="text-[#8b949e] text-sm mt-1">LWC Components stored in LWCForge</p>
            </div>
            <button
              onClick={() => setShowCreateModal(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#00a1e0] hover:bg-[#0090c7] text-white text-sm font-semibold transition-all shadow-lg shadow-[#00a1e0]/20"
            >
              <Plus className="w-4 h-4" />
              New Component
            </button>
          </div>

          {/* State Handlers */}
          {fetchError && (
            <div className="flex items-center justify-between p-4 bg-[#da3633]/10 border border-[#da3633]/20 rounded-xl text-[#f85149] mb-6">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="text-sm">{fetchError}</span>
              </div>
            </div>
          )}

          {isLoading && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {[1, 2, 3].map((i) => <SkeletonCard key={`local-skel-${i}`} />)}
            </div>
          )}

          {!isLoading && !fetchError && components.length === 0 && (
            <div className="border border-dashed border-[#30363d] rounded-xl p-8 text-center bg-[#161b22]/50">
              <p className="text-[#8b949e] text-sm mb-4">No components found in your LWCForge workspace.</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="text-[#00a1e0] text-sm font-medium hover:underline"
              >
                Create your first component
              </button>
            </div>
          )}

          {!isLoading && components.length > 0 && (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {components.map((comp) => (
                <Link
                  key={comp.id}
                  href={`/dashboard/editor/${comp.id}`}
                  className="group bg-[#161b22] border border-[#21262d] hover:border-[#00a1e0]/50 rounded-xl p-5 transition-all duration-200 hover:shadow-lg hover:shadow-[#00a1e0]/5 flex flex-col gap-3"
                >
                  <div className="flex-1">
                    <h3 className="font-semibold text-[#e6edf3] group-hover:text-[#00a1e0] transition-colors text-sm mb-1 truncate">
                      {comp.name}
                    </h3>
                    <p className="text-[#8b949e] text-xs leading-relaxed line-clamp-2">
                      {comp.description || <span className="italic">No description</span>}
                    </p>
                  </div>
                  <div className="flex items-center justify-between pt-2 border-t border-[#21262d] text-xs text-[#8b949e]">
                    <span>Local</span>
                    <span>
                      {formatDistanceToNow(new Date(comp.updated_at), { addSuffix: true })}
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>


        {/* SECTION: FROM YOUR ORG */}
        <section>
          {/* Header */}
          <div className="flex items-center justify-between mb-6 border-b border-[#21262d] pb-4">
            <div>
              <h2 className="text-xl font-bold text-[#e6edf3] flex items-center gap-2">
                <Cloud className="w-5 h-5 text-[#238636]" />
                From Your Org
              </h2>
              <p className="text-[#8b949e] text-sm mt-1">Existing components synchronized from Salesforce</p>
            </div>
            {profile.isOrgConnected && (
              <button onClick={fetchOrgComponents} className="p-2 rounded-lg text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] transition-colors" title="Refresh Org Components">
                <RefreshCw className={`w-4 h-4 ${isOrgLoading ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>

          {!profile.isOrgConnected ? (
            <div className="border border-dashed border-[#30363d] rounded-xl p-8 text-center bg-[#161b22]/50 flex flex-col items-center">
              <Cloud className="w-8 h-8 text-[#484f58] mb-3" />
              <p className="text-[#e6edf3] font-medium mb-1">Salesforce Org Not Connected</p>
              <p className="text-[#8b949e] text-sm mb-5">Connect your Salesforce org to view and import your existing components.</p>
              <Link href="/dashboard/settings" className="px-5 py-2.5 rounded-xl bg-[#21262d] hover:bg-[#30363d] text-[#e6edf3] text-sm font-semibold transition-all border border-[#30363d]">
                Connect Org in Settings
              </Link>
            </div>
          ) : (
            <>
              {orgError && (
                <div className="flex items-center justify-between p-4 bg-[#da3633]/10 border border-[#da3633]/20 rounded-xl text-[#f85149] mb-6">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" />
                    <span className="text-sm">{orgError}</span>
                  </div>
                  <button onClick={fetchOrgComponents} className="text-sm font-medium underline hover:no-underline ml-4">
                    Retry
                  </button>
                </div>
              )}

              {isOrgLoading && !orgError && (
                <div>
                  <p className="text-xs text-[#8b949e] mb-4 flex items-center gap-2">
                    <Loader2 className="w-3 h-3 animate-spin"/> Fetching from Salesforce...
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                    {[1, 2, 3, 4, 5, 6].map((i) => <SkeletonCard key={`org-skel-${i}`} />)}
                  </div>
                </div>
              )}

              {!isOrgLoading && !orgError && orgComponents.length === 0 && (
                 <div className="border border-dashed border-[#30363d] rounded-xl p-8 text-center bg-[#161b22]/50">
                   <p className="text-[#8b949e] text-sm">No custom LWC components found in your Salesforce Org.</p>
                 </div>
              )}

              {!isOrgLoading && orgComponents.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                  {orgComponents.map((comp) => {
                    const isImportingThis = importingId === comp.id;
                    return (
                      <div key={comp.id} className="bg-[#161b22] border border-[#21262d] rounded-xl p-5 flex flex-col gap-3">
                        <div className="flex-1">
                          <h3 className="font-semibold text-[#e6edf3] text-sm mb-1 truncate">
                            {comp.name}
                          </h3>
                          <p className="text-[#8b949e] text-xs leading-relaxed line-clamp-2">
                            {comp.description || <span className="italic">Salesforce Bundle</span>}
                          </p>
                        </div>
                        <div className="flex items-center justify-between pt-3 border-t border-[#21262d] text-xs text-[#8b949e]">
                          <span>
                            {comp.lastModified ? formatDistanceToNow(new Date(comp.lastModified), { addSuffix: true }) : '—'}
                          </span>
                          <button
                            onClick={() => importComponent(comp)}
                            disabled={isImportingThis}
                            className="bg-[#238636] hover:bg-[#2ea043] text-white px-3 py-1.5 rounded disabled:opacity-50 transition-colors flex items-center gap-1.5 font-medium"
                          >
                            {isImportingThis ? <><Loader2 className="w-3 h-3 animate-spin"/> Loading...</> : 'Open in Editor'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </section>

      </main>

      {/* Create Component Modal */}
      {showCreateModal && userId && (
        <CreateComponentModal
          onClose={() => setShowCreateModal(false)}
          onCreated={handleComponentCreated}
          userId={userId}
          supabase={supabase}
        />
      )}

      {/* Toast */}
      {toast && <Toast message={toast} onDone={() => setToast(null)} />}
    </div>
  );
}
