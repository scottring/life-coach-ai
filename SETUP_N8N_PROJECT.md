# Setting Up n8n-personal-assistant-460615 Project

## Quick Setup Steps

Since you want to keep using the `n8n-personal-assistant-460615` project, here's what you need to do:

### 1. Enable Required APIs

Open these links while logged into the Google account that owns `n8n-personal-assistant-460615`:

- **Gmail API**: https://console.cloud.google.com/apis/library/gmail.googleapis.com?project=n8n-personal-assistant-460615
- **Calendar API**: https://console.cloud.google.com/apis/library/calendar-json.googleapis.com?project=n8n-personal-assistant-460615

Click "ENABLE" on each page if not already enabled.

### 2. Verify OAuth Consent Screen

Go to: https://console.cloud.google.com/apis/oauth-consent-screen?project=n8n-personal-assistant-460615

Make sure you have:
- App name set (e.g., "Life Coach AI" or "n8n Personal Assistant")
- User support email configured
- These scopes added:
  - `https://www.googleapis.com/auth/gmail.readonly`
  - `https://www.googleapis.com/auth/calendar.readonly`
  - `https://www.googleapis.com/auth/userinfo.email`
  - `https://www.googleapis.com/auth/userinfo.profile`

### 3. Check OAuth Credentials

Go to: https://console.cloud.google.com/apis/credentials?project=n8n-personal-assistant-460615

Find your OAuth 2.0 Client ID: `77559771257-fl16uhd249dgjrle0llgqch64p4uovq0.apps.googleusercontent.com`

Make sure it has:
- **Authorized JavaScript origins**:
  ```
  http://localhost:5173
  http://localhost:3000
  http://localhost:5174
  ```

### 4. Test API Access

After enabling the APIs, wait 2-3 minutes, then:

1. Go to your app's Settings > Integrations
2. Remove any existing Gmail connections
3. Click "+ Add Work" or "+ Add Personal" to reconnect Gmail
4. The sync should now work!

## Verification Checklist

- [ ] Gmail API is enabled (shows "API Enabled" with green checkmark)
- [ ] Calendar API is enabled (shows "API Enabled" with green checkmark)
- [ ] OAuth consent screen is configured
- [ ] Your email is in the test users list (if app is in testing mode)
- [ ] OAuth client has correct JavaScript origins

## If Still Getting 403 Errors

1. **Clear browser cache** and cookies for accounts.google.com
2. **Try incognito/private window**
3. **Check API quotas**: https://console.cloud.google.com/apis/api/gmail.googleapis.com/quotas?project=n8n-personal-assistant-460615
4. **Check for any API restrictions** on the credentials

## Success Indicators

When everything is working:
- No more 403 errors
- "Sync All" button successfully fetches emails
- You see "Email sync completed. Extracted X tasks." in console
- Calendar events load properly

## Note About n8n Integration

Since this is the `n8n-personal-assistant` project, you might also want to:
- Set up n8n webhooks for automated task creation
- Configure n8n workflows to process emails
- Use n8n for advanced automation between services

The fact that this project is already set up for n8n means it's a good choice for your personal assistant app!