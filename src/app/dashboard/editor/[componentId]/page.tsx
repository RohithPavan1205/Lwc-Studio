import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import EditorShell from './EditorShell';

interface EditorPageProps {
  params: { componentId: string };
}

export default async function EditorPage({ params }: EditorPageProps) {
  const { componentId } = params;

  // ── 1. Auth check ─────────────────────────────────────────────────────────
  const supabase = createClient();
  if (!supabase) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-[#f85149] font-bold mb-2">Configuration Error</p>
          <p className="text-[#8b949e] text-sm">Supabase is not configured correctly.</p>
        </div>
      </div>
    );
  }

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return redirect('/login');
  }

  // ── 2. Load component data ─────────────
  const { data: component, error: compError } = await supabase
    .from('components')
    .select('id, name, html_content, js_content, css_content')
    .eq('id', componentId)
    .single();

  if (compError || !component) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-[#f85149] font-bold text-lg mb-2">Component Not Found</p>
          <p className="text-[#8b949e] text-sm">
            Component <code className="text-[#79c0ff]">{componentId}</code> does not exist or you don&apos;t have access.
          </p>
          <a
            href="/dashboard"
            className="mt-6 inline-block px-6 py-2 rounded-lg bg-[#00a1e0] text-white text-sm font-semibold hover:bg-[#0090c7] transition-all"
          >
            Back to Dashboard
          </a>
        </div>
      </div>
    );
  }

  // ── 3. Fetch user profile for NavBar ─────────────────────────────────────
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name')
    .eq('id', user.id)
    .single();

  // ── 4. Check if Salesforce org is connected (service role to bypass RLS) ──
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL ?? '';
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? '';
  let isOrgConnected = false;

  if (supabaseUrl && serviceRoleKey) {
    const adminSupabase = createAdminClient(supabaseUrl, serviceRoleKey);
    const { data: sfConn } = await adminSupabase
      .from('salesforce_connections')
      .select('id')
      .eq('user_id', user.id)
      .maybeSingle();
    isOrgConnected = !!sfConn;
  }

  return (
    <EditorShell
      componentId={componentId}
      componentName={component.name}
      htmlContent={component.html_content ?? ''}
      jsContent={component.js_content ?? ''}
      cssContent={component.css_content ?? ''}
      userId={user.id}
      userFullName={profile?.full_name ?? ''}
      userEmail={user.email ?? ''}
      isOrgConnected={isOrgConnected}
    />
  );
}
