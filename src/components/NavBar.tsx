'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { ChevronRight, Settings, LogOut, Zap } from 'lucide-react';

export interface Breadcrumb {
  label: string;
  href: string;
}

interface NavBarProps {
  userFullName: string;
  userEmail: string;
  isOrgConnected: boolean;
  breadcrumbs?: Breadcrumb[];
}

export default function NavBar({
  userFullName,
  userEmail,
  isOrgConnected,
  breadcrumbs,
}: NavBarProps) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
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
    router.push('/login');
    router.refresh();
  };

  const initials = userFullName
    ? userFullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : userEmail?.[0]?.toUpperCase() ?? 'U';

  return (
    <nav className="flex items-center justify-between px-6 h-14 border-b border-[#21262d] bg-[#0d1117] flex-shrink-0 z-50">
      {/* Left: Logo + Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-2 text-[#e6edf3] font-bold text-sm hover:opacity-80 transition-opacity flex-shrink-0"
        >
          <div className="w-6 h-6 rounded bg-[#00a1e0] flex items-center justify-center">
            <Zap className="w-3.5 h-3.5 text-white" fill="white" />
          </div>
          LWC Studio
        </Link>

        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="flex items-center gap-1.5 min-w-0">
            {breadcrumbs.map((crumb, idx) => (
              <div key={crumb.href} className="flex items-center gap-1.5 min-w-0">
                <ChevronRight className="w-3.5 h-3.5 text-[#484f58] flex-shrink-0" />
                {idx === breadcrumbs.length - 1 ? (
                  <span className="text-sm text-[#e6edf3] font-medium truncate max-w-[200px]">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-sm text-[#8b949e] hover:text-[#e6edf3] transition-colors truncate max-w-[200px]"
                  >
                    {crumb.label}
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Org status + Avatar */}
      <div className="flex items-center gap-3 flex-shrink-0">
        {/* Org connection status */}
        <Link
          href="/dashboard/settings"
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:bg-[#21262d]"
        >
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              isOrgConnected ? 'bg-[#26a641] shadow-[0_0_6px_#26a641]' : 'bg-[#484f58]'
            }`}
          />
          <span className={isOrgConnected ? 'text-[#3fb950]' : 'text-[#484f58]'}>
            {isOrgConnected ? 'Org Connected' : 'No Org'}
          </span>
        </Link>

        {/* Avatar + Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="navbar-avatar-btn"
            onClick={() => setDropdownOpen((v) => !v)}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00a1e0] to-[#1565c0] flex items-center justify-center text-white text-xs font-bold hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#00a1e0] focus:ring-offset-2 focus:ring-offset-[#0d1117]"
            aria-label="User menu"
            aria-expanded={dropdownOpen}
          >
            {initials}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-[#161b22] border border-[#30363d] rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50">
              {/* User info */}
              <div className="px-4 py-3 border-b border-[#21262d]">
                <p className="text-[#e6edf3] text-sm font-semibold truncate">{userFullName || 'User'}</p>
                <p className="text-[#8b949e] text-xs truncate mt-0.5">{userEmail}</p>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#e6edf3] hover:bg-[#21262d] transition-colors"
                >
                  <Settings className="w-4 h-4 text-[#8b949e]" />
                  Settings
                </Link>

                <button
                  id="navbar-logout-btn"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#f85149] hover:bg-[#21262d] transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
}
