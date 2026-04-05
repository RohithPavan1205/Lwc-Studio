'use client';

import Link from 'next/link';
import { signup } from '@/app/auth/actions';
import { useState, useTransition } from 'react';

export default function SignupPage() {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  async function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const result = await signup(formData);
      if (result?.error) {
        setError(result.error);
      }
    });
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-[440px] flex flex-col space-y-8">
        
        {/* Branding */}
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight text-[var(--on-surface)]">
            LWC Studio
          </h1>
          <p className="text-[var(--on-surface-variant)] text-sm tracking-wide">
            Request Precision Void Engine Access
          </p>
        </div>

        {/* Auth Form */}
        <div className="flex flex-col space-y-6">
          <form action={handleSubmit} className="flex flex-col space-y-5">
            <div className="space-y-4">
              <div>
                <label className="void-label" htmlFor="name">Full Identity Name</label>
                <input 
                  id="name"
                  name="name"
                  type="text" 
                  placeholder="John Doe" 
                  className="void-input w-full"
                  required
                />
              </div>
              <div>
                <label className="void-label" htmlFor="email">Work Email</label>
                <input 
                  id="email"
                  name="email"
                  type="email" 
                  placeholder="name@company.com" 
                  className="void-input w-full"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="void-label" htmlFor="password">Security Token</label>
                  <input 
                    id="password"
                    name="password"
                    type="password" 
                    placeholder="••••••••" 
                    className="void-input w-full"
                    required
                  />
                </div>
                <div>
                  <label className="void-label" htmlFor="confirm-password">Confirm Token</label>
                  <input 
                    id="confirm-password"
                    name="confirm-password"
                    type="password" 
                    placeholder="••••••••" 
                    className="void-input w-full"
                    required
                  />
                </div>
              </div>
            </div>

            {error && (
              <div className="p-3 text-[10px] uppercase font-bold tracking-widest bg-[var(--error)] bg-opacity-10 border border-[var(--error)] border-opacity-20 text-[var(--error)] rounded">
                Access Refused: {error}
              </div>
            )}

            <div className="pt-2">
               <label className="flex items-start space-x-3 cursor-pointer">
                  <input type="checkbox" className="mt-1 w-4 h-4 rounded bg-black/30 border-none ring-0 outline-none text-[var(--primary)]" required />
                  <span className="text-xs text-[var(--on-surface-variant)] leading-relaxed">
                     I agree to the <Link href="#" className="underline decoration-[var(--outline)]">Terms of Service</Link> and <Link href="#" className="underline decoration-[var(--outline)]">Privacy Policy</Link> for the Precision Void environment.
                  </span>
               </label>
            </div>

            <button 
              type="submit" 
              disabled={isPending}
              className="void-btn-primary w-full mt-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isPending ? 'Provisioning...' : 'Initialize Account'}
            </button>
          </form>

          <footer className="pt-4 border-t border-[var(--outline-variant)]">
            <p className="text-center text-sm text-[var(--on-surface-variant)]">
              Already have Access?{' '}
              <Link href="/login" className="text-[var(--primary)] font-medium hover:brightness-125 transition-all">
                Enter Void Session
              </Link>
            </p>
          </footer>
        </div>

        {/* Identity Footer */}
        <div className="pt-8 opacity-40">
           <div className="h-[1px] w-12 bg-gradient-to-r from-transparent via-[var(--primary)] to-transparent mx-auto mb-4" />
           <p className="text-[10px] text-center uppercase tracking-[0.2em] font-medium leading-relaxed max-w-[280px] mx-auto text-balance">
              Secure provisioning for Salesforce-integrated Lightning Web Component projects.
           </p>
        </div>

      </div>
    </main>
  );
}
