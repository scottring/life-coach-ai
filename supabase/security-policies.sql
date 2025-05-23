-- Security Policies for Life Coach AI
-- Run this AFTER running fixed-essential-schema.sql

-- Drop existing policies if they exist (to avoid conflicts)
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

-- Security Policies for Families
CREATE POLICY "Users can view families they belong to" ON families FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = families.id 
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create families" ON families FOR INSERT
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Family admins can update families" ON families FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = families.id 
      AND family_members.user_id = auth.uid()
      AND family_members.role IN ('admin', 'parent')
    )
  );

-- Security Policies for Family Members
CREATE POLICY "Users can view family members" ON family_members FOR SELECT
  USING (
    user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = family_members.family_id 
      AND fm.user_id = auth.uid()
    )
  );

CREATE POLICY "Family admins can manage members" ON family_members FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM family_members fm
      WHERE fm.family_id = family_members.family_id 
      AND fm.user_id = auth.uid()
      AND fm.role IN ('admin', 'parent')
    )
  );

-- Security Policies for Family Goals
CREATE POLICY "Family members can view family goals" ON family_goals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_goals.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can manage family goals" ON family_goals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_goals.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

-- Security Policies for Family Tasks
CREATE POLICY "Family members can view family tasks" ON family_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_tasks.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can manage family tasks" ON family_tasks FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_tasks.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

-- Security Policies for Family Meals
CREATE POLICY "Family members can view meals" ON family_meals FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_meals.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can manage meals" ON family_meals FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_meals.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

-- Security Policies for Family Reviews
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

-- Security Policies for Shopping Items
CREATE POLICY "Family members can view shopping items" ON shopping_items FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = shopping_items.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can manage shopping items" ON shopping_items FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = shopping_items.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

-- Security Policies for Family Milestones
CREATE POLICY "Family members can view family milestones" ON family_milestones FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_milestones.family_id 
      AND family_members.user_id = auth.uid()
    )
  );

CREATE POLICY "Family members can manage family milestones" ON family_milestones FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM family_members 
      WHERE family_members.family_id = family_milestones.family_id 
      AND family_members.user_id = auth.uid()
    )
  );