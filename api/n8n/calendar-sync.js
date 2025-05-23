import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Only allow POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify webhook secret
  const secret = req.headers['x-webhook-secret'];
  if (process.env.VITE_N8N_WEBHOOK_SECRET && secret !== process.env.VITE_N8N_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Invalid webhook secret' });
  }

  try {
    const { events, syncedAt } = req.body;
    
    console.log(`Syncing ${events?.length || 0} calendar events`);

    const results = {
      created: 0,
      updated: 0,
      skipped: 0,
      errors: 0
    };

    for (const event of (events || [])) {
      try {
        // Check if task already exists for this calendar event
        const { data: existingTask } = await supabase
          .from('tasks')
          .select('id, deadline')
          .eq('calendar_event_id', event.calendar_event_id)
          .single();

        if (existingTask) {
          // Update existing task if event time changed
          if (new Date(existingTask.deadline).getTime() !== new Date(event.deadline).getTime()) {
            const { error } = await supabase
              .from('tasks')
              .update({
                title: event.title,
                description: event.description,
                deadline: event.deadline,
                location: event.location,
                metadata: {
                  ...event,
                  last_synced: syncedAt
                }
              })
              .eq('id', existingTask.id);

            if (error) throw error;
            results.updated++;
          } else {
            results.skipped++;
          }
        } else {
          // Create new task
          const { error } = await supabase
            .from('tasks')
            .insert({
              title: event.title,
              description: event.description,
              deadline: event.deadline,
              context: event.context,
              priority: event.priority,
              status: 'pending',
              calendar_event_id: event.calendar_event_id,
              source: event.source,
              metadata: {
                ...event,
                created_from_calendar: true,
                synced_at: syncedAt
              }
            });

          if (error) throw error;
          results.created++;
        }
      } catch (error) {
        console.error('Error processing event:', error);
        results.errors++;
      }
    }

    // Update last sync time
    await supabase
      .from('user_preferences')
      .update({ 
        last_calendar_sync: syncedAt,
        calendar_sync_stats: results
      })
      .eq('user_id', 'default'); // This should be improved to use actual user ID

    console.log('Calendar sync complete:', results);

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