import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const componentId = params.id;
    if (!componentId) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const supabase = createClient();
    if (!supabase) return NextResponse.json({ error: 'Supabase client error' }, { status: 500 });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Ownership check: only return the component if this user owns it
    const { data, error } = await supabase
      .from('components')
      .select('id, name, html_content, js_content, css_content, meta_xml, updated_at')
      .eq('id', componentId)
      .eq('user_id', user.id) // ownership check
      .single();

    if (error || !data) {
      return NextResponse.json({ error: 'Component not found or access denied' }, { status: 404 });
    }

    return NextResponse.json(data);
  } catch (err) {
    console.error('[load] Crash:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const componentId = params.id;
    if (!componentId) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const supabase = createClient();
    if (!supabase) return NextResponse.json({ error: 'Supabase client error' }, { status: 500 });

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Ownership check: only delete if this user owns it
    const { error, count } = await supabase
      .from('components')
      .delete()
      .eq('id', componentId)
      .eq('user_id', user.id); // ownership check

    if (error) {
      console.error('[delete] Error:', error);
      return NextResponse.json({ error: 'Failed to delete component' }, { status: 500 });
    }

    if (count === 0) {
      return NextResponse.json({ error: 'Component not found or access denied' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[delete] Crash:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
