'use client';

import { useState, useEffect, useMemo } from 'react';
import { X, Search, Download, Loader2, AlertCircle } from 'lucide-react';

interface OrgComponent {
  Id: string;
  DeveloperName: string;
  MasterLabel: string;
  ApiVersion: number;
}

interface ImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete: () => void;
  existingComponentNames: string[];
}

export default function ImportModal({ isOpen, onClose, onComplete, existingComponentNames }: ImportModalProps) {
  const [components, setComponents] = useState<OrgComponent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusText, setStatusText] = useState('');
  const [conflicts, setConflicts] = useState<string[]>([]);
  const [resolveMode, setResolveMode] = useState<false | 'prompt'>(false);

  useEffect(() => {
    if (isOpen) {
      loadComponents();
    } else {
      setComponents([]);
      setSelectedIds(new Set());
      setSearch('');
      setError('');
      setProgress(0);
      setImporting(false);
      setConflicts([]);
      setResolveMode(false);
    }
  }, [isOpen]);

  const loadComponents = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/salesforce/import?action=list');
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to list components');
      
      setComponents(data.components || []);
    } catch (err: unknown) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const filtered = useMemo(() => {
    if (!search) return components;
    return components.filter(c => 
      c.DeveloperName.toLowerCase().includes(search.toLowerCase()) || 
      c.MasterLabel.toLowerCase().includes(search.toLowerCase())
    );
  }, [components, search]);

  const handleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const startImport = async () => {
    if (selectedIds.size === 0) return;
    
    // Check conflicts first
    const selected = components.filter(c => selectedIds.has(c.Id));
    const currentConflicts = selected.filter(c => existingComponentNames.includes(c.DeveloperName));
    
    if (currentConflicts.length > 0 && !resolveMode) {
      setConflicts(currentConflicts.map(c => c.DeveloperName));
      setResolveMode('prompt');
      return;
    }

    setImporting(true);
    setResolveMode(false);
    setProgress(0);

    let completed = 0;
    for (const comp of selected) {
      setStatusText(`Importing ${comp.DeveloperName}...`);
      try {
        // Fetch files
        const filesRes = await fetch(`/api/salesforce/import?action=files&bundleId=${comp.Id}`);
        if (!filesRes.ok) throw new Error('Files fetch failed');
        const filesData = await filesRes.json();

        // Check if name is conflict to see if we apply suffix
        let finalName = comp.DeveloperName;
        if (existingComponentNames.includes(comp.DeveloperName)) {
           finalName = `${comp.DeveloperName}_imported`;
        }

        // Post to create
        const createRes = await fetch('/api/components/create', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: finalName,
            htmlContent: filesData.html || '',
            jsContent: filesData.js || '',
            cssContent: filesData.css || '',
            metaXml: filesData.xml || ''
          })
        });

        if (!createRes.ok) {
          // Import for this component failed; progress continues
        }
      } catch {
        // Import error for individual component; progress continues
      }
      completed++;
      setProgress(Math.round((completed / selected.length) * 100));
    }

    setStatusText('Import complete!');
    setTimeout(() => {
      onComplete();
      onClose();
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#21262d] shrink-0">
          <h2 className="text-[#e6edf3] font-semibold text-lg flex items-center gap-2">
            <Download className="w-5 h-5 text-[#00a1e0]" />
            Import from Salesforce Org
          </h2>
          {!importing && (
            <button onClick={onClose} className="p-1 rounded-md text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] transition-colors">
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        <div className="p-6 flex-1 overflow-hidden flex flex-col min-h-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center flex-1 text-[#8b949e]">
              <Loader2 className="w-8 h-8 animate-spin text-[#00a1e0] mb-4" />
              <p>Fetching components from org...</p>
            </div>
          ) : importing ? (
             <div className="flex flex-col items-center justify-center flex-1">
               <Loader2 className="w-10 h-10 animate-spin text-[#00a1e0] mb-6" />
               <div className="w-full max-w-md bg-[#21262d] h-3 rounded-full overflow-hidden mb-3">
                 <div className="bg-[#00a1e0] h-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
               </div>
               <p className="text-[#e6edf3] font-medium">{statusText}</p>
               <p className="text-[#8b949e] text-sm mt-1">{progress}% Complete</p>
             </div>
          ) : resolveMode === 'prompt' ? (
             <div className="flex flex-col items-center justify-center flex-1 text-center max-w-md mx-auto">
               <AlertCircle className="w-12 h-12 text-[#d29922] mb-4" />
               <h3 className="text-[#e6edf3] text-lg font-bold mb-2">Name Conflicts Detected</h3>
               <p className="text-[#8b949e] text-sm mb-6">
                 {conflicts.length} component(s) already exist in your workspace: <br/>
                 <span className="text-[#e6edf3] font-mono block mt-2 text-xs opacity-80">{conflicts.join(', ')}</span>
               </p>
               <div className="flex gap-4">
                 <button onClick={() => setResolveMode(false)} className="px-4 py-2 rounded-lg bg-[#21262d] text-[#e6edf3] hover:bg-[#30363d] transition-colors font-medium">Cancel</button>
                 <button onClick={startImport} className="px-4 py-2 rounded-lg bg-[#00a1e0] text-white hover:bg-[#0090c7] transition-colors font-medium">Import as Copy (_imported)</button>
               </div>
             </div>
          ) : (
            <>
              {error ? (
                <div className="p-4 bg-[#da3633]/10 border border-[#da3633]/20 rounded-lg text-[#f85149] mb-4">
                  {error}
                </div>
              ) : null}

              <div className="relative mb-4 shrink-0">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8b949e]" />
                <input
                  type="text"
                  placeholder="Search by name or label..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 bg-[#0d1117] border border-[#30363d] rounded-lg text-sm text-[#e6edf3] placeholder:text-[#484f58] focus:outline-none focus:border-[#00a1e0]"
                />
              </div>

              <div className="flex-1 overflow-y-auto border border-[#30363d] rounded-lg min-h-0 bg-[#0d1117]">
                <table className="w-full text-left text-sm">
                  <thead className="bg-[#161b22] sticky top-0 border-b border-[#30363d]">
                    <tr>
                      <th className="w-12 px-4 py-3">
                        <input 
                          type="checkbox" 
                          className="rounded border-[#30363d] bg-transparent text-[#00a1e0] focus:ring-[#00a1e0] cursor-pointer"
                          checked={selectedIds.size === filtered.length && filtered.length > 0}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedIds(new Set(filtered.map(c => c.Id)));
                            else setSelectedIds(new Set());
                          }}
                        />
                      </th>
                      <th className="px-4 py-3 font-semibold text-[#8b949e]">Developer Name</th>
                      <th className="px-4 py-3 font-semibold text-[#8b949e]">Master Label</th>
                      <th className="px-4 py-3 font-semibold text-[#8b949e]">API Version</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-[#8b949e]">No components found</td>
                      </tr>
                    ) : (
                      filtered.map(comp => (
                        <tr 
                          key={comp.Id} 
                          className={`border-b border-[#21262d] last:border-0 hover:bg-[#161b22] cursor-pointer transition-colors ${selectedIds.has(comp.Id) ? 'bg-[#00a1e0]/5' : ''}`}
                          onClick={() => handleSelect(comp.Id)}
                        >
                          <td className="px-4 py-3">
                            <input 
                              type="checkbox" 
                              checked={selectedIds.has(comp.Id)}
                              readOnly
                              className="rounded border-[#30363d] bg-transparent text-[#00a1e0] focus:ring-[#00a1e0] cursor-pointer pointer-events-none"
                            />
                          </td>
                          <td className="px-4 py-3 font-medium text-[#e6edf3]">{comp.DeveloperName}</td>
                          <td className="px-4 py-3 text-[#8b949e]">{comp.MasterLabel}</td>
                          <td className="px-4 py-3 text-[#8b949e]">{comp.ApiVersion}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {!importing && resolveMode !== 'prompt' && (
          <div className="px-6 py-4 border-t border-[#21262d] shrink-0 flex items-center justify-between">
            <span className="text-sm text-[#8b949e]">{selectedIds.size} component(s) selected</span>
            <div className="flex gap-3">
              <button
                onClick={onClose}
                className="px-4 py-2 rounded-lg text-sm font-medium text-[#8b949e] hover:text-[#e6edf3] hover:bg-[#21262d] transition-all"
              >
                Cancel
              </button>
              <button
                onClick={startImport}
                disabled={selectedIds.size === 0}
                className="px-5 py-2 rounded-lg text-sm font-medium bg-[#00a1e0] hover:bg-[#0090c7] text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all"
              >
                Import Selected
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
