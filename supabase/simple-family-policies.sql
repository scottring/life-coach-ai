-- Ultra-simple family policies to completely avoid recursion
-- This removes all complex queries that could cause infinite loops

-- Drop ALL family-related policies first
DROP POLICY IF EXISTS "Users can view families they belong to" ON families;
DROP POLICY IF EXISTS "Users can create families" ON families;
DROP POLICY IF EXISTS "Family creators can update families" ON families;
DROP POLICY IF EXISTS "Family admins can update families" ON families;

DROP POLICY IF EXISTS "Users can view family members" ON family_members;
DROP POLICY IF EXISTS "Users can join families" ON family_members;
DROP POLICY IF EXISTS "Users can update their own membership" ON family_members;
DROP POLICY IF EXISTS "Users can leave families" ON family_members;
DROP POLICY IF EXISTS "Family admins can manage members" ON family_members;

DROP POLICY IF EXISTS "Family members can view family goals" ON family_goals;
DROP POLICY IF EXISTS "Family members can manage family goals" ON family_goals;

DROP POLICY IF EXISTS "Family members can view family tasks" ON family_tasks;
DROP POLICY IF EXISTS "Family members can manage family tasks" ON family_tasks;

DROP POLICY IF EXISTS "Family members can view meals" ON family_meals;
DROP POLICY IF EXISTS "Family members can manage meals" ON family_meals;

DROP POLICY IF EXISTS "Family members can view family reviews" ON family_reviews;
DROP POLICY IF EXISTS "Family members can manage family reviews" ON family_reviews;

DROP POLICY IF EXISTS "Family members can view shopping items" ON shopping_items;
DROP POLICY IF EXISTS "Family members can manage shopping items" ON shopping_items;

DROP POLICY IF EXISTS "Family members can view family milestones" ON family_milestones;
DROP POLICY IF EXISTS "Family members can manage family milestones" ON family_milestones;

-- Families - super simple, no lookups
CREATE POLICY "Anyone can view families" ON families FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can create families" ON families FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Family creators can update families" ON families FOR UPDATE
  USING (auth.uid() = created_by);

CREATE POLICY "Family creators can delete families" ON families FOR DELETE
  USING (auth.uid() = created_by);

-- Family Members - absolutely no self-referencing
CREATE POLICY "Anyone can view family members" ON family_members FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can join families" ON family_members FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own membership" ON family_members FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own membership" ON family_members FOR DELETE
  USING (auth.uid() = user_id);

-- Family Goals - simple
CREATE POLICY "Anyone can view family goals" ON family_goals FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage family goals" ON family_goals FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Family Tasks - simple
CREATE POLICY "Anyone can view family tasks" ON family_tasks FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage family tasks" ON family_tasks FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Family Meals - simple
CREATE POLICY "Anyone can view family meals" ON family_meals FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage family meals" ON family_meals FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Family Reviews - simple
CREATE POLICY "Anyone can view family reviews" ON family_reviews FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage family reviews" ON family_reviews FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Shopping Items - simple
CREATE POLICY "Anyone can view shopping items" ON shopping_items FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage shopping items" ON shopping_items FOR ALL
  USING (auth.uid() IS NOT NULL);

-- Family Milestones - simple
CREATE POLICY "Anyone can view family milestones" ON family_milestones FOR SELECT
  USING (true);

CREATE POLICY "Authenticated users can manage family milestones" ON family_milestones FOR ALL
  USING (auth.uid() IS NOT NULL);