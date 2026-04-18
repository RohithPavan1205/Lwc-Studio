"use client"

import * as React from "react"
import { useState, useRef, useEffect, useCallback, Suspense } from "react"
import { motion, AnimatePresence } from "motion/react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import {
  Menu, X, ChevronDown, Loader2, Cloud, Search, Code2, Layers, Zap
} from "lucide-react"
import { useResponsiveColumns } from "@/hooks/useResponsiveColumns"

/* ═══════════════════════════════════════════════
   TYPES & CONSTANTS
═══════════════════════════════════════════════ */
interface Star { x: number; y: number; size: number; opacity: number; dur: number; delay: number }

const STARS: Star[] = Array.from({ length: 200 }, () => ({
  x: Math.random() * 100, y: Math.random() * 100,
  size: Math.random() * 2 + 0.4,
  opacity: Math.random() * 0.55 + 0.1,
  dur: Math.random() * 4 + 2,
  delay: -(Math.random() * 6),
}))

const NAV_LINKS = [
  { label: "Templates", href: "/templates" },
  { label: "Studio",    href: "/dashboard" },
  { label: "Docs",      href: "/docs" },
]

export interface Template {
  id: string;
  name: string;
  component_name: string;
  category: string;
  tags: string[];
  complexity: 'beginner' | 'intermediate' | 'advanced';
  has_animation: boolean;
  has_interaction: boolean;
  has_javascript: boolean;
  description: string | null;
  original_author: string | null;
  html_content: string | null;
  is_featured: boolean;
  view_count: number;
  use_count: number;
  created_at: string;
}

interface TemplatesResponse {
  templates: Template[];
  total: number;
  page: number;
  totalPages: number;
}

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'Buttons', label: 'Buttons' },
  { value: 'Cards', label: 'Cards' },
  { value: 'Checkboxes', label: 'Checkboxes' },
  { value: 'Forms', label: 'Forms' },
  { value: 'Inputs', label: 'Inputs' },
  { value: 'Loaders', label: 'Loaders' },
  { value: 'RadioButtons', label: 'Radio Buttons' },
  { value: 'ToggleSwitches', label: 'Toggle Switches' },
  { value: 'Tooltips', label: 'Tooltips' },
];

const COMPLEXITY_OPTIONS = [
  { value: 'all', label: 'All Complexity' },
  { value: 'beginner', label: 'Beginner' },
  { value: 'intermediate', label: 'Intermediate' },
  { value: 'advanced', label: 'Advanced' },
];

/* ═══════════════════════════════════════════════
   LAZY IFRAME & CARD
═══════════════════════════════════════════════ */
function ComplexityBadge({ level }: { level: string }) {
  const colors: Record<string, { bg: string; text: string; label: string }> = {
    beginner:     { bg: 'rgba(16,185,129,0.1)',  text: '#10B981', label: 'Beginner' },
    intermediate: { bg: 'rgba(245,158,11,0.1)',  text: '#F59E0B', label: 'Intermediate' },
    advanced:     { bg: 'rgba(239,68,68,0.1)',   text: '#EF4444', label: 'Advanced' },
  };
  const c = colors[level] ?? colors.beginner;
  return (
    <span style={{
      padding: '2px 8px', borderRadius: 999, fontSize: 10, fontWeight: 600,
      letterSpacing: '0.04em', background: c.bg, color: c.text, textTransform: 'uppercase'
    }}>
      {c.label}
    </span>
  );
}

function SkeletonCard() {
  return (
    <div style={{
      background: '#0F1623', border: '1px solid rgba(27,79,216,0.10)',
      borderRadius: 14, overflow: 'hidden', animation: 'skeleton-pulse 1.5s ease-in-out infinite',
    }}>
      <div style={{ height: 200, background: 'rgba(59,130,246,0.04)' }} />
      <div style={{ padding: '16px 18px' }}>
        <div style={{ height: 14, background: 'rgba(59,130,246,0.07)', borderRadius: 6, marginBottom: 8, width: '60%' }} />
        <div style={{ height: 10, background: 'rgba(59,130,246,0.05)', borderRadius: 6, width: '40%' }} />
      </div>
    </div>
  );
}

function LazyIframe({ srcDoc, title, scale = 0.85 }: { srcDoc: string; title: string; scale?: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVisible(true); observer.disconnect(); } },
      { rootMargin: '200px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} style={{ width: '100%', height: '100%', position: 'relative' }}>
      {visible ? (
        <iframe
          title={title} srcDoc={srcDoc} sandbox="allow-scripts allow-same-origin" scrolling="no"
          style={{ width: `${100 / scale}%`, height: `${100 / scale}%`, border: 'none', display: 'block', transform: `scale(${scale})`, transformOrigin: 'top left' }}
        />
      ) : (
        <div style={{ width: '100%', height: '100%', background: 'rgba(59,130,246,0.03)' }} />
      )}
    </div>
  );
}

function TemplateCard({ template }: { template: Template }) {
  const router = useRouter();
  const contentLength = (template.html_content || '').length;
  const isTall = contentLength > 500;
  const previewHeight = isTall ? 400 : 220;

  return (
    <div className="break-inside-avoid mb-6">
      <div
        onClick={() => router.push(`/templates/${template.id}`)}
        className="group relative component-card flex flex-col"
        style={{
          top: 0,
          background: '#0F1623', border: '1px solid rgba(27,79,216,0.15)',
          borderRadius: 16, overflow: 'hidden', cursor: 'pointer', transition: 'all 0.3s ease',
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = 'rgba(245,158,11,0.4)';
          e.currentTarget.style.top = '-4px';
          e.currentTarget.style.boxShadow = '0 12px 40px rgba(0,0,0,0.8), 0 0 20px rgba(245,158,11,0.1)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = 'rgba(27,79,216,0.15)';
          e.currentTarget.style.top = '0px';
          e.currentTarget.style.boxShadow = 'none';
        }}
      >
        <div style={{ height: previewHeight, background: 'radial-gradient(ellipse at top, rgba(27,79,216,0.12) 0%, rgba(10,14,26,0.95) 80%)', position: 'relative', overflow: 'hidden' }}>
        {template.html_content ? (
          <LazyIframe scale={isTall ? 0.70 : 0.85} srcDoc={`<style>body{display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:transparent;overflow:hidden;cursor:pointer;padding:32px;box-sizing:border-box;}</style>${template.html_content}<script>document.body.addEventListener('click', function(e) { if(e.target === document.body || e.target === document.documentElement) window.parent.postMessage({type:'card_click', id:'${template.id}'}, '*'); });</script>`} title={template.name} />
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'rgba(138,155,190,0.25)', fontSize: 13, flexDirection: 'column', gap: 8 }}>
            <Layers size={24} style={{ opacity: 0.4 }} />
            <span style={{ fontSize: 12 }}>No Preview Available</span>
          </div>
        )}

        {template.is_featured && (
          <div style={{
            position: 'absolute', top: 12, right: 12, background: 'rgba(245,158,11,0.9)', backdropFilter: 'blur(8px)',
            borderRadius: 6, padding: '4px 10px', fontSize: 10, fontWeight: 700, color: '#fff',
            letterSpacing: '0.06em', textTransform: 'uppercase', border: '1px solid rgba(245,158,11,0.5)',
            boxShadow: '0 4px 15px rgba(245,158,11,0.3)',
          }}>
            ★ Featured
          </div>
        )}

        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity duration-300 z-10 pointer-events-none">
          <button
            className="pointer-events-auto flex items-center justify-center gap-2 bg-gradient-to-r from-[#1B4FD8] to-[#103A9E] text-white text-sm font-medium px-4 py-2 rounded-full shadow-[0_4px_20px_rgba(27,79,216,0.5)] transform translate-y-2 group-hover:translate-y-0 transition-all duration-300 hover:brightness-110 hover:scale-105"
            onClick={(e) => { e.stopPropagation(); router.push(`/templates/${template.id}`); }}
          >
            <Code2 size={14} /> Get Code
          </button>
        </div>
      </div>

      <div style={{ padding: '16px 20px', background: '#0F1623' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ color: '#F3F3F3', fontSize: 16, fontWeight: 600, letterSpacing: '-0.01em', lineHeight: 1.3 }}>{template.name}</span>
          <ComplexityBadge level={template.complexity} />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <span style={{ color: '#F3F3F3', fontSize: 11, fontWeight: 500, background: 'rgba(245,158,11,0.15)', padding: '3px 10px', borderRadius: 999, border: '1px solid rgba(245,158,11,0.25)' }}>
            {template.category}
          </span>
          {template.has_animation && <span style={{ color: '#8A9BBE', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}><Zap size={12} className="text-[#3B82F6]" /> Animated</span>}
          {template.has_javascript && <span style={{ color: '#8A9BBE', fontSize: 11, display: 'flex', alignItems: 'center', gap: 4 }}><Code2 size={12} className="text-[#F59E0B]" /> JS</span>}
        </div>
      </div>
    </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════
   NAVBAR & WRAPPER
═══════════════════════════════════════════════ */
function Navbar({ hasSession, isLoading, onConnect }: { hasSession: boolean | null; isLoading: boolean; onConnect: () => void; }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, display: "flex", justifyContent: "center", padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 20px", background: "rgba(15,20,35,0.85)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: 999, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", width: "100%", maxWidth: 860, position: "relative" }}>
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", flexShrink: 0 }}>
          <img src="/logo-studio.png" alt="LWC Studio" style={{ height: 40, width: "auto", objectFit: "contain", transform: "scale(2.2)", transformOrigin: "left center" }} />
        </Link>
        <nav className="hidden md:flex" style={{ alignItems: "center", gap: 28 }}>
          {NAV_LINKS.map((item, i) => (
            <motion.div key={item.label} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: i * 0.06 }}>
              <Link href={item.href} style={{ fontSize: 14, color: "rgba(255,255,255,0.7)", textDecoration: "none", fontWeight: 500, transition: "color 0.2s" }}
                onMouseEnter={e => (e.currentTarget.style.color = "#f59e0b")}
                onMouseLeave={e => (e.currentTarget.style.color = "rgba(255,255,255,0.7)")}>
                {item.label}
              </Link>
            </motion.div>
          ))}
        </nav>
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.25 }} className="hidden sm:block">
          {hasSession ? (
            <Link href="/dashboard" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "9px 22px", fontSize: 14, fontWeight: 600, color: "#fff", background: "#2563eb", borderRadius: 999, textDecoration: "none", boxShadow: "0 0 20px rgba(37,99,235,0.4)", transition: "filter 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.15)")}
              onMouseLeave={e => (e.currentTarget.style.filter = "brightness(1)")}>
              Dashboard →
            </Link>
          ) : (
            <button onClick={onConnect} disabled={isLoading} style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 22px", fontSize: 14, fontWeight: 600, color: "#fff", background: "#2563eb", borderRadius: 999, border: "none", cursor: "pointer", boxShadow: "0 0 20px rgba(37,99,235,0.4)", opacity: isLoading ? 0.65 : 1, transition: "filter 0.2s" }}
              onMouseEnter={e => !isLoading && ((e.currentTarget as HTMLButtonElement).style.filter = "brightness(1.15)")}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.filter = "brightness(1)")}>
              {isLoading ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Connecting…</> : <><Cloud size={14} /> Connect Org</>}
            </button>
          )}
        </motion.div>
        <button className="md:hidden" style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", padding: 4 }} onClick={() => setIsOpen(!isOpen)}>
          <Menu size={22} />
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div initial={{ opacity: 0, x: "100%" }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: "100%" }} transition={{ type: "spring", damping: 25, stiffness: 300 }}
            style={{ position: "fixed", inset: 0, background: "#07090f", zIndex: 300, paddingTop: 96, paddingLeft: 32, paddingRight: 32 }}>
            <motion.button style={{ position: "absolute", top: 24, right: 24, background: "none", border: "none", cursor: "pointer", color: "#fff" }} onClick={() => setIsOpen(false)} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
              <X size={24} />
            </motion.button>
            <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
              {NAV_LINKS.map((item, i) => (
                <motion.div key={item.label} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.08 + 0.1 }} exit={{ opacity: 0, x: 20 }}>
                  <Link href={item.href} onClick={() => setIsOpen(false)} style={{ fontSize: 20, fontWeight: 600, color: "#fff", textDecoration: "none" }}>{item.label}</Link>
                </motion.div>
              ))}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} exit={{ opacity: 0, y: 20 }} style={{ marginTop: 16 }}>
                {hasSession ? (
                  <Link href="/dashboard" style={{ display: "block", textAlign: "center", padding: "14px", fontSize: 16, fontWeight: 600, color: "#fff", background: "#2563eb", borderRadius: 999, textDecoration: "none" }}>Go to Dashboard</Link>
                ) : (
                  <button onClick={() => { onConnect(); setIsOpen(false); }} disabled={isLoading} style={{ width: "100%", textAlign: "center", padding: "14px", fontSize: 16, fontWeight: 600, color: "#fff", background: "#2563eb", borderRadius: 999, border: "none", cursor: "pointer" }}>{isLoading ? "Connecting…" : "Connect Salesforce Org"}</button>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function GlobalStyles() {
  useEffect(() => {
    const id = "lwcs-global-templates"
    if (document.getElementById(id)) return
    const el = document.createElement("style")
    el.id = id
    el.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
      html { background-color: #07090f; }
      @keyframes twinkle {
        0%,100% { opacity: var(--op); transform: scale(1); }
        50% { opacity: calc(var(--op)*0.15); transform: scale(0.65); }
      }
      @keyframes skeleton-pulse {
        0%, 100% { opacity: 1; }
        50% { opacity: 0.5; }
      }
      input::placeholder { color: rgba(255,255,255,0.4); }
    `
    document.head.appendChild(el)
  }, [])
  return null
}

function CustomSelect({ value, onChange, options, minWidth = 140 }: { value: string, onChange: (v: string) => void, options: {value: string, label: string}[], minWidth?: number }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  const selectedEntry = options.find(o => o.value === value) || options[0];

  return (
    <div ref={ref} style={{ position: "relative", minWidth }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
          background: "#0c101c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "12px 16px",
          color: "rgba(255,255,255,0.85)", fontSize: 13, fontWeight: 500, cursor: "pointer", outline: "none",
        }}
      >
        <span style={{ whiteSpace: "nowrap" }}>{selectedEntry.label}</span>
        <ChevronDown size={14} style={{ color: "rgba(255,255,255,0.4)" }} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }} transition={{ duration: 0.15 }}
            style={{ position: "absolute", top: "100%", left: 0, marginTop: 4, background: "#111827", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, zIndex: 50, padding: 4, minWidth: "100%", whiteSpace: "nowrap", boxShadow: "0 10px 30px rgba(0,0,0,0.5)" }}
          >
            {options.map(o => (
              <button
                key={o.value} onClick={() => { onChange(o.value); setOpen(false); }}
                style={{ width: "100%", textAlign: "left", padding: "8px 12px", background: o.value === value ? "rgba(37,99,235,0.15)" : "transparent", color: o.value === value ? "#3b82f6" : "rgba(255,255,255,0.7)", border: "none", borderRadius: 4, fontSize: 13, cursor: "pointer", transition: "background 0.2s" }}
                onMouseEnter={e => { if (o.value !== value) e.currentTarget.style.background = "rgba(255,255,255,0.05)"; }}
                onMouseLeave={e => { if (o.value !== value) e.currentTarget.style.background = "transparent"; }}
              >
                {o.label}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function MixTemplatesLayout({ templates }: { templates: Template[] }) {
  const byCat: Record<string, Template[]> = {};
  for (const t of templates) {
    if (!byCat[t.category]) byCat[t.category] = [];
    byCat[t.category].push(t);
  }
  
  const interleaved: Template[] = [];
  const keys = Object.keys(byCat);
  let added = true;
  while (added) {
    added = false;
    for (const key of keys) {
      if (byCat[key].length > 0) {
        interleaved.push(byCat[key].shift()!);
        added = true;
      }
    }
  }
  const cols = useResponsiveColumns();

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: '24px', alignItems: 'start', width: '100%' }}>
      {Array.from({ length: cols }).map((_, colIndex) => {
        const colItems = interleaved.filter((_, i) => i % cols === colIndex);
        return (
          <div key={colIndex} className="flex flex-col gap-6 w-full min-w-0">
            {colItems.map((t, i) => <TemplateCard key={`${t.id}-${i}`} template={t} />)}
          </div>
        );
      })}
    </div>
  );
}

function TemplatesContent() {
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedComplexity, setSelectedComplexity] = useState("all");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const cols = useResponsiveColumns();
  
  const [isConnecting, setIsConnecting] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);

  const router = useRouter();

  useEffect(() => {
    import("@supabase/ssr").then(({ createBrowserClient }) => {
      const sb = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
      sb.auth.getUser().then(({ data }) => setHasSession(!!data.user));
    });

    const handleMessage = (e: MessageEvent) => {
      if (e.data?.type === 'card_click' && e.data?.id) {
        router.push(`/templates/${e.data.id}`);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [router]);

  const handleSalesforceConnect = async () => {
    try {
      setIsConnecting(true);
      setError(null);
      const response = await fetch("/api/auth/salesforce/initiate", {
        method: "POST", headers: { "Content-Type": "application/json" }, cache: "no-store",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Failed to initiate Salesforce login");
      }
      const { authUrl } = await response.json();
      window.location.href = authUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred connecting to Salesforce");
      setIsConnecting(false);
    }
  };

  const fetchTemplates = useCallback(async (targetPage: number) => {
    setLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set("limit", "24");
    params.set("page", String(targetPage));
    if (selectedCategory !== "all") params.set("category", selectedCategory);
    if (selectedComplexity !== "all") params.set("complexity", selectedComplexity);
    if (search) params.set("search", search);

    try {
      const res = await fetch(`/api/templates?${params}`);
      if (!res.ok) throw new Error("Failed to load templates");
      const data: TemplatesResponse = await res.json();
      setTemplates(data.templates);
      setTotalPages(data.totalPages);
      setPage(data.page);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [selectedCategory, selectedComplexity, search]);

  useEffect(() => { fetchTemplates(1); }, [fetchTemplates, selectedCategory, selectedComplexity, search]);
  
  const handlePageChange = (newPage: number) => {
    if (newPage > 0 && newPage <= totalPages) {
      setPage(newPage);
      fetchTemplates(newPage);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchInput), 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  return (
    <div style={{ minHeight: "100vh", background: "#07090f", display: "flex", flexDirection: "column", fontFamily: "'Inter', sans-serif" }}>
      <GlobalStyles />
      <Navbar hasSession={hasSession} isLoading={isConnecting} onConnect={handleSalesforceConnect} />

      {/* Hero Section */}
      <section style={{ position: "relative", display: "flex", flexDirection: "column", alignItems: "center", paddingTop: 140, paddingBottom: 64, overflow: "hidden" }}>
        <div style={{ position: "absolute", inset: 0, zIndex: 0, background: `radial-gradient(ellipse 80% 60% at 50% 28%, rgba(30,50,120,0.5) 0%, transparent 70%), radial-gradient(ellipse 55% 40% at 85% 55%, rgba(80,30,120,0.3) 0%, transparent 60%), radial-gradient(ellipse 45% 30% at 15% 70%, rgba(20,40,110,0.2) 0%, transparent 60%)` }} />
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          {STARS.map((s, i) => (
            <div key={i} style={{ position: "absolute", borderRadius: "50%", background: "white", width: s.size, height: s.size, left: `${s.x}%`, top: `${s.y}%`, ["--op" as string]: s.opacity, opacity: s.opacity, animation: `twinkle ${s.dur.toFixed(1)}s ease-in-out infinite ${s.delay.toFixed(1)}s` }} />
          ))}
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", maxWidth: 960, width: "100%", padding: "0 24px" }}>
          <h1 style={{ fontSize: "clamp(36px, 5vw, 56px)", fontWeight: 800, color: "#fff", letterSpacing: "-1.5px", marginBottom: 20 }}>
            Templates Library
          </h1>
          <p style={{ fontSize: "clamp(15px, 2vw, 17px)", lineHeight: 1.8, color: "rgba(255,255,255,0.65)", maxWidth: 740, marginBottom: 48 }}>
            Discover production-ready Lightning Web Components designed for real Salesforce projects. Browse beautiful, reusable, and deployable templates built to save development time and improve UI quality across your Salesforce applications.
          </p>

          {/* Search & Filters Action Bar */}
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", width: "100%", justifyContent: "center" }}>
            <div style={{ position: "relative", flex: "1 1 320px", maxWidth: 600 }}>
              <Search size={16} style={{ position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)" }} />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search templates by name, category, or use case..."
                style={{ width: "100%", background: "#0c101c", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, padding: "12px 16px 12px 42px", color: "#fff", fontSize: 13, outline: "none", boxShadow: "inset 0 2px 4px rgba(0,0,0,0.2)" }}
              />
              {searchInput && (
                <button onClick={() => setSearchInput("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "rgba(255,255,255,0.4)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}><X size={14} /></button>
              )}
            </div>
            
            <CustomSelect value={selectedCategory} onChange={setSelectedCategory} options={CATEGORIES} minWidth={160} />
            <CustomSelect value={selectedComplexity} onChange={setSelectedComplexity} options={COMPLEXITY_OPTIONS} minWidth={150} />

            <button
              onClick={() => { setSearchInput(""); setSelectedCategory("all"); setSelectedComplexity("all"); }}
              style={{ background: "#0c101c", border: "1px solid rgba(255,255,255,0.1)", padding: "12px 20px", borderRadius: 8, color: "rgba(255,255,255,0.6)", fontSize: 13, fontWeight: 500, cursor: "pointer", transition: "all 0.2s" }}
              onMouseEnter={(e) => { e.currentTarget.style.color = "#fff"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.2)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = "rgba(255,255,255,0.6)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.1)"; }}
            >
              Reset Filters
            </button>
          </div>
        </motion.div>
      </section>

      {/* Main Grid Content */}
      <main style={{ flex: 1, padding: "20px 24px 80px", maxWidth: 1400, margin: "0 auto", width: "100%" }}>
        {error && (
          <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 12, padding: "16px 20px", color: "#fca5a5", marginBottom: 24, display: "flex", alignItems: "center", gap: 12 }}>
            <X size={16} /> {error}
            <button onClick={() => fetchTemplates(page)} style={{ marginLeft: "auto", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, color: "#fca5a5", padding: "4px 12px", cursor: "pointer", fontSize: 12 }}>Retry</button>
          </div>
        )}

        {loading ? (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: '24px', alignItems: 'start', width: '100%' }}>
             {Array.from({ length: cols }).map((_, cIdx) => (
                <div key={cIdx} className="flex flex-col gap-6 w-full min-w-0">
                  {Array.from({ length: 3 }).map((_, i) => <SkeletonCard key={i} />)}
                </div>
             ))}
          </div>
        ) : selectedCategory === 'all' ? (
          <MixTemplatesLayout templates={templates} />
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gap: '24px', alignItems: 'start', width: '100%' }}>
            {Array.from({ length: cols }).map((_, colIndex) => {
              const colItems = templates.filter((_, i) => i % cols === colIndex);
              return (
                <div key={colIndex} className="flex flex-col gap-6 w-full min-w-0">
                  {colItems.map((t) => <TemplateCard key={t.id} template={t} />)}
                </div>
              );
            })}
          </div>
        )}

        {!loading && templates.length === 0 && !error && (
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "80px 20px", textAlign: "center" }}>
            <div style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", padding: 24, borderRadius: "50%", marginBottom: 16 }}>
              <Search size={32} style={{ color: "rgba(255,255,255,0.3)" }} />
            </div>
            <h3 style={{ fontSize: 18, fontWeight: 600, color: "#fff", marginBottom: 6 }}>No templates found</h3>
            <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14, marginBottom: 24 }}>Try adjusting your filters or search terms.</p>
            <button onClick={() => { setSearchInput(""); setSelectedCategory("all"); setSelectedComplexity("all"); }} style={{ background: "#2563eb", color: "#fff", padding: "10px 24px", borderRadius: 8, fontSize: 14, fontWeight: 500, border: "none", cursor: "pointer" }}>Clear all filters</button>
          </div>
        )}

        {/* Pagination */}
        {!loading && totalPages > 1 && (
          <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 16, marginTop: 64 }}>
            <button
              onClick={() => handlePageChange(Math.max(1, page - 1))} disabled={page <= 1}
              style={{ background: page <= 1 ? "transparent" : "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", padding: "10px 20px", borderRadius: 8, color: page <= 1 ? "rgba(255,255,255,0.3)" : "#fff", cursor: page <= 1 ? "default" : "pointer", fontSize: 13, fontWeight: 500 }}
            >
              ← Previous
            </button>
            <span style={{ fontSize: 13, color: "rgba(255,255,255,0.5)" }}>Page <strong style={{ color: "#fff" }}>{page}</strong> of {totalPages}</span>
            <button
              onClick={() => handlePageChange(Math.min(totalPages, page + 1))} disabled={page >= totalPages}
              style={{ background: page >= totalPages ? "transparent" : "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", padding: "10px 20px", borderRadius: 8, color: page >= totalPages ? "rgba(255,255,255,0.3)" : "#fff", cursor: page >= totalPages ? "default" : "pointer", fontSize: 13, fontWeight: 500 }}
            >
              Next →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default function TemplatesPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: "100vh", background: "#07090f" }} />}>
      <TemplatesContent />
    </Suspense>
  )
}
