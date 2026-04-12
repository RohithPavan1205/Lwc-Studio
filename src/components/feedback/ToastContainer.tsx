'use client';

import { useEffect, useState, useCallback } from 'react';
import { X, CheckCircle, AlertTriangle, Info, AlertCircle } from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastData {
  id: string;
  type: ToastType;
  title: string;
  description?: string;
  duration?: number;
  action?: { label: string; onClick: () => void };
}

// ─── Single Toast ─────────────────────────────────────────────────────────────

function ToastItem({
  toast,
  onRemove,
}: {
  toast: ToastData;
  onRemove: (id: string) => void;
}) {
  const [exiting, setExiting] = useState(false);
  const duration = toast.duration ?? 4000;

  const dismiss = useCallback(() => {
    setExiting(true);
    setTimeout(() => onRemove(toast.id), 150);
  }, [toast.id, onRemove]);

  useEffect(() => {
    const t = setTimeout(dismiss, duration);
    return () => clearTimeout(t);
  }, [dismiss, duration]);

  const icons: Record<ToastType, React.ReactNode> = {
    success: <CheckCircle size={16} className="text-[var(--success)] flex-shrink-0" />,
    error: <AlertCircle size={16} className="text-[var(--error)] flex-shrink-0" />,
    warning: <AlertTriangle size={16} className="text-[var(--warning)] flex-shrink-0" />,
    info: <Info size={16} className="text-[var(--info)] flex-shrink-0" />,
  };

  const borders: Record<ToastType, string> = {
    success: 'border-l-[var(--success)]',
    error: 'border-l-[var(--error)]',
    warning: 'border-l-[var(--warning)]',
    info: 'border-l-[var(--info)]',
  };

  return (
    <div
      className={`
        relative flex items-start gap-3 w-80 max-w-full
        bg-[var(--bg-elevated)] border border-[var(--border-default)]
        border-l-4 ${borders[toast.type]}
        rounded-xl px-4 py-3 shadow-[var(--shadow-lg)]
        overflow-hidden
        ${exiting ? 'toast-exit' : 'toast-enter'}
      `}
      role="alert"
    >
      {/* Icon */}
      <div className="mt-0.5">{icons[toast.type]}</div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[var(--text-primary)]">{toast.title}</p>
        {toast.description && (
          <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
            {toast.description}
          </p>
        )}
        {toast.action && (
          <button
            onClick={toast.action.onClick}
            className="mt-2 text-xs font-semibold text-[var(--forge-primary)] hover:text-[var(--forge-glow)] transition-colors"
          >
            {toast.action.label} →
          </button>
        )}
      </div>

      {/* Close */}
      <button
        onClick={dismiss}
        className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)] transition-colors flex-shrink-0 mt-0.5"
        aria-label="Dismiss"
      >
        <X size={13} />
      </button>

      {/* Progress bar */}
      <div
        className="absolute bottom-0 left-0 h-0.5 bg-[var(--forge-primary)]"
        style={{
          animation: `progress-shrink ${duration}ms linear forwards`,
        }}
      />
    </div>
  );
}

// ─── Toast Container ─────────────────────────────────────────────────────────

let globalAddToast: ((toast: Omit<ToastData, 'id'>) => void) | null = null;

export function addToast(toast: Omit<ToastData, 'id'>) {
  if (globalAddToast) globalAddToast(toast);
}

export function ToastContainer() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const add = useCallback((toast: Omit<ToastData, 'id'>) => {
    const id = Math.random().toString(36).slice(2);
    setToasts((prev) => {
      const next = [...prev, { ...toast, id }];
      // Max 3 visible
      return next.slice(-3);
    });
  }, []);

  const remove = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    globalAddToast = add;
    return () => {
      globalAddToast = null;
    };
  }, [add]);

  if (toasts.length === 0) return null;

  return (
    <div
      aria-live="polite"
      className="fixed bottom-6 right-6 z-[600] flex flex-col gap-2 items-end"
    >
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onRemove={remove} />
      ))}
    </div>
  );
}

export default ToastContainer;
