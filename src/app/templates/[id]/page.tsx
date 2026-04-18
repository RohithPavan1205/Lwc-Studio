'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ChevronLeft, Plus } from 'lucide-react';
import { Template } from '../page';
import UseTemplateModal from '@/components/templates/UseTemplateModal';

// ─── Component ──────────────────────────────────────────────────────────────

export default function TemplateDetail({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [template, setTemplate] = useState<Template & { lwc_html?: string; lwc_js?: string; lwc_css?: string; lwc_meta_xml?: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Background toggle for preview
  const [previewBg, setPreviewBg] = useState<'transparent' | 'dark' | 'light'>('transparent');
  const [activeTab, setActiveTab] = useState<'html' | 'js' | 'css'>('html');
  const [showUseModal, setShowUseModal] = useState(false);

  useEffect(() => {
    async function fetchTemplate() {
      try {
        const res = await fetch(`/api/templates/${params.id}`);
        if (!res.ok) throw new Error('Failed to load template');
        const data = await res.json();
        setTemplate(data.template);
        
        // Track view
        fetch(`/api/templates/${params.id}/view`, { method: 'POST' }).catch(() => {});
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }
    fetchTemplate();
  }, [params.id]);

  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: '#0B0F1A', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ color: '#F9FAFB', fontSize: 14 }}>Loading...</div>
      </div>
    );
  }

  if (error || !template) {
    return (
      <div style={{ minHeight: '100vh', background: '#0B0F1A', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 16 }}>
        <div style={{ color: '#EF4444' }}>{error || 'Template not found'}</div>
        <Link href="/templates" style={{ color: '#F97316', textDecoration: 'none' }}>← Back to Gallery</Link>
      </div>
    );
  }

  const bgColors = {
    transparent: 'radial-gradient(ellipse at center, rgba(249,115,22,0.04) 0%, rgba(11,15,26,0.95) 70%)',
    dark: '#111827',
    light: '#F3F4F6'
  };

  return (
    <div style={{ height: '100vh', background: '#0B0F1A', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      
      {/* ── Top Bar ────────────────────────────────────────────── */}
      <header style={{ height: 64, borderBottom: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', padding: '0 24px', justifyContent: 'space-between', background: 'rgba(0,0,0,0.4)', backdropFilter: 'blur(20px)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <button onClick={() => router.push('/templates')} style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'none', border: 'none', color: '#9CA3AF', cursor: 'pointer', fontSize: 13 }}>
            <ChevronLeft size={16} /> Go back
          </button>
          <div style={{ width: 1, height: 20, background: 'rgba(255,255,255,0.1)' }} />
          <h1 style={{ color: '#F9FAFB', fontSize: 16, fontWeight: 600, margin: 0 }}>{template.name}</h1>
          <span style={{ background: 'rgba(255,255,255,0.1)', color: '#D1D5DB', padding: '2px 8px', borderRadius: 999, fontSize: 11 }}>{template.category}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {template.original_author && <span style={{ color: '#9CA3AF', fontSize: 13 }}>by <strong style={{color: '#E5E7EB'}}>{template.original_author}</strong></span>}
          <div style={{ display: 'flex', gap: 12, color: '#6B7280', fontSize: 12 }}>
            <span>👁 {template.view_count}</span>
            <span>⬇ {template.use_count}</span>
          </div>
        </div>
      </header>

      {/* ── Main Split View ────────────────────────────────────────────── */}
      <main style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        
        {/* Left: Preview */}
        <section style={{ flex: 1, display: 'flex', flexDirection: 'column', position: 'relative' }}>
          
          {/* Background Controls */}
          <div style={{ position: 'absolute', top: 16, right: 16, zIndex: 10, display: 'flex', gap: 4, background: 'rgba(0,0,0,0.5)', padding: 4, borderRadius: 8, backdropFilter: 'blur(10px)' }}>
            <button onClick={() => setPreviewBg('transparent')} style={{ width: 24, height: 24, borderRadius: 4, background: 'transparent', border: previewBg === 'transparent' ? '1px solid #F97316' : '1px solid transparent', cursor: 'pointer', position: 'relative' }}>
              <div style={{position: 'absolute', inset: 3, background: 'repeating-conic-gradient(#808080 0% 25%, transparent 0% 50%) 50% / 8px 8px', borderRadius: 2, opacity: 0.5}}></div>
            </button>
            <button onClick={() => setPreviewBg('dark')} style={{ width: 24, height: 24, borderRadius: 4, background: '#111827', border: previewBg === 'dark' ? '1px solid #F97316' : '1px solid transparent', cursor: 'pointer' }}></button>
            <button onClick={() => setPreviewBg('light')} style={{ width: 24, height: 24, borderRadius: 4, background: '#F3F4F6', border: previewBg === 'light' ? '1px solid #F97316' : '1px solid transparent', cursor: 'pointer' }}></button>
          </div>

          <div style={{ flex: 1, background: bgColors[previewBg], display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', position: 'relative' }}>
            {template.html_content ? (
               <iframe
                title={template.name}
                srcDoc={`<style>body{display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:transparent;overflow:hidden;}</style>${template.html_content}`}
                sandbox="allow-scripts"
                style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
              />
            ) : (
              <div style={{ color: '#6B7280' }}>No visual preview available</div>
            )}
          </div>
        </section>

        {/* Right: Code Viewer */}
        <section style={{ width: 600, background: '#111827', borderLeft: '1px solid rgba(255,255,255,0.06)', display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ display: 'flex', background: '#1F2937', padding: '0 16px', gap: 2 }}>
            {(['html', 'js', 'css'] as const).map(tab => {
               const config = {
                 html: { src: '/icons/html-5.png', label: '.html' },
                 js: { src: '/icons/js.png', label: '.js' },
                 css: { src: '/icons/css-3.png', label: '.css' }
               }[tab];
               return (
                 <button
                   key={tab}
                   onClick={() => setActiveTab(tab)}
                   style={{
                     display: 'flex', alignItems: 'center', gap: 6,
                     padding: '12px 16px', background: 'transparent', border: 'none',
                     borderBottom: activeTab === tab ? '2px solid #F97316' : '2px solid transparent',
                     color: activeTab === tab ? '#F9FAFB' : '#9CA3AF',
                     fontSize: 13, fontWeight: activeTab === tab ? 600 : 400,
                     cursor: 'pointer', fontFamily: 'monospace'
                   }}
                 >
                   <img src={config.src} alt={tab} width={14} height={14} style={{ opacity: activeTab === tab ? 1 : 0.6, borderRadius: tab === 'js' ? 2 : 0 }} />
                   {config.label}
                 </button>
               );
            })}
          </div>
          
          {/* Very basic code pre for now, ideally Monaco could be loaded here but using a pre gets the point across safely without bundle bloat */}
          <div style={{ flex: 1, padding: 24, overflowY: 'auto' }}>
             <pre style={{
               fontFamily: '"JetBrains Mono", monospace', fontSize: 13, lineHeight: 1.6,
               color: '#D1D5DB', margin: 0, whiteSpace: 'pre-wrap'
             }}>
               {activeTab === 'html' && (template.lwc_html || '<!-- HTML Code Not Found -->')}
               {activeTab === 'js' && (template.lwc_js || '// JS Code Not Found')}
               {activeTab === 'css' && (template.lwc_css || '/* CSS Code Not Found */')}
             </pre>
          </div>
        </section>
      </main>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer style={{ height: 72, background: 'rgba(0,0,0,0.6)', borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 24px' }}>
        <p style={{ color: '#6B7280', fontSize: 13, margin: 0 }}>
          {template.description || 'No description provided.'}
        </p>
        
        <button
          onClick={() => setShowUseModal(true)}
          style={{
            background: '#F97316', color: '#fff', border: 'none', borderRadius: 8,
            padding: '10px 24px', fontSize: 14, fontWeight: 600, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 8, transition: 'background 0.15s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = '#EA580C'}
          onMouseLeave={(e) => e.currentTarget.style.background = '#F97316'}
        >
           <Plus size={16} /> Use This Template
        </button>
      </footer>

      {showUseModal && (
        <UseTemplateModal template={template} onClose={() => setShowUseModal(false)} />
      )}
    </div>
  );
}
