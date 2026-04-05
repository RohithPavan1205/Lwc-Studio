'use client';
import { useState } from 'react';
import Editor from '@monaco-editor/react';

interface LwcEditorProps {
  htmlCode: string;
  jsCode: string;
  cssCode: string;
  onChange: (type: 'html' | 'js' | 'css', value: string) => void;
}

type TabType = 'html' | 'js' | 'css';

let snippetsRegistered = false;

export default function LwcEditor({ htmlCode, jsCode, cssCode, onChange }: LwcEditorProps) {
  const [activeTab, setActiveTab] = useState<TabType>('js');

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const handleEditorWillMount = (monacoInstance: any) => {
    // Only register snippets once to prevent duplicates during React hot reloads
    if (!snippetsRegistered) {
      monacoInstance.languages.registerCompletionItemProvider('javascript', {
        provideCompletionItems: () => {
          const suggestions = [
            {
              label: 'import lwc',
              kind: monacoInstance.languages.CompletionItemKind.Snippet,
              insertText: "import { LightningElement, api, wire, track } from 'lwc';\n",
              insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Import basic LWC decorators'
            },
            {
              label: '@api',
              kind: monacoInstance.languages.CompletionItemKind.Snippet,
              insertText: '@api ${1:propertyName};',
              insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Expose a public reactive property'
            },
            {
              label: '@track',
              kind: monacoInstance.languages.CompletionItemKind.Snippet,
              insertText: '@track ${1:propertyName} = {};',
              insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Define a private reactive property'
            },
            {
              label: '@wire',
              kind: monacoInstance.languages.CompletionItemKind.Snippet,
              insertText: '@wire(${1:adapter}, { ${2:adapterConfig} })\n${3:propertyOrFunction};',
              insertTextRules: monacoInstance.languages.CompletionItemInsertTextRule.InsertAsSnippet,
              documentation: 'Wire a property or function to an apex method or data adapter'
            }
          ];
          return { suggestions: suggestions };
        }
      });
      snippetsRegistered = true;
    }

    // Configure basic syntax options
    monacoInstance.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
      noSemanticValidation: false,
      noSyntaxValidation: false,
    });
    
    // Set compiler options to support decorators for LWC
    monacoInstance.languages.typescript.javascriptDefaults.setCompilerOptions({
      target: monacoInstance.languages.typescript.ScriptTarget.ES2020,
      experimentalDecorators: true,
      allowNonTsExtensions: true
    });
  };

  const getLanguage = () => {
    if (activeTab === 'html') return 'html';
    if (activeTab === 'css') return 'css';
    return 'javascript';
  };

  const getValue = () => {
    if (activeTab === 'html') return htmlCode;
    if (activeTab === 'css') return cssCode;
    return jsCode;
  };

  const handleEditorChange = (value: string | undefined) => {
    onChange(activeTab, value || '');
  };

  return (
    <div className="flex flex-col h-full w-full rounded-md overflow-hidden border border-[var(--outline-variant)] bg-[var(--surface-container)]">
      {/* Tab Header */}
      <div className="flex border-b border-[var(--outline-variant)] bg-[#1e1e1e] overflow-x-auto">
        {(['html', 'js', 'css'] as TabType[]).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-6 py-3 text-xs font-mono uppercase tracking-widest transition-colors ${
              activeTab === tab
                ? 'bg-[#00a1e0] bg-opacity-10 text-[#00a1e0] border-t-2 border-t-[#00a1e0]'
                : 'text-[#888] hover:bg-white hover:bg-opacity-5 border-t-2 border-t-transparent'
            }`}
          >
            {tab === 'html' ? 'template.html' : tab === 'js' ? 'component.js' : 'styles.css'}
          </button>
        ))}
      </div>
      
      {/* Editor Frame */}
      <div className="flex-1 relative min-h-[400px]">
        <Editor
          height="100%"
          width="100%"
          theme="vs-dark"
          language={getLanguage()}
          value={getValue()}
          onChange={handleEditorChange}
          beforeMount={handleEditorWillMount}
          options={{
            minimap: { enabled: false },
            fontSize: 14,
            wordWrap: 'on',
            lineNumbersMinChars: 3,
            formatOnPaste: true,
            scrollBeyondLastLine: false,
            padding: { top: 16 }
          }}
        />
      </div>
    </div>
  );
}
