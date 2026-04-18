'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import {
  CheckCircle,
  XCircle,
  Pencil,
  Check,
  X,
  ExternalLink,
  Loader2,
  User,
  Link2,
  BarChart2,
  AlertTriangle,
  Zap,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import TopNavbar from '@/components/navigation/TopNavbar';

// ─── Types ───────────────────────────────────────────────────────────────────

interface SettingsData {
  userId: string;
  fullName: string;
  email: string;
  sfInstanceUrl: string | null;
  sfConnectedAt: string | null;
}

// ─── Section Card ─────────────────────────────────────────────────────────────

function Section({
  title,
  icon,
  badge,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  badge?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="forge-card rounded-xl overflow-hidden">
      <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--border-subtle)]">
        <div className="flex items-center gap-2.5">
          <span className="text-[var(--text-secondary)]">{icon}</span>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h2>
        </div>
        {badge}
      </div>
      <div className="px-6 py-5">{children}</div>
    </section>
  );
}

// ─── Settings Page ────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter();

  const supabase = useMemo(
    () =>
      createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      ),
    []
  );

  const [data, setData] = useState<SettingsData>({
    userId: '',
    fullName: '',
    email: '',
    sfInstanceUrl: null,
    sfConnectedAt: null,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [apiUsage, setApiUsage] = useState<{ used: number; limit: number } | null>(null);

  // Name editing
  const [editingName, setEditingName] = useState(false);
  const [nameValue, setNameValue] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);
  const [nameError, setNameError] = useState('');
  const [nameSaved, setNameSaved] = useState(false);

  // Org actions
  const [isConnecting, setIsConnecting] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [orgMsg, setOrgMsg] = useState('');
  const [orgMsgIsError, setOrgMsgIsError] = useState(false);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/'); return; }

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

      // Fetch API usage
      if (sfResult.data) {
        fetch('/api/salesforce/api-limits', { cache: 'no-store' })
          .then((r) => r.json())
          .then((d) => { if (d.used !== undefined) setApiUsage({ used: d.used, limit: d.limit }); })
          .catch(() => {});
      }
    } catch (err) {
      console.error('[Settings] Load error:', err);
    } finally {
      setIsLoading(false);
    }
  }, [supabase, router]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSaveName = async () => {
    const trimmed = nameValue.trim();
    if (!trimmed) { setNameError('Name cannot be empty.'); return; }
    if (trimmed === data.fullName) { setEditingName(false); return; }
    setIsSavingName(true);
    setNameError('');
    const { error } = await supabase
      .from('profiles')
      .update({ full_name: trimmed })
      .eq('id', data.userId);
    setIsSavingName(false);
    if (error) {
      setNameError('Failed to save. Please try again.');
    } else {
      setData((prev) => ({ ...prev, fullName: trimmed }));
      setEditingName(false);
      setNameSaved(true);
      setTimeout(() => setNameSaved(false), 3000);
    }
  };

  const handleConnectOrg = async () => {
    setIsConnecting(true);
    setOrgMsg('');
    try {
      const res = await fetch('/api/auth/salesforce/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || 'Failed to initiate auth');
      }
      const { authUrl } = await res.json();
      window.location.href = authUrl;
    } catch (err) {
      setOrgMsgIsError(true);
      setOrgMsg(err instanceof Error ? err.message : 'Could not connect');
      setIsConnecting(false);
    }
  };

  const handleDisconnectOrg = async () => {
    setIsDisconnecting(true);
    setOrgMsg('');
    setOrgMsgIsError(false);
    try {
      const res = await fetch('/api/salesforce/disconnect', { method: 'POST', cache: 'no-store' });
      const d = await res.json();
      if (res.ok) {
        setData((prev) => ({ ...prev, sfInstanceUrl: null, sfConnectedAt: null }));
        setOrgMsg('Org disconnected successfully.');
      } else {
        setOrgMsgIsError(true);
        setOrgMsg(d.error ?? 'Failed to disconnect.');
      }
    } catch {
      setOrgMsgIsError(true);
      setOrgMsg('Network error.');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const isOrgConnected = !!data.sfInstanceUrl;
  const apiPct = apiUsage ? Math.round((apiUsage.used / apiUsage.limit) * 100) : 0;
  const apiColor =
    apiPct >= 90 ? 'var(--error)' : apiPct >= 70 ? 'var(--warning)' : 'var(--success)';

  const user = data.email ? { name: data.fullName, email: data.email } : undefined;

  return (
    <div className="min-h-screen bg-[var(--bg-void)] flex flex-col">
      <TopNavbar
        variant="dashboard"
        user={user}
        orgStatus={isOrgConnected ? 'connected' : 'disconnected'}
        breadcrumbs={[
          { label: 'Dashboard', href: '/dashboard' },
          { label: 'Settings' },
        ]}
      />

      <main className="flex-1 px-4 sm:px-6 py-8 max-w-2xl mx-auto w-full">
        <div className="mb-8">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">Settings</h1>
          <p className="text-sm text-[var(--text-secondary)] mt-0.5">
            Manage your account and Salesforce org connection
          </p>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="forge-card rounded-xl p-6">
                <div className="skeleton h-4 w-1/3 mb-4 rounded" />
                <div className="skeleton h-10 rounded mb-3" />
                <div className="skeleton h-10 rounded" />
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-5">

            {/* ── Account ──────────────────────────────────────────────────── */}
            <Section title="Account" icon={<User size={15} />}>
              <div className="space-y-5">
                {/* Full Name */}
                <div>
                  <label className="forge-label">Full Name</label>
                  {editingName ? (
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <input
                          id="settings-name-input"
                          autoFocus
                          value={nameValue}
                          onChange={(e) => setNameValue(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveName();
                            if (e.key === 'Escape') {
                              setEditingName(false);
                              setNameValue(data.fullName);
                              setNameError('');
                            }
                          }}
                          className="forge-input flex-1"
                        />
                        <button
                          onClick={handleSaveName}
                          disabled={isSavingName}
                          className="p-2 rounded-lg bg-[var(--success)] text-white hover:opacity-90 transition-opacity disabled:opacity-50"
                        >
                          {isSavingName ? (
                            <Loader2 size={15} className="animate-forge-spin" />
                          ) : (
                            <Check size={15} />
                          )}
                        </button>
                        <button
                          onClick={() => {
                            setEditingName(false);
                            setNameValue(data.fullName);
                            setNameError('');
                          }}
                          className="p-2 rounded-lg bg-[var(--bg-overlay)] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
                        >
                          <X size={15} />
                        </button>
                      </div>
                      {nameError && (
                        <p className="text-xs text-[var(--error)]">{nameError}</p>
                      )}
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <p className="flex-1 text-sm text-[var(--text-primary)] bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-4 py-2.5">
                        {data.fullName || (
                          <span className="text-[var(--text-tertiary)]">Not set</span>
                        )}
                      </p>
                      <button
                        id="settings-edit-name-btn"
                        onClick={() => setEditingName(true)}
                        className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-colors"
                      >
                        <Pencil size={14} />
                      </button>
                    </div>
                  )}
                  {nameSaved && (
                    <p className="text-xs text-[var(--success)] mt-2 flex items-center gap-1">
                      <Check size={11} /> Name saved
                    </p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="forge-label">Email (Salesforce Identity)</label>
                  <p className="text-sm text-[var(--text-secondary)] bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 cursor-not-allowed">
                    {data.email}
                  </p>
                </div>
              </div>
            </Section>

            {/* ── Salesforce Org ───────────────────────────────────────────── */}
            <Section
              title="Salesforce Org"
              icon={<Link2 size={15} />}
              badge={
                <span
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                    isOrgConnected
                      ? 'bg-[var(--success-subtle)] text-[var(--success)] border border-[rgba(34,197,94,0.2)]'
                      : 'bg-[var(--bg-overlay)] text-[var(--text-secondary)] border border-[var(--border-default)]'
                  }`}
                >
                  {isOrgConnected ? (
                    <>
                      <CheckCircle size={11} /> Connected
                    </>
                  ) : (
                    <>
                      <XCircle size={11} /> Not Connected
                    </>
                  )}
                </span>
              }
            >
              {isOrgConnected ? (
                <div className="space-y-4">
                  <div>
                    <label className="forge-label">Instance URL</label>
                    <div className="flex items-center gap-2">
                      <p className="flex-1 text-sm text-[var(--text-primary)] bg-[var(--bg-base)] border border-[var(--border-subtle)] rounded-lg px-4 py-2.5 truncate font-code text-xs">
                        {data.sfInstanceUrl}
                      </p>
                      <a
                        href={data.sfInstanceUrl ?? '#'}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-2 rounded-lg text-[var(--text-tertiary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-colors"
                      >
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  </div>

                  {data.sfConnectedAt && (
                    <div>
                      <label className="forge-label">Connected</label>
                      <p className="text-sm text-[var(--text-secondary)] px-1">
                        {formatDistanceToNow(new Date(data.sfConnectedAt), { addSuffix: true })}
                      </p>
                    </div>
                  )}

                  {orgMsg && (
                    <p className={`text-sm flex items-center gap-2 ${orgMsgIsError ? 'text-[var(--error)]' : 'text-[var(--success)]'}`}>
                      {orgMsgIsError ? <XCircle size={14} /> : <CheckCircle size={14} />}
                      {orgMsg}
                    </p>
                  )}

                  <div className="flex gap-3 pt-1">
                    <button
                      onClick={handleConnectOrg}
                      disabled={isConnecting}
                      className="btn-ghost text-sm px-4 py-2 disabled:opacity-50"
                    >
                      {isConnecting && <Loader2 size={13} className="animate-forge-spin" />}
                      {isConnecting ? 'Reconnecting...' : 'Reconnect Org'}
                    </button>
                    <button
                      id="settings-disconnect-btn"
                      onClick={handleDisconnectOrg}
                      disabled={isDisconnecting}
                      className="btn-danger text-sm px-4 py-2 disabled:opacity-50"
                    >
                      {isDisconnecting && <Loader2 size={13} className="animate-forge-spin" />}
                      {isDisconnecting ? 'Disconnecting...' : 'Disconnect Org'}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm text-[var(--text-secondary)]">
                    Connect your Salesforce org to deploy Lightning Web Components directly from LWC Studio.
                  </p>

                  {orgMsg && (
                    <p className={`text-sm flex items-center gap-2 ${orgMsgIsError ? 'text-[var(--error)]' : 'text-[var(--success)]'}`}>
                      {orgMsgIsError ? <XCircle size={14} /> : <CheckCircle size={14} />}
                      {orgMsg}
                    </p>
                  )}

                  <button
                    id="settings-connect-org-btn"
                    onClick={handleConnectOrg}
                    disabled={isConnecting}
                    className="btn-forge-primary text-sm px-5 py-2.5 disabled:opacity-50"
                  >
                    {isConnecting ? (
                      <Loader2 size={14} className="animate-forge-spin" />
                    ) : (
                      <Zap size={14} />
                    )}
                    {isConnecting ? 'Connecting...' : 'Connect Salesforce Org'}
                  </button>
                </div>
              )}
            </Section>

            {/* ── API Usage ─────────────────────────────────────────────────── */}
            {isOrgConnected && (
              <Section title="API Usage" icon={<BarChart2 size={15} />}>
                {apiUsage ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-[var(--text-secondary)]">Daily API Calls</span>
                      <span className="font-code text-sm" style={{ color: apiColor }}>
                        {apiUsage.used.toLocaleString()} / {apiUsage.limit.toLocaleString()}
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-[var(--bg-base)] overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{
                          width: `${Math.min(apiPct, 100)}%`,
                          background: apiColor,
                        }}
                      />
                    </div>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      Resets at midnight UTC · {100 - apiPct}% remaining
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                    <Loader2 size={14} className="animate-forge-spin" />
                    Loading API usage...
                  </div>
                )}
              </Section>
            )}

            {/* ── Danger Zone ───────────────────────────────────────────────── */}
            <section className="rounded-xl overflow-hidden border border-[rgba(239,68,68,0.2)]">
              <div className="flex items-center gap-2.5 px-6 py-4 border-b border-[rgba(239,68,68,0.15)] bg-[var(--error-subtle)]">
                <AlertTriangle size={15} className="text-[var(--error)]" />
                <h2 className="text-sm font-semibold text-[var(--error)]">Danger Zone</h2>
              </div>
              <div className="px-6 py-5 bg-[var(--bg-surface)]">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)] mb-1">
                      Delete Account
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]">
                      Permanently delete all components, version history, and your account.
                      Components in your Salesforce org are NOT affected.
                    </p>
                  </div>
                  <button className="btn-danger text-sm px-4 py-2 flex-shrink-0 whitespace-nowrap">
                    Delete Account
                  </button>
                </div>
              </div>
            </section>
          </div>
        )}
      </main>
    </div>
  );
}
