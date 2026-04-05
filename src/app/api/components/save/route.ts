import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const { id, htmlContent, jsContent, cssContent } = await request.json();

    if (!id) {
      return NextResponse.json({ error: 'Component ID required' }, { status: 400 });
    }

    const supabase = createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client error' }, { status: 500 });
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Step 1: Save to components table ─────────────────────────────────────
    const now = new Date().toISOString();
    const { error: updateError } = await supabase
      .from('components')
      .update({
        html_content: htmlContent,
        js_content: jsContent,
        css_content: cssContent,
        updated_at: now,
      })
      .eq('id', id);

    if (updateError) {
      console.error('[save] Component update error:', updateError);
      return NextResponse.json({ error: 'Failed to update component' }, { status: 500 });
    }

    // ── Step 2: Insert a version snapshot ────────────────────────────────────
    // This is best-effort — if it fails we still return success for the save
    const { error: versionError } = await supabase
      .from('versions')
      .insert({
        component_id: id,
        html_content: htmlContent,
        js_content: jsContent,
        css_content: cssContent,
        created_at: now,
      });

    if (versionError) {
      // Log the FULL error object so we can see exactly what went wrong
      console.error('[save] Version snapshot failed (non-fatal) — full error:', JSON.stringify(versionError, null, 2));
      // Still return success — save is more important than the snapshot
    }

    return NextResponse.json({ success: true, componentId: id });

  } catch (err: unknown) {
    console.error('[save] Unexpected crash:', err);
    const message = err instanceof Error ? err.message : 'Unknown server error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
