import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        ui: ['Inter', 'Satoshi', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['Inter', 'Satoshi', 'sans-serif'],
        code: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // ── Salesforce Blue Design System ──────────────────────────────
        sf: {
          primary:  '#0176D3',
          glow:     '#1B96FF',
          deep:     '#0056A3',
          subtle:   'rgba(1,118,211,0.12)',
          border:   'rgba(1,118,211,0.15)',
          borderHover: 'rgba(27,150,255,0.35)',
        },
        // ── Studio tokens (now SF-blue-based) ─────────────────────────
        studio: {
          primary: 'var(--studio-primary)',
          hover:   'var(--studio-hover)',
          accent:  'var(--studio-accent)',
        },
        // ── Backgrounds ───────────────────────────────────────────────
        bg: {
          void:     'var(--bg-void)',
          base:     'var(--bg-base)',
          surface:  'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
          overlay:  'var(--bg-overlay)',
          highlight:'var(--bg-highlight)',
        },
        // ── Borders ───────────────────────────────────────────────────
        border: {
          subtle:  'var(--border-subtle)',
          default: 'var(--border-default)',
          strong:  'var(--border-strong)',
          focus:   'var(--border-focus)',
        },
        // ── Text ──────────────────────────────────────────────────────
        text: {
          primary:   'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary:  'var(--text-tertiary)',
          accent:    'var(--text-accent)',
          muted:     'var(--text-muted)',
        },
      },
      animation: {
        'forge-spin':      'forge-spin 1s linear infinite',
        'forge-pulse':     'forge-pulse 1.6s ease-in-out infinite',
        'forge-slide-in':  'forge-slide-in-up 0.25s cubic-bezier(0,0,0.2,1) both',
        'forge-scale-in':  'forge-scale-in 0.2s cubic-bezier(0.34,1.56,0.64,1) both',
        shimmer:           'forge-shimmer 1.5s infinite',
        'card-reveal':     'cardReveal 250ms cubic-bezier(0,0,0.2,1) both',
        'subtle-float':    'subtleFloat 6s ease-in-out infinite',
        'glow-pulse':      'glowPulse 3s ease-in-out infinite',
        'sf-grid-pulse':   'sfGridPulse 8s ease-in-out infinite',
        'dot-float':       'dotFloat 20s linear infinite',
        'use-btn-slide':   'useBtnSlide 0.2s ease both',
      },
      backgroundImage: {
        'sf-grid': `
          radial-gradient(circle, rgba(27,150,255,0.08) 1px, transparent 1px)
        `,
      },
    },
  },
  plugins: [],
};

export default config;
