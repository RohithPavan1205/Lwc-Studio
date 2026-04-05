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

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });


    const { data, error } = await supabase
      .from('components')
      .select('*')
      .eq('id', componentId)
      .single();

    if (error || !data) {
      console.error('Load Error:', error);
      return NextResponse.json({ error: 'Component not found' }, { status: 404 });
    }

    return NextResponse.json(data);

  } catch (err) {
    console.error('Load Crash:', err);
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
