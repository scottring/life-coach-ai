// Simple webhook handler for n8n
// In production, this would be a proper backend endpoint

import { handleN8nWebhook } from '../src/lib/n8nWebhookHandler';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const webhookType = req.url.includes('gmail-tasks') ? 'gmail' : 'calendar';
  
  try {
    // Verify webhook secret if configured
    const secret = process.env.VITE_N8N_WEBHOOK_SECRET;
    if (secret && req.headers['x-n8n-webhook-secret'] !== secret) {
      return res.status(401).json({ error: 'Invalid webhook secret' });
    }

    // Process the webhook data
    const result = await handleN8nWebhook(webhookType, req.body);
    
    res.status(200).json({
      success: true,
      type: webhookType,
      processed: result
    });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}

// Note: In development, you can use a service like ngrok to expose local webhooks
// Example: ngrok http 5173
// Then use the ngrok URL in your n8n workflows