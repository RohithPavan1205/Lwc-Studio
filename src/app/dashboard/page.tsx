import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import { logout } from '@/app/auth/actions';
import { checkAndRefreshToken } from '@/utils/salesforce';

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
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
  } catch {
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

  // Check for Salesforce connection
  let sfConnection = null;
  let sfOrgName = 'Connected Org';
  try {
    const { data } = await supabase
      .from('salesforce_connections')
      .select('instance_url, updated_at')
      .eq('user_id', user.id)
      .maybeSingle();

    if (data) {
      sfConnection = data;
      // Real-time access token check and refresh
      const validToken = await checkAndRefreshToken(user.id);
      if (validToken) {
        // Fetch Org Name / Username
        const userInfoResponse = await fetch(`${data.instance_url}/services/oauth2/userinfo`, {
          headers: { Authorization: `Bearer ${validToken}` },
          next: { revalidate: 3600 } // cache for an hour to avoid spamming SF API on every render
        });
        if (userInfoResponse.ok) {
          const userInfo = await userInfoResponse.json();
          sfOrgName = userInfo.organization_name || userInfo.name || 'Salesforce Org';
        }
      }
    }
  } catch (err) {
    console.error('Error fetching sf_connection:', err);
  }

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

          <div className="void-card p-6 flex flex-col space-y-4 border border-[var(--outline-variant)]">
            <div className="flex justify-between items-center whitespace-nowrap overflow-hidden">
              <div className="flex items-center space-x-4 flex-1">
                <div className={`w-10 h-10 rounded flex items-center justify-center ${sfConnection ? 'bg-[#00a1e0] bg-opacity-10' : 'bg-[var(--surface-container-high)] flex-shrink-0'}`}>
                   <div className={`w-5 h-5 rounded-sm border-2 ${sfConnection ? 'border-[#00a1e0]' : 'border-[var(--on-surface-variant)]'} border-b-0`} />
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-bold text-[var(--on-surface)]">Salesforce Connection</h3>
                  {sfConnection ? (
                    <p className="text-sm text-[#00a1e0] mt-1 flex items-center truncate">
                      <span className="w-2 h-2 rounded-full bg-[#00a1e0] mr-2"></span>
                      {sfOrgName} ■ {sfConnection.instance_url}
                    </p>
                  ) : (
                    <p className="text-sm text-[var(--on-surface-variant)] mt-1">
                      No org connected.
                    </p>
                  )}
                </div>
              </div>
              {!sfConnection ? (
                <form action="/api/auth/salesforce/login" method="GET" className="ml-4">
                  <button className="text-xs font-bold uppercase tracking-wide bg-[#00a1e0] text-white px-6 py-3 rounded hover:bg-opacity-90 transition-all shadow-lg flex-shrink-0">
                    Connect Org
                  </button>
                </form>
              ) : (
                <form action="/api/salesforce/disconnect" method="POST" className="ml-4">
                  <button className="text-xs font-bold uppercase tracking-wide text-[var(--error)] border border-[var(--error)] border-opacity-30 px-6 py-3 rounded hover:bg-[var(--error)] hover:bg-opacity-10 transition-all flex-shrink-0">
                    Disconnect Org
                  </button>
                </form>
              )}
            </div>
            
            {searchParams?.error && (
              <div className="mt-4 p-3 bg-[var(--error)] bg-opacity-10 border border-[var(--error)] rounded text-xs text-[var(--error)]">
                <p className="font-bold uppercase tracking-wider mb-1">Connection Error</p>
                <p>{searchParams.error} {searchParams.desc ? `- ${searchParams.desc}` : ''}</p>
              </div>
            )}
            {searchParams?.success && (
              <div className="mt-4 p-3 bg-[#4caf50] bg-opacity-10 border border-[#4caf50] rounded text-xs text-[#4caf50]">
                <p className="font-bold uppercase tracking-wider mb-1">Success</p>
                <p>Salesforce Org successfully connected and verified.</p>
              </div>
            )}
          </div>

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
