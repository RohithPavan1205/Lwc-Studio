/* eslint-disable @next/next/no-img-element */
'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { ChevronRight, Settings, LogOut } from 'lucide-react';

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
    router.push('/');
    router.refresh();
  };

  const initials = userFullName
    ? userFullName.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
    : userEmail?.[0]?.toUpperCase() ?? 'U';

  return (
    <nav className="flex items-center justify-between px-6 h-14 border-b border-white/[0.06] bg-[#111827] flex-shrink-0 z-50">
      {/* Left: Logo + Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 text-[#F9FAFB] font-bold text-sm hover:opacity-80 transition-opacity flex-shrink-0"
        >
          <img src="/logo-studio.png" alt="LWC Studio" className="h-[120px] w-auto object-contain" />
        </Link>

        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="flex items-center gap-1.5 min-w-0">
            {breadcrumbs.map((crumb, idx) => (
              <div key={crumb.href} className="flex items-center gap-1.5 min-w-0">
                <ChevronRight className="w-3.5 h-3.5 text-[#4B5563] flex-shrink-0" />
                {idx === breadcrumbs.length - 1 ? (
                  <span className="text-sm text-[#F9FAFB] font-medium truncate max-w-[200px]">
                    {crumb.label}
                  </span>
                ) : (
                  <Link
                    href={crumb.href}
                    className="text-sm text-[#9CA3AF] hover:text-[#F9FAFB] transition-colors truncate max-w-[200px]"
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
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:bg-[#1F2937]"
        >
          <span
            className={`w-2 h-2 rounded-full flex-shrink-0 ${
              isOrgConnected ? 'bg-[#10B981] shadow-[0_0_6px_#10B981]' : 'bg-[#4B5563]'
            }`}
          />
          <span className={isOrgConnected ? 'text-[#10B981]' : 'text-[#4B5563]'}>
            {isOrgConnected ? 'Org Connected' : 'No Org'}
          </span>
        </Link>

        {/* Avatar + Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            id="navbar-avatar-btn"
            onClick={() => setDropdownOpen((v) => !v)}
            className="w-8 h-8 rounded-full bg-gradient-to-br from-[#F97316] to-[#EA580C] flex items-center justify-center text-white text-xs font-bold hover:opacity-90 transition-opacity focus:outline-none focus:ring-2 focus:ring-[#F97316]/50 focus:ring-offset-2 focus:ring-offset-[#111827]"
            aria-label="User menu"
            aria-expanded={dropdownOpen}
          >
            {initials}
          </button>

          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-2 w-56 bg-[#1F2937] border border-white/10 rounded-xl shadow-[0_16px_48px_rgba(0,0,0,0.8)] overflow-hidden z-50">
              {/* User info */}
              <div className="px-4 py-3 border-b border-white/[0.06]">
                <p className="text-[#F9FAFB] text-sm font-semibold truncate">{userFullName || 'User'}</p>
                <p className="text-[#9CA3AF] text-xs truncate mt-0.5">{userEmail}</p>
              </div>

              {/* Menu items */}
              <div className="py-1">
                <Link
                  href="/dashboard/settings"
                  onClick={() => setDropdownOpen(false)}
                  className="flex items-center gap-3 px-4 py-2.5 text-sm text-[#F9FAFB] hover:bg-white/[0.05] transition-colors"
                >
                  <Settings className="w-4 h-4 text-[#9CA3AF]" />
                  Settings
                </Link>

                <button
                  id="navbar-logout-btn"
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-[#EF4444] hover:bg-[#EF4444]/10 transition-colors"
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
