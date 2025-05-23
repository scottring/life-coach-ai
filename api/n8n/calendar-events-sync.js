import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  console.log('Calendar sync endpoint called with method:', req.method);
  console.log('Headers:', req.headers);
  
  // Only allow POST
  if (req.method !== 'POST') {
    console.log('Method not allowed:', req.method);
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify webhook secret (temporarily disabled for testing)
  const secret = req.headers['x-webhook-secret'];
  console.log('Webhook secret from header:', secret);
  console.log('Expected secret:', process.env.VITE_N8N_WEBHOOK_SECRET);
  
  // TODO: Re-enable secret verification after testing
  // if (process.env.VITE_N8N_WEBHOOK_SECRET && secret !== process.env.VITE_N8N_WEBHOOK_SECRET) {
  //   console.log('Invalid webhook secret');
  //   return res.status(401).json({ error: 'Invalid webhook secret' });
  // }

  try {
    const { events, syncedAt } = req.body;
    
    console.log(`Syncing ${events?.length || 0} calendar events (work + personal)`);

    const results = {
      created: 0,
      updated: 0,
      errors: 0
    };

    for (const event of (events || [])) {
      try {
        // Check if event already exists
        const { data: existingEvent } = await supabase
          .from('calendar_events')
          .select('id')
          .eq('google_event_id', event.google_event_id)
          .eq('calendar_id', event.calendar_id)
          .single();

        const eventData = {
          ...event,
          last_synced: syncedAt
        };

        if (existingEvent) {
          // Update existing event
          const { error } = await supabase
            .from('calendar_events')
            .update(eventData)
            .eq('id', existingEvent.id);

          if (error) throw error;
          results.updated++;
        } else {
          // Create new event
          const { error } = await supabase
            .from('calendar_events')
            .insert(eventData);

          if (error) throw error;
          results.created++;
        }

      } catch (error) {
        console.error('Error processing event:', error);
        results.errors++;
      }
    }

    console.log('Calendar events sync complete:', results);

    return res.status(200).json({
      success: true,
      results,
      syncedAt
    });

  } catch (error) {
    console.error('Calendar sync error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}