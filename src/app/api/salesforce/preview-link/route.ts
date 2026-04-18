import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkAndRefreshToken } from '@/utils/salesforce';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const componentName = searchParams.get('c');
    
    if (!componentName) {
      return NextResponse.json({ error: 'Component name is required' }, { status: 400 });
    }

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

    // Refresh token if needed
    const token = await checkAndRefreshToken(user.id);
    if (!token) {
      return NextResponse.json({ error: 'Failed to retrieve Salesforce token' }, { status: 401 });
    }

    // Get instance URL - DO NOT select preview_page_url as it likely doesn't exist in schema
    const { data: conn, error: connError } = await supabase
      .from('salesforce_connections')
      .select('instance_url')
      .eq('user_id', user.id)
      .single();

    if (connError || !conn?.instance_url) {
      return NextResponse.json({ error: 'No Salesforce connection found' }, { status: 404 });
    }

    // Generate secure frontdoor link to the isolated Visualforce preview page.
    // This completely bypasses the Salesforce UI chrome ("the org" frame) 
    // and natively renders only the white-labeled component.
    const pagePath = `/apex/LWC_Studio_Preview?c=${componentName}`;
    const retURL = encodeURIComponent(pagePath);
    const previewUrl = `${conn.instance_url}/secur/frontdoor.jsp?sid=${token}&retURL=${retURL}`;

    return NextResponse.json({ success: true, previewUrl });
  } catch {
    return NextResponse.json({ error: 'Server error' }, { status: 500 });
  }
}
