import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  const supabase = createClient();
  if (!supabase) return NextResponse.redirect(new URL('/dashboard?error=db_error', request.url));

  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL('/dashboard?error=unauthorized', request.url));
  }

  const { error } = await supabase
    .from('salesforce_connections')
    .delete()
    .eq('user_id', user.id);

  if (error) {
    console.error('Failed to disconnect org:', error);
    return NextResponse.redirect(new URL('/dashboard?error=disconnect_failed', request.url));
  }

  return NextResponse.redirect(new URL('/dashboard?success=sf_disconnected', request.url));
}
