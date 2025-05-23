# Deploy Life Coach AI to Vercel

## Prerequisites
- Vercel account (free at vercel.com)
- Git repository (GitHub, GitLab, or Bitbucket)
- All environment variables ready

## Step 1: Prepare Your Repository

1. **Commit all changes**:
   ```bash
   git add .
   git commit -m "Prepare for Vercel deployment"
   git push origin main
   ```

2. **Ensure these files exist**:
   - `vercel.json` - Deployment configuration ✅
   - `api/` folder - Serverless functions ✅
   - `.env.example` - Environment template ✅

## Step 2: Deploy to Vercel

### Option A: Via Vercel CLI
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel

# Follow prompts:
# - Link to existing project? No
# - What's your project name? life-coach-ai
# - Which directory? ./
# - Override settings? No
```

### Option B: Via Vercel Dashboard

1. Go to [vercel.com/new](https://vercel.com/new)
2. Import your Git repository
3. Configure project:
   - **Framework Preset**: Vite
   - **Root Directory**: `./`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`

## Step 3: Add Environment Variables

In Vercel Dashboard > Settings > Environment Variables, add:

```env
# Supabase
VITE_SUPABASE_URL=https://zkniqzkrqbmumymwdjho.supabase.co
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

# OpenAI
VITE_OPENAI_API_KEY=your_openai_api_key

# Google OAuth
VITE_GOOGLE_CLIENT_ID=77559771257-fl16uhd249dgjrle0llgqch64p4uovq0.apps.googleusercontent.com
VITE_GOOGLE_CLIENT_SECRET=your_google_client_secret

# n8n Webhooks
VITE_N8N_WEBHOOK_SECRET=your_secret_key_here
```

## Step 4: Update Google OAuth

1. Go to [Google Cloud Console](https://console.cloud.google.com/apis/credentials?project=n8n-personal-assistant-460615)
2. Edit your OAuth 2.0 Client
3. Add to **Authorized JavaScript origins**:
   ```
   https://life-coach-ai.vercel.app
   https://life-coach-ai-*.vercel.app
   https://your-custom-domain.com (if using)
   ```

## Step 5: Update n8n Workflows

In each n8n workflow, update the webhook URL:
1. Edit the environment variable `WEBHOOK_URL`
2. Set to: `https://life-coach-ai.vercel.app`

Or in individual workflows:
- Gmail: `https://life-coach-ai.vercel.app/api/n8n/gmail-tasks`
- Calendar: `https://life-coach-ai.vercel.app/api/n8n/calendar-tasks`

## Step 6: Configure Domain (Optional)

1. In Vercel Dashboard > Settings > Domains
2. Add your custom domain
3. Update DNS records as instructed
4. Add domain to Google OAuth origins

## Step 7: Test Everything

1. **Visit your app**: `https://life-coach-ai.vercel.app`
2. **Test OAuth**: Try connecting Gmail/Calendar
3. **Test n8n webhooks**: 
   - Trigger a workflow in n8n
   - Check Vercel Functions logs
4. **Monitor**: Check Vercel dashboard for errors

## Deployment Checklist

- [ ] Code pushed to Git repository
- [ ] Vercel project created and linked
- [ ] All environment variables added
- [ ] Google OAuth origins updated
- [ ] n8n webhook URLs updated
- [ ] Custom domain configured (optional)
- [ ] OAuth connections tested
- [ ] n8n webhooks tested

## Troubleshooting

### "Invalid redirect URI" error
- Add Vercel URLs to Google OAuth origins
- Wait 5-10 minutes for changes to propagate

### Webhooks not working
- Check webhook secret matches in both n8n and Vercel
- Verify API routes are deployed (check Functions tab)
- Check Vercel function logs for errors

### Build failures
- Check build logs in Vercel dashboard
- Ensure all dependencies are in package.json
- Verify Node version compatibility

## Production Tips

1. **Set up monitoring**: Use Vercel Analytics
2. **Enable preview deployments**: Test changes before production
3. **Use environment variables**: Different values for preview/production
4. **Set up alerts**: Get notified of errors
5. **Regular backups**: Export Supabase data regularly