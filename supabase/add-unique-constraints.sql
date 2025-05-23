-- Add unique constraints to prevent duplicate tasks from same source
-- This provides database-level protection against duplicates

-- Add unique constraint on tasks table for same source_id per user
-- This prevents duplicate tasks from the same email/calendar event
ALTER TABLE tasks ADD CONSTRAINT unique_user_source_id 
  UNIQUE (user_id, source, source_id);

-- Create index for better performance on deduplication queries
CREATE INDEX IF NOT EXISTS idx_tasks_user_source ON tasks(user_id, source, source_id);
CREATE INDEX IF NOT EXISTS idx_tasks_title_similarity ON tasks(user_id, source, title);

-- Add similar constraint for family tasks if needed
ALTER TABLE family_tasks ADD CONSTRAINT unique_family_source_id 
  UNIQUE (family_id, source, source_id);