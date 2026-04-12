'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import {
  ChevronRight,
  Settings,
  LogOut,
  Zap,
  AlertCircle,
  LayoutDashboard,
  User,
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface TopNavbarProps {
  variant?: 'landing' | 'dashboard' | 'editor' | 'minimal';
  breadcrumbs?: BreadcrumbItem[];
  apiUsage?: { used: number; limit: number } | null;
  orgStatus?: 'connected' | 'disconnected' | 'connecting';
  orgName?: string;
  user?: { name: string; email: string; avatarUrl?: string };
  /** Extra content to render in the right zone (editor toolbar buttons) */
  rightContent?: React.ReactNode;
}

// ─── Org Status Badge ─────────────────────────────────────────────────────────

function OrgStatusBadge({
  status,
  orgName,
}: {
  status: 'connected' | 'disconnected' | 'connecting';
  orgName?: string;
}) {
  const dotClass =
    status === 'connected'
      ? 'org-dot connected'
      : status === 'connecting'
        ? 'org-dot connecting'
        : 'org-dot disconnected';

  const textColor =
    status === 'connected'
      ? 'text-[var(--success)]'
      : status === 'connecting'
        ? 'text-[var(--warning)]'
        : 'text-[var(--text-tertiary)]';

  const label =
    status === 'connected'
      ? orgName ?? 'Org Connected'
      : status === 'connecting'
        ? 'Connecting...'
        : 'No Org';

  return (
    <Link
      href="/dashboard/settings"
      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-colors hover:bg-[var(--bg-surface)] ${textColor}`}
    >
      <span className={dotClass} />
      <span className="hidden sm:inline">{label}</span>
    </Link>
  );
}

// ─── API Usage Badge ──────────────────────────────────────────────────────────

function ApiUsageBadge({ used, limit }: { used: number; limit: number }) {
  const pct = Math.round((used / limit) * 100);
  const color =
    pct >= 90
      ? 'text-[var(--error)]'
      : pct >= 70
        ? 'text-[var(--warning)]'
        : 'text-[var(--text-secondary)]';

  return (
    <Link
      href="/dashboard/settings"
      className={`hidden md:flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-[var(--text-primary)] ${color}`}
      title={`${used.toLocaleString()} / ${limit.toLocaleString()} API calls today`}
    >
      <AlertCircle size={12} />
      <span className="font-code">
        {used.toLocaleString()}/{limit.toLocaleString()}
      </span>
    </Link>
  );
}

// ─── User Avatar Menu ─────────────────────────────────────────────────────────

function UserAvatarMenu({
  user,
}: {
  user: { name: string; email: string; avatarUrl?: string };
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleSignOut = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    router.push('/');
    router.refresh();
  };

  const initials = user.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user.email?.[0]?.toUpperCase() ?? 'U';

  return (
    <div className="relative" ref={ref}>
      <button
        id="navbar-avatar-btn"
        onClick={() => setOpen((v) => !v)}
        className="w-8 h-8 rounded-full bg-gradient-to-br from-[var(--forge-primary)] to-[var(--forge-ember)] flex items-center justify-center text-[var(--text-inverse)] text-xs font-bold hover:opacity-90 transition-opacity focus:outline-none"
        aria-label="User menu"
        aria-expanded={open}
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-60 bg-[var(--bg-elevated)] border border-[var(--border-default)] rounded-xl shadow-[var(--shadow-lg)] overflow-hidden z-[200] animate-forge-scale-in">
          {/* User info */}
          <div className="px-4 py-3 border-b border-[var(--border-subtle)]">
            <p className="text-[var(--text-primary)] text-sm font-semibold truncate">
              {user.name || 'User'}
            </p>
            <p className="text-[var(--text-secondary)] text-xs truncate mt-0.5">
              {user.email}
            </p>
          </div>

          <div className="py-1">
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-colors"
            >
              <LayoutDashboard size={15} className="text-[var(--text-secondary)]" />
              Dashboard
            </Link>
            <Link
              href="/dashboard/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--text-primary)] hover:bg-[var(--bg-overlay)] transition-colors"
            >
              <Settings size={15} className="text-[var(--text-secondary)]" />
              Settings
            </Link>
          </div>

          <div className="border-t border-[var(--border-subtle)] py-1">
            <button
              id="navbar-logout-btn"
              onClick={handleSignOut}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[var(--error)] hover:bg-[var(--error-subtle)] transition-colors"
            >
              <LogOut size={15} />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Navbar ──────────────────────────────────────────────────────────────

export default function TopNavbar({
  variant = 'dashboard',
  breadcrumbs,
  apiUsage,
  orgStatus,
  orgName,
  user,
  rightContent,
}: TopNavbarProps) {
  const pathname = usePathname();

  return (
    <nav className="forge-navbar">
      {/* Left Zone: Logo + Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Link href={user ? '/dashboard' : '/'} className="forge-logo flex-shrink-0 w-28 h-8 flex items-center justify-center relative ml-2 lg:ml-4">
          <img src="/logo-full.png" alt="LWCForge" className="absolute h-[140px] w-auto max-w-none object-contain pointer-events-none" />
        </Link>

        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="flex items-center gap-1.5 min-w-0 ml-1">
            {breadcrumbs.map((crumb, idx) => (
              <div key={idx} className="flex items-center gap-1.5 min-w-0">
                <ChevronRight size={13} className="text-[var(--text-tertiary)] flex-shrink-0" />
                {idx === breadcrumbs.length - 1 || !crumb.href ? (
                  <span className="breadcrumb-current truncate max-w-[180px]">
                    {crumb.label}
                  </span>
                ) : (
                  <Link href={crumb.href} className="breadcrumb-item truncate max-w-[140px]">
                    {crumb.label}
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right Zone */}
      <div className="flex items-center gap-2 flex-shrink-0">
        {/* Editor/Dashboard toolbar content */}
        {rightContent}

        {/* API usage counter */}
        {apiUsage && <ApiUsageBadge used={apiUsage.used} limit={apiUsage.limit} />}

        {/* Org status */}
        {orgStatus !== undefined && (
          <OrgStatusBadge status={orgStatus} orgName={orgName} />
        )}

        {/* Landing nav links */}
        {variant === 'landing' && (
          <>
            <Link
              href="/templates"
              className="hidden sm:block text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors px-3 py-1.5"
            >
              Templates
            </Link>
          </>
        )}

        {/* User avatar */}
        {user && <UserAvatarMenu user={user} />}

        {/* Landing: Login button if no user */}
        {!user && variant !== 'landing' && (
          <Link
            href="/"
            className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
