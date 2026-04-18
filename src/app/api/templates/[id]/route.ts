import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/templates/[id]
 * Returns full template including LWC source code.
 */
export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client error' }, { status: 500 });
    }

    const { data: template, error } = await supabase
      .from('templates')
      .select('*')
      .eq('id', params.id)
      .eq('is_active', true)
      .single();

    if (error || !template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 });
    }

    return NextResponse.json({ template });
  } catch (err) {
    console.error('[GET /api/templates/[id]] crash:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
