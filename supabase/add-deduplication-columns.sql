-- Add missing columns for deduplication to existing tables
-- Run this BEFORE adding unique constraints

-- Add source tracking columns to tasks table if they don't exist
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source VARCHAR(20);
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS source_id VARCHAR(255);

-- Add source tracking columns to family_tasks table if they don't exist
ALTER TABLE family_tasks ADD COLUMN IF NOT EXISTS source VARCHAR(20);
ALTER TABLE family_tasks ADD COLUMN IF NOT EXISTS source_id VARCHAR(255);

-- Update existing tasks to have a default source
UPDATE tasks SET source = 'manual' WHERE source IS NULL;
UPDATE family_tasks SET source = 'manual' WHERE source IS NULL;

-- Now add the unique constraints (this will work now that columns exist)
DO $$ 
BEGIN
    -- Add unique constraint for tasks if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_user_source_id' 
        AND conrelid = 'tasks'::regclass
    ) THEN
        ALTER TABLE tasks ADD CONSTRAINT unique_user_source_id 
            UNIQUE (user_id, source, source_id);
    END IF;
    
    -- Add unique constraint for family_tasks if it doesn't exist
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_family_source_id' 
        AND conrelid = 'family_tasks'::regclass
    ) THEN
        ALTER TABLE family_tasks ADD CONSTRAINT unique_family_source_id 
            UNIQUE (family_id, source, source_id);
    END IF;
END $$;

-- Create indexes for better performance on deduplication queries
CREATE INDEX IF NOT EXISTS idx_tasks_user_source ON tasks(user_id, source, source_id);
CREATE INDEX IF NOT EXISTS idx_tasks_title_similarity ON tasks(user_id, source, title);
CREATE INDEX IF NOT EXISTS idx_family_tasks_source ON family_tasks(family_id, source, source_id);