# Gmail API Setup Guide

## Fixing the 403 Forbidden Error

The 403 error means the Gmail API is not properly configured. Follow these steps:

### Step 1: Enable Gmail API in Google Cloud Console

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Make sure you're in the correct project (check the project selector at the top)
3. Navigate to **APIs & Services > Library**
4. Search for **"Gmail API"**
5. Click on Gmail API
6. Click the **"ENABLE"** button

### Step 2: Verify OAuth Consent Screen

1. Go to **APIs & Services > OAuth consent screen**
2. Make sure your app is configured:
   - App name is set
   - User support email is configured
   - Developer contact information is added
3. Under **Scopes**, verify these scopes are added:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`

### Step 3: Check API Credentials

1. Go to **APIs & Services > Credentials**
2. Find your OAuth 2.0 Client ID (should match: `77559771257-fl16uhd249dgjrle0llgqch64p4uovq0.apps.googleusercontent.com`)
3. Click on it to edit
4. Under **Authorized JavaScript origins**, add:
   - `http://localhost:5173`
   - `http://localhost:3000`
   - Your production URL (if applicable)

### Step 4: Test the API

1. Open `test-gmail-api.html` in your browser
2. Click "Authorize Gmail"
3. Complete the OAuth flow
4. Click "Test Gmail API"
5. You should see a successful response

### Step 5: Reconnect in the App

1. Go to your app's **Settings > Integrations**
2. Remove any existing Gmail connections
3. Click **"+ Add Work"** or **"+ Add Personal"** to reconnect
4. Complete the OAuth flow
5. Try syncing emails again

## Common Issues

### "Access blocked" error
- Make sure your app is in "Testing" or "Production" mode in OAuth consent screen
- Add your email to the test users list if in Testing mode

### Still getting 403 after enabling API
- Wait 5-10 minutes for the API to fully activate
- Clear your browser cache and cookies
- Try in an incognito/private window

### Token expired
- Tokens expire after 1 hour
- The app should handle this automatically, but you may need to reconnect

## Verify Everything is Working

Run this command to check if Gmail API is enabled:
```bash
curl -H "Authorization: Bearer YOUR_ACCESS_TOKEN" \
  https://gmail.googleapis.com/gmail/v1/users/me/profile
```

If successful, you'll see your Gmail profile information.