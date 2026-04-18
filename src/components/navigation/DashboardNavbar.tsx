'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Settings, LogOut, Link as LinkIcon, Unlink, Menu, X } from 'lucide-react';

interface DashboardNavbarProps {
  user?: { name: string; email: string; avatarUrl?: string };
  orgStatus?: 'connected' | 'disconnected' | 'connecting';
}

function UserAvatarMenu({ user, orgStatus }: DashboardNavbarProps) {
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

  const initials = user?.name
    ? user.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : user?.email?.[0]?.toUpperCase() ?? 'U';

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        className="flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold text-white transition-all outline-none"
        style={{
          background: 'linear-gradient(135deg, #0176D3 0%, #0056A3 100%)',
          border: '2px solid rgba(255,255,255,0.1)',
        }}
      >
        {initials}
      </button>

      {open && (
        <div className="absolute right-0 top-12 w-56 rounded-xl border border-white/10 bg-[#111827] shadow-2xl shadow-black/50 divide-y divide-white/[0.06] z-50">
          <div className="px-4 py-3">
            <p className="text-sm font-semibold text-white truncate">{user?.name || 'User'}</p>
            <p className="text-xs text-gray-400 truncate mt-0.5">{user?.email}</p>
          </div>

          <div className="py-1">
            <Link
              href="/dashboard/settings"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors"
            >
              <Settings size={14} className="text-gray-400" />
              Settings
            </Link>

            {orgStatus === 'connected' ? (
              <button
                onClick={() => {
                  setOpen(false);
                  router.push('/dashboard/settings'); // Redirecting to settings since explicit disconnect requires API deletion
                }}
                className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors text-left"
              >
                <Unlink size={14} className="text-gray-400" />
                Disconnect Org
              </button>
            ) : (
              <a
                href="/api/auth/salesforce/initiate"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2 text-sm text-gray-300 hover:text-white hover:bg-white/[0.06] transition-colors"
              >
                <LinkIcon size={14} className="text-gray-400" />
                Connect Org
              </a>
            )}
          </div>

          <div className="py-1">
            <button
              onClick={handleSignOut}
              className="w-full flex items-center gap-2.5 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors text-left"
            >
              <LogOut size={14} />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardNavbar({ user, orgStatus }: DashboardNavbarProps) {
  const pathname = usePathname();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navLinks = [
    { label: 'Dashboard', href: '/dashboard' },
    { label: 'Templates', href: '/templates' },
    { label: 'Docs', href: '/docs' },
  ];
  return (
    <>
      <div className="w-full shrink-0" style={{ height: 96 }} />
      <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, display: "flex", justifyContent: "center", padding: "16px 20px", pointerEvents: "none" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 20px", background: "rgba(15,20,35,0.85)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: 999, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", width: "100%", maxWidth: 860, position: "relative", pointerEvents: "auto" }}>
          
          {/* Left Zone: Logo */}
          <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", flexShrink: 0 }}>
            <img src="/logo-studio.png" alt="LWC Studio" style={{ height: 40, width: "auto", objectFit: "contain", transform: "scale(2.2)", transformOrigin: "left center" }} />
          </Link>

          {/* Center Links */}
          <nav className="hidden md:flex" style={{ alignItems: "center", gap: 28, position: "absolute", left: "50%", transform: "translateX(-50%)" }}>
            {navLinks.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="transition-colors group relative"
                  style={{ 
                    fontSize: 14, 
                    color: isActive ? "#fff" : "rgba(255,255,255,0.7)", 
                    textDecoration: "none", 
                    fontWeight: 500 
                  }}
                  onMouseEnter={e => !isActive && (e.currentTarget.style.color = "#f59e0b")}
                  onMouseLeave={e => !isActive && (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}
                >
                  {link.label}
                  {isActive && (
                    <span 
                      style={{ 
                        position: "absolute", bottom: -20, left: "50%", right: 0, 
                        height: 2, width: 24, transform: "translateX(-50%)",
                        background: "#f59e0b", borderRadius: "2px 2px 0 0", 
                        boxShadow: "0 0 8px rgba(245,158,11,0.5)" 
                      }} 
                    />
                  )}
                </Link>
              );
            })}
          </nav>

          {/* Right Zone: Pills & Avatar */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="hidden md:block">
              {orgStatus === 'connected' ? (
                <div 
                  className="flex items-center gap-2 font-medium"
                  style={{
                    padding: '6px 14px', borderRadius: 999,
                    fontSize: 12, color: '#10B981',
                    background: 'rgba(16,185,129,0.08)',
                    border: '1px solid rgba(16,185,129,0.15)'
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span>Org Connected</span>
                </div>
              ) : (
                <div 
                  className="flex items-center gap-2 font-medium"
                  style={{
                    padding: '6px 14px', borderRadius: 999,
                    fontSize: 12, color: '#4A5A78',
                    background: 'rgba(27,150,255,0.04)',
                    border: '1px solid rgba(1,118,211,0.12)'
                  }}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-[#4A5A78]" />
                  <span>No Org</span>
                </div>
              )}
            </div>

            {user && <UserAvatarMenu user={user} orgStatus={orgStatus} />}

            <button
              className="md:hidden"
              style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", padding: 4 }}
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <Menu size={22} />
            </button>
          </div>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="fixed inset-0 top-14 z-40 bg-[#0a0a1a] border-t border-white/[0.06] p-4 flex flex-col gap-4 md:hidden">
          <div className="flex flex-col gap-2">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileMenuOpen(false)}
                className={`p-3 rounded-lg text-sm ${pathname === link.href ? 'bg-white/[0.06] text-white font-medium' : 'text-gray-400'}`}
              >
                {link.label}
              </Link>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-white/[0.06]">
            {orgStatus === 'connected' ? (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-white/10 bg-white/[0.04] text-sm">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-gray-300 font-medium">Org Connected</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 p-3 rounded-lg border border-white/10 bg-white/[0.04] text-sm">
                <span className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-gray-400 font-medium">No Org</span>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
