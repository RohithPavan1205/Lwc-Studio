import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = 'force-dynamic';

export async function POST() {
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

  const { error } = await supabase
    .from('salesforce_connections')
    .delete()
    .eq('user_id', user.id);

  if (error) {
    return NextResponse.json({ error: 'Failed to disconnect org' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
