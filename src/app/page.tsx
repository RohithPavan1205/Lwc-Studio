/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  Zap,
  ArrowRight,
  Eye,
  Rocket,
  Cloud,
  Loader2,
  CheckCircle,
} from 'lucide-react';


// ─── Animation Hook ────────────────────────────────────────────────────────
function ScrollReveal({ children, delay = 0, className = '' }: { children: React.ReactNode, delay?: number, className?: string }) {
  const [isVisible, setIsVisible] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        setIsVisible(true);
        if (ref.current) observer.unobserve(ref.current);
      }
    }, { threshold: 0.1, rootMargin: '50px' });
    
    if (ref.current) observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);

  return (
    <div 
      ref={ref} 
      className={`transition-all duration-1000 ease-[cubic-bezier(0.16,1,0.3,1)] transform will-change-[opacity,transform] ${isVisible ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-12 scale-[0.98]'} ${className}`} 
      style={{ transitionDelay: `${delay}ms` }}
    >
      {children}
    </div>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────

interface Feature {
  icon: React.ReactNode;
  title: string;
  description: string;
}

interface Step {
  num: string;
  title: string;
  description: string;
}

// ─── Animated Code Mockup ─────────────────────────────────────────────────────

const CODE_LINES = [
  { indent: 0, content: '<template>', color: 'text-[#F07178]' },
  { indent: 1, content: '  <lightning-card', color: 'text-[#F07178]' },
  { indent: 2, content: '    title="Account Info"', color: 'text-[#FFCB6B]' },
  { indent: 2, content: '    icon-name="standard:account"', color: 'text-[#FFCB6B]' },
  { indent: 1, content: '  >', color: 'text-[#F07178]' },
  { indent: 2, content: '    <div class="slds-p-around_medium">', color: 'text-[#F1F3F6]' },
  { indent: 3, content: '      <p>{account.Name}</p>', color: 'text-[#C3E88D]' },
  { indent: 2, content: '    </div>', color: 'text-[#F1F3F6]' },
  { indent: 1, content: '  </lightning-card>', color: 'text-[#F07178]' },
  { indent: 0, content: '</template>', color: 'text-[#F07178]' },
];

function EditorMockup() {
  const [visibleLines, setVisibleLines] = useState(0);
  const [cursor, setCursor] = useState(true);

  useEffect(() => {
    if (visibleLines < CODE_LINES.length) {
      const t = setTimeout(() => setVisibleLines((v) => v + 1), 120);
      return () => clearTimeout(t);
    }
  }, [visibleLines]);

  useEffect(() => {
    const t = setInterval(() => setCursor((v) => !v), 500);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="flex flex-col sm:flex-row h-full w-full bg-[#0a0a0a]">
      {/* Editor pane */}
      <div className="flex-1 p-5 min-w-0 flex flex-col">
        {/* Tab bar */}
        <div className="flex items-center gap-4 mb-4 border-b border-white/5 pb-3">
          <span className="text-xs font-medium text-white border-b border-[var(--forge-primary)] -mb-[13px] pb-3">
            accountInfo.html
          </span>
          <span className="text-xs text-[var(--text-tertiary)] pb-3">accountInfo.js</span>
          <span className="text-xs text-[var(--text-tertiary)] pb-3">accountInfo.css</span>
        </div>

        {/* Code */}
        <div className="font-code text-[13px] leading-6 space-y-0.5 mt-2">
          {CODE_LINES.slice(0, visibleLines).map((line, i) => (
            <div key={i} className="flex items-center">
              <span className="text-white/20 w-6 mr-4 text-right select-none">{i + 1}</span>
              <span className={line.color}>{line.content}</span>
              {i === visibleLines - 1 && (
                <span
                  className={`inline-block w-[1.5px] h-4 bg-[var(--forge-primary)] ml-1 align-middle ${cursor ? 'opacity-100' : 'opacity-0'}`}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="w-px bg-white/5 hidden sm:block" />

      {/* Preview pane */}
      <div className="w-full sm:w-56 flex flex-col bg-[#050505]">
        <div className="px-5 py-3 border-b border-white/5 text-xs text-[var(--text-secondary)] font-medium flex items-center justify-between">
          <span>Live Preview</span>
          <div className="flex items-center gap-1.5 opacity-80">
             <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] shadow-[0_0_6px_var(--success)]" />
             <span className="text-[10px] text-[var(--success)] font-medium">Synced</span>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center p-5">
          <div className="w-full rounded-md border border-white/10 bg-white shadow-xl transform scale-95 origin-center">
            <div className="h-7 bg-[#0070D2] flex items-center px-3 gap-2">
              <Cloud size={12} className="text-white" />
              <span className="text-white text-[10px] font-semibold truncate">Account Info</span>
            </div>
            <div className="p-3 space-y-2">
              <div className="h-2 rounded bg-gray-200 w-3/4" />
              <div className="h-2 rounded bg-gray-200 w-1/2" />
              <div className="h-2 rounded bg-gray-100 w-2/3 mt-3" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Feature Cards ────────────────────────────────────────────────────────────

const FEATURES: Feature[] = [
  {
    icon: <Zap size={22} className="text-white/60 group-hover:text-white transition-colors" />,
    title: 'Instant Preview',
    description: 'See your component render live in your org with automatic post-deploy refresh.',
  },
  {
    icon: <Eye size={22} className="text-white/60 group-hover:text-white transition-colors" />,
    title: 'Real Org Context',
    description: 'Preview with actual org data, layouts, and SLDS — not a sandbox simulation.',
  },
  {
    icon: <Rocket size={22} className="text-white/60 group-hover:text-white transition-colors" />,
    title: 'One-Click Deploy',
    description: 'Deploy via Salesforce Tooling API. Background setup on first load.',
  },
];

const STEPS: Step[] = [
  { num: '01', title: 'Connect your Salesforce org', description: 'Authenticate securely using standard OAuth — no passwords or credentials are ever stored.' },
  { num: '02', title: 'Write in our Monaco Editor', description: 'Enjoy full syntax highlighting, autocompletion, and multiple tabs for your HTML, JS, and CSS files.' },
  { num: '03', title: 'Deploy & Preview Instantly', description: 'Push your changes to your actual org in seconds, and watch it render exactly as it will for your users.' },
];

// ─── Main Landing Content ─────────────────────────────────────────────────────

function LandingContent() {
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const errorParam = searchParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam.replace(/_/g, ' ')));
    }
  }, [searchParams]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Check if user already has a session → show "Go to Dashboard"
  useEffect(() => {
    import('@supabase/ssr').then(({ createBrowserClient }) => {
      const supabase = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      supabase.auth.getUser().then(({ data }) => {
        setHasSession(!!data.user);
      });
    });
  }, []);

  const handleSalesforceConnect = async () => {
    try {
      setIsLoading(true);
      setError('');
      const response = await fetch('/api/auth/salesforce/initiate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to initiate Salesforce login');
      }
      const { authUrl } = await response.json();
      window.location.href = authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#040404] text-[var(--text-primary)] flex flex-col relative overflow-hidden font-sans">
      <style dangerouslySetInnerHTML={{__html: `
        @keyframes fadeUpIn {
          from { opacity: 0; transform: translateY(24px) scale(0.98); filter: blur(4px); }
          to { opacity: 1; transform: translateY(0) scale(1); filter: blur(0); }
        }
        .animate-fade-up {
          animation: fadeUpIn 0.9s cubic-bezier(0.16, 1, 0.3, 1) forwards;
          opacity: 0;
        }
        .delay-100 { animation-delay: 100ms; }
        .delay-200 { animation-delay: 200ms; }
        .delay-300 { animation-delay: 300ms; }
        .delay-400 { animation-delay: 400ms; }
        .delay-500 { animation-delay: 500ms; }

        @keyframes floatSlow {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-12px); }
        }
        .animate-float-slow {
          animation: floatSlow 6s ease-in-out infinite;
        }

        @keyframes bgGlowShift {
          0%, 100% { opacity: 0.02; transform: scale(1) translateX(0); }
          50% { opacity: 0.04; transform: scale(1.05) translateX(10px); }
        }
        .animate-bg-shift {
          animation: bgGlowShift 8s ease-in-out infinite;
        }
      `}} />

      {/* ── Premium Ambient Background ───────────────────────────────── */}
      <div className="fixed inset-0 pointer-events-none -z-10 flex items-start justify-center">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_80%_at_50%_-20%,rgba(247,127,0,0.06),rgba(0,0,0,0))]" />
        <div className="absolute top-[-10%] w-[1000px] h-[600px] bg-white blur-[120px] rounded-[100%] animate-bg-shift" />
      </div>

      {/* ── Fixed Navbar ───────────────────────────────────────────────────── */}
      <nav 
        className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 flex items-center justify-between px-6 will-change-transform
        ${scrolled ? 'h-16 bg-[#040404]/80 backdrop-blur-lg border-b border-white/[0.08] shadow-lg' : 'h-20 bg-transparent border-b border-transparent'}`}
      >
        <Link href="/" className="forge-logo relative h-8 w-28 flex items-center justify-center ml-2 lg:ml-4">
          <img src="/logo-full.png" alt="LWCForge" className="absolute h-[140px] w-auto max-w-none object-contain pointer-events-none" />
        </Link>

        <div className="flex items-center gap-6">
          <Link
            href="/templates"
            className="hidden sm:block text-sm text-[var(--text-secondary)] hover:text-white transition-colors font-medium"
          >
            Templates
          </Link>
          {hasSession ? (
            <Link
              href="/dashboard"
              className="flex items-center gap-2 bg-[var(--bg-elevated)] text-white border border-white/10 hover:border-white/20 hover:bg-white/5 font-medium text-sm px-4 py-2 rounded-lg transition-all active:scale-95 shadow-sm"
            >
              Dashboard
              <ArrowRight size={14} />
            </Link>
          ) : (
            <button
              onClick={handleSalesforceConnect}
              disabled={isLoading}
              className="flex items-center gap-2 bg-[var(--bg-elevated)] text-white border border-white/10 hover:border-white/20 hover:bg-white/5 font-medium text-sm px-4 py-2 rounded-lg transition-all active:scale-95 shadow-sm"
              id="landing-sf-connect-btn"
            >
              {isLoading ? (
                <>
                  <Loader2 size={14} className="animate-forge-spin" />
                  Connecting
                </>
              ) : (
                <>
                  <Cloud size={14} />
                  Connect Org
                </>
              )}
            </button>
          )}
        </div>
      </nav>

      {/* Spacer for fixed nav */}
      <div className="h-20" />

      {/* ── Hero ─────────────────────────────────────────────────────── */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-16 pb-20 max-w-5xl mx-auto w-full">
        {/* Badge */}
        <div className="animate-fade-up inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/[0.02] border border-white/[0.06] text-[var(--text-secondary)] text-xs font-medium mb-10 hover:bg-white/[0.04] transition-colors cursor-default backdrop-blur-sm shadow-[0_0_15px_rgba(0,0,0,0.2)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[var(--forge-primary)] opacity-50"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-[var(--forge-primary)]"></span>
          </span>
          Next-Gen LWC Development
        </div>

        {/* H1 */}
        <h1 className="animate-fade-up delay-100 text-5xl sm:text-6xl lg:text-7xl font-bold tracking-tighter text-white leading-[1.05] mb-8 drop-shadow-sm">
          Build Lightning Components
          <br />
          Without the{' '}
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--forge-primary)] to-[#ffb866] drop-shadow-[0_0_12px_rgba(247,127,0,0.3)]">
            wait.
          </span>
        </h1>

        {/* Subtext */}
        <p className="animate-fade-up delay-200 text-lg sm:text-xl text-[var(--text-secondary)] max-w-2xl leading-relaxed mb-12 opacity-80 font-light">
          Write code in your browser and see it render in your actual Salesforce org{' '}
          <strong className="text-[var(--text-primary)] font-medium">instantly</strong>. Auto-deploys, live sync, and a full Monaco editor.
        </p>

        {/* Error */}
        {error && (
          <div className="animate-fade-up delay-200 mb-8 px-4 py-3 bg-[var(--error-subtle)] border border-[rgba(239,68,68,0.3)] rounded-lg text-[var(--error)] text-sm shadow-sm">
            {error}
          </div>
        )}

        {/* CTAs */}
        <div className="animate-fade-up delay-300 flex flex-col sm:flex-row items-center gap-5">
          {hasSession ? (
            <Link
              href="/dashboard"
              className="group flex items-center gap-2 bg-gradient-to-b from-[var(--forge-primary)] to-[#cc6600] text-white font-semibold text-base px-8 py-3.5 rounded-full shadow-[0_6px_24px_rgba(247,127,0,0.3)] hover:shadow-[0_10px_32px_rgba(247,127,0,0.5)] hover:scale-[1.04] hover:brightness-110 active:scale-[0.98] transition-all duration-300"
            >
              Go to Dashboard
              <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-300" />
            </Link>
          ) : (
            <button
              onClick={handleSalesforceConnect}
              disabled={isLoading}
              id="hero-sf-connect-btn"
              className="group flex items-center gap-2 bg-gradient-to-b from-[var(--forge-primary)] to-[#cc6600] text-white font-semibold text-base px-8 py-3.5 rounded-full shadow-[0_6px_24px_rgba(247,127,0,0.3)] hover:shadow-[0_10px_32px_rgba(247,127,0,0.5)] hover:scale-[1.04] hover:brightness-110 active:scale-[0.98] transition-all duration-300 disabled:opacity-70 disabled:hover:scale-100 disabled:hover:shadow-none"
            >
              {isLoading ? (
                <>
                  <Loader2 size={16} className="animate-forge-spin" />
                  Connecting...
                </>
              ) : (
                <>
                  <Zap size={16} />
                  Continue with Salesforce
                  <ArrowRight size={16} className="group-hover:translate-x-1 transition-transform duration-300 opacity-80" />
                </>
              )}
            </button>
          )}
          <Link
            href="/templates"
            className="flex items-center gap-2 text-[var(--text-secondary)] hover:text-white bg-transparent border border-white/10 hover:border-white/20 text-base px-8 py-3.5 rounded-full hover:bg-white/[0.02] hover:scale-[1.03] active:scale-95 transition-all duration-300"
          >
            Explore Templates
          </Link>
        </div>

        {/* Trust */}
        <div className="animate-fade-up delay-400 flex flex-wrap items-center justify-center gap-3 mt-12 text-[var(--text-tertiary)] text-xs opacity-70">
          <span className="flex items-center gap-1.5"><CheckCircle size={12} className="text-[#888]" /> OAuth standard</span>
          <span className="text-white/20">•</span>
          <span className="flex items-center gap-1.5"><CheckCircle size={12} className="text-[#888]" /> Instant deploy</span>
          <span className="text-white/20">•</span>
          <span className="flex items-center gap-1.5"><CheckCircle size={12} className="text-[#888]" /> Auto-sync</span>
        </div>
      </section>

      {/* ── Editor Mockup ─────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 pb-32 max-w-5xl mx-auto w-full">
        <div className="relative mx-auto max-w-4xl group animate-fade-up delay-500">
          <div className="animate-float-slow">
            {/* Deep premium glow */}
            <div className="absolute inset-[-40px] bg-gradient-to-r from-[var(--forge-primary)] via-[#ff6b00] to-orange-500 opacity-10 blur-3xl rounded-full group-hover:opacity-[0.25] transition-opacity duration-700" />
            
            {/* Editor window casing */}
            <div className="relative h-[22rem] sm:h-[28rem] rounded-2xl overflow-hidden bg-[#0c0c0c] border border-white/10 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)] ring-1 ring-white/5 transition-transform duration-700 group-hover:-translate-y-2 group-hover:shadow-[0_30px_80px_-20px_rgba(0,0,0,1)]">
              <div className="h-10 bg-white/[0.03] border-b border-white/5 flex items-center px-4 gap-2 backdrop-blur-md">
                 <div className="w-3 h-3 rounded-full bg-[#FF5F56] shadow-sm transform hover:scale-110 transition-transform" />
                 <div className="w-3 h-3 rounded-full bg-[#FFBD2E] shadow-sm transform hover:scale-110 transition-transform" />
                 <div className="w-3 h-3 rounded-full bg-[#27C93F] shadow-sm transform hover:scale-110 transition-transform" />
              </div>
              <div className="h-[calc(100%-2.5rem)]">
                <EditorMockup />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Features ─────────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 pb-32 max-w-6xl mx-auto w-full">
        <ScrollReveal>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {FEATURES.map((f, i) => (
              <div
                key={f.title}
                className={`group flex flex-col p-8 rounded-2xl border transition-all duration-500 ease-out hover:-translate-y-3 hover:border-white/20 hover:shadow-[0_20px_40px_-15px_rgba(0,0,0,1)] ${
                  i === 1 
                    ? 'bg-gradient-to-b from-[#151515] to-[#0a0a0a] border-white/10 shadow-[0_0_40px_rgba(0,0,0,0.5)] md:-translate-y-1 md:scale-[1.02] z-10 hover:shadow-[0_20px_50px_-15px_rgba(247,127,0,0.15)]' 
                    : 'bg-[#0a0a0a] border-white/5 opacity-90 hover:opacity-100'
                }`}
              >
                <div className="w-12 h-12 bg-white/5 rounded-xl flex items-center justify-center mb-6 ring-1 ring-white/10 group-hover:ring-white/20 group-hover:bg-white/10 transition-all duration-300">
                  <div className="group-hover:scale-110 group-hover:text-white transition-all duration-300 flex items-center justify-center text-white/60">
                    {f.icon}
                  </div>
                </div>
                <h3 className="text-lg font-semibold text-white mb-3 tracking-tight">{f.title}</h3>
                <p className="text-base text-[var(--text-secondary)] leading-relaxed font-light">{f.description}</p>
              </div>
            ))}
          </div>
        </ScrollReveal>
      </section>

      {/* ── How It Works ──────────────────────────────────────────────── */}
      <section className="relative z-10 px-6 pb-32 max-w-4xl mx-auto w-full">
        <ScrollReveal delay={100}>
          <div className="text-center mb-16">
            <h2 className="text-3xl sm:text-4xl font-bold text-white tracking-tight mb-4">
              How It Works
            </h2>
            <p className="text-[var(--text-secondary)]">Get from zero to preview seamlessly.</p>
          </div>
        </ScrollReveal>
        
        <div className="space-y-10 relative">
          {/* Connector line behind */}
          <div className="absolute left-[31px] top-6 bottom-10 w-px bg-gradient-to-b from-[var(--forge-primary)]/40 via-white/10 to-transparent hidden sm:block delay-500 animate-fade-up" />

          {STEPS.map((step, i) => (
            <ScrollReveal key={step.num} delay={i * 200}>
              <div className="group flex flex-col sm:flex-row items-start gap-8 relative">
                {/* Number/Icon circle */}
                <div className="w-16 h-16 rounded-2xl bg-black border border-white/10 flex items-center justify-center flex-shrink-0 z-10 group-hover:bg-[#111] group-hover:border-white/20 group-hover:scale-110 group-hover:shadow-[0_0_30px_rgba(247,127,0,0.15)] transition-all duration-400 ease-[cubic-bezier(0.16,1,0.3,1)] overflow-hidden relative">
                  <div className="absolute inset-x-0 bottom-0 h-1/2 bg-[var(--forge-primary)]/10 blur-xl group-hover:bg-[var(--forge-primary)]/30 transition-colors duration-500" />
                  <span className="font-display text-xl font-bold text-white/50 group-hover:text-white transition-colors duration-300 relative z-10 group-hover:scale-110">
                    {step.num}
                  </span>
                </div>
                <div className="flex-1 pt-1 bg-[#0a0a0a]/50 p-6 sm:p-8 rounded-2xl border border-white/5 hover:border-white/10 hover:shadow-[0_15px_30px_-10px_rgba(0,0,0,1)] transition-all duration-400 group-hover:-translate-y-1 group-hover:bg-[#111]">
                  <h3 className="text-xl font-semibold text-white mb-3">{step.title}</h3>
                  <p className="text-base text-[var(--text-secondary)] font-light leading-relaxed">{step.description}</p>
                </div>
              </div>
            </ScrollReveal>
          ))}
        </div>
      </section>

      {/* ── Footer ───────────────────────────────────────────────────── */}
      <footer className="relative z-10 border-t border-white/5 bg-[#040404] px-6 py-10 mt-auto">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <Link href="/" className="forge-logo relative h-8 w-28 flex items-center justify-center opacity-80 hover:opacity-100 transition-opacity duration-300 ml-2 lg:ml-4">
            <img src="/logo-full.png" alt="LWCForge" className="absolute h-[140px] w-auto max-w-none object-contain pointer-events-none" />
          </Link>
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-[var(--text-secondary)] font-light">
            <Link href="/templates" className="hover:text-white transition-colors">
              Templates
            </Link>
            <span className="font-display text-white/10 hidden sm:inline">•</span>
            <span>Built for modern Salesforce teams</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─── Default Export with Suspense ─────────────────────────────────────────────

export default function LandingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--bg-void)] flex items-center justify-center">
          <Loader2 className="animate-forge-spin text-[var(--forge-primary)]" size={32} />
        </div>
      }
    >
      <LandingContent />
    </Suspense>
  );
}
