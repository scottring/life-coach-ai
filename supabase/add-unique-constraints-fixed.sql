-- Add unique constraints for deduplication (fixed version)
-- This version checks if constraints already exist before adding them

-- Add unique constraint on tasks table for same source_id per user
-- This prevents duplicate tasks from the same email/calendar event
DO $$ 
BEGIN
    -- Check if unique constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_user_source_id' 
        AND conrelid = 'tasks'::regclass
    ) THEN
        -- Only add constraint if source_id is not null (to allow manual tasks)
        ALTER TABLE tasks ADD CONSTRAINT unique_user_source_id 
            UNIQUE (user_id, source, source_id);
        RAISE NOTICE 'Added unique constraint for tasks table';
    ELSE
        RAISE NOTICE 'Unique constraint for tasks table already exists';
    END IF;
    
    -- Check if family tasks constraint already exists
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint 
        WHERE conname = 'unique_family_source_id' 
        AND conrelid = 'family_tasks'::regclass
    ) THEN
        ALTER TABLE family_tasks ADD CONSTRAINT unique_family_source_id 
            UNIQUE (family_id, source, source_id);
        RAISE NOTICE 'Added unique constraint for family_tasks table';
    ELSE
        RAISE NOTICE 'Unique constraint for family_tasks table already exists';
    END IF;
END $$;

-- Create indexes for better performance on deduplication queries
CREATE INDEX IF NOT EXISTS idx_tasks_user_source ON tasks(user_id, source, source_id);
CREATE INDEX IF NOT EXISTS idx_tasks_title_similarity ON tasks(user_id, source, title);
CREATE INDEX IF NOT EXISTS idx_family_tasks_source ON family_tasks(family_id, source, source_id);

-- Create partial indexes for non-null source_ids (more efficient)
CREATE INDEX IF NOT EXISTS idx_tasks_source_id_not_null ON tasks(user_id, source, source_id) 
    WHERE source_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_family_tasks_source_id_not_null ON family_tasks(family_id, source, source_id) 
    WHERE source_id IS NOT NULL;