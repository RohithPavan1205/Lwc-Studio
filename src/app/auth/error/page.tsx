import Link from 'next/link';
import { AlertTriangle, ArrowLeft, Zap } from 'lucide-react';

interface AuthErrorPageProps {
  searchParams: { error?: string; error_description?: string };
}

export default function AuthErrorPage({ searchParams }: AuthErrorPageProps) {
  const rawError = searchParams.error ?? '';
  const description = searchParams.error_description ?? '';

  const humanError =
    rawError === 'access_denied'
      ? 'Authorization denied. You cancelled the connection or denied permissions.'
      : rawError === 'invalid_client'
        ? 'Invalid OAuth client. Please contact support.'
        : rawError === 'temporarily_unavailable'
          ? 'Salesforce is temporarily unavailable. Please try again in a few minutes.'
          : description || rawError || 'An unexpected error occurred during authentication.';

  return (
    <div className="min-h-screen bg-[var(--bg-void)] flex flex-col items-center justify-center px-6">
      {/* Ambient glow */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 w-[500px] h-[400px] bg-[var(--error)] opacity-[0.04] blur-[100px] rounded-full" />
      </div>

      {/* Logo */}
      <Link href="/" className="forge-logo mb-12 relative z-10 flex flex-col items-center h-12 w-40 justify-center shrink-0">
        <img src="/logo-full.png" alt="LWCForge" className="absolute h-[180px] w-auto max-w-none object-contain pointer-events-none" />
      </Link>

      {/* Error Card */}
      <div className="relative z-10 forge-card rounded-2xl p-8 max-w-md w-full text-center">
        {/* Icon */}
        <div className="w-16 h-16 rounded-full bg-[var(--error-subtle)] flex items-center justify-center mx-auto mb-5">
          <AlertTriangle size={28} className="text-[var(--error)]" />
        </div>

        <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">
          Authentication Failed
        </h1>

        <p className="text-sm text-[var(--text-secondary)] mb-4">
          We couldn&apos;t connect to your Salesforce org.
        </p>

        {humanError && (
          <div className="mb-6 px-4 py-3 rounded-lg bg-[var(--error-subtle)] border border-[rgba(239,68,68,0.2)] text-left">
            <p className="text-sm text-[var(--error)] leading-relaxed">{humanError}</p>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            href="/"
            className="btn-forge-primary text-sm px-6 py-2.5 justify-center"
          >
            <Zap size={14} />
            Try Again
          </Link>
          <Link
            href="/"
            className="btn-ghost text-sm px-6 py-2.5 justify-center"
          >
            <ArrowLeft size={14} />
            Back to Home
          </Link>
        </div>

        {rawError && (
          <p className="mt-6 text-xs text-[var(--text-tertiary)] font-code">
            Error code: {rawError}
          </p>
        )}
      </div>
    </div>
  );
}
