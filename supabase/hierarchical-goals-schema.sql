-- Update family_tasks table to support hierarchical structure
-- Add columns to support goals -> milestones -> projects -> tasks hierarchy

ALTER TABLE family_tasks ADD COLUMN IF NOT EXISTS item_type VARCHAR(20) DEFAULT 'task';
-- item_type can be: 'milestone', 'project', 'task'

ALTER TABLE family_tasks ADD COLUMN IF NOT EXISTS parent_type VARCHAR(20);
-- parent_type can be: 'goal', 'milestone', 'project'

ALTER TABLE family_tasks ADD COLUMN IF NOT EXISTS parent_id UUID;
-- parent_id references the ID of the parent item (goal.id, milestone.id, or project.id)

-- Add indexes for better performance on hierarchical queries
CREATE INDEX IF NOT EXISTS idx_family_tasks_hierarchy ON family_tasks(family_id, item_type, parent_type, parent_id);
CREATE INDEX IF NOT EXISTS idx_family_tasks_parent ON family_tasks(parent_type, parent_id);

-- Update family_goals table to support progress tracking
ALTER TABLE family_goals ADD COLUMN IF NOT EXISTS current_value NUMERIC DEFAULT 0;
ALTER TABLE family_goals ADD COLUMN IF NOT EXISTS progress_percentage INTEGER DEFAULT 0;

-- Create family_reviews table for weekly review sessions
CREATE TABLE IF NOT EXISTS family_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  family_id UUID REFERENCES families(id) ON DELETE CASCADE,
  week_ending DATE NOT NULL,
  accomplishments TEXT[],
  challenges TEXT[],
  goal_progress JSONB,
  next_week_focus TEXT[],
  family_feedback JSONB,
  commitments JSONB,
  ai_insights JSONB,
  created_by UUID REFERENCES family_members(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(family_id, week_ending)
);

-- Add RLS policies for family_reviews
ALTER TABLE family_reviews ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Family members can view family reviews" ON family_reviews FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_reviews.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can manage family reviews" ON family_reviews FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_reviews.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

-- Create function to update goal progress based on milestones
CREATE OR REPLACE FUNCTION update_goal_progress()
RETURNS TRIGGER AS $$
BEGIN
  -- When a milestone or project is updated, recalculate goal progress
  IF NEW.parent_type = 'goal' AND NEW.item_type IN ('milestone', 'project') THEN
    UPDATE family_goals 
    SET 
      progress_percentage = (
        SELECT COALESCE(
          ROUND(
            (COUNT(*) FILTER (WHERE status = 'completed')::NUMERIC / 
             NULLIF(COUNT(*)::NUMERIC, 0)) * 100
          ), 0
        )
        FROM family_tasks 
        WHERE parent_type = 'goal' 
        AND parent_id = NEW.parent_id 
        AND item_type = 'milestone'
      ),
      updated_at = NOW()
    WHERE id = NEW.parent_id;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update goal progress
DROP TRIGGER IF EXISTS trigger_update_goal_progress ON family_tasks;
CREATE TRIGGER trigger_update_goal_progress
  AFTER INSERT OR UPDATE OR DELETE ON family_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_goal_progress();

-- Create view for hierarchical goal structure
CREATE OR REPLACE VIEW family_goal_hierarchy AS
WITH RECURSIVE goal_tree AS (
  -- Base case: goals
  SELECT 
    g.id,
    g.family_id,
    g.title,
    g.description,
    g.status,
    g.target_value,
    g.current_value,
    g.progress_percentage,
    g.timeframe,
    'goal' as item_type,
    NULL as parent_id,
    NULL as parent_type,
    0 as level,
    ARRAY[g.id] as path
  FROM family_goals g
  
  UNION ALL
  
  -- Recursive case: milestones, projects, tasks
  SELECT 
    t.id,
    t.family_id,
    t.title,
    t.description,
    t.status,
    NULL as target_value,
    NULL as current_value,
    NULL as progress_percentage,
    NULL as timeframe,
    t.item_type,
    t.parent_id,
    t.parent_type,
    gt.level + 1,
    gt.path || t.id
  FROM family_tasks t
  INNER JOIN goal_tree gt ON (
    (t.parent_type = 'goal' AND t.parent_id = gt.id AND gt.item_type = 'goal') OR
    (t.parent_type = 'milestone' AND t.parent_id = gt.id AND gt.item_type = 'milestone') OR
    (t.parent_type = 'project' AND t.parent_id = gt.id AND gt.item_type = 'project')
  )
)
SELECT * FROM goal_tree ORDER BY family_id, level, created_at;

-- Grant necessary permissions
GRANT SELECT ON family_goal_hierarchy TO authenticated;
GRANT ALL ON family_reviews TO authenticated;