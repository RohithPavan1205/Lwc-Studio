import { createClient } from '@/utils/supabase/server';

interface TokenRefreshResponse {
  access_token: string;
  signature: string;
  scope: string;
  instance_url: string;
  id: string;
  token_type: string;
  issued_at: string;
}

export async function checkAndRefreshToken(userId: string): Promise<string | null> {
  const supabase = createClient();
  if (!supabase) return null;

  // 1. Read the token from salesforce_connections
  const { data: connection, error } = await supabase
    .from('salesforce_connections')
    .select('access_token, refresh_token, token_expiry, instance_url')
    .eq('user_id', userId)
    .single();

  if (error || !connection) {
    console.error('No Salesforce connection found for user or error:', error);
    return null;
  }

  const now = new Date();
  const expiryTime = connection.token_expiry ? new Date(connection.token_expiry) : new Date(0);
  
  // Checks if token_expiry is within 5 minutes or already expired
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (fiveMinutesFromNow >= expiryTime) {
    console.log('Token expiring soon or expired. Refreshing...');
    if (!connection.refresh_token) {
      console.error('No refresh token available to refresh access_token.');
      return null;
    }

    const clientId = process.env.SALESFORCE_CLIENT_ID;
    const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
    const loginUrl = process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com';

    if (!clientId || !clientSecret) {
      console.error('Missing configured client ID/Secret for refresh');
      return null;
    }

    try {
      // Calls Salesforce token refresh endpoint
      const response = await fetch(`${loginUrl}/services/oauth2/token`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          grant_type: 'refresh_token',
          client_id: clientId,
          client_secret: clientSecret,
          refresh_token: connection.refresh_token,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        console.error('Failed to refresh token API:', data);
        return null;
      }

      const newAccessToken = data.access_token;
      // Salesforce doesn't always send a new refresh token, fallback to old one if missing
      const newRefreshToken = data.refresh_token || connection.refresh_token; 
      
      // Let's set the new expiry to 2 hours from now
      const newExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

      // Updates the new access_token and token_expiry in Supabase
      const { error: updateError } = await supabase
        .from('salesforce_connections')
        .update({
          access_token: newAccessToken,
          refresh_token: newRefreshToken,
          token_expiry: newExpiry,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        console.error('Failed to save refreshed token to DB:', updateError);
        return null;
      }

      return newAccessToken;

    } catch (err) {
      console.error('Unexpected error during token refresh:', err);
      return null;
    }
  }

  // Token is still valid
  return connection.access_token;
}
