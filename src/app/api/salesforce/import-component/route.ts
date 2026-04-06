import { NextResponse } from 'next/server';
import { createClient, createAdminClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = createClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Database service unavailable' }, { status: 500 });
    }

    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await request.json();
    const { name, htmlContent, jsContent, cssContent } = body;

    if (!name) {
      return NextResponse.json({ error: 'Component name is required' }, { status: 400 });
    }

    const adminClient = createAdminClient();
    if (!adminClient) {
      return NextResponse.json({ error: 'Server configuration error' }, { status: 500 });
    }

    // 1. Check if component with this name already exists for this user
    const { data: existingComponent, error: fetchError } = await adminClient
      .from('components')
      .select('id')
      .eq('user_id', user.id)
      .eq('name', name)
      .maybeSingle();

    if (fetchError) {
      console.error('[SF Import] Error checking existing component:', fetchError);
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }

    const now = new Date().toISOString();
    let componentId;

    if (existingComponent) {
      // 2a. Update existing
      console.log(`[SF Import] Updating existing component ${name} (${existingComponent.id})`);
      const { error: updateError } = await adminClient
        .from('components')
        .update({
          html_content: htmlContent || '',
          js_content: jsContent || '',
          css_content: cssContent || '',
          updated_at: now
        })
        .eq('id', existingComponent.id);

      if (updateError) {
        console.error('[SF Import] Error updating component:', updateError);
        return NextResponse.json({ error: 'Failed to update existing component' }, { status: 500 });
      }
      componentId = existingComponent.id;
    } else {
      // 2b. Insert new
      console.log(`[SF Import] Creating new component ${name}`);
      const { data: newComponent, error: insertError } = await adminClient
        .from('components')
        .insert({
          user_id: user.id,
          name,
          description: `Imported from Salesforce Org on ${new Date().toLocaleDateString()}`,
          html_content: htmlContent || '',
          js_content: jsContent || '',
          css_content: cssContent || '',
          created_at: now,
          updated_at: now
        })
        .select('id')
        .single();

      if (insertError || !newComponent) {
        console.error('[SF Import] Error inserting component:', insertError);
        return NextResponse.json({ error: 'Failed to create new component' }, { status: 500 });
      }
      componentId = newComponent.id;
    }

    return NextResponse.json({ success: true, componentId });

  } catch (error: any) {
    console.error('[SF Import] Unexpected error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
