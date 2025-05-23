import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client
const supabase = createClient(
  process.env.VITE_SUPABASE_URL,
  process.env.VITE_SUPABASE_ANON_KEY
);

export default async function handler(req, res) {
  // Only allow GET
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  // Verify webhook secret
  const secret = req.headers['x-webhook-secret'];
  if (process.env.VITE_N8N_WEBHOOK_SECRET && secret !== process.env.VITE_N8N_WEBHOOK_SECRET) {
    return res.status(401).json({ error: 'Invalid webhook secret' });
  }

  try {
    // Get tasks for the next 24 hours
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const { data: tasks, error } = await supabase
      .from('tasks')
      .select('*')
      .gte('deadline', now.toISOString())
      .lte('deadline', tomorrow.toISOString())
      .eq('status', 'pending')
      .order('deadline', { ascending: true });

    if (error) throw error;

    // Filter out tasks that already have prepared documents
    const { data: preparedDocs } = await supabase
      .from('prepared_documents')
      .select('task_id')
      .in('task_id', tasks.map(t => t.id));

    const preparedTaskIds = new Set(preparedDocs?.map(d => d.task_id) || []);
    const tasksNeedingPrep = tasks.filter(t => !preparedTaskIds.has(t.id));

    return res.status(200).json(tasksNeedingPrep);
  } catch (error) {
    console.error('Error fetching upcoming tasks:', error);
    return res.status(500).json({ 
      error: 'Failed to fetch tasks',
      details: error.message 
    });
  }
}