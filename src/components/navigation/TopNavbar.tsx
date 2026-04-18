/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import {
  ChevronRight,
  Settings,
  LogOut,
  AlertCircle,
  LayoutDashboard,
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
      ? '#10B981'
      : status === 'connecting'
        ? '#1B96FF'
        : '#4A5A78';

  const label =
    status === 'connected'
      ? orgName ?? 'Org Connected'
      : status === 'connecting'
        ? 'Connecting...'
        : 'No Org';

  return (
    <Link
      href="/dashboard/settings"
      style={{
        display: 'flex', alignItems: 'center', gap: 6,
        padding: '5px 12px', borderRadius: 999,
        fontSize: 12, fontWeight: 500, color: textColor,
        textDecoration: 'none', transition: 'background 0.2s',
        background: 'rgba(27,150,255,0.04)',
        border: '1px solid rgba(1,118,211,0.12)',
      }}
      onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(27,150,255,0.08)')}
      onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(27,150,255,0.04)')}
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
      ? '#EF4444'
      : pct >= 70
        ? '#F59E0B'
        : '#8A9BBE';

  return (
    <Link
      href="/dashboard/settings"
      className="hidden md:flex items-center gap-1.5 text-xs font-medium transition-colors hover:text-[#F3F3F3]"
      style={{ color, textDecoration: 'none', fontSize: 12 }}
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
        style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'linear-gradient(135deg, #0176D3 0%, #0056A3 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: '#fff', fontSize: 12, fontWeight: 700,
          border: '2px solid rgba(27,150,255,0.2)',
          cursor: 'pointer', transition: 'all 0.2s',
          boxShadow: '0 0 0 0 rgba(1,118,211,0.3)',
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 14px rgba(27,150,255,0.3)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(27,150,255,0.5)';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 0 0 0 rgba(1,118,211,0.3)';
          (e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(27,150,255,0.2)';
        }}
        aria-label="User menu"
        aria-expanded={open}
      >
        {initials}
      </button>

      {open && (
        <div style={{
          position: 'absolute', right: 0, top: 'calc(100% + 8px)',
          width: 240,
          background: '#161D2E',
          border: '1px solid rgba(1,118,211,0.15)',
          borderRadius: 12,
          boxShadow: '0 16px 48px rgba(0,0,0,0.8), 0 0 0 1px rgba(27,150,255,0.08)',
          overflow: 'hidden',
          zIndex: 200,
          animation: 'forge-scale-in 0.15s cubic-bezier(0.34,1.56,0.64,1) both',
        }}>
          {/* User info */}
          <div style={{ padding: '14px 16px', borderBottom: '1px solid rgba(1,118,211,0.08)' }}>
            <div style={{
              width: 32, height: 32, borderRadius: '50%',
              background: 'linear-gradient(135deg, #0176D3 0%, #0056A3 100%)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#fff', fontSize: 12, fontWeight: 700,
              marginBottom: 8,
            }}>
              {initials}
            </div>
            <p style={{ color: '#F3F3F3', fontSize: 13, fontWeight: 600, margin: '0 0 2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.name || 'User'}
            </p>
            <p style={{ color: '#4A5A78', fontSize: 11, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {user.email}
            </p>
          </div>

          <div style={{ padding: '4px 0' }}>
            <Link
              href="/dashboard"
              onClick={() => setOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 16px', fontSize: 13, color: '#F3F3F3',
                textDecoration: 'none', transition: 'background 0.15s',
                fontFamily: 'Inter, sans-serif',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(27,150,255,0.06)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = 'transparent')}
            >
              <LayoutDashboard size={14} style={{ color: '#8A9BBE' }} />
              Dashboard
            </Link>
            <Link
              href="/dashboard/settings"
              onClick={() => setOpen(false)}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 16px', fontSize: 13, color: '#F3F3F3',
                textDecoration: 'none', transition: 'background 0.15s',
                fontFamily: 'Inter, sans-serif',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = 'rgba(27,150,255,0.06)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.background = 'transparent')}
            >
              <Settings size={14} style={{ color: '#8A9BBE' }} />
              Settings
            </Link>
          </div>

          <div style={{ borderTop: '1px solid rgba(1,118,211,0.08)', padding: '4px 0' }}>
            <button
              id="navbar-logout-btn"
              onClick={handleSignOut}
              style={{
                width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                padding: '9px 16px', fontSize: 13, color: '#EF4444',
                background: 'none', border: 'none', cursor: 'pointer',
                transition: 'background 0.15s', textAlign: 'left',
                fontFamily: 'Inter, sans-serif',
              }}
              onMouseEnter={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'rgba(239,68,68,0.08)')}
              onMouseLeave={(e) => ((e.currentTarget as HTMLButtonElement).style.background = 'none')}
            >
              <LogOut size={14} />
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
  return (
    <nav className="forge-navbar">
      {/* Left Zone: Logo + Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        <Link href={user ? '/dashboard' : '/'} className="forge-logo flex-shrink-0 flex items-center gap-2.5 ml-2 lg:ml-4">
          <img src="/logo-studio.png" alt="LWC Studio" className="h-[120px] w-auto object-contain" />
        </Link>

        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="flex items-center gap-1.5 min-w-0 ml-1">
            {breadcrumbs.map((crumb, idx) => (
              <div key={idx} className="flex items-center gap-1.5 min-w-0">
                <ChevronRight size={13} style={{ color: '#4A5A78', flexShrink: 0 }} />
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

        {/* Landing/Dashboard nav links */}
        {(variant === 'landing' || variant === 'dashboard') && (
          <>
            <Link
              href="/templates"
              style={{
                display: 'none',
                fontSize: 13, color: '#8A9BBE',
                textDecoration: 'none', padding: '5px 10px',
                transition: 'color 0.2s', fontWeight: 500,
              }}
              className="sm:block hover:text-[#F59E0B]"
            >
              Templates
            </Link>
            <Link
              href="/docs"
              style={{
                display: 'none',
                fontSize: 13, color: '#8A9BBE',
                textDecoration: 'none', padding: '5px 10px',
                transition: 'color 0.2s', fontWeight: 500,
              }}
              className="sm:block hover:text-[#F59E0B]"
            >
              Docs
            </Link>
          </>
        )}

        {/* User avatar */}
        {user && <UserAvatarMenu user={user} />}

        {/* Landing: Login button if no user */}
        {!user && variant !== 'landing' && (
          <Link
            href="/"
            style={{
              fontSize: 13, color: '#8A9BBE',
              textDecoration: 'none', padding: '5px 10px',
              transition: 'color 0.2s',
            }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = '#F3F3F3')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLAnchorElement).style.color = '#8A9BBE')}
          >
            Login
          </Link>
        )}
      </div>
    </nav>
  );
}
