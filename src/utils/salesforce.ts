import { createClient } from '@/utils/supabase/server';
import { encryptToken, decryptToken } from '@/utils/crypto/tokens';


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
    return null;
  }

  const decryptedAccessToken = decryptToken(connection.access_token);
  const decryptedRefreshToken = connection.refresh_token ? decryptToken(connection.refresh_token) : null;

  const now = new Date();
  const expiryTime = connection.token_expiry ? new Date(connection.token_expiry) : new Date(0);
  
  // Checks if token_expiry is within 5 minutes or already expired
  const fiveMinutesFromNow = new Date(now.getTime() + 5 * 60 * 1000);

  if (fiveMinutesFromNow >= expiryTime) {
    if (!decryptedRefreshToken) {
      return null;
    }

    const clientId = process.env.SALESFORCE_CLIENT_ID;
    const clientSecret = process.env.SALESFORCE_CLIENT_SECRET;
    const loginUrl = process.env.SALESFORCE_LOGIN_URL || 'https://login.salesforce.com';

    if (!clientId || !clientSecret) {
      throw new Error('Missing configured Salesforce client ID/Secret for token refresh');
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
          refresh_token: decryptedRefreshToken,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (data.error === 'invalid_grant') {
          await supabase.from('salesforce_connections').update({ is_valid: false }).eq('user_id', userId);
          const error = new Error('Re-authentication required');
          error.name = 'REAUTH_REQUIRED';
          throw error;
        }
        return null;
      }

      const newAccessToken = data.access_token;
      // Salesforce doesn't always send a new refresh token, fallback to old one if missing
      const newRefreshToken = data.refresh_token || decryptedRefreshToken; 
      
      // Let's set the new expiry to 2 hours from now
      const newExpiry = new Date(Date.now() + 2 * 60 * 60 * 1000).toISOString();

      // Updates the new access_token and token_expiry in Supabase
      const { error: updateError } = await supabase
        .from('salesforce_connections')
        .update({
          access_token: encryptToken(newAccessToken),
          refresh_token: newRefreshToken ? encryptToken(newRefreshToken) : null,
          token_expiry: newExpiry,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (updateError) {
        throw new Error(`Failed to save refreshed token: ${updateError.message}`);
      }

      return newAccessToken;

    } catch (err) {
      if (err instanceof Error && err.name === 'REAUTH_REQUIRED') {
        throw err;
      }
      return null;
    }
  }

  // Token is still valid
  return decryptedAccessToken;
}
