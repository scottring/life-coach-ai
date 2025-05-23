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
    const { taskId, documents, preparedAt } = req.body;

    // Store prepared documents
    const { error } = await supabase
      .from('prepared_documents')
      .upsert({
        task_id: taskId,
        documents: documents,
        prepared_at: preparedAt,
        created_at: new Date().toISOString()
      });

    if (error) throw error;

    // Also update the task to mark that documents are prepared
    await supabase
      .from('tasks')
      .update({ 
        metadata: {
          documents_prepared: true,
          documents_prepared_at: preparedAt
        }
      })
      .eq('id', taskId);

    console.log(`Documents prepared for task ${taskId}`);

    return res.status(200).json({
      success: true,
      taskId,
      documentCount: documents.length
    });

  } catch (error) {
    console.error('Error saving prepared documents:', error);
    return res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
}