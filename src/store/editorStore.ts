import { create } from 'zustand';

export interface ComponentData {
  id: string | null;
  name: string;
  htmlContent: string;
  jsContent: string;
  cssContent: string;
  xmlContent: string;
}

interface EditorState {
  currentComponent: ComponentData;
  isDirty: boolean;
  isSaving: boolean;
  isDeploying: boolean;
  lastSavedAt: number | null;
  
  setHtml: (html: string) => void;
  setJs: (js: string) => void;
  setCss: (css: string) => void;
  setXml: (xml: string) => void;
  setComponentDefinition: (comp: ComponentData) => void;
  saveComponent: () => Promise<void>;
  loadComponent: (id: string) => Promise<void>;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  currentComponent: {
    id: null,
    name: 'Untitled',
    htmlContent: '',
    jsContent: '',
    cssContent: '',
    xmlContent: ''
  },
  isDirty: false,
  isSaving: false,
  isDeploying: false,
  lastSavedAt: null,

  setHtml: (html) => set((state) => ({
    currentComponent: { ...state.currentComponent, htmlContent: html },
    isDirty: true
  })),

  setJs: (js) => set((state) => ({
    currentComponent: { ...state.currentComponent, jsContent: js },
    isDirty: true
  })),

  setCss: (css) => set((state) => ({
    currentComponent: { ...state.currentComponent, cssContent: css },
    isDirty: true
  })),

  setXml: (xml) => set((state) => ({
    currentComponent: { ...state.currentComponent, xmlContent: xml },
    isDirty: true
  })),
  
  setComponentDefinition: (comp) => set({
    currentComponent: comp,
    isDirty: false,
    lastSavedAt: Date.now()
  }),

  saveComponent: async () => {
    const { currentComponent, isDirty } = get();
    if (!isDirty) return;

    set({ isSaving: true });
    

    try {
      const res = await fetch('/api/components/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(currentComponent),
        cache: 'no-store'
      });
      if (res.ok) {
        set({ isDirty: false, lastSavedAt: Date.now() });
      } else {
        console.error('Failed to save component:', await res.text());
      }
    } catch (err) {
      console.error('Save failed:', err);
    } finally {
      set({ isSaving: false });
    }
  },

  loadComponent: async (id) => {
    try {
      const res = await fetch(`/api/components/load/${id}`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        set({
          currentComponent: {
            id: data.id,
            name: data.name,
            htmlContent: data.html_content || '',
            jsContent: data.js_content || '',
            cssContent: data.css_content || '',
            xmlContent: data.xml_content || ''
          },
          isDirty: false,
          lastSavedAt: new Date(data.updated_at || Date.now()).getTime()
        });
      }
    } catch (err) {
      console.error('Failed to load component', err);
    }
  }
}));
