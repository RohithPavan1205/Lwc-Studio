import { create } from 'zustand';

export interface ComponentData {
  id: string | null;
  name: string;
  htmlContent: string;
  jsContent: string;
  cssContent: string;
}

// Deploy states
export type DeployStatusType = 'idle' | 'deploying' | 'success' | 'error';

// Background setup banner states (Task 3)
export type SetupBannerState = 'hidden' | 'in-progress' | 'success' | 'error';

interface EditorState {
  // ── Component data ─────────────────────────────────────────────────────────
  currentComponent: ComponentData;

  // ── Save state ─────────────────────────────────────────────────────────────
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: number | null;

  // ── Deploy state ───────────────────────────────────────────────────────────
  isDeploying: boolean;
  lastDeployedAt: Date | null;       // null = never deployed this session
  deployStatus: DeployStatusType;
  deployError: string | null;
  lastDeployMethod: 'update' | 'first-deploy' | null;
  lastDeployDuration: number | null; // ms

  // ── Background setup banner (Task 3) ──────────────────────────────────────
  setupBanner: SetupBannerState;
  setupBannerError: string | null;

  // ── Derived ────────────────────────────────────────────────────────────────
  isDeployed: () => boolean;

  // ── Actions ────────────────────────────────────────────────────────────────
  setHtml: (html: string) => void;
  setJs: (js: string) => void;
  setCss: (css: string) => void;
  setComponentDefinition: (comp: ComponentData) => void;
  saveComponent: () => Promise<void>;
  loadComponent: (id: string) => Promise<void>;

  // Deploy actions
  setDeployStatus: (status: DeployStatusType, error?: string) => void;
  setLastDeployedAt: (date: Date, method?: 'update' | 'first-deploy', duration?: number) => void;

  // Setup banner actions
  setSetupBanner: (state: SetupBannerState, error?: string) => void;
  dismissSetupBanner: () => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  // ── Initial state ──────────────────────────────────────────────────────────
  currentComponent: {
    id: null,
    name: 'Untitled',
    htmlContent: '',
    jsContent: '',
    cssContent: '',
  },
  isDirty: false,
  isSaving: false,
  lastSavedAt: null,

  isDeploying: false,
  lastDeployedAt: null,
  deployStatus: 'idle',
  deployError: null,
  lastDeployMethod: null,
  lastDeployDuration: null,

  setupBanner: 'hidden',
  setupBannerError: null,

  // ── Derived ────────────────────────────────────────────────────────────────
  isDeployed: () => get().lastDeployedAt !== null,

  // ── Editor actions ─────────────────────────────────────────────────────────
  setHtml: (html) =>
    set((state) => ({
      currentComponent: { ...state.currentComponent, htmlContent: html },
      isDirty: true,
    })),

  setJs: (js) =>
    set((state) => ({
      currentComponent: { ...state.currentComponent, jsContent: js },
      isDirty: true,
    })),

  setCss: (css) =>
    set((state) => ({
      currentComponent: { ...state.currentComponent, cssContent: css },
      isDirty: true,
    })),

  setComponentDefinition: (comp) =>
    set({
      currentComponent: comp,
      isDirty: false,
      lastSavedAt: Date.now(),
      // Reset deploy state when component changes
      lastDeployedAt: null,
      deployStatus: 'idle',
      deployError: null,
      lastDeployMethod: null,
      lastDeployDuration: null,
      setupBanner: 'hidden',
      setupBannerError: null,
    }),

  // ── Save action ────────────────────────────────────────────────────────────
  saveComponent: async () => {
    const { currentComponent, isDirty } = get();
    if (!isDirty || !currentComponent.id) return;

    set({ isSaving: true });

    try {
      const res = await fetch('/api/components/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          id: currentComponent.id,
          htmlContent: currentComponent.htmlContent,
          jsContent: currentComponent.jsContent,
          cssContent: currentComponent.cssContent,
        }),
      });

      if (res.ok) {
        set({ isDirty: false, lastSavedAt: Date.now() });
      } else {
        const errText = await res.text();
        console.error('[store] Save failed:', errText);
      }
    } catch (err) {
      console.error('[store] Save crashed:', err);
    } finally {
      set({ isSaving: false });
    }
  },

  // ── Load action ────────────────────────────────────────────────────────────
  loadComponent: async (id) => {
    try {
      const res = await fetch(`/api/components/load/${id}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json() as {
          id: string; name: string; html_content?: string;
          js_content?: string; css_content?: string; updated_at?: string;
        };
        set({
          currentComponent: {
            id: data.id,
            name: data.name,
            htmlContent: data.html_content || '',
            jsContent: data.js_content || '',
            cssContent: data.css_content || '',
          },
          isDirty: false,
          lastSavedAt: new Date(data.updated_at || Date.now()).getTime(),
          lastDeployedAt: null,
          deployStatus: 'idle',
          deployError: null,
          lastDeployMethod: null,
          lastDeployDuration: null,
        });
      }
    } catch (err) {
      console.error('[store] Load failed:', err);
    }
  },

  // ── Deploy actions ─────────────────────────────────────────────────────────
  setDeployStatus: (status, error) =>
    set({
      deployStatus: status,
      isDeploying: status === 'deploying',
      deployError: error ?? null,
    }),

  setLastDeployedAt: (date, method, duration) =>
    set({
      lastDeployedAt: date,
      deployStatus: 'success',
      isDeploying: false,
      deployError: null,
      lastDeployMethod: method ?? null,
      lastDeployDuration: duration ?? null,
    }),

  // ── Setup banner actions ───────────────────────────────────────────────────
  setSetupBanner: (state, error) =>
    set({ setupBanner: state, setupBannerError: error ?? null }),

  dismissSetupBanner: () =>
    set({ setupBanner: 'hidden', setupBannerError: null }),
}));
