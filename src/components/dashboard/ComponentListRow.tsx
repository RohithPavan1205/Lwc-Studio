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

interface ComponentListRowProps {
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

export default function ComponentListRow({ component, onDelete, index, status = 'draft' }: ComponentListRowProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const rowRef = useRef<HTMLDivElement>(null);

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
    
    if (rowRef.current) observer.observe(rowRef.current);
    return () => observer.disconnect();
  }, []);

  const hasContent = Boolean(component.html_content);
  const previewDoc = useMemo(() => {
    if (!isVisible || !hasContent) return '';
    return buildPreviewDocument(component.html_content || '', component.css_content || '');
  }, [isVisible, hasContent, component.html_content, component.css_content]);

  return (
    <div
      ref={rowRef}
      className="group relative flex items-center gap-4 px-4 py-3.5 rounded-xl border border-white/[0.06] hover:border-white/[0.14] bg-[#0d1117] transition-all cursor-pointer hover:shadow-lg hover:shadow-black/20"
      style={{ animationDelay: `${Math.min(index, 8) * 30}ms` }}
    >
      <Link href={`/dashboard/editor/${component.id}`} className="flex items-center gap-4 flex-1 min-w-0">
        
        {/* Mini Preview block replacing old static Icon */}
        <div className="relative w-[60px] h-[60px] rounded-lg overflow-hidden shrink-0 border border-white/[0.06] bg-[#080c14] flex-shrink-0">
          {hasContent ? (
            <iframe
              srcDoc={previewDoc}
              sandbox="allow-scripts"
              className="absolute w-full h-full border-0 pointer-events-none"
              style={{ transform: 'scale(0.4)', transformOrigin: 'top left', width: '250%', height: '250%' }}
              title={component.name}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-blue-500 opacity-50 bg-[#0d1117]">
              <span className="text-xl font-bold">⚡</span>
            </div>
          )}
        </div>

        {/* Name + label */}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-white group-hover:text-blue-400 transition-colors truncate">
            {component.name}
          </p>
          {component.master_label && component.master_label !== component.name && (
            <p className="text-xs text-gray-500 truncate mt-0.5">{component.master_label}</p>
          )}
        </div>

        {/* Status */}
        <div className="hidden sm:flex flex-shrink-0">
           <StatusBadge status={status} />
        </div>

        {/* Meta */}
        <div className="hidden md:flex items-center gap-1 text-xs text-gray-500 flex-shrink-0 w-28 justify-end">
          <Clock size={10} />
          {component.updated_at
            ? formatDistanceToNow(new Date(component.updated_at), { addSuffix: true })
            : '—'}
        </div>

        {/* Version */}
        {component.api_version && (
          <span className="hidden lg:block text-[10px] text-gray-600 font-mono px-1.5 py-0.5 rounded flex-shrink-0 bg-white/[0.04] border border-white/[0.06] ml-4">
            v{component.api_version}
          </span>
        )}
      </Link>

      {/* Overflow menu */}
      <div onClick={(e) => e.preventDefault()} className="flex-shrink-0 relative">
        <button
          onClick={(e) => {
             e.preventDefault();
             e.stopPropagation();
             setMenuOpen((v) => !v);
          }}
          className="p-1.5 rounded-md text-gray-500 hover:text-white hover:bg-white/[0.08] opacity-0 group-hover:opacity-100 transition-all"
          aria-label="Component options"
        >
          <MoreHorizontal size={15} />
        </button>
        {menuOpen && (
          <div className="absolute right-0 mt-1 w-48 bg-[#111827] border border-white/10 rounded-xl shadow-2xl overflow-hidden z-[200]">
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
  );
}
