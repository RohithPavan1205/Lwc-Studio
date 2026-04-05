'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { formatDistanceToNow } from 'date-fns';
import { ComponentMeta } from '@/types/components';

interface Props {
  components: ComponentMeta[];
}

export default function ProjectManager({ components }: Props) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [compName, setCompName] = useState('');
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState('');

  const handleCreate = async () => {
     if (!/^[a-z][a-zA-Z0-9_]*$/.test(compName)) {
        setError('Name must start with a lowercase letter and contain only alphanumeric characters or underscores.');
        return;
     }

     setIsCreating(true);
     setError('');
     try {
       const res = await fetch('/api/components/create', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json'},
         body: JSON.stringify({ name: compName })
       });
       const data = await res.json();
       if (!res.ok) throw new Error(data.error || 'Failed to create component');
       
       router.push(`/dashboard/editor/${data.id}`);
     } catch(err: unknown) {
       setError(err instanceof Error ? err.message : String(err));
       setIsCreating(false);
     }
  };

  return (
    <div className="space-y-8">
      {/* Action Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div 
          onClick={() => setShowModal(true)}
          className="void-card p-6 flex flex-col space-y-4 border border-[var(--outline-variant)] hover:border-[var(--primary)] transition-all cursor-pointer group shadow"
        >
          <div className="w-10 h-10 rounded bg-[var(--primary)] bg-opacity-10 flex items-center justify-center transition-transform group-hover:scale-110">
            <div className="w-4 h-4 border-2 border-[var(--primary)] rounded-sm" />
          </div>
          <div>
            <h3 className="font-bold text-[var(--on-surface)] group-hover:text-[var(--primary)] transition-colors">New Project</h3>
            <p className="text-xs text-[var(--on-surface-variant)] mt-1">Start from a clean slate or template.</p>
          </div>
        </div>

        <div className="void-card p-6 flex flex-col space-y-4 border border-[var(--outline-variant)] hover:border-[var(--secondary)] transition-all cursor-pointer group shadow opacity-70">
           <div className="w-10 h-10 rounded bg-[var(--secondary)] bg-opacity-10 flex items-center justify-center transition-transform group-hover:scale-110">
             <div className="w-4 h-4 border-2 border-[var(--secondary)] rounded-full" />
           </div>
           <div>
             <h3 className="font-bold text-[var(--on-surface)] group-hover:text-[var(--secondary)] transition-colors">Import LWC (Soon!)</h3>
             <p className="text-xs text-[var(--on-surface-variant)] mt-1">Sync existing components from Salesforce.</p>
           </div>
        </div>

        <div className="void-card p-6 flex flex-col space-y-4 border border-[var(--outline-variant)] hover:border-[var(--tertiary)] transition-all cursor-pointer group shadow opacity-70">
           <div className="w-10 h-10 rounded bg-[var(--tertiary)] bg-opacity-10 flex items-center justify-center transition-transform group-hover:scale-110">
             <div className="w-1 h-4 bg-[var(--tertiary)] rounded-full" />
           </div>
           <div>
             <h3 className="font-bold text-[var(--on-surface)] group-hover:text-[var(--tertiary)] transition-colors">System Health (Soon!)</h3>
             <p className="text-xs text-[var(--on-surface-variant)] mt-1">Check API limits and connection status.</p>
           </div>
        </div>
      </div>

      {/* Projects List */}
      <section className="pt-8">
         <h2 className="text-xl font-bold mb-4 font-mono uppercase tracking-widest text-[var(--on-surface-variant)]">Your Workspace</h2>
         {components.length === 0 ? (
           <div className="void-sunken border border-[var(--outline-variant)] rounded-[var(--radius-md)] p-12 flex flex-col items-center justify-center text-center space-y-4 opacity-70">
              <p className="font-bold text-lg text-[var(--on-surface)]">No Active Projects</p>
              <p className="text-sm text-[var(--on-surface-variant)]">You haven&apos;t initialized any components yet.</p>
           </div>
         ) : (
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
             {components.map(comp => (
               <div 
                 key={comp.id} 
                 onClick={() => router.push(`/dashboard/editor/${comp.id}`)}
                 className="p-5 border border-[var(--outline-variant)] rounded bg-[var(--surface-container)] hover:bg-[var(--surface-container-high)] cursor-pointer transition-colors shadow flex flex-col justify-between h-32 group"
               >
                 <div>
                   <h3 className="font-bold text-[#00a1e0] group-hover:text-blue-300 flex items-center">
                     <svg className="w-4 h-4 mr-2 text-[var(--on-surface-variant)]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4"></path></svg>
                     {comp.name}
                   </h3>
                 </div>
                 <div className="text-xs font-mono text-[var(--on-surface-variant)] uppercase tracking-wider flex justify-between">
                   <span>Modified:</span>
                   <span>{formatDistanceToNow(new Date(comp.updated_at), { addSuffix: true })}</span>
                 </div>
               </div>
             ))}
           </div>
         )}
      </section>

      {/* New Project Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-70 backdrop-blur-sm flex items-center justify-center p-4">
           <div className="bg-[var(--surface-container)] border border-[var(--outline-variant)] p-8 rounded shadow-2xl w-full max-w-md relative">
              <button 
                onClick={() => !isCreating && setShowModal(false)}
                className="absolute top-4 right-4 text-[var(--on-surface-variant)] hover:text-white"
              >
                 <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
              </button>
              
              <h2 className="text-2xl font-bold tracking-tight text-[var(--on-surface)] mb-2">New LWC</h2>
              <p className="text-sm text-[var(--on-surface-variant)] mb-6">Enter a strict Salesforce API name (e.g. <code className="text-[#00a1e0]">dataGridComponent</code>).</p>
              
              <div className="space-y-4">
                 <div>
                   <input 
                     disabled={isCreating}
                     type="text" 
                     value={compName}
                     onChange={(e) => setCompName(e.target.value)}
                     placeholder="componentName"
                     className="w-full bg-[var(--surface-container-high)] border border-[var(--outline-variant)] text-white p-3 rounded font-mono outline-none focus:border-[#00a1e0] transition-colors"
                   />
                 </div>
                 {error && <p className="text-red-400 text-xs font-bold">{error}</p>}
                 <button 
                   onClick={handleCreate}
                   disabled={isCreating || !compName}
                   className="w-full bg-[#00a1e0] hover:bg-opacity-90 disabled:opacity-50 text-white font-bold py-3 rounded uppercase tracking-widest text-sm transition-all shadow"
                 >
                   {isCreating ? 'Scaffolding...' : 'Create Component'}
                 </button>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
