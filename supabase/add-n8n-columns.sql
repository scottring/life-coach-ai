-- Add n8n configuration columns to user_preferences table
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS n8n_url TEXT,
ADD COLUMN IF NOT EXISTS n8n_webhooks JSONB;

-- Add comment for clarity
COMMENT ON COLUMN user_preferences.n8n_url IS 'Base URL of the users n8n instance';
COMMENT ON COLUMN user_preferences.n8n_webhooks IS 'Webhook configuration for n8n workflows';