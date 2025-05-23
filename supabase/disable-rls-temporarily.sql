-- Temporarily disable RLS to get the app working
-- You can re-enable this later once everything is stable

-- Disable RLS on family tables temporarily
ALTER TABLE families DISABLE ROW LEVEL SECURITY;
ALTER TABLE family_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE family_goals DISABLE ROW LEVEL SECURITY;
ALTER TABLE family_tasks DISABLE ROW LEVEL SECURITY;
ALTER TABLE family_meals DISABLE ROW LEVEL SECURITY;
ALTER TABLE family_reviews DISABLE ROW LEVEL SECURITY;
ALTER TABLE shopping_items DISABLE ROW LEVEL SECURITY;
ALTER TABLE family_milestones DISABLE ROW LEVEL SECURITY;