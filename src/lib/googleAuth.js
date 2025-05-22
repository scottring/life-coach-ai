import { supabase } from './supabaseClient';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_CALENDAR_SCOPE = import.meta.env.VITE_GOOGLE_CALENDAR_SCOPE;
// For popup OAuth flow, we don't need a redirect URI

// Initialize Google OAuth
export function initGoogleAuth() {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Google Auth not available in server environment'));
      return;
    }

    if (window.google?.accounts?.oauth2) {
      resolve(window.google.accounts.oauth2);
      return;
    }

    // Load Google OAuth script
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.onload = () => {
      if (window.google?.accounts?.oauth2) {
        resolve(window.google.accounts.oauth2);
      } else {
        reject(new Error('Failed to load Google OAuth library'));
      }
    };
    script.onerror = () => {
      reject(new Error('Failed to load Google OAuth script'));
    };
    document.head.appendChild(script);
  });
}

// Start Google Calendar OAuth flow
export async function startGoogleCalendarAuth(accountLabel = 'Work') {
  try {
    const oauth2 = await initGoogleAuth();
    
    const client = oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_CALENDAR_SCOPE,
      callback: async (response) => {
        if (response.access_token) {
          await handleAccessToken(response, 'google_calendar', accountLabel);
        }
      },
    });

    client.requestAccessToken();
  } catch (error) {
    console.error('Error starting Google Calendar auth:', error);
    throw error;
  }
}

// Start Google Gmail OAuth flow
export async function startGoogleGmailAuth(accountLabel = 'Work') {
  try {
    console.log('Starting Gmail auth with:', {
      client_id: GOOGLE_CLIENT_ID,
      scope: import.meta.env.VITE_GOOGLE_GMAIL_SCOPE,
      origin: window.location.origin
    });
    
    const oauth2 = await initGoogleAuth();
    
    const client = oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: import.meta.env.VITE_GOOGLE_GMAIL_SCOPE,
      callback: async (response) => {
        console.log('OAuth response:', response);
        if (response.access_token) {
          await handleAccessToken(response, 'gmail', accountLabel);
        } else if (response.error) {
          console.error('OAuth error:', response.error);
          alert(`OAuth error: ${response.error}`);
        }
      },
    });

    client.requestAccessToken();
  } catch (error) {
    console.error('Error starting Google Gmail auth:', error);
    throw error;
  }
}

// Handle the access token from Google OAuth popup
async function handleAccessToken(tokenResponse, service, accountLabel) {
  try {
    console.log('handleAccessToken called with:', { service, accountLabel, tokenResponse });
    
    // Get Google user info to extract email
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokenResponse.access_token}`,
      },
    });
    
    if (!userInfoResponse.ok) {
      console.error('Failed to get Google user info:', userInfoResponse.status, userInfoResponse.statusText);
      throw new Error('Failed to get Google user info');
    }
    
    const googleUser = await userInfoResponse.json();
    console.log('Google user info:', googleUser);
    
    // Get current user
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      console.error('Auth error:', authError);
      throw new Error('No authenticated user found');
    }
    console.log('Current user:', user.id);

    // Check if this is the first account for this service
    const { data: existingAccounts, error: fetchError } = await supabase
      .from('integration_credentials')
      .select('id')
      .eq('user_id', user.id)
      .eq('service', service);

    if (fetchError) {
      console.error('Error fetching existing accounts:', fetchError);
    }
    console.log('Existing accounts:', existingAccounts);

    const isPrimaryAccount = !existingAccounts || existingAccounts.length === 0;
    console.log('Is primary account:', isPrimaryAccount);

    const credentialsData = {
      user_id: user.id,
      service: service,
      credentials: {
        access_token: tokenResponse.access_token,
        refresh_token: null, // Token client doesn't provide refresh tokens
        expires_at: new Date(Date.now() + (tokenResponse.expires_in || 3600) * 1000).toISOString(),
        scope: tokenResponse.scope,
        account_label: accountLabel,
        account_email: googleUser.email,
        is_primary: isPrimaryAccount,
      },
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    
    console.log('Attempting to upsert credentials:', credentialsData);

    // Store credentials in Supabase
    const { data: upsertData, error: upsertError } = await supabase
      .from('integration_credentials')
      .upsert(credentialsData);

    if (upsertError) {
      console.error('Upsert error:', upsertError);
      throw upsertError;
    }
    
    console.log('Upsert successful:', upsertData);
    console.log(`Successfully connected ${service} (${accountLabel}: ${googleUser.email})!`);
    return { tokens: tokenResponse, accountEmail: googleUser.email };
  } catch (error) {
    console.error('Error handling access token:', error);
    throw error;
  }
}

// Get stored access token for a service
export async function getAccessToken(service, accountEmail = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }

    let query = supabase
      .from('integration_credentials')
      .select('credentials')
      .eq('user_id', user.id)
      .eq('service', service);

    const { data, error } = await query;

    if (error || !data || data.length === 0) {
      return null;
    }

    // Find the account we want (specific email or primary)
    let targetCredentials = null;
    if (accountEmail) {
      // Find specific account by email
      targetCredentials = data.find(item => item.credentials?.account_email === accountEmail);
    } else {
      // Find primary account or use first available
      targetCredentials = data.find(item => item.credentials?.is_primary) || data[0];
    }

    if (!targetCredentials?.credentials) {
      return null;
    }

    const credentials = targetCredentials.credentials;
    const expiresAt = new Date(credentials.expires_at);
    const now = new Date();

    // Check if token is expired
    if (expiresAt <= now) {
      // For now, return null if expired since we don't have refresh tokens with token client
      console.log('Access token expired, need to re-authenticate');
      return null;
    }

    return credentials.access_token;
  } catch (error) {
    console.error('Error getting access token:', error);
    return null;
  }
}

// Get all connected accounts for a service
export async function getConnectedAccounts(service) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }

    const { data, error } = await supabase
      .from('integration_credentials')
      .select('credentials, created_at')
      .eq('user_id', user.id)
      .eq('service', service)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    // Extract account info from credentials
    return data?.map(item => ({
      account_label: item.credentials?.account_label || 'Unknown',
      account_email: item.credentials?.account_email || 'unknown@email.com',
      is_primary: item.credentials?.is_primary || false,
      created_at: item.created_at
    })) || [];
  } catch (error) {
    console.error('Error getting connected accounts:', error);
    return [];
  }
}

// Refresh an expired access token
async function refreshAccessToken(service, refreshToken, accountEmail) {
  try {
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
        refresh_token: refreshToken,
        grant_type: 'refresh_token',
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to refresh access token');
    }

    const tokens = await response.json();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }

    // Update stored credentials for specific account
    const { error } = await supabase
      .from('integration_credentials')
      .update({
        credentials: {
          access_token: tokens.access_token,
          refresh_token: refreshToken, // Keep the same refresh token
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          scope: tokens.scope,
        },
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .eq('service', service)
      .eq('account_email', accountEmail);

    if (error) {
      throw error;
    }

    return tokens.access_token;
  } catch (error) {
    console.error('Error refreshing access token:', error);
    throw error;
  }
}

// Disconnect a Google service account
export async function disconnectGoogleService(service, accountEmail = null) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }

    // Get the access token to revoke it
    const accessToken = await getAccessToken(service, accountEmail);
    
    if (accessToken) {
      // Revoke the token with Google
      await fetch(`https://oauth2.googleapis.com/revoke?token=${accessToken}`, {
        method: 'POST',
      });
    }

    // Remove credentials from database
    if (accountEmail) {
      // Remove specific account by finding it in the credentials
      const { data: credentials } = await supabase
        .from('integration_credentials')
        .select('id, credentials')
        .eq('user_id', user.id)
        .eq('service', service);
      
      const targetRecord = credentials?.find(item => item.credentials?.account_email === accountEmail);
      if (targetRecord) {
        const { error: deleteError } = await supabase
          .from('integration_credentials')
          .delete()
          .eq('id', targetRecord.id);
        
        if (deleteError) throw deleteError;
      }
    } else {
      // Remove all accounts for this service
      const { error: deleteError } = await supabase
        .from('integration_credentials')
        .delete()
        .eq('user_id', user.id)
        .eq('service', service);
      
      if (deleteError) throw deleteError;
    }


    console.log(`Successfully disconnected ${service}${accountEmail ? ` (${accountEmail})` : ''}!`);
    return true;
  } catch (error) {
    console.error('Error disconnecting service:', error);
    throw error;
  }
}

// Alias for disconnectGoogleService to match IntegrationsManager usage
export const disconnectGoogleAccount = disconnectGoogleService;

// Set primary account for a service
export async function setPrimaryAccount(service, accountEmail) {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }

    // Get all credentials for this service
    const { data: credentials } = await supabase
      .from('integration_credentials')
      .select('id, credentials')
      .eq('user_id', user.id)
      .eq('service', service);

    if (!credentials || credentials.length === 0) {
      throw new Error('No credentials found for this service');
    }

    // Update all accounts to unset primary, then set the target as primary
    for (const item of credentials) {
      const updatedCredentials = {
        ...item.credentials,
        is_primary: item.credentials?.account_email === accountEmail
      };

      await supabase
        .from('integration_credentials')
        .update({ credentials: updatedCredentials })
        .eq('id', item.id);
    }

    console.log(`Successfully set ${accountEmail} as primary for ${service}!`);
    return true;
  } catch (error) {
    console.error('Error setting primary account:', error);
    throw error;
  }
}