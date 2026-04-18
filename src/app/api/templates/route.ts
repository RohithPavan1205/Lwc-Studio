import { NextResponse } from 'next/server';
import { createAdminClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/templates
 * Query params:
 *   category      - filter by category name
 *   complexity    - beginner | intermediate | advanced
 *   search        - text search on name, description
 *   hasAnimation  - true | false
 *   featured      - true (only featured)
 *   page          - page number (default 1)
 *   limit         - items per page (default 24, max 100)
 */
export async function GET(request: Request) {
  try {
    const supabase = createAdminClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Supabase client error' }, { status: 500 });
    }

    const { searchParams } = new URL(request.url);
    const category    = searchParams.get('category');
    const complexity  = searchParams.get('complexity');
    const search      = searchParams.get('search');
    const hasAnimation = searchParams.get('hasAnimation');
    const featured    = searchParams.get('featured');
    const page        = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit       = Math.min(100, Math.max(1, parseInt(searchParams.get('limit') ?? '24', 10)));
    const offset      = (page - 1) * limit;

    // ── Build query ──────────────────────────────────────────────────────────
    let query = supabase
      .from('templates')
      .select(
        'id, name, component_name, category, tags, complexity, has_animation, has_interaction, has_javascript, description, original_author, html_content, is_featured, view_count, use_count, created_at',
        { count: 'exact' }
      )
      .eq('is_active', true)
      .order('created_at', { ascending: false });

    if (category)     query = query.eq('category', category);
    if (complexity)   query = query.eq('complexity', complexity);
    if (hasAnimation === 'true') query = query.eq('has_animation', true);
    if (featured === 'true')     query = query.eq('is_featured', true);

    if (search) {
      query = query.or(
        `name.ilike.%${search}%,description.ilike.%${search}%,original_author.ilike.%${search}%`
      );
    }

    const { data: templates, count, error } = await query.range(offset, offset + limit - 1);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      templates: templates ?? [],
      total: count ?? 0,
      page,
      limit,
      totalPages: Math.ceil((count ?? 0) / limit),
    });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
