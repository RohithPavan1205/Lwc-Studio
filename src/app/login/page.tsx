'use client';

import Link from 'next/link';

export default function LoginPage() {
  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-[400px] flex flex-col space-y-8">
        
        {/* Branding */}
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--on-surface)]">
            LWC Studio
          </h1>
          <p className="text-[var(--on-surface-variant)] text-sm tracking-wide">
            Sign in to your Precision Void Engine
          </p>
        </div>

        {/* Auth Form (Visual only for now) */}
        <div className="flex flex-col space-y-6">
          <form className="flex flex-col space-y-5" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-4">
              <div>
                <label className="void-label" htmlFor="email">Work Email</label>
                <input 
                  id="email"
                  type="email" 
                  placeholder="name@company.com" 
                  className="void-input w-full"
                  required
                />
              </div>
              <div>
                <label className="void-label" htmlFor="password">Security Token (Password)</label>
                <input 
                  id="password"
                  type="password" 
                  placeholder="••••••••••••" 
                  className="void-input w-full"
                  required
                />
              </div>
            </div>

            <div className="flex items-center justify-between py-1">
              <label className="flex items-center space-x-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded bg-black/30 border-none ring-0 outline-none text-[var(--primary)]" />
                <span className="text-xs text-[var(--on-surface-variant)]">Stay in session</span>
              </label>
              <Link href="#" className="text-xs text-[var(--primary)] hover:underline opacity-80 decoration-1 underline-offset-4">
                Forgot access?
              </Link>
            </div>

            <button type="submit" className="void-btn-primary w-full mt-2">
              Decrypt & Authenticate
            </button>
          </form>

          <footer className="pt-4 border-t border-[var(--outline-variant)]">
            <p className="text-center text-sm text-[var(--on-surface-variant)]">
              Not registered?{' '}
              <Link href="/signup" className="text-[var(--primary)] font-medium hover:brightness-125 transition-all">
                Request Engine Access
              </Link>
            </p>
          </footer>
        </div>

        {/* Precision Void Identity */}
        <div className="pt-8 opacity-40">
           <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent mx-auto mb-4" />
           <p className="text-[10px] text-center uppercase tracking-[0.2em] font-medium leading-relaxed max-w-[280px] mx-auto text-balance">
              The Precision Void Engine provides low-latency workspace environments for mission-critical development.
           </p>
        </div>

      </div>
    </main>
  );
}
