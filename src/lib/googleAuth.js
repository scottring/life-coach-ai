import { supabase } from './supabaseClient';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
const GOOGLE_CALENDAR_SCOPE = import.meta.env.VITE_GOOGLE_CALENDAR_SCOPE;
const REDIRECT_URI = typeof window !== 'undefined' ? `${window.location.origin}/auth/google/callback` : '';

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
    
    const client = oauth2.initCodeClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: GOOGLE_CALENDAR_SCOPE,
      ux_mode: 'popup',
      callback: async (response) => {
        if (response.code) {
          await handleAuthCode(response.code, 'google_calendar', accountLabel);
        }
      },
    });

    client.requestCode();
  } catch (error) {
    console.error('Error starting Google Calendar auth:', error);
    throw error;
  }
}

// Start Google Gmail OAuth flow
export async function startGoogleGmailAuth(accountLabel = 'Work') {
  try {
    const oauth2 = await initGoogleAuth();
    
    const client = oauth2.initCodeClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: import.meta.env.VITE_GOOGLE_GMAIL_SCOPE,
      ux_mode: 'popup',
      callback: async (response) => {
        if (response.code) {
          await handleAuthCode(response.code, 'gmail', accountLabel);
        }
      },
    });

    client.requestCode();
  } catch (error) {
    console.error('Error starting Google Gmail auth:', error);
    throw error;
  }
}

// Handle the authorization code from Google
async function handleAuthCode(authCode, service, accountLabel) {
  try {
    // Exchange authorization code for access token
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        client_secret: import.meta.env.VITE_GOOGLE_CLIENT_SECRET,
        code: authCode,
        grant_type: 'authorization_code',
        redirect_uri: REDIRECT_URI,
      }),
    });

    if (!tokenResponse.ok) {
      throw new Error('Failed to exchange authorization code for tokens');
    }

    const tokens = await tokenResponse.json();
    
    // Get Google user info to extract email
    const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });
    
    if (!userInfoResponse.ok) {
      throw new Error('Failed to get Google user info');
    }
    
    const googleUser = await userInfoResponse.json();
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }

    // Check if this is the first account for this service
    const { data: existingAccounts } = await supabase
      .from('integration_credentials')
      .select('id')
      .eq('user_id', user.id)
      .eq('service', service);

    const isPrimaryAccount = !existingAccounts || existingAccounts.length === 0;

    // Store credentials in Supabase
    const { error } = await supabase
      .from('integration_credentials')
      .upsert({
        user_id: user.id,
        service: service,
        account_label: accountLabel,
        account_email: googleUser.email,
        is_primary: isPrimaryAccount,
        credentials: {
          access_token: tokens.access_token,
          refresh_token: tokens.refresh_token,
          expires_at: new Date(Date.now() + tokens.expires_in * 1000).toISOString(),
          scope: tokens.scope,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'user_id,service,account_email'
      });

    if (error) {
      throw error;
    }

    console.log(`Successfully connected ${service} (${accountLabel}: ${googleUser.email})!`);
    return { tokens, accountEmail: googleUser.email };
  } catch (error) {
    console.error('Error handling auth code:', error);
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
      .select('credentials, account_email, refresh_token')
      .eq('user_id', user.id)
      .eq('service', service);

    if (accountEmail) {
      // Get specific account
      query = query.eq('account_email', accountEmail);
    } else {
      // Get primary account
      query = query.eq('is_primary', true);
    }

    const { data, error } = await query.single();

    if (error || !data) {
      return null;
    }

    const credentials = data.credentials;
    const expiresAt = new Date(credentials.expires_at);
    const now = new Date();

    // Check if token is expired
    if (expiresAt <= now) {
      // Refresh the token
      return await refreshAccessToken(service, credentials.refresh_token, data.account_email);
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
      .select('account_label, account_email, is_primary, created_at')
      .eq('user_id', user.id)
      .eq('service', service)
      .order('is_primary', { ascending: false })
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    return data || [];
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
    let query = supabase
      .from('integration_credentials')
      .delete()
      .eq('user_id', user.id)
      .eq('service', service);

    if (accountEmail) {
      // Remove specific account
      query = query.eq('account_email', accountEmail);
    }

    const { error } = await query;

    if (error) {
      throw error;
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

    // First, unset all accounts as primary for this service
    await supabase
      .from('integration_credentials')
      .update({ is_primary: false })
      .eq('user_id', user.id)
      .eq('service', service);

    // Then set the specified account as primary
    const { error } = await supabase
      .from('integration_credentials')
      .update({ is_primary: true })
      .eq('user_id', user.id)
      .eq('service', service)
      .eq('account_email', accountEmail);

    if (error) {
      throw error;
    }

    console.log(`Successfully set ${accountEmail} as primary for ${service}!`);
    return true;
  } catch (error) {
    console.error('Error setting primary account:', error);
    throw error;
  }
}