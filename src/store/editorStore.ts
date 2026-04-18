import { create } from 'zustand';

export interface ComponentData {
  id: string | null;
  name: string;
  htmlContent: string;
  jsContent: string;
  cssContent: string;
  xmlContent: string;
}

export type DeployStatusType = 'idle' | 'deploying' | 'success' | 'error';

// 'hidden' = never shown / dismissed
// 'in-progress' = background deploy running
// 'success' = background deploy succeeded
// 'error' = background deploy failed
export type SetupBannerStatus = 'hidden' | 'in-progress' | 'success' | 'error';

interface EditorState {
  // ── Component data ─────────────────────────────────────────────────────────
  currentComponent: ComponentData;

  // ── Save state ─────────────────────────────────────────────────────────────
  isDirty: boolean;
  isSaving: boolean;
  lastSavedAt: number | null;

  // ── Deploy state ───────────────────────────────────────────────────────────
  lastDeployedAt: Date | null;
  deployStatus: DeployStatusType;
  deployError: string | null;
  lastDeployDuration: number | null;

  // ── Setup banner (background first-deploy) ─────────────────────────────────
  setupBanner: SetupBannerStatus;
  setupBannerError: string | null;

  // ── Actions ────────────────────────────────────────────────────────────────
  setHtml: (html: string) => void;
  setJs: (js: string) => void;
  setCss: (css: string) => void;
  setXml: (xml: string) => void;
  setComponentDefinition: (comp: ComponentData) => void;
  resetComponent: () => void;
  saveComponent: () => Promise<void>;

  // Deploy actions
  setDeployStatus: (status: DeployStatusType, error?: string) => void;
  setLastDeployedAt: (date: Date, duration?: number) => void;

  // Setup banner actions
  setSetupBanner: (status: SetupBannerStatus, error?: string) => void;
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
    xmlContent: '',
  },
  isDirty: false,
  isSaving: false,
  lastSavedAt: null,

  lastDeployedAt: null,
  deployStatus: 'idle',
  deployError: null,
  lastDeployDuration: null,

  setupBanner: 'hidden',
  setupBannerError: null,

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

  setXml: (xml) =>
    set((state) => ({
      currentComponent: { ...state.currentComponent, xmlContent: xml },
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
      lastDeployDuration: null,
      // Reset banner when component changes
      setupBanner: 'hidden',
      setupBannerError: null,
    }),

  resetComponent: () =>
    set({
      currentComponent: {
        id: null,
        name: 'Untitled',
        htmlContent: '',
        jsContent: '',
        cssContent: '',
        xmlContent: '',
      },
      isDirty: false,
      deployStatus: 'idle',
      setupBanner: 'hidden',
      setupBannerError: null,
    }),

  // ── Save action ────────────────────────────────────────────────────────────
  saveComponent: async () => {
    const { currentComponent, isDirty } = get();
    const { id, htmlContent, jsContent, cssContent, xmlContent } = currentComponent;
    if (!isDirty || !id) return;

    set({ isSaving: true });

    try {
      const res = await fetch('/api/components/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        cache: 'no-store',
        body: JSON.stringify({
          id,
          htmlContent,
          jsContent,
          cssContent,
          xmlContent,
        }),
      });

      if (res.ok) {
        set({ isDirty: false, lastSavedAt: Date.now() });
      } else {
        // isDirty stays true so user can retry
      }
    } catch {
      // isDirty stays true so user can retry
    } finally {
      set({ isSaving: false });
    }
  },

  // ── Deploy actions ─────────────────────────────────────────────────────────
  setDeployStatus: (status, error) =>
    set({
      deployStatus: status,
      deployError: error ?? null,
    }),

  setLastDeployedAt: (date, duration) =>
    set({
      lastDeployedAt: date,
      deployStatus: 'success',
      deployError: null,
      lastDeployDuration: duration ?? null,
    }),

  // ── Setup banner actions ───────────────────────────────────────────────────
  setSetupBanner: (status, error) =>
    set({
      setupBanner: status,
      setupBannerError: error ?? null,
    }),

  dismissSetupBanner: () =>
    set({
      setupBanner: 'hidden',
      setupBannerError: null,
    }),
}));
