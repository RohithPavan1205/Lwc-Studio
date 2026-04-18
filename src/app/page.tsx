/* eslint-disable @next/next/no-img-element */
"use client"

import * as React from "react"
import { useState, useRef, useEffect, Suspense } from "react"
import { motion, AnimatePresence, useMotionValue, useTransform } from "motion/react"
import { Menu, X, ChevronDown, Loader2, Cloud } from "lucide-react"
import Link from "next/link"
import { useSearchParams } from "next/navigation"

/* ═══════════════════════════════════════════════
   TYPES
═══════════════════════════════════════════════ */
interface Star { x: number; y: number; size: number; opacity: number; dur: number; delay: number }

/* ═══════════════════════════════════════════════
   CONSTANTS
═══════════════════════════════════════════════ */
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

const FEATURES = [
  { icon: "🎨", title: "Beautiful UI Templates", desc: "Access professionally designed LWC templates — cards, forms, dashboards, tables, modals and more. Not just functional, but visually impressive.", span: "col" },
  { icon: "⚡", title: "Instant Live Preview", desc: "Preview components instantly before deployment using a fast local rendering engine and optional Salesforce org validation.", span: "row" },
  { icon: "🔗", title: "One-Click Deployment", desc: "Deploy directly to your connected Salesforce org using secure OAuth and Metadata API — no manual packaging needed.", span: "row" },
  { icon: "🧠", title: "AI-Powered Assistance", desc: "Generate, improve, and fix Lightning Web Components with intelligent AI built specifically for Salesforce workflows.", span: "col" },
]

const STEPS = [
  { n: "01", title: "Browse Templates", desc: "Discover beautiful LWC components designed for real-world Salesforce use cases." },
  { n: "02", title: "Preview Instantly", desc: "See how the component looks and behaves before touching your Salesforce org." },
  { n: "03", title: "Customize in Studio", desc: "Edit HTML, CSS, JS, and meta.xml files directly inside the browser IDE." },
  { n: "04", title: "Deploy to Org", desc: "Push directly to Salesforce and preview inside your real Lightning App Page." },
]

const SF_FEATURES = [
  "Secure Salesforce OAuth with PKCE", "Encrypted token storage",
  "Metadata API deployment engine", "Org import wizard",
  "Deployment error tracking", "FlexiPage preview generation",
  "Multi-file LWC editing", "Component lifecycle management",
]

const LOGOS = [
  "Salesforce", "LWC", "Apex", "SLDS", "Flow", "Agentforce", "Metadata API", "Experience Cloud",
]

const TESTIMONIALS_COL1 = [
  { name: "Arjun Mehta", role: "Salesforce Developer @ Infosys", text: "LWC Studio completely changed how I build components. The templates alone save me 4–5 hours per project." },
  { name: "Priya Sharma", role: "Freelance SF Consultant", text: "I deliver polished client UIs in half the time. My clients always ask what tool I'm using." },
  { name: "Karan Bhatia", role: "SF Dev @ Deloitte", text: "The one-click deploy is a game changer. No more packaging headaches or CLI setup on client machines." },
]

const TESTIMONIALS_COL2 = [
  { name: "Neha Gupta", role: "Student @ Manipal", text: "As a student learning LWC, having real templates to study and deploy to a real org is invaluable." },
  { name: "Ravi Teja", role: "Sr. Developer @ Accenture", text: "The AI assistance actually understands Salesforce context. It's not just generic code generation." },
  { name: "Sana Khan", role: "Trailblazer Community MVP", text: "Beautiful, fast, and actually useful. LWC Studio is what Salesforce developers have been missing." },
]

const FAQS = [
  { q: "What is LWC Studio?", a: "LWC Studio is a browser-based IDE for Salesforce developers that lets you create, preview, and deploy Lightning Web Components directly from your browser — no local setup required." },
  { q: "Do I need a Salesforce org to use it?", a: "No. You can browse templates and use the studio preview without connecting an org. You only need an org when deploying components." },
  { q: "How does deployment work?", a: "LWC Studio uses Salesforce's Metadata API with OAuth 2.0 PKCE authentication. Your credentials are never stored — we use secure session-based token references." },
  { q: "Is AI assistance included in the free plan?", a: "Basic AI suggestions are available on the Free plan. Full AI-powered generation, fix suggestions, and component improvement are part of the Pro plan." },
  { q: "Can I use my own templates?", a: "Yes. Pro users can import, save, and share custom templates within the studio. Team plans support org-wide shared template libraries." },
  { q: "Is this officially affiliated with Salesforce?", a: "LWC Studio is an independent developer tool built for the Salesforce ecosystem. We are not affiliated with or endorsed by Salesforce.com, Inc." },
]

const AUDIENCES = [
  { icon: "👨‍💻", role: "Salesforce Developers", desc: "Ship better UI faster without rebuilding everything from scratch." },
  { icon: "💼", role: "Freelancers & Consultants", desc: "Deliver premium client experiences with polished Lightning components." },
  { icon: "🎓", role: "Students & Learners", desc: "Learn LWC through real templates and real deployment workflows." },
  { icon: "🏢", role: "Teams & Agencies", desc: "Standardize reusable components across projects and improve delivery speed." },
]

const CODE_LINES: { num: number; content: React.ReactNode }[] = [
  { num: 1, content: <><Punct c="<" /><Tag c="template" /><Punct c=">" /></> },
  { num: 2, content: <>&nbsp;&nbsp;<Punct c="<" /><Tag c="lightning-card" /></> },
  { num: 3, content: <>&nbsp;&nbsp;&nbsp;&nbsp;<Attr c="title" /><Punct c='=' /><Str c='"Account Info"' /></> },
  { num: 4, content: <>&nbsp;&nbsp;&nbsp;&nbsp;<Attr c="icon-name" /><Punct c='=' /><Str c='"standard:account"' /></> },
  { num: 5, content: <>&nbsp;&nbsp;<Punct c=">" /></> },
  { num: 6, content: <>&nbsp;&nbsp;&nbsp;&nbsp;<Punct c="<" /><Tag c="div" /> <Attr c="class" /><Punct c='=' /><Str c='"slds-p-around_medium"' /><Punct c=">" /></> },
  { num: 7, content: <>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<Punct c="<" /><Tag c="p" /><Punct c=">" /><Expr c="{account.Name}" /><Punct c="</" /><Tag c="p" /><Punct c=">" /></> },
  { num: 8, content: <>&nbsp;&nbsp;&nbsp;&nbsp;<Punct c=">" /></> },
]

/* ═══════════════════════════════════════════════
   SYNTAX TOKENS
═══════════════════════════════════════════════ */
function Tag({ c }: { c: string }) { return <span style={{ color: "#f97316" }}>{c}</span> }
function Attr({ c }: { c: string }) { return <span style={{ color: "#fbbf24" }}>{c}</span> }
function Str({ c }: { c: string }) { return <span style={{ color: "#86efac" }}>{c}</span> }
function Expr({ c }: { c: string }) { return <span style={{ color: "#93c5fd" }}>{c}</span> }
function Punct({ c }: { c: string }) { return <span style={{ color: "rgba(255,255,255,0.45)" }}>{c}</span> }

/* ═══════════════════════════════════════════════
   NAVBAR — uses real logo + real auth + real routes
═══════════════════════════════════════════════ */
function Navbar({ hasSession, isLoading, onConnect }: {
  hasSession: boolean | null;
  isLoading: boolean;
  onConnect: () => void;
}) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 200, display: "flex", justifyContent: "center", padding: "16px 20px" }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 20px", background: "rgba(15,20,35,0.85)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)", borderRadius: 999, boxShadow: "0 8px 32px rgba(0,0,0,0.5)", width: "100%", maxWidth: 860, position: "relative" }}>
        {/* Logo — real image */}
        <Link href="/" style={{ display: "flex", alignItems: "center", gap: 8, textDecoration: "none", flexShrink: 0 }}>
          <img src="/logo-studio.png" alt="LWC Studio" style={{ height: 40, width: "auto", objectFit: "contain", transform: "scale(2.2)", transformOrigin: "left center" }} />
        </Link>

        {/* Desktop links */}
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

        {/* CTA — real auth */}
        <motion.div initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: 0.25 }}
          className="hidden sm:block">
          {hasSession ? (
            <Link href="/dashboard"
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", padding: "9px 22px", fontSize: 14, fontWeight: 600, color: "#fff", background: "#2563eb", borderRadius: 999, textDecoration: "none", boxShadow: "0 0 20px rgba(37,99,235,0.4)", transition: "filter 0.2s" }}
              onMouseEnter={e => (e.currentTarget.style.filter = "brightness(1.15)")}
              onMouseLeave={e => (e.currentTarget.style.filter = "brightness(1)")}>
              Dashboard →
            </Link>
          ) : (
            <button onClick={onConnect} disabled={isLoading}
              style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "9px 22px", fontSize: 14, fontWeight: 600, color: "#fff", background: "#2563eb", borderRadius: 999, border: "none", cursor: "pointer", boxShadow: "0 0 20px rgba(37,99,235,0.4)", opacity: isLoading ? 0.65 : 1, transition: "filter 0.2s" }}
              onMouseEnter={e => !isLoading && ((e.currentTarget as HTMLButtonElement).style.filter = "brightness(1.15)")}
              onMouseLeave={e => ((e.currentTarget as HTMLButtonElement).style.filter = "brightness(1)")}>
              {isLoading ? <><Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} /> Connecting…</> : <><Cloud size={14} /> Connect Org</>}
            </button>
          )}
        </motion.div>

        {/* Mobile toggle */}
        <button className="md:hidden" style={{ background: "none", border: "none", cursor: "pointer", color: "#fff", padding: 4 }} onClick={() => setIsOpen(!isOpen)}>
          <Menu size={22} />
        </button>
      </div>

      {/* Mobile overlay */}
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
                  <Link href={item.href} onClick={() => setIsOpen(false)} style={{ fontSize: 20, fontWeight: 600, color: "#fff", textDecoration: "none" }}>
                    {item.label}
                  </Link>
                </motion.div>
              ))}
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} exit={{ opacity: 0, y: 20 }} style={{ marginTop: 16 }}>
                {hasSession ? (
                  <Link href="/dashboard" style={{ display: "block", textAlign: "center", padding: "14px", fontSize: 16, fontWeight: 600, color: "#fff", background: "#2563eb", borderRadius: 999, textDecoration: "none" }}>
                    Go to Dashboard
                  </Link>
                ) : (
                  <button onClick={() => { onConnect(); setIsOpen(false); }} disabled={isLoading} style={{ width: "100%", textAlign: "center", padding: "14px", fontSize: 16, fontWeight: 600, color: "#fff", background: "#2563eb", borderRadius: 999, border: "none", cursor: "pointer" }}>
                    {isLoading ? "Connecting…" : "Connect Salesforce Org"}
                  </button>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   EVERVAULT CARD (hover encrypted text effect)
═══════════════════════════════════════════════ */
const CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$%&"

function EvervaultCard({ title, icon, desc }: { title: string; icon: string; desc: string }) {
  const [hovered, setHovered] = useState(false)
  const [encrypted, setEncrypted] = useState(title)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const mouseX = useMotionValue(0)
  const mouseY = useMotionValue(0)

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    mouseX.set(e.clientX - rect.left)
    mouseY.set(e.clientY - rect.top)
  }

  useEffect(() => {
    if (hovered) {
      let iter = 0
      intervalRef.current = setInterval(() => {
        setEncrypted(title.split("").map((ch, i) => {
          if (ch === " ") return " "
          if (i < iter) return title[i]
          return CHARS[Math.floor(Math.random() * CHARS.length)]
        }).join(""))
        if (iter >= title.length) clearInterval(intervalRef.current!)
        iter += 0.5
      }, 30)
    } else {
      clearInterval(intervalRef.current!)
      setEncrypted(title)
    }
    return () => clearInterval(intervalRef.current!)
  }, [hovered, title])

  const bgX = useTransform(mouseX, [0, 300], ["0%", "100%"])
  const bgY = useTransform(mouseY, [0, 300], ["0%", "100%"])

  return (
    <motion.div
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onMouseMove={handleMouseMove}
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      style={{
        position: "relative", borderRadius: 16, padding: "32px 28px",
        border: "1px solid rgba(255,255,255,0.1)",
        background: "rgba(255,255,255,0.03)",
        overflow: "hidden", cursor: "default",
      }}
    >
      <motion.div style={{
        position: "absolute", inset: 0, opacity: hovered ? 1 : 0,
        background: "radial-gradient(circle 200px at var(--mx) var(--my), rgba(37,99,235,0.18), transparent 80%)",
        transition: "opacity 0.3s",
        ["--mx" as string]: bgX,
        ["--my" as string]: bgY,
        pointerEvents: "none",
      }} />
      {[[-6, -6], [-6, "auto"], ["auto", -6], ["auto", "auto"]].map(([t, b], i) => (
        <div key={i} style={{ position: "absolute", top: t === "auto" ? undefined : t as number, bottom: b === "auto" ? undefined : b as number, left: i < 2 ? -6 : undefined, right: i >= 2 ? -6 : undefined, width: 12, height: 12, border: "1.5px solid rgba(255,255,255,0.25)", borderRadius: 2 }} />
      ))}
      <div style={{ fontSize: 32, marginBottom: 20 }}>{icon}</div>
      <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 12, color: hovered ? "#93c5fd" : "#fff", fontFamily: hovered ? "'JetBrains Mono','Courier New',monospace" : "inherit", transition: "color 0.2s, font-family 0.1s", letterSpacing: hovered ? "0.02em" : "normal" }}>
        {hovered ? encrypted : title}
      </h3>
      <p style={{ fontSize: 14, lineHeight: 1.65, color: "rgba(255,255,255,0.6)" }}>{desc}</p>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════
   LOGO CLOUD (infinite scroll marquee)
═══════════════════════════════════════════════ */
function LogoCloud() {
  const items = [...LOGOS, ...LOGOS]
  return (
    <div style={{ overflow: "hidden", position: "relative", padding: "8px 0" }}>
      <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: 120, background: "linear-gradient(90deg, #07090f, transparent)", zIndex: 2, pointerEvents: "none" }} />
      <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 120, background: "linear-gradient(-90deg, #07090f, transparent)", zIndex: 2, pointerEvents: "none" }} />
      <motion.div
        animate={{ x: ["0%", "-50%"] }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        style={{ display: "flex", gap: 0, width: "max-content" }}
      >
        {items.map((logo, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, padding: "12px 32px", borderRight: "1px solid rgba(255,255,255,0.08)", whiteSpace: "nowrap" }}>
            <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#2563eb", display: "inline-block", flexShrink: 0 }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "rgba(255,255,255,0.45)", letterSpacing: "0.04em" }}>{logo}</span>
          </div>
        ))}
      </motion.div>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   TESTIMONIAL CARD
═══════════════════════════════════════════════ */
function TestimonialCard({ name, role, text, delay }: { name: string; role: string; text: string; delay: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5, delay }}
      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "24px", marginBottom: 16 }}
    >
      <div style={{ display: "flex", gap: 2, marginBottom: 12 }}>
        {Array.from({ length: 5 }).map((_, i) => <span key={i} style={{ color: "#f59e0b", fontSize: 13 }}>★</span>)}
      </div>
      <p style={{ fontSize: 14, lineHeight: 1.7, color: "rgba(255,255,255,0.65)", marginBottom: 16 }}>&ldquo;{text}&rdquo;</p>
      <div>
        <div style={{ fontSize: 14, fontWeight: 600, color: "#fff" }}>{name}</div>
        <div style={{ fontSize: 12, color: "rgba(255,255,255,0.4)", marginTop: 2 }}>{role}</div>
      </div>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════
   FAQ ITEM
═══════════════════════════════════════════════ */
function FAQItem({ q, a, index }: { q: string; a: string; index: number }) {
  const [open, setOpen] = useState(false)
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.4, delay: index * 0.07 }}
      style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}
    >
      <button onClick={() => setOpen(!open)}
        style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "22px 0", background: "none", border: "none", cursor: "pointer", textAlign: "left" }}>
        <span style={{ fontSize: 16, fontWeight: 600, color: "#fff" }}>{q}</span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.25 }} style={{ flexShrink: 0, marginLeft: 16, color: "rgba(255,255,255,0.4)" }}>
          <ChevronDown size={18} />
        </motion.span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.3 }} style={{ overflow: "hidden" }}>
            <p style={{ fontSize: 15, lineHeight: 1.75, color: "rgba(255,255,255,0.6)", paddingBottom: 22 }}>{a}</p>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════
   SECTION LABEL
═══════════════════════════════════════════════ */
function Label({ text }: { text: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.3)", borderRadius: 999, padding: "6px 16px", fontSize: 11, fontWeight: 700, color: "#60a5fa", letterSpacing: "0.1em", textTransform: "uppercase" as const, marginBottom: 18 }}
    >
      {text}
    </motion.div>
  )
}

/* ═══════════════════════════════════════════════
   GLOBAL STYLES (injected once)
═══════════════════════════════════════════════ */
function GlobalStyles() {
  useEffect(() => {
    const id = "lwcs-global"
    if (document.getElementById(id)) return
    const el = document.createElement("style")
    el.id = id
    el.textContent = `
      @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
      @keyframes twinkle {
        0%,100% { opacity: var(--op); transform: scale(1); }
        50% { opacity: calc(var(--op)*0.15); transform: scale(0.65); }
      }
      @keyframes pulse-glow {
        0%,100% { box-shadow: 0 0 0 0 rgba(37,99,235,0.5); }
        50% { box-shadow: 0 0 0 10px rgba(37,99,235,0); }
      }
      @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
    `
    document.head.appendChild(el)
  }, [])
  return null
}

/* ═══════════════════════════════════════════════
   MAIN LANDING CONTENT (with real auth)
═══════════════════════════════════════════════ */
function LandingContent() {
  const searchParams = useSearchParams()
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState("")
  const [hasSession, setHasSession] = useState<boolean | null>(null)
  const [activeTab, setActiveTab] = useState(0)

  // Error from URL params
  useEffect(() => {
    const e = searchParams.get("error")
    if (e) setError(decodeURIComponent(e.replace(/_/g, " ")))
  }, [searchParams])

  // Session check via Supabase
  useEffect(() => {
    import("@supabase/ssr").then(({ createBrowserClient }) => {
      const sb = createBrowserClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      )
      sb.auth.getUser().then(({ data }) => setHasSession(!!data.user))
    })
  }, [])

  // Real Salesforce OAuth
  const handleSalesforceConnect = async () => {
    try {
      setIsLoading(true)
      setError("")
      const res = await fetch("/api/auth/salesforce/initiate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      })
      if (!res.ok) {
        const d = await res.json()
        throw new Error(d.error || "Failed to initiate Salesforce login")
      }
      const { authUrl } = await res.json()
      window.location.href = authUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred")
      setIsLoading(false)
    }
  }

  const font = "'Inter', sans-serif"
  const bg   = "#07090f"
  const bg2  = "#060810"
  const white = "#fff"
  const muted = "rgba(255,255,255,0.6)"
  const dim   = "rgba(255,255,255,0.35)"
  const border = "rgba(255,255,255,0.09)"
  const blue  = "#2563eb"
  const amber = "#f59e0b"

  const container: React.CSSProperties = { maxWidth: 1140, margin: "0 auto", padding: "0 40px" }
  const section = (extra?: React.CSSProperties): React.CSSProperties => ({
    position: "relative", padding: "100px 0", overflow: "hidden", ...extra,
  })
  const h2Style: React.CSSProperties = {
    fontSize: "clamp(32px,4vw,54px)", fontWeight: 900, letterSpacing: "-1.5px",
    color: white, lineHeight: 1.1, marginBottom: 16,
  }

  const BtnPrimary = ({ children, href, onClick, style: extraStyle, disabled }: {
    children: React.ReactNode; href?: string; onClick?: () => void; style?: React.CSSProperties; disabled?: boolean;
  }) => {
    const base: React.CSSProperties = {
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      padding: "14px 32px", background: blue, color: white, borderRadius: 8,
      fontSize: 15, fontWeight: 600, textDecoration: "none", cursor: "pointer",
      border: "none", opacity: disabled ? 0.7 : 1,
      ...extraStyle,
    }
    if (href) {
      return <motion.div whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.97 }}><Link href={href} style={base}>{children}</Link></motion.div>
    }
    return <motion.button whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.97 }} onClick={onClick} disabled={disabled} style={base}>{children}</motion.button>
  }

  const BtnSecondary = ({ children, href, onClick, disabled }: {
    children: React.ReactNode; href?: string; onClick?: () => void; disabled?: boolean;
  }) => {
    const base: React.CSSProperties = {
      display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8,
      padding: "14px 32px", background: "transparent", color: white,
      border: "1.5px solid rgba(255,255,255,0.45)", borderRadius: 8,
      fontSize: 15, fontWeight: 600, textDecoration: "none", cursor: "pointer",
      opacity: disabled ? 0.7 : 1,
    }
    if (href) {
      return <motion.div whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.97 }}><Link href={href} style={base}>{children}</Link></motion.div>
    }
    return <motion.button whileHover={{ scale: 1.04, y: -1 }} whileTap={{ scale: 0.97 }} onClick={onClick} disabled={disabled} style={base}>{children}</motion.button>
  }

  return (
    <div style={{ fontFamily: font, background: bg, color: white, overflowX: "hidden" }}>
      <GlobalStyles />
      <Navbar hasSession={hasSession} isLoading={isLoading} onConnect={handleSalesforceConnect} />

      {/* ══════════════════════════ HERO ══════════════════════════ */}
      <section style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", position: "relative", overflow: "hidden", paddingTop: 80 }}>
        <div style={{ position: "absolute", inset: 0, zIndex: 0, background: `radial-gradient(ellipse 80% 60% at 50% 28%, rgba(30,50,120,0.65) 0%, transparent 70%), radial-gradient(ellipse 55% 40% at 85% 55%, rgba(80,30,120,0.45) 0%, transparent 60%), radial-gradient(ellipse 45% 30% at 15% 70%, rgba(20,40,110,0.3) 0%, transparent 60%), ${bg}` }} />

        {/* Stars */}
        <div style={{ position: "absolute", inset: 0, zIndex: 0 }}>
          {STARS.map((s, i) => (
            <div key={i} style={{ position: "absolute", borderRadius: "50%", background: "white", width: s.size, height: s.size, left: `${s.x}%`, top: `${s.y}%`, ["--op" as string]: s.opacity, opacity: s.opacity, animation: `twinkle ${s.dur.toFixed(1)}s ease-in-out infinite ${s.delay.toFixed(1)}s` }} />
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6 }}
          style={{ position: "relative", zIndex: 2, display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", padding: "88px 24px 0", maxWidth: 920, width: "100%", margin: "0 auto" }}
        >
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
            style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.10)", borderRadius: 999, padding: "8px 20px", fontSize: 13, fontWeight: 500, marginBottom: 28 }}>
            <span style={{ fontSize: 15 }}>⚡</span> Built for <strong style={{ margin: "0 3px" }}>Salesforce</strong> Developers
          </motion.div>

          <motion.h1 initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.18 }}
            style={{ fontSize: "clamp(46px,7vw,82px)", fontWeight: 900, lineHeight: 1.05, letterSpacing: "-2.5px", marginBottom: 24 }}>
            Build Beautiful<br />
            <span style={{ background: "linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #f59e0b 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Lightning Web Components</span>
            <br />Faster
          </motion.h1>

          <motion.p initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.26 }}
            style={{ fontSize: 18, lineHeight: 1.75, color: muted, maxWidth: 580, marginBottom: 44 }}>
            Create, preview, and deploy production-ready LWC directly from your browser — with beautiful templates, instant setup, and seamless Salesforce org integration.
          </motion.p>

          {/* Error */}
          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              style={{ marginBottom: 20, padding: "10px 20px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, color: "#fca5a5", fontSize: 14 }}>
              {error}
            </motion.div>
          )}

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.34 }}
            style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center", marginBottom: 72 }}>
            <BtnPrimary href="/templates" style={{ animation: "pulse-glow 3s ease-in-out infinite" }}>Explore Templates</BtnPrimary>
            {hasSession ? (
              <BtnSecondary href="/dashboard">Go to Dashboard →</BtnSecondary>
            ) : (
              <BtnSecondary onClick={handleSalesforceConnect} disabled={isLoading}>
                {isLoading ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Connecting…</> : <><Cloud size={16} /> Connect Salesforce Org</>}
              </BtnSecondary>
            )}
          </motion.div>
        </motion.div>

        {/* Editor mockup */}
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.42, duration: 0.7 }}
          style={{ position: "relative", zIndex: 2, width: "100%", maxWidth: 780, padding: "0 24px" }}>
          {/* Glow behind editor */}
          <div style={{ position: "absolute", inset: "-30px", borderRadius: 24, background: "radial-gradient(ellipse at 50% 50%, rgba(37,99,235,0.18) 0%, transparent 70%)", pointerEvents: "none" }} />
          <div style={{ background: "#151d2e", borderRadius: 14, overflow: "hidden", boxShadow: "0 40px 100px rgba(0,0,0,0.8), 0 0 80px rgba(37,99,235,0.10)", position: "relative" }}>
            <div style={{ background: "#1c2539", padding: "13px 18px", display: "flex", alignItems: "center", gap: 6 }}>
              {[["#ff5f57"], ["#febc2e"], ["#28c840"]].map(([c], i) => <span key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: c, display: "inline-block" }} />)}
            </div>
            <div style={{ background: "#1a2235", display: "flex", alignItems: "center", padding: "0 0 0 16px", borderBottom: "1px solid rgba(255,255,255,0.07)" }}>
              {["accountInfo.html", "accountInfo.js", "accountInfo.css"].map((tab, i) => (
                <button key={tab} onClick={() => setActiveTab(i)} style={{ padding: "11px 16px", fontSize: 13, fontWeight: 500, color: activeTab === i ? "rgba(255,255,255,0.95)" : "rgba(255,255,255,0.35)", background: "none", border: "none", borderBottom: activeTab === i ? `2px solid ${amber}` : "2px solid transparent", cursor: "pointer", whiteSpace: "nowrap" }}>{tab}</button>
              ))}
              <div style={{ marginLeft: "auto", padding: "11px 18px", display: "flex", alignItems: "center", gap: 20, fontSize: 13, color: muted, borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
                <span>Live Preview</span>
                <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 6px #22c55e", display: "inline-block" }} />
                  <span style={{ color: "#22c55e", fontWeight: 600 }}>Synced</span>
                </span>
              </div>
            </div>
            <div style={{ display: "flex" }}>
              <div style={{ flex: 1, padding: "20px 0", fontFamily: "'JetBrains Mono','Fira Code',monospace", fontSize: 13.5, lineHeight: 1.78, background: "#151d2e" }}>
                {CODE_LINES.map(({ num, content }) => (
                  <div key={num} style={{ display: "flex", alignItems: "baseline", padding: "0 20px" }}>
                    <span style={{ color: "rgba(255,255,255,0.18)", width: 28, textAlign: "right", marginRight: 20, fontSize: 13, flexShrink: 0 }}>{num}</span>
                    <span style={{ color: "rgba(255,255,255,0.82)" }}>{content}</span>
                  </div>
                ))}
              </div>
              <div style={{ width: 176, flexShrink: 0, padding: "20px 14px", background: "#111827", borderLeft: "1px solid rgba(255,255,255,0.07)" }}>
                <div style={{ background: "#1e3a8a", borderRadius: 8, padding: "12px", display: "flex", flexDirection: "column", gap: 9 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, fontWeight: 600, paddingBottom: 8, borderBottom: "1px solid rgba(255,255,255,0.15)" }}>
                    <span style={{ width: 14, height: 14, background: "rgba(255,255,255,0.2)", borderRadius: 3, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8 }}>☁</span>
                    Account Info
                  </div>
                  {["90%", "65%", "82%", "70%", "55%"].map((w, i) => <div key={i} style={{ height: 7, background: "rgba(255,255,255,0.16)", borderRadius: 4, width: w }} />)}
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        <p style={{ position: "relative", zIndex: 2, fontSize: 13, color: dim, padding: "28px 0 56px" }}>Trusted by Salesforce Developers Building Better UI</p>
      </section>

      {/* ══════════════════════════ LOGO CLOUD ══════════════════════════ */}
      <div style={{ borderTop: `1px solid ${border}`, borderBottom: `1px solid ${border}`, padding: "4px 0", background: bg2 }}>
        <LogoCloud />
      </div>

      {/* ══════════════════════════ WHY LWC STUDIO ══════════════════════════ */}
      <section style={section({ background: bg })}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 50% at 50% 100%, rgba(37,99,235,0.07) 0%, transparent 70%)" }} />
        <div style={{ ...container, position: "relative", zIndex: 1 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: "center", marginBottom: 64 }}>
            <Label text="Why LWC Studio" />
            <h2 style={h2Style}>Why Developers Choose LWC Studio</h2>
            <p style={{ fontSize: 17, lineHeight: 1.75, color: muted, maxWidth: 560, margin: "0 auto" }}>
              Most Salesforce developers spend hours building functional components… but very little time making them beautiful.<br />
              <span style={{ color: white, fontWeight: 600 }}>LWC Studio bridges that gap.</span>
            </p>
          </motion.div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
            {FEATURES.map((f) => (
              <EvervaultCard key={f.title} title={f.title} icon={f.icon} desc={f.desc} />
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════ HOW IT WORKS ══════════════════════════ */}
      <section style={section({ background: bg2 })}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 50% 40% at 50% 50%, rgba(37,99,235,0.06) 0%, transparent 70%)" }} />
        <div style={{ ...container, position: "relative", zIndex: 1 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: "center", marginBottom: 64 }}>
            <Label text="How It Works" />
            <h2 style={h2Style}>From Template to Salesforce Org in Minutes</h2>
          </motion.div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(230px, 1fr))", gap: 16 }}>
            {STEPS.map((step, i) => (
              <motion.div key={step.n} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} whileHover={{ borderColor: "rgba(37,99,235,0.4)", y: -3 }}
                style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${border}`, borderRadius: 14, padding: "36px 28px", transition: "all 0.3s" }}>
                <div style={{ fontSize: 52, fontWeight: 900, letterSpacing: "-2px", color: "rgba(37,99,235,0.22)", lineHeight: 1, marginBottom: 20 }}>{step.n}</div>
                <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10, color: white }}>{step.title}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.7, color: muted }}>{step.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════ SALESFORCE NATIVE ══════════════════════════ */}
      <section style={section({ background: bg })}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 50% 50% at 0% 50%, rgba(37,99,235,0.08) 0%, transparent 70%)" }} />
        <div style={{ ...container, position: "relative", zIndex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 80, alignItems: "center" }}>
            <motion.div initial={{ opacity: 0, x: -30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6 }}>
              <Label text="Salesforce Native" />
              <h2 style={{ ...h2Style, marginBottom: 20 }}>Built for Real Salesforce Development</h2>
              <p style={{ fontSize: 16, lineHeight: 1.8, color: muted, marginBottom: 8 }}>
                LWC Studio is not just another frontend playground.<br />
                <span style={{ color: white, fontWeight: 700 }}>It understands Salesforce.</span>
              </p>
              <p style={{ fontSize: 15, lineHeight: 1.75, color: muted }}>
                Built specifically for LWC, Salesforce deployment workflows, and enterprise-grade developer needs.
              </p>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: 30 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }} transition={{ duration: 0.6, delay: 0.1 }}
              style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
              {SF_FEATURES.map((feat, i) => (
                <motion.div key={feat} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.06 }}
                  style={{ display: "flex", alignItems: "flex-start", gap: 10, padding: "14px 14px", background: "rgba(37,99,235,0.07)", border: "1px solid rgba(37,99,235,0.18)", borderRadius: 10 }}>
                  <span style={{ color: "#22c55e", fontSize: 14, flexShrink: 0, marginTop: 2 }}>✓</span>
                  <span style={{ fontSize: 13, fontWeight: 500, color: "rgba(255,255,255,0.82)", lineHeight: 1.4 }}>{feat}</span>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════ FOR WHO ══════════════════════════ */}
      <section style={section({ background: bg2 })}>
        <div style={{ ...container, position: "relative", zIndex: 1 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: "center", marginBottom: 56 }}>
            <Label text="For Who" />
            <h2 style={h2Style}>Who Uses LWC Studio?</h2>
          </motion.div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 18 }}>
            {AUDIENCES.map((a, i) => (
              <motion.div key={a.role} initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ delay: i * 0.1 }} whileHover={{ y: -4, borderColor: "rgba(37,99,235,0.4)" }}
                style={{ background: "rgba(255,255,255,0.025)", border: `1px solid ${border}`, borderRadius: 14, padding: "32px 28px", textAlign: "center", transition: "all 0.3s" }}>
                <div style={{ fontSize: 36, marginBottom: 16 }}>{a.icon}</div>
                <h3 style={{ fontSize: 17, fontWeight: 700, marginBottom: 10, color: white }}>{a.role}</h3>
                <p style={{ fontSize: 14, lineHeight: 1.65, color: muted }}>{a.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════ TESTIMONIALS ══════════════════════════ */}
      <section style={section({ background: bg })}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 60% 50% at 50% 50%, rgba(139,92,246,0.06) 0%, transparent 70%)" }} />
        <div style={{ ...container, position: "relative", zIndex: 1 }}>
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} style={{ textAlign: "center", marginBottom: 60 }}>
            <Label text="Testimonials" />
            <h2 style={h2Style}>Developers Love It</h2>
            <p style={{ fontSize: 16, color: muted, maxWidth: 480, margin: "0 auto" }}>Real feedback from real Salesforce developers in the community.</p>
          </motion.div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div>{TESTIMONIALS_COL1.map((t, i) => <TestimonialCard key={t.name} {...t} delay={i * 0.1} />)}</div>
            <div style={{ marginTop: 32 }}>{TESTIMONIALS_COL2.map((t, i) => <TestimonialCard key={t.name} {...t} delay={i * 0.1 + 0.15} />)}</div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════ MANIFESTO ══════════════════════════ */}
      <section style={section({ background: bg2 })}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 80% 60% at 50% 50%, rgba(139,92,246,0.08) 0%, transparent 70%)" }} />
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
          style={{ maxWidth: 740, margin: "0 auto", padding: "0 40px", position: "relative", zIndex: 1, textAlign: "center" }}>
          <div style={{ fontSize: 80, color: "rgba(37,99,235,0.2)", lineHeight: 0.8, marginBottom: 16, fontFamily: "serif" }}>&ldquo;</div>
          <h2 style={{ fontSize: "clamp(28px,4.5vw,50px)", fontWeight: 900, letterSpacing: "-1.5px", lineHeight: 1.12, marginBottom: 24, color: white }}>
            Developers Don&apos;t Need More Grey Boxes
          </h2>
          <p style={{ fontSize: 18, lineHeight: 1.8, color: muted, marginBottom: 12 }}>They need components that actually look good.</p>
          <p style={{ fontSize: 15, lineHeight: 1.75, color: dim }}>LWC Studio helps Salesforce developers move beyond default layouts and create interfaces users genuinely love using. Because good UI is not optional anymore.</p>
        </motion.div>
      </section>

      {/* ══════════════════════════ FAQ ══════════════════════════ */}
      <section style={section({ background: bg2 })}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 50% 40% at 50% 50%, rgba(37,99,235,0.05) 0%, transparent 70%)" }} />
        <div style={{ ...container, position: "relative", zIndex: 1 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.6fr", gap: 80, alignItems: "flex-start" }}>
            <motion.div initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}>
              <Label text="FAQ" />
              <h2 style={{ ...h2Style, marginBottom: 16 }}>Frequently Asked Questions</h2>
              <p style={{ fontSize: 15, lineHeight: 1.75, color: muted }}>Everything you need to know about LWC Studio. Can&apos;t find an answer? <Link href="/docs" style={{ color: "#60a5fa", textDecoration: "none" }}>Check our docs</Link>.</p>
            </motion.div>
            <div style={{ borderTop: `1px solid ${border}` }}>
              {FAQS.map((faq, i) => <FAQItem key={faq.q} q={faq.q} a={faq.a} index={i} />)}
            </div>
          </div>
        </div>
      </section>

      {/* ══════════════════════════ FINAL CTA ══════════════════════════ */}
      <section style={section({ background: bg })}>
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse 70% 60% at 50% 50%, rgba(37,99,235,0.13) 0%, transparent 70%)" }} />
        <motion.div initial={{ opacity: 0, y: 30 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }} transition={{ duration: 0.7 }}
          style={{ ...container, position: "relative", zIndex: 1, textAlign: "center" }}>
          <Label text="Get Started" />
          <h2 style={{ ...h2Style, maxWidth: 680, margin: "0 auto 20px" }}>Start Building Better LWC Today</h2>
          <p style={{ fontSize: 18, color: muted, maxWidth: 500, margin: "0 auto 44px", lineHeight: 1.75 }}>
            Stop wasting hours rebuilding the same components. Launch faster with beautiful templates, real previews, and direct Salesforce deployment.
          </p>
          <div style={{ display: "flex", gap: 14, justifyContent: "center", flexWrap: "wrap" }}>
            <BtnPrimary href="/templates" style={{ padding: "16px 40px", fontSize: 16, animation: "pulse-glow 2.5s ease-in-out infinite" }}>Explore Templates</BtnPrimary>
            {hasSession ? (
              <BtnSecondary href="/dashboard">Go to Dashboard</BtnSecondary>
            ) : (
              <BtnSecondary onClick={handleSalesforceConnect} disabled={isLoading}>
                {isLoading ? <><Loader2 size={16} style={{ animation: "spin 1s linear infinite" }} /> Connecting…</> : "Connect Org"}
              </BtnSecondary>
            )}
          </div>
        </motion.div>
      </section>

      {/* ══════════════════════════ FOOTER ══════════════════════════ */}
      <footer style={{ borderTop: `1px solid ${border}`, padding: "48px 0 36px", background: bg2 }}>
        <div style={{ ...container, display: "flex", flexDirection: "column", gap: 28 }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 24 }}>
            <Link href="/" style={{ display: "flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
              <img src="/logo-studio.png" alt="LWC Studio" style={{ height: 40, width: "auto", objectFit: "contain", transform: "scale(2.2)", transformOrigin: "left center" }} />
            </Link>
            <div style={{ display: "flex", gap: 28, flexWrap: "wrap" }}>
              {[
                { label: "Docs", href: "/docs" },
                { label: "Templates", href: "/templates" },
                { label: "Dashboard", href: "/dashboard" },
              ].map(link => (
                <Link key={link.label} href={link.href} style={{ fontSize: 14, color: dim, textDecoration: "none", fontWeight: 500, transition: "color 0.2s" }}
                  onMouseEnter={e => (e.currentTarget.style.color = "rgba(255,255,255,0.85)")}
                  onMouseLeave={e => (e.currentTarget.style.color = dim)}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          <div style={{ borderTop: `1px solid ${border}`, paddingTop: 24, textAlign: "center", fontSize: 13, color: dim }}>
            Built for the Salesforce Developer Community ⚡ &nbsp;© 2026 LWC Studio
          </div>
        </div>
      </footer>
    </div>
  )
}

/* ═══════════════════════════════════════════════
   DEFAULT EXPORT WITH SUSPENSE
═══════════════════════════════════════════════ */
export default function LandingPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#07090f" }}>
        <Loader2 size={32} style={{ color: "#3b82f6", animation: "spin 1s linear infinite" }} />
      </div>
    }>
      <LandingContent />
    </Suspense>
  )
}
