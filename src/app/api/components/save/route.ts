import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { id, htmlContent, jsContent, cssContent, xmlContent } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Component ID required' }, { status: 400 });
    }

    const supabase = createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client error' }, { status: 500 });
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date().toISOString();

    // ── Update with ownership check (user_id must match) ─────────────────
    // The .eq('user_id', user.id) prevents any user from overwriting
    // another user's component even if they guess the UUID.
    // select() + count:'exact' is required for Supabase to populate the count field.
    const { error: updateError, data } = await supabase
      .from('components')
      .update({
        html_content: htmlContent,
        js_content: jsContent,
        css_content: cssContent,
        ...(xmlContent !== undefined ? { meta_xml: xmlContent } : {}),
        updated_at: now,
      })
      .eq('id', id)
      .eq('user_id', user.id) // ownership check
      .select('id');

    if (updateError) {
      console.error('[save] Component update error:', updateError);
      return NextResponse.json({ error: 'Failed to update component' }, { status: 500 });
    }

    // If no row was returned, the component doesn't exist or access is denied
    if (!data || data.length === 0) {
      return NextResponse.json({ error: 'Component not found or access denied' }, { status: 403 });
    }

    // ── Version snapshot (best-effort) ────────────────────────────────────
    const { error: versionError } = await supabase.from('versions').insert({
      component_id: id,
      html_content: htmlContent,
      js_content: jsContent,
      css_content: cssContent,
      ...(xmlContent !== undefined ? { meta_xml: xmlContent } : {}),
      created_at: now,
    });

    if (versionError) {
      console.error(
        '[save] Version snapshot failed (non-fatal):',
        JSON.stringify(versionError, null, 2)
      );
      // Non-fatal — save succeeded, versioning is best-effort
    }

    return NextResponse.json({ success: true, componentId: id });
  } catch (err: unknown) {
    console.error('[save] Unexpected crash:', err);
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
