'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { formatDistanceToNow } from 'date-fns';
import { MoreHorizontal, Code2, Trash2, Clock } from 'lucide-react';
import { buildPreviewDocument } from '@/lib/buildPreviewDocument';

interface ComponentData {
  id: string;
  name: string;
  master_label?: string;
  api_version?: string;
  created_at: string;
  updated_at: string;
  html_content?: string;
  css_content?: string;
}

interface ComponentCardProps {
  component: ComponentData;
  onDelete: (c: ComponentData) => void;
  index: number;
  status?: string;
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'synced') {
    return (
      <span className="flex items-center gap-1.5 text-xs font-medium text-green-400 bg-green-950/60 border border-green-900/50 px-2 py-0.5 rounded-full">
        <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
        Deployed
      </span>
    );
  }
  return (
    <span className="flex items-center gap-1.5 text-xs font-medium text-orange-400 bg-orange-950/60 border border-orange-900/50 px-2 py-0.5 rounded-full">
      <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />
      Draft
    </span>
  );
}

function EmptyPreviewPlaceholder() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-[#0d1117]">
      <div className="w-8 h-8 text-blue-500 opacity-50 text-2xl flex items-center justify-center font-bold">⚡</div>
      <p className="text-gray-600 text-xs">No preview yet</p>
      <p className="text-gray-700 text-[10px]">Open in editor to start coding</p>
    </div>
  );
}

export default function ComponentCard({ component, onDelete, index, status = 'draft' }: ComponentCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  const contentLength = (component.html_content || '').length + (component.css_content || '').length;
  const isTall = contentLength > 500;
  const previewHeight = isTall ? 400 : 220;
  const scale = isTall ? 0.70 : 0.85;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );
    
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, []);

  const hasContent = Boolean(component.html_content);
  const previewDoc = useMemo(() => {
    if (!isVisible || !hasContent) return '';
    return buildPreviewDocument(component.html_content || '', component.css_content || '');
  }, [isVisible, hasContent, component.html_content, component.css_content]);

  return (
    <div className="break-inside-avoid mb-4">
      <div
        ref={cardRef}
        className="group relative rounded-xl overflow-hidden bg-[#0d1117] border border-white/[0.06] hover:border-white/[0.14] transition-all duration-200 hover:shadow-lg hover:shadow-black/40 hover:-top-1 cursor-pointer"
        style={{ animationDelay: `${Math.min(index, 8) * 40}ms` }}
      >
        <Link href={`/dashboard/editor/${component.id}`} className="block">
          <div className="relative overflow-hidden bg-[#080c14] border-b border-white/[0.06]" style={{ height: previewHeight }}>
            {hasContent ? (
              <iframe
                srcDoc={previewDoc}
                sandbox="allow-scripts"
                className="absolute border-0 pointer-events-none origin-top-left"
                style={{ width: `${100/scale}%`, height: `${100/scale}%`, transform: `scale(${scale})` }}
                title={component.name}
              />
            ) : (
              <EmptyPreviewPlaceholder />
            )}
            
            <div className="absolute top-2.5 right-2.5">
              <StatusBadge status={status} />
            </div>
          </div>

          <div className="p-4">
            <div className="flex items-start justify-between gap-2 mb-1">
              <h3 className="text-white font-medium text-sm truncate">{component.name}</h3>
              {component.api_version && (
                <span className="text-[10px] text-gray-600 font-mono bg-white/[0.04] px-1.5 py-0.5 rounded shrink-0">
                  v{component.api_version}
                </span>
              )}
            </div>
            {component.master_label && component.master_label !== component.name && (
              <p className="text-gray-500 text-xs truncate mb-3">{component.master_label}</p>
            )}
            <div className="flex items-center text-gray-600 text-xs mt-3">
              <Clock className="w-3 h-3 mr-1" />
              {component.updated_at
                ? formatDistanceToNow(new Date(component.updated_at), { addSuffix: true })
                : '—'}
            </div>
          </div>
        </Link>

        {/* Overflow menu */}
        <div className="absolute top-3 left-3" onClick={(e) => e.preventDefault()}>
          <button
            onClick={(e) => {
               e.preventDefault();
               e.stopPropagation();
               setMenuOpen((v) => !v);
            }}
            className="p-1.5 rounded-md text-white/40 hover:text-white hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-all shadow-sm bg-black/40 backdrop-blur-md"
            aria-label="Component options"
          >
            <MoreHorizontal size={15} />
          </button>
          {menuOpen && (
            <div className="absolute left-0 mt-1 w-48 bg-[#111827] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[200]">
              <Link
                href={`/dashboard/editor/${component.id}`}
                onClick={() => setMenuOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-gray-200 hover:bg-white/[0.06] transition-colors"
              >
                <Code2 size={14} className="text-gray-400" />
                Open Editor
              </Link>
              <button
                onClick={() => { setMenuOpen(false); onDelete(component); }}
                className="w-full flex items-center gap-2.5 px-4 py-2.5 text-sm text-red-500 hover:bg-red-500/10 transition-colors text-left"
              >
                <Trash2 size={14} />
                Delete
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
