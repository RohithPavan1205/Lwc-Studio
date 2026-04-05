import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const { id, htmlContent, jsContent, cssContent } = await request.json();

    if (!id) return NextResponse.json({ error: 'Component ID required' }, { status: 400 });

    const supabase = createClient();
    if (!supabase) return NextResponse.json({ error: 'Supabase client error' }, { status: 500 });
    
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Ensure updating components in DB and inserting version snapshot
    const { error: updateError } = await supabase
      .from('components')
      .update({
        html_content: htmlContent,
        js_content: jsContent,
        css_content: cssContent
        // updated_at is handled by DB triggers
      })
      .eq('id', id);

    if (updateError) {
      console.error('Component save error:', updateError);
      return NextResponse.json({ error: 'Failed to update component' }, { status: 500 });
    }

    // Create a new snapshot in versions table
    const { error: versionError } = await supabase
      .from('versions')
      .insert({
        component_id: id,
        html_content: htmlContent,
        js_content: jsContent,
        css_content: cssContent
      });

    if (versionError) {
      console.error('Snapshot creation error:', versionError);
      return NextResponse.json({ error: 'Warning: saved but failed to snapshot version' }, { status: 500 });
    }

    return NextResponse.json({ success: true, updated_at: new Date().toISOString() });

  } catch (err: any) {
    console.error('API Error:', err);
    return NextResponse.json({ error: 'Server Error' }, { status: 500 });
  }
}
