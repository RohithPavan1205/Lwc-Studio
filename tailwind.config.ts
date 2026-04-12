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
        ui: ['var(--font-geist)', 'Geist', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
        display: ['var(--font-dm-mono)', 'DM Mono', 'monospace'],
        code: ['JetBrains Mono', 'DM Mono', 'Fira Code', 'monospace'],
      },
      colors: {
        // Forge design tokens bridged to Tailwind
        forge: {
          primary: 'var(--forge-primary)',
          glow: 'var(--forge-glow)',
          ember: 'var(--forge-ember)',
        },
        bg: {
          void: 'var(--bg-void)',
          base: 'var(--bg-base)',
          surface: 'var(--bg-surface)',
          elevated: 'var(--bg-elevated)',
          overlay: 'var(--bg-overlay)',
          highlight: 'var(--bg-highlight)',
        },
        border: {
          subtle: 'var(--border-subtle)',
          default: 'var(--border-default)',
          strong: 'var(--border-strong)',
          focus: 'var(--border-focus)',
        },
        text: {
          primary: 'var(--text-primary)',
          secondary: 'var(--text-secondary)',
          tertiary: 'var(--text-tertiary)',
          accent: 'var(--text-accent)',
        },
      },
      animation: {
        'forge-spin': 'forge-spin 1s linear infinite',
        'forge-pulse': 'forge-pulse 1.6s ease-in-out infinite',
        'forge-slide-in': 'forge-slide-in-up 0.25s cubic-bezier(0,0,0.2,1) both',
        'forge-scale-in': 'forge-scale-in 0.2s cubic-bezier(0.34,1.56,0.64,1) both',
        shimmer: 'forge-shimmer 1.5s infinite',
        'card-reveal': 'cardReveal 250ms cubic-bezier(0,0,0.2,1) both',
      },
    },
  },
  plugins: [],
};

export default config;
