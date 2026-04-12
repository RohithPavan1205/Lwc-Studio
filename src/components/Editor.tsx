'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import Editor, { loader } from '@monaco-editor/react';

export interface EditorError {
  fileName: string;
  problem: string;
  lineNumber: number;
  columnNumber: number;
}

interface LwcEditorProps {
  htmlCode: string;
  jsCode: string;
  cssCode: string;
  xmlCode?: string;
  errors?: EditorError[];
  onChange: (type: 'html' | 'js' | 'css' | 'xml', value: string) => void;
}

type TabType = 'html' | 'js' | 'css' | 'xml';

// ─── File type icon SVGs (inline, pixel-perfect) ─────────────────────────────

function Html5Icon({ size = 18 }: { size?: number }) {
  return (
    <img src="/icons/html-5.png" alt="HTML5" width={size} height={size} className="object-contain shrink-0" />
  );
}

function JsIcon({ size = 18 }: { size?: number }) {
  return (
    <img src="/icons/js.png" alt="JavaScript" width={size} height={size} className="object-contain shrink-0 rounded-[3px]" />
  );
}

function XmlIcon({ size = 18 }: { size?: number }) {
  return (
    <img src="/icons/xml.png" alt="XML" width={size} height={size} className="object-contain shrink-0" />
  );
}

function CssIcon({ size = 18 }: { size?: number }) {
  return (
    <img src="/icons/css-3.png" alt="CSS3" width={size} height={size} className="object-contain shrink-0" />
  );
}

// ─── Tab icons and labels ─────────────────────────────────────────────────────

const TAB_CONFIG: Record<TabType, {
  label: string;
  shortLabel: string;
  language: string;
  icon: React.ReactNode;
  iconColor: string;
}> = {
  html: {
    label: 'template.html',
    shortLabel: '.html',
    language: 'html',
    icon: <Html5Icon size={14} />,
    iconColor: '#E44D26',
  },
  js: {
    label: 'component.js',
    shortLabel: '.js',
    language: 'javascript',
    icon: <JsIcon size={14} />,
    iconColor: '#F7DF1E',
  },
  css: {
    label: 'styles.css',
    shortLabel: '.css',
    language: 'css',
    icon: <CssIcon size={14} />,
    iconColor: '#264DE4',
  },
  xml: {
    label: 'meta.xml',
    shortLabel: '.xml',
    language: 'xml',
    icon: <XmlIcon size={14} />,
    iconColor: '#E06C75',
  },
};

// ─── VS Code "One Dark Pro" / dark theme definition ───────────────────────────
// Matches the screenshot: dark bg, red/orange keywords, green strings,
// blue/yellow identifiers, cyan attributes, soft purple types

const FORGE_THEME_DATA = {
  base: 'vs-dark' as const,
  inherit: false,
  rules: [
    // Base
    { token: '', foreground: 'C9D1D9', background: '171B22' },
    // Comments — muted blue-grey, italic
    { token: 'comment',        foreground: '5B6878', fontStyle: 'italic' },
    { token: 'comment.line',   foreground: '5B6878', fontStyle: 'italic' },
    { token: 'comment.block',  foreground: '5B6878', fontStyle: 'italic' },
    // Keywords — vivid violet
    { token: 'keyword',                  foreground: 'D271DE' },
    { token: 'keyword.control',          foreground: 'D271DE' },
    { token: 'keyword.operator',         foreground: '79C0FF' },
    { token: 'keyword.other',            foreground: 'D271DE' },
    // Storage
    { token: 'storage',      foreground: 'D271DE' },
    { token: 'storage.type', foreground: 'F0B429' },
    // Strings — bright green
    { token: 'string',         foreground: 'A5D6FF' },
    { token: 'string.quoted',  foreground: '7EE787' },
    { token: 'string.regexp',  foreground: 'FF7B72' },
    // Numbers
    { token: 'constant.numeric', foreground: 'F2C476' },
    { token: 'number',            foreground: 'F2C476' },
    // Constants
    { token: 'constant',                   foreground: 'F2C476' },
    { token: 'constant.language',          foreground: 'FF7B72' },
    { token: 'constant.character.escape',  foreground: '79C0FF' },
    // Variables
    { token: 'variable',          foreground: 'FF7B72' },
    { token: 'variable.parameter', foreground: 'FFA666' },
    { token: 'variable.language',  foreground: 'F0B429' },
    // Functions / Methods — sky blue
    { token: 'entity.name.function', foreground: '79C0FF' },
    { token: 'support.function',      foreground: '79C0FF' },
    // Classes / Types — golden yellow
    { token: 'entity.name.class',  foreground: 'F0B429' },
    { token: 'entity.name.type',   foreground: 'F0B429' },
    { token: 'support.class',       foreground: 'F0B429' },
    // Operators — cyan
    { token: 'keyword.operator.assignment',  foreground: '79C0FF' },
    { token: 'keyword.operator.comparison',  foreground: '79C0FF' },
    // HTML / XML tags
    { token: 'tag',                      foreground: '7EE787' },
    { token: 'metatag',                  foreground: '7EE787' },
    { token: 'metatag.content.html',     foreground: 'A5D6FF' },
    { token: 'tag.html',                 foreground: '7EE787' },
    { token: 'attribute.name',           foreground: 'F0B429' },
    { token: 'attribute.value',          foreground: 'A5D6FF' },
    { token: 'attribute.value.html',     foreground: 'A5D6FF' },
    { token: 'delimiter',                foreground: 'C9D1D9' },
    { token: 'delimiter.html',           foreground: 'C9D1D9' },
    // CSS
    { token: 'entity.name.tag.css',                foreground: 'FF7B72' },
    { token: 'entity.other.attribute-name.css',    foreground: 'F0B429' },
    { token: 'support.type.property-name.css',     foreground: '79C0FF' },
    { token: 'constant.other.color',               foreground: 'F2C476' },
    // Punctuation
    { token: 'punctuation',              foreground: 'C9D1D9' },
    { token: 'punctuation.definition.tag', foreground: '7EE787' },
  ],
  colors: {
    // Editor chrome — deeper than topbar/tabbar layers
    'editor.background':                  '#171B22',
    'editor.foreground':                  '#C9D1D9',
    'editor.lineHighlightBackground':     '#1F2733',
    'editor.lineHighlightBorder':         '#00000000',
    'editor.selectionBackground':         '#264F78',
    'editor.inactiveSelectionBackground': '#2A3A4A',
    'editor.selectionHighlightBackground':'#264F7855',
    'editor.wordHighlightBackground':     '#264F7840',
    'editor.wordHighlightStrongBackground':'#264F78',
    'editor.findMatchBackground':         '#42557B',
    'editor.findMatchHighlightBackground':'#314365',
    // Line numbers
    'editorLineNumber.foreground':       '#3D4D60',
    'editorLineNumber.activeForeground': '#8B9EB7',
    // Cursor — forge amber
    'editorCursor.foreground': '#F77F00',
    // Indent guides
    'editorIndentGuide.background':       '#1F2733',
    'editorIndentGuide.activeBackground': '#2C3B4E',
    // Gutter
    'editorGutter.background': '#171B22',
    // Bracket matching
    'editorBracketMatch.background': '#516479',
    'editorBracketMatch.border':     '#516479',
    // Widgets
    'editorWidget.background':                    '#1C2130',
    'editorWidget.border':                        '#2C3B4E',
    'editorSuggestWidget.background':             '#1C2130',
    'editorSuggestWidget.border':                 '#2C3B4E',
    'editorSuggestWidget.selectedBackground':     '#264F78',
    'editorSuggestWidget.highlightForeground':    '#79C0FF',
    // Scrollbar
    'scrollbarSlider.background':       '#264F7840',
    'scrollbarSlider.hoverBackground':  '#264F7880',
    'scrollbarSlider.activeBackground': '#264F78',
    // Minimap
    'minimap.background': '#141820',
    // Overview ruler
    'editorOverviewRuler.border': '#00000000',
    // Error / Warning squiggle
    'editorError.foreground':   '#FF7B72',
    'editorWarning.foreground': '#F0B429',
    'editorInfo.foreground':    '#79C0FF',
  },
};

// ─── Main Editor component ────────────────────────────────────────────────────

export default function LwcEditor({
  htmlCode,
  jsCode,
  cssCode,
  xmlCode = '',
  errors = [],
  onChange,
}: LwcEditorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('js');
  const [themeRegistered, setThemeRegistered] = useState(false);

  const editorRef = useRef<any>(null);
  const monacoRef = useRef<any>(null);
  const modelsRef = useRef<Record<TabType, any>>({ html: null, js: null, css: null, xml: null });
  const snippetsRegistered = useRef(false);

  // ── beforeMount: register theme + LWC snippets ──────────────────────────────
  const handleEditorWillMount = useCallback((monacoInstance: any) => {
    // Register forge theme
    monacoInstance.editor.defineTheme('forge-dark', FORGE_THEME_DATA);
    setThemeRegistered(true);

    if (!snippetsRegistered.current) {
      monacoInstance.languages.registerCompletionItemProvider('javascript', {
        provideCompletionItems: () => ({
          suggestions: [
            {
              label: 'import lwc',
              kind: monacoInstance.languages.CompletionItemKind.Snippet,
              insertText: "import { LightningElement, api, wire, track } from 'lwc';\n",
              insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Import LWC decorators',
            },
            {
              label: '@api',
              kind: monacoInstance.languages.CompletionItemKind.Snippet,
              insertText: '@api ${1:propertyName};',
              insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Public reactive property',
            },
            {
              label: '@track',
              kind: monacoInstance.languages.CompletionItemKind.Snippet,
              insertText: '@track ${1:propertyName} = {};',
              insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Private reactive property',
            },
            {
              label: '@wire',
              kind: monacoInstance.languages.CompletionItemKind.Snippet,
              insertText: '@wire(${1:adapter}, { ${2:config} })\n${3:propertyOrFunction};',
              insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Wire adapter',
            },
          ],
        }),
      });
      snippetsRegistered.current = true;
    }

    monacoInstance.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });
    monacoInstance.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monacoInstance.languages.typescript.ScriptTarget.ES2020,
      experimentalDecorators: true,
      allowNonTsExtensions: true,
    });
  }, []);

  // ── onMount: create all 4 models ─────────────────────────────────────────────
  const handleEditorOnMount = useCallback((editor: any, monaco: any) => {
    editorRef.current = editor;
    monacoRef.current = monaco;

    const uris = {
      html: monaco.Uri.parse('file:///template.html'),
      js: monaco.Uri.parse('file:///component.js'),
      css: monaco.Uri.parse('file:///styles.css'),
      xml: monaco.Uri.parse('file:///meta.xml'),
    };

    // Dispose existing models
    (['html', 'js', 'css', 'xml'] as TabType[]).forEach((t) => {
      const existing = monaco.editor.getModel(uris[t]);
      if (existing) existing.dispose();
    });

    // Create fresh models
    modelsRef.current.html = monaco.editor.createModel(htmlCode, 'html', uris.html);
    modelsRef.current.js = monaco.editor.createModel(jsCode, 'javascript', uris.js);
    modelsRef.current.css = monaco.editor.createModel(cssCode, 'css', uris.css);
    modelsRef.current.xml = monaco.editor.createModel(xmlCode || '', 'xml', uris.xml);

    // Set initial model
    editor.setModel(modelsRef.current[activeTab]);

    // Listen for changes
    modelsRef.current.html.onDidChangeContent(() => {
      onChange('html', modelsRef.current.html.getValue());
    });
    modelsRef.current.js.onDidChangeContent(() => {
      onChange('js', modelsRef.current.js.getValue());
    });
    modelsRef.current.css.onDidChangeContent(() => {
      onChange('css', modelsRef.current.css.getValue());
    });
    modelsRef.current.xml.onDidChangeContent(() => {
      onChange('xml', modelsRef.current.xml.getValue());
    });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Sync external content changes into models
  useEffect(() => {
    if (!modelsRef.current.js) return;
    if (modelsRef.current.html && modelsRef.current.html.getValue() !== htmlCode) {
      modelsRef.current.html.setValue(htmlCode);
    }
    if (modelsRef.current.js.getValue() !== jsCode) {
      modelsRef.current.js.setValue(jsCode);
    }
    if (modelsRef.current.css && modelsRef.current.css.getValue() !== cssCode) {
      modelsRef.current.css.setValue(cssCode);
    }
    if (modelsRef.current.xml && xmlCode !== undefined && modelsRef.current.xml.getValue() !== xmlCode) {
      modelsRef.current.xml.setValue(xmlCode);
    }
  }, [htmlCode, jsCode, cssCode, xmlCode]);

  // Switch Monaco model on tab change
  useEffect(() => {
    if (editorRef.current && modelsRef.current[activeTab]) {
      editorRef.current.setModel(modelsRef.current[activeTab]);
    }
  }, [activeTab]);

  // Propagate deploy errors as Monaco markers
  useEffect(() => {
    const monaco = monacoRef.current;
    if (!monaco) return;

    // Clear all markers first
    (['html', 'js', 'css', 'xml'] as TabType[]).forEach((t) => {
      if (modelsRef.current[t]) {
        monaco.editor.setModelMarkers(modelsRef.current[t], 'lwc', []);
      }
    });

    if (!errors || errors.length === 0) return;

    const markers: Record<TabType, any[]> = { html: [], js: [], css: [], xml: [] };
    errors.forEach((err) => {
      const marker = {
        severity: monaco.MarkerSeverity.Error,
        message: err.problem,
        startLineNumber: err.lineNumber || 1,
        startColumn: err.columnNumber || 1,
        endLineNumber: err.lineNumber || 1,
        endColumn: 100,
      };
      if (err.fileName.endsWith('.html')) markers.html.push(marker);
      else if (err.fileName.endsWith('.js')) markers.js.push(marker);
      else if (err.fileName.endsWith('.css')) markers.css.push(marker);
      else if (err.fileName.endsWith('.xml')) markers.xml.push(marker);
    });

    (['html', 'js', 'css', 'xml'] as TabType[]).forEach((t) => {
      if (modelsRef.current[t]) {
        monaco.editor.setModelMarkers(modelsRef.current[t], 'lwc', markers[t]);
      }
    });
  }, [errors]);

  const tabs = (['html', 'js', 'css', 'xml'] as TabType[]);

  return (
    <div className="flex flex-col h-full w-full overflow-hidden" style={{ background: '#171B22' }}>
      {/* ── File Tabs ───────────────────────────────────────────────────────── */}
      <div
        className="editor-tabbar flex border-b overflow-x-auto flex-shrink-0"
        style={{ borderColor: 'rgba(30,37,48,0.7)' }}
      >
        {tabs.map((tab) => {
          const cfg = TAB_CONFIG[tab];
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className="flex items-center gap-2 px-4 py-2.5 text-xs font-mono flex-shrink-0 select-none relative"
              style={{
                background: isActive ? '#1A1E25' : 'transparent',
                color: isActive ? '#E6EDF3' : '#4D5F73',
                fontWeight: isActive ? 600 : 400,
                borderBottom: isActive ? '2px solid #F77F00' : '2px solid transparent',
                borderTop: '2px solid transparent',
                transition: 'color 0.15s ease, background 0.15s ease, border-color 0.15s ease',
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.color = '#8B9EB7';
                  (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  (e.currentTarget as HTMLElement).style.color = '#4D5F73';
                  (e.currentTarget as HTMLElement).style.background = 'transparent';
                }
              }}
            >
              <span className="flex-shrink-0" style={{ opacity: isActive ? 1 : 0.6 }}>{cfg.icon}</span>
              <span>{cfg.label}</span>
              {/* Error dot */}
              {errors.some((e) =>
                (tab === 'html' && e.fileName.endsWith('.html')) ||
                (tab === 'js' && e.fileName.endsWith('.js')) ||
                (tab === 'css' && e.fileName.endsWith('.css')) ||
                (tab === 'xml' && e.fileName.endsWith('.xml'))
              ) && (
                <span
                  className="w-1.5 h-1.5 rounded-full ml-0.5 flex-shrink-0"
                  style={{ background: '#FF7B72' }}
                />
              )}
            </button>
          );
        })}

        {/* Right spacer */}
        <div className="flex-1" />
      </div>

      {/* ── Monaco Editor ─────────────────────────────────────────────────────── */}
      <div className="flex-1 relative" style={{ minHeight: 0 }}>
        <Editor
          height="100%"
          width="100%"
          theme={themeRegistered ? 'forge-dark' : 'vs-dark'}
          beforeMount={handleEditorWillMount}
          onMount={handleEditorOnMount}
          options={{
            minimap: { enabled: false },
            fontSize: 13,
            fontFamily: '"JetBrains Mono", "Fira Code", "Cascadia Code", monospace',
            fontLigatures: true,
            lineHeight: 22,
            wordWrap: 'on',
            lineNumbersMinChars: 3,
            lineNumbers: 'on',
            formatOnPaste: true,
            formatOnType: false,
            scrollBeyondLastLine: false,
            padding: { top: 16, bottom: 16 },
            renderLineHighlight: 'all',
            cursorBlinking: 'smooth',
            cursorSmoothCaretAnimation: 'on',
            cursorWidth: 2,
            smoothScrolling: true,
            tabSize: 2,
            insertSpaces: true,
            bracketPairColorization: { enabled: true },
            guides: {
              bracketPairs: true,
              indentation: true,
            },
            renderWhitespace: 'none',
            scrollbar: {
              verticalScrollbarSize: 6,
              horizontalScrollbarSize: 6,
              useShadows: true,
            },
            overviewRulerBorder: false,
            overviewRulerLanes: 0,
            folding: true,
            foldingStrategy: 'indentation',
            showFoldingControls: 'mouseover',
            contextmenu: true,
            quickSuggestions: {
              other: true,
              comments: false,
              strings: false,
            },
            suggestOnTriggerCharacters: true,
            acceptSuggestionOnEnter: 'on',
            inlineSuggest: { enabled: true },
          }}
        />
      </div>
    </div>
  );
}



