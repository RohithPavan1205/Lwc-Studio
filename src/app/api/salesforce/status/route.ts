import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { checkAndRefreshToken } from '@/utils/salesforce';

export async function GET() {
  const supabase = createClient();
  if (!supabase) return NextResponse.json({ isConnected: false }, { status: 500 });

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ isConnected: false }, { status: 401 });

  const { data: connection } = await supabase
    .from('salesforce_connections')
    .select('instance_url')
    .eq('user_id', user.id)
    .maybeSingle();

  if (!connection) {
    return NextResponse.json({ isConnected: false });
  }

  const validToken = await checkAndRefreshToken(user.id);
  if (!validToken) {
    return NextResponse.json({ isConnected: false });
  }

  let orgName = 'Connected Org';
  try {
    const userInfoResponse = await fetch(`${connection.instance_url}/services/oauth2/userinfo`, {
      headers: {
        Authorization: `Bearer ${validToken}`,
      }
    });
    if (userInfoResponse.ok) {
      const userInfo = await userInfoResponse.json();
      // userinfo API provides organization_name usually along with user details
      orgName = userInfo.organization_name || userInfo.name || 'Salesforce Org';
    }
  } catch (e) {
    console.error('Failed to resolve user info', e);
  }

  return NextResponse.json({
    isConnected: true,
    instanceUrl: connection.instance_url,
    orgName: orgName
  });
}
