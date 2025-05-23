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
    const { tasks } = req.body;
    const accountType = req.headers['x-account-type'] || 'unknown';
    const accountEmail = req.headers['x-account-email'] || 'unknown';

    console.log(`Received ${tasks?.length || 0} calendar tasks from ${accountType} account (${accountEmail})`);

    // Process each task
    const results = {
      created: 0,
      duplicates: 0,
      errors: 0
    };

    for (const task of (tasks || [])) {
      try {
        // Check for duplicates based on title and related event ID
        const { data: existing } = await supabase
          .from('tasks')
          .select('id')
          .eq('title', task.title)
          .eq('source_id', task.relatedEventId)
          .single();

        if (existing) {
          results.duplicates++;
          continue;
        }

        // Create the task
        const { error } = await supabase
          .from('tasks')
          .insert({
            title: task.title,
            description: task.description || '',
            deadline: task.dueDate || null,
            context: task.context || (accountType === 'work' ? 'Work' : 'Personal'),
            priority: task.priority || 3,
            status: 'pending',
            source: 'calendar',
            source_id: task.relatedEventId,
            metadata: {
              account_type: accountType,
              account_email: accountEmail,
              related_event_title: task.relatedEventTitle,
              extracted_at: task.extractedAt
            }
          });

        if (error) throw error;
        results.created++;

      } catch (error) {
        console.error('Error processing calendar task:', error);
        results.errors++;
      }
    }

    // Update last sync time
    await supabase
      .from('user_preferences')
      .update({ 
        last_calendar_sync: new Date().toISOString()
      })
      .eq('user_id', accountEmail); // This should be improved to use actual user ID

    console.log('Calendar webhook processing complete:', results);

    return res.status(200).json({
      success: true,
      results
    });

  } catch (error) {
    console.error('Calendar webhook error:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}