import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * POST /api/templates/[id]/view
 * Increments the view_count for analytics. No auth required.
 */
export async function POST(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client error' }, { status: 500 });
    }

    const { error } = await supabase.rpc('increment_template_view', {
      template_id: params.id,
    });

    if (error) {
      // Fallback: manual increment if RPC doesn't exist
      const { data: current } = await supabase
        .from('templates')
        .select('view_count')
        .eq('id', params.id)
        .single();

      if (current) {
        await supabase
          .from('templates')
          .update({ view_count: (current.view_count ?? 0) + 1 })
          .eq('id', params.id);
      }
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
