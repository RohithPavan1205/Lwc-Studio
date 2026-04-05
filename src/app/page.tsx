import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-24 bg-[var(--background)] text-[var(--on-background)] overflow-hidden">
      {/* Decorative Gradient Glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-[var(--primary)] opacity-[0.03] blur-[120px] pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center">
        <h1 className="text-7xl font-bold tracking-tighter text-[var(--on-surface)] mb-4">
          LWC Studio
        </h1>
        <p className="text-xl text-[var(--on-surface-variant)] font-light tracking-[0.15em] uppercase mb-12">
          Architecture & Precision
        </p>
        
        <div className="flex gap-6 items-center">
          <Link href="/login" className="void-btn-primary px-10">
            Enter Void Engine
          </Link>
          <Link href="/signup" className="void-btn-secondary px-8">
            Request Access
          </Link>
        </div>
      </div>
      
      <div className="mt-24 flex gap-6 items-center opacity-60">
        <div className="h-[1px] w-24 bg-gradient-to-r from-transparent to-[var(--outline-variant)]"></div>
        <span className="text-[10px] font-medium text-[var(--on-surface-variant)] uppercase tracking-[0.4em]">
          Mission Critical Salesforce Development
        </span>
        <div className="h-[1px] w-24 bg-gradient-to-l from-transparent to-[var(--outline-variant)]"></div>
      </div>

      {/* Version Metadata */}
      <div className="absolute bottom-12 left-12">
         <p className="text-[10px] font-mono text-[var(--outline)] opacity-40 hover:opacity-100 transition-opacity flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
            STABLE_BUILD_4.05.2026
         </p>
      </div>
    </main>
  );
}
