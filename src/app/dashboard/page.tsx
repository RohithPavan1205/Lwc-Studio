import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { logout } from '@/app/auth/actions';

export default async function DashboardPage() {
  const supabase = createClient();

  // If Supabase is missing config, help the user troubleshoot
  if (!supabase) {
    return (
      <div className="min-h-screen bg-[var(--background)] flex items-center justify-center p-8">
        <div className="void-card p-12 max-w-lg border border-[var(--error)] border-opacity-30">
          <h1 className="text-xl font-bold text-[var(--error)] mb-4 uppercase tracking-tighter">System Configuration Error</h1>
          <p className="text-sm text-[var(--on-surface-variant)] leading-relaxed">
            The Precision Void Engine could not be initialized. Please ensure your 
            <code className="bg-black/40 px-2 py-0.5 rounded mx-1 italic">NEXT_PUBLIC_SUPABASE_URL</code> and 
            <code className="bg-black/40 px-2 py-0.5 rounded mx-1 italic">NEXT_PUBLIC_SUPABASE_ANON_KEY</code> 
            environment variables are configured correctly in your Vercel Dashboard.
          </p>
          <div className="mt-8 pt-8 border-t border-[var(--outline-variant)]">
            <p className="text-[10px] text-[var(--outline)] uppercase tracking-widest font-mono">Digest: 500_CONFIG_MISSING</p>
          </div>
        </div>
      </div>
    );
  }

  let user;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch (e) {
    user = null;
  }

  if (!user) {
    return redirect('/login');
  }

  // Fetch profile to show full name
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  return (
    <main className="min-h-screen bg-[var(--background)] flex flex-col">
      {/* Dashboard Nav */}
      <nav className="border-b border-[var(--outline-variant)] px-8 py-4 flex justify-between items-center bg-[var(--surface-container-low)]">
        <div className="flex items-center space-x-4">
          <h2 className="text-lg font-bold tracking-tight text-[var(--on-surface)]">LWC Studio</h2>
          <span className="text-[10px] bg-[var(--primary-container)] text-[var(--on-primary-container)] px-2 py-0.5 rounded font-mono uppercase">Dashboard</span>
        </div>
        
        <div className="flex items-center space-x-6">
          <span className="text-sm text-[var(--on-surface-variant)]">
            User: <span className="text-[var(--on-surface)] font-medium">{profile?.full_name || user.email}</span>
          </span>
          <form action={logout}>
            <button className="text-xs uppercase tracking-widest font-bold text-[var(--error)] hover:bg-[var(--error)] hover:bg-opacity-10 px-4 py-2 rounded transition-all">
              Terminate Session
            </button>
          </form>
        </div>
      </nav>

      {/* Main Content Area */}
      <div className="flex-1 p-8">
        <div className="max-w-5xl mx-auto space-y-8">
          <header>
            <h1 className="text-3xl font-bold text-[var(--on-surface)]">Welcome back, {profile?.full_name?.split(' ')[0] || 'Developer'}</h1>
            <p className="text-[var(--on-surface-variant)] mt-2">Initialize your next mission-critical LWC project.</p>
          </header>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="void-card p-6 flex flex-col space-y-4 border border-transparent hover:border-[var(--primary)] transition-all cursor-pointer group">
              <div className="w-10 h-10 rounded bg-[var(--primary)] bg-opacity-10 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-[var(--primary)] rounded-sm" />
              </div>
              <div>
                <h3 className="font-bold text-[var(--on-surface)] group-hover:text-[var(--primary)] transition-colors">New Project</h3>
                <p className="text-xs text-[var(--on-surface-variant)] mt-1">Start from a clean slate or template.</p>
              </div>
            </div>

            <div className="void-card p-6 flex flex-col space-y-4 border border-transparent hover:border-[var(--secondary)] transition-all cursor-pointer group">
               <div className="w-10 h-10 rounded bg-[var(--secondary)] bg-opacity-10 flex items-center justify-center">
                 <div className="w-5 h-5 border-2 border-[var(--secondary)] rounded-full" />
               </div>
               <div>
                 <h3 className="font-bold text-[var(--on-surface)] group-hover:text-[var(--secondary)] transition-colors">Import LWC</h3>
                 <p className="text-xs text-[var(--on-surface-variant)] mt-1">Sync existing components from Salesforce.</p>
               </div>
            </div>

            <div className="void-card p-6 flex flex-col space-y-4 border border-transparent hover:border-[var(--tertiary)] transition-all cursor-pointer group">
               <div className="w-10 h-10 rounded bg-[var(--tertiary)] bg-opacity-10 flex items-center justify-center">
                 <div className="w-1 h-5 bg-[var(--tertiary)] rounded-full" />
               </div>
               <div>
                 <h3 className="font-bold text-[var(--on-surface)] group-hover:text-[var(--tertiary)] transition-colors">System Health</h3>
                 <p className="text-xs text-[var(--on-surface-variant)] mt-1">Check API limits and connection status.</p>
               </div>
            </div>
          </div>

          <section className="pt-8">
             <div className="void-sunken rounded-[var(--radius-md)] p-12 flex flex-col items-center justify-center text-center space-y-4 opacity-50">
                <p className="void-label mb-0">No Active Projects</p>
                <p className="text-xs text-[var(--on-surface-variant)]">You haven&apos;t initialized any workspace environments yet.</p>
             </div>
          </section>
        </div>
      </div>
    </main>
  );
}
