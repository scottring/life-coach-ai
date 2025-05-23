# Consolidating Google Cloud Accounts

## Current Setup Analysis

You appear to have OAuth credentials from one Google Cloud account but may be trying to access APIs from another. This causes 403 errors because the APIs aren't enabled in the correct project.

## Steps to Consolidate to One Account

### Step 1: Choose Your Primary Google Cloud Account

Decide which Google account to use:
- **Option A**: Your personal Google account
- **Option B**: A dedicated workspace/business account

### Step 2: Create a New Google Cloud Project (or use existing)

1. Sign in to [Google Cloud Console](https://console.cloud.google.com/) with your chosen account
2. Create a new project or select an existing one
3. Note the project ID

### Step 3: Enable Required APIs

In your chosen project, enable:
1. **Gmail API**: [Enable here](https://console.cloud.google.com/apis/library/gmail.googleapis.com)
2. **Google Calendar API**: [Enable here](https://console.cloud.google.com/apis/library/calendar-json.googleapis.com)
3. **Google Identity API** (for OAuth): Usually auto-enabled

### Step 4: Configure OAuth Consent Screen

1. Go to [APIs & Services > OAuth consent screen](https://console.cloud.google.com/apis/oauth-consent-screen)
2. Choose "External" (unless using Google Workspace)
3. Fill in required fields:
   - App name: "Life Coach AI"
   - User support email: Your email
   - Developer contact: Your email
4. Add scopes:
   - `https://www.googleapis.com/auth/gmail.readonly`
   - `https://www.googleapis.com/auth/calendar.readonly`
   - `https://www.googleapis.com/auth/userinfo.email`
   - `https://www.googleapis.com/auth/userinfo.profile`
5. Add test users (your email addresses)

### Step 5: Create New OAuth 2.0 Credentials

1. Go to [APIs & Services > Credentials](https://console.cloud.google.com/apis/credentials)
2. Click "Create Credentials" > "OAuth client ID"
3. Choose "Web application"
4. Name: "Life Coach AI Web Client"
5. Add Authorized JavaScript origins:
   ```
   http://localhost:5173
   http://localhost:3000
   http://localhost:5174
   ```
6. Add Authorized redirect URIs (if needed):
   ```
   http://localhost:5173/auth/callback
   http://localhost:3000/auth/callback
   ```
7. Click "Create"
8. **SAVE THE CLIENT ID AND CLIENT SECRET**

### Step 6: Update Your .env File

Replace the existing credentials with your new ones:

```env
# Google OAuth integration (REPLACE THESE)
VITE_GOOGLE_CLIENT_ID=your_new_client_id_here
VITE_GOOGLE_CLIENT_SECRET=your_new_client_secret_here

# Keep the scopes the same
VITE_GOOGLE_CALENDAR_SCOPE=https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email
VITE_GOOGLE_GMAIL_SCOPE=https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email
```

### Step 7: Clear Existing Connections

1. In your database, clear the `integration_credentials` table:
   ```sql
   DELETE FROM integration_credentials WHERE service IN ('gmail', 'google_calendar');
   ```

Or do it through the app:
1. Go to Settings > Integrations
2. Remove all Gmail accounts
3. Remove all Calendar accounts

### Step 8: Restart and Reconnect

1. Restart your development server
2. Go to Settings > Integrations
3. Connect Gmail with your new credentials
4. Connect Calendar with your new credentials

## Verification Checklist

- [ ] Gmail API enabled in the correct project
- [ ] Calendar API enabled in the correct project
- [ ] OAuth consent screen configured
- [ ] New OAuth credentials created
- [ ] .env file updated with new credentials
- [ ] Old connections removed from database
- [ ] Successfully connected Gmail
- [ ] Successfully connected Calendar
- [ ] Email sync working
- [ ] Calendar sync working

## Benefits of Consolidation

1. **Simpler management**: One Google Cloud project to manage
2. **Consistent permissions**: All APIs under same project
3. **Easier debugging**: All logs in one place
4. **Cost tracking**: Single billing account (though APIs are free within limits)
5. **No more 403 errors**: APIs properly enabled in the right project

## Troubleshooting

### "Access blocked" error
- Make sure OAuth consent screen is in "Testing" mode
- Add your email to test users

### Still getting 403
- Double-check APIs are enabled in the NEW project
- Wait 5-10 minutes after enabling APIs
- Clear browser cache/cookies

### Can't see the project
- Make sure you're signed into the correct Google account
- Check the account selector in top right of Google Cloud Console