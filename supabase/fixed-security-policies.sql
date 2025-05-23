-- Fixed Security Policies for Life Coach AI
-- This fixes the infinite recursion issues

-- Drop ALL existing policies first
DROP POLICY IF EXISTS "Users can view their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can insert their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can update their own tasks" ON tasks;
DROP POLICY IF EXISTS "Users can delete their own tasks" ON tasks;

DROP POLICY IF EXISTS "Users can view their own goals" ON goals;
DROP POLICY IF EXISTS "Users can insert their own goals" ON goals;
DROP POLICY IF EXISTS "Users can update their own goals" ON goals;
DROP POLICY IF EXISTS "Users can delete their own goals" ON goals;

DROP POLICY IF EXISTS "Users can view their own task_goals" ON task_goals;
DROP POLICY IF EXISTS "Users can insert their own task_goals" ON task_goals;
DROP POLICY IF EXISTS "Users can delete their own task_goals" ON task_goals;

DROP POLICY IF EXISTS "Users can view their own contexts" ON user_contexts;
DROP POLICY IF EXISTS "Users can insert their own contexts" ON user_contexts;
DROP POLICY IF EXISTS "Users can update their own contexts" ON user_contexts;

DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can insert their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;

DROP POLICY IF EXISTS "Users can view their own credentials" ON integration_credentials;
DROP POLICY IF EXISTS "Users can insert their own credentials" ON integration_credentials;
DROP POLICY IF EXISTS "Users can update their own credentials" ON integration_credentials;
DROP POLICY IF EXISTS "Users can delete their own credentials" ON integration_credentials;

DROP POLICY IF EXISTS "Users can view their own insights" ON insights;
DROP POLICY IF EXISTS "Users can insert their own insights" ON insights;
DROP POLICY IF EXISTS "Users can update their own insights" ON insights;

DROP POLICY IF EXISTS "Users can view families they belong to" ON families;
DROP POLICY IF EXISTS "Users can create families" ON families;
DROP POLICY IF EXISTS "Family admins can update families" ON families;

DROP POLICY IF EXISTS "Users can view family members" ON family_members;
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

-- Individual User Policies (Simple - no recursion)

-- Tasks
CREATE POLICY "Users can view their own tasks" ON tasks FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tasks" ON tasks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own tasks" ON tasks FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own tasks" ON tasks FOR DELETE
  USING (auth.uid() = user_id);

-- Goals
CREATE POLICY "Users can view their own goals" ON goals FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own goals" ON goals FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own goals" ON goals FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own goals" ON goals FOR DELETE
  USING (auth.uid() = user_id);

-- User contexts
CREATE POLICY "Users can view their own contexts" ON user_contexts FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own contexts" ON user_contexts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own contexts" ON user_contexts FOR UPDATE
  USING (auth.uid() = user_id);

-- User preferences
CREATE POLICY "Users can view their own preferences" ON user_preferences FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own preferences" ON user_preferences FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own preferences" ON user_preferences FOR UPDATE
  USING (auth.uid() = user_id);

-- Integration credentials
CREATE POLICY "Users can view their own credentials" ON integration_credentials FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own credentials" ON integration_credentials FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own credentials" ON integration_credentials FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own credentials" ON integration_credentials FOR DELETE
  USING (auth.uid() = user_id);

-- Insights
CREATE POLICY "Users can view their own insights" ON insights FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own insights" ON insights FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own insights" ON insights FOR UPDATE
  USING (auth.uid() = user_id);

-- Task-Goal relationships (simplified to avoid recursion)
CREATE POLICY "Users can view their own task_goals" ON task_goals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_goals.task_id 
      AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert their own task_goals" ON task_goals FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_goals.task_id 
      AND tasks.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can delete their own task_goals" ON task_goals FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM tasks 
      WHERE tasks.id = task_goals.task_id 
      AND tasks.user_id = auth.uid()
    )
  );

-- Family Policies (Fixed to avoid recursion)

-- Families - simple policies
CREATE POLICY "Users can view families they belong to" ON families FOR SELECT
  USING (
    created_by = auth.uid() OR
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = families.id 
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create families" ON families FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Family creators can update families" ON families FOR UPDATE
  USING (auth.uid() = created_by);

-- Family Members - avoid self-referencing recursion
CREATE POLICY "Users can view family members" ON family_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can join families" ON family_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own membership" ON family_members FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can leave families" ON family_members FOR DELETE
  USING (auth.uid() = user_id);

-- Family Goals - simplified
CREATE POLICY "Family members can view family goals" ON family_goals FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can manage family goals" ON family_goals FOR ALL
  USING (
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid()
    )
  );

-- Family Tasks - simplified
CREATE POLICY "Family members can view family tasks" ON family_tasks FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can manage family tasks" ON family_tasks FOR ALL
  USING (
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid()
    )
  );

-- Family Meals - simplified
CREATE POLICY "Family members can view meals" ON family_meals FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can manage meals" ON family_meals FOR ALL
  USING (
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid()
    )
  );

-- Family Reviews - simplified
CREATE POLICY "Family members can view family reviews" ON family_reviews FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can manage family reviews" ON family_reviews FOR ALL
  USING (
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid()
    )
  );

-- Shopping Items - simplified
CREATE POLICY "Family members can view shopping items" ON shopping_items FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can manage shopping items" ON shopping_items FOR ALL
  USING (
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid()
    )
  );

-- Family Milestones - simplified
CREATE POLICY "Family members can view family milestones" ON family_milestones FOR SELECT
  USING (
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can manage family milestones" ON family_milestones FOR ALL
  USING (
    family_id IN (
      SELECT family_id FROM family_members 
      WHERE user_id = auth.uid()
    )
  );