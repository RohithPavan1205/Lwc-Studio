'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { CheckCircle, XCircle, Pencil, Check, X, ExternalLink } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import NavBar from '@/components/NavBar';

// ─── Types ─────────────────────────────────────────────────────────────────────

interface SettingsData {
  userId: string;
  fullName: string;
  email: string;
  sfInstanceUrl: string | null;
  sfConnectedAt: string | null;
}

// ─── Settings Page ─────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();

  const supabase = createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const [data, setData] = useState<SettingsData>({
    userId: '',
    fullName: '',
    email: '',
    sfInstanceUrl: null,
    sfConnectedAt: null,
  });
  const [isLoading, setIsLoading] = useState(true);

  // Name editing
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameSaved, setNameSaved] = useState(false);

  // Org disconnect
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [disconnectMsg, setDisconnectMsg] = useState('');

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const [profileResult, sfResult] = await Promise.all([
        supabase.from('profiles').select('full_name').eq('id', user.id).single(),
        supabase
          .from('salesforce_connections')
          .select('instance_url, created_at')
          .eq('user_id', user.id)
          .maybeSingle(),
      ]);

      setData({
        userId: user.id,
        fullName: profileResult.data?.full_name ?? '',
        email: user.email ?? '',
        sfInstanceUrl: sfResult.data?.instance_url ?? null,
        sfConnectedAt: sfResult.data?.created_at ?? null,
      });
      setNameValue(profileResult.data?.full_name ?? '');
    } catch (err) {
      console.error('[Settings] Load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveName = async () => {
    const trimmed = nameValue.trim();
    if (!trimmed || trimmed === data.fullName) {
      setEditingName(false);
      return;
    }
    setIsSavingName(true);
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: trimmed })
      .eq('id', data.userId);

    setIsSavingName(false);
    if (!error) {
      setData((prev) => ({ ...prev, fullName: trimmed }));
      setEditingName(false);
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 3000);
    }
  };

  const handleDisconnectOrg = async () => {
    setIsDisconnecting(true);
    setDisconnectMsg('');
    try {
      const res = await fetch('/api/salesforce/disconnect', {
        method: 'POST',
        cache: 'no-store',
      });
      if (res.ok || res.redirected) {
        setData((prev) => ({ ...prev, sfInstanceUrl: null, sfConnectedAt: null }));
        setDisconnectMsg('Org disconnected successfully.');
      } else {
        setDisconnectMsg('Failed to disconnect. Please try again.');
      }
    } catch {
      setDisconnectMsg('Failed to disconnect. Please try again.');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const isOrgConnected = !!data.sfInstanceUrl;

  return (
    <div className="min-h-screen bg-[#0d1117] flex flex-col">
      <NavBar
        userFullName={data.fullName}
        userEmail={data.email}
        isOrgConnected={isOrgConnected}
        breadcrumbs={[{ label: 'Settings', href: '/dashboard/settings' }]}
      />

      <main className="flex-1 px-6 py-8 max-w-2xl mx-auto w-full">
        <h1 className="text-2xl font-bold text-[#e6edf3] mb-8">Settings</h1>

        {isLoading ? (
          <div className="space-y-6">
            {[1, 2].map((i) => (
              <div key={i} className="bg-[#161b22] border border-[#21262d] rounded-xl p-6 animate-pulse">
                <div className="h-5 bg-[#21262d] rounded w-1/3 mb-4" />
                <div className="h-10 bg-[#21262d] rounded mb-3" />
                <div className="h-10 bg-[#21262d] rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* ── Account Section ─────────────────────────────────────────── */}
            <section className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#21262d]">
                <h2 className="text-[#e6edf3] font-semibold text-sm">Your Account</h2>
              </div>
              <div className="px-6 py-5 space-y-5">
                {/* Full Name */}
                <div>
                  <label className="block text-xs font-medium text-[#8b949e] uppercase tracking-wider mb-2">
                    Full Name
                  </label>
                  {editingName ? (
                    <div className="flex items-center gap-2">
                      <input
                        id="settings-name-input"
                        autoFocus
                        value={nameValue}
                        onChange={(e) => setNameValue(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveName();
                          if (e.key === 'Escape') { setEditingName(false); setNameValue(data.fullName); }
                        }}
                        className="flex-1 bg-[#0d1117] border border-[#00a1e0] rounded-lg px-4 py-2.5 text-sm text-[#e6edf3] focus:outline-none"
                      />
                      <button
                        onClick={handleSaveName}
                        disabled={isSavingName}
                        className="p-2 rounded-lg bg-[#238636] hover:bg-[#2ea043] text-white transition-colors disabled:opacity-50"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => { setEditingName(false); setNameValue(data.fullName); }}
                        className="p-2 rounded-lg bg-[#21262d] hover:bg-[#30363d] text-[#8b949e] transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-3">
                      <p className="flex-1 text-sm text-[#e6edf3] bg-[#0d1117] border border-[#21262d] rounded-lg px-4 py-2.5">
                        {data.fullName || <span className="text-[#484f58]">Not set</span>}
                      </p>
                      <button
                        id="settings-edit-name-btn"
                        onClick={() => setEditingName(true)}
                        className="p-2 rounded-lg text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] transition-all"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  {nameSaved && (
                    <p className="text-xs text-[#3fb950] mt-2 flex items-center gap-1">
                      <Check className="w-3 h-3" /> Name saved
                    </p>
                  )}
                </div>

                {/* Email (read only) */}
                <div>
                  <label className="block text-xs font-medium text-[#8b949e] uppercase tracking-wider mb-2">
                    Email
                  </label>
                  <p className="text-sm text-[#8b949e] bg-[#0d1117] border border-[#21262d] rounded-lg px-4 py-2.5 cursor-not-allowed">
                    {data.email}
                  </p>
                </div>
              </div>
            </section>

            {/* ── Salesforce Org Section ───────────────────────────────────── */}
            <section className="bg-[#161b22] border border-[#21262d] rounded-xl overflow-hidden">
              <div className="px-6 py-4 border-b border-[#21262d] flex items-center justify-between">
                <h2 className="text-[#e6edf3] font-semibold text-sm">Salesforce Org</h2>
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    isOrgConnected
                      ? 'bg-[#238636]/20 text-[#3fb950] border border-[#238636]/30'
                      : 'bg-[#21262d] text-[#8b949e] border border-[#30363d]'
                  }`}
                >
                  {isOrgConnected ? (
                    <><CheckCircle className="w-3 h-3" /> Connected</>
                  ) : (
                    <><XCircle className="w-3 h-3" /> Not Connected</>
                  )}
                </span>
              </div>

              <div className="px-6 py-5">
                {isOrgConnected ? (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-medium text-[#8b949e] uppercase tracking-wider mb-2">
                        Instance URL
                      </label>
                      <div className="flex items-center gap-2">
                        <p className="flex-1 text-sm text-[#e6edf3] bg-[#0d1117] border border-[#21262d] rounded-lg px-4 py-2.5 truncate">
                          {data.sfInstanceUrl}
                        </p>
                        <a
                          href={data.sfInstanceUrl ?? '#'}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-2 rounded-lg text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] transition-all"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                    </div>

                    {data.sfConnectedAt && (
                      <div>
                        <label className="block text-xs font-medium text-[#8b949e] uppercase tracking-wider mb-2">
                          Connected
                        </label>
                        <p className="text-sm text-[#8b949e] px-4 py-2.5">
                          {formatDistanceToNow(new Date(data.sfConnectedAt), { addSuffix: true })}
                        </p>
                      </div>
                    )}

                    {disconnectMsg && (
                      <p className={`text-sm flex items-center gap-2 ${disconnectMsg.includes('success') ? 'text-[#3fb950]' : 'text-[#f85149]'}`}>
                        {disconnectMsg.includes('success') ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
                        {disconnectMsg}
                      </p>
                    )}

                    <button
                      id="settings-disconnect-btn"
                      onClick={handleDisconnectOrg}
                      disabled={isDisconnecting}
                      className="px-5 py-2.5 rounded-lg text-sm font-semibold text-[#f85149] border border-[#da3633]/30 hover:bg-[#da3633]/10 disabled:opacity-50 transition-all"
                    >
                      {isDisconnecting ? 'Disconnecting...' : 'Disconnect Org'}
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <p className="text-sm text-[#8b949e]">
                      Connect your Salesforce org to deploy and preview your Lightning Web Components directly from LWC Studio.
                    </p>
                    {disconnectMsg && (
                      <p className="text-sm text-[#3fb950] flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        {disconnectMsg}
                      </p>
                    )}
                    <a
                      id="settings-connect-org-btn"
                      href="/api/auth/salesforce/login"
                      className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#00a1e0] hover:bg-[#0090c7] text-white text-sm font-semibold transition-all"
                    >
                      Connect Salesforce Org
                    </a>
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
