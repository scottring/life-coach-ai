// Quick utility to check Gmail API status
export async function checkGmailApiStatus(accessToken) {
  try {
    // Try to get user profile - this is the simplest Gmail API call
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/profile', {
      headers: {
        'Authorization': `Bearer ${accessToken}`
      }
    });

    if (response.status === 403) {
      const data = await response.json();
      console.error('Gmail API Error:', data);
      
      // Check specific error reasons
      if (data.error?.message?.includes('Gmail API has not been used')) {
        return {
          enabled: false,
          error: 'Gmail API is not enabled in Google Cloud Console',
          action: 'Enable Gmail API at https://console.cloud.google.com/apis/library/gmail.googleapis.com'
        };
      } else if (data.error?.message?.includes('Request had insufficient authentication scopes')) {
        return {
          enabled: false,
          error: 'Missing required Gmail scopes',
          action: 'Reconnect with proper scopes: gmail.readonly'
        };
      }
      
      return {
        enabled: false,
        error: 'Gmail API access denied',
        action: 'Check API permissions and reconnect'
      };
    }

    if (response.ok) {
      const profile = await response.json();
      return {
        enabled: true,
        emailAddress: profile.emailAddress,
        messagesTotal: profile.messagesTotal,
        threadsTotal: profile.threadsTotal
      };
    }

    return {
      enabled: false,
      error: `Unexpected status: ${response.status}`,
      action: 'Check your Google Cloud Console configuration'
    };

  } catch (error) {
    return {
      enabled: false,
      error: error.message,
      action: 'Check network connection and try again'
    };
  }
}