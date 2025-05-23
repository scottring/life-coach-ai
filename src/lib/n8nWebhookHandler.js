import { supabase } from './supabaseClient';
import { DeduplicationService } from './deduplicationService';

// Handle incoming tasks from n8n workflows
export async function handleN8nWebhook(type, data) {
  try {
    console.log(`Received ${type} webhook with ${data.length} items`);
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    const results = {
      created: 0,
      duplicates: 0,
      errors: 0
    };
    
    // Process each task
    for (const item of data) {
      try {
        const taskData = {
          title: item.title,
          description: item.description || '',
          deadline: item.dueDate || null,
          context: item.context || 'Work',
          priority: item.priority || 3,
          status: 'pending'
        };
        
        // Use deduplication service to create task only if unique
        const sourceId = type === 'gmail' ? item.emailId : item.relatedEventId;
        const savedTask = await DeduplicationService.createTaskIfUnique(
          user.id,
          taskData,
          item.source || type,
          sourceId
        );
        
        if (savedTask) {
          results.created++;
          console.log('Created task:', savedTask.title);
        } else {
          results.duplicates++;
          console.log('Skipped duplicate task:', taskData.title);
        }
      } catch (error) {
        console.error('Error processing task:', error);
        results.errors++;
      }
    }
    
    // Log results
    console.log(`Webhook processing complete:`, results);
    
    // Update last sync time
    const syncField = type === 'gmail' ? 'last_email_sync' : 'last_calendar_sync';
    await supabase
      .from('user_preferences')
      .update({ 
        [syncField]: new Date().toISOString(),
      })
      .eq('user_id', user.id);
    
    return results;
  } catch (error) {
    console.error('Error handling n8n webhook:', error);
    throw error;
  }
}

// Register webhook endpoints with n8n
export async function registerN8nWebhooks(n8nUrl, userId) {
  try {
    const webhooks = [
      {
        id: 'life-coach-gmail-tasks',
        url: `${window.location.origin}/api/n8n/gmail-tasks`,
        userId
      },
      {
        id: 'life-coach-calendar-tasks',
        url: `${window.location.origin}/api/n8n/calendar-tasks`,
        userId
      }
    ];
    
    // Store webhook URLs in user preferences
    await supabase
      .from('user_preferences')
      .update({
        n8n_webhooks: webhooks,
        n8n_url: n8nUrl
      })
      .eq('user_id', userId);
    
    console.log('Registered n8n webhooks:', webhooks);
    return webhooks;
  } catch (error) {
    console.error('Error registering webhooks:', error);
    throw error;
  }
}

// Trigger n8n workflow manually
export async function triggerN8nWorkflow(workflowId, n8nUrl) {
  try {
    const response = await fetch(`${n8nUrl}/webhook/${workflowId}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        trigger: 'manual',
        timestamp: new Date().toISOString()
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to trigger workflow: ${response.statusText}`);
    }
    
    const result = await response.json();
    console.log('Workflow triggered successfully:', result);
    return result;
  } catch (error) {
    console.error('Error triggering n8n workflow:', error);
    throw error;
  }
}