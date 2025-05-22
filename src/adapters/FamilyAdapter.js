import { supabase } from '../lib/supabaseClient';

export const FamilyAdapter = {
  async getFamilies(userId) {
    const { data, error } = await supabase
      .from('family_members')
      .select(`
        family_id,
        role,
        families (
          id,
          name,
          created_at
        )
      `)
      .eq('user_id', userId);

    if (error) throw error;
    return data.map(item => ({
      ...item.families,
      userRole: item.role
    }));
  },

  async createFamily(familyData, userId) {
    const { data: family, error: familyError } = await supabase
      .from('families')
      .insert({
        name: familyData.name,
        created_by: userId
      })
      .select()
      .single();

    if (familyError) throw familyError;

    const { error: memberError } = await supabase
      .from('family_members')
      .insert({
        family_id: family.id,
        user_id: userId,
        role: 'admin'
      });

    if (memberError) throw memberError;
    return family;
  },

  async getFamilyMembers(familyId) {
    const { data, error } = await supabase
      .from('family_members')
      .select(`
        id,
        user_id,
        role,
        joined_at
      `)
      .eq('family_id', familyId);

    if (error) throw error;
    return data;
  },

  async addFamilyMember(familyId, userId, role = 'member') {
    const { data, error } = await supabase
      .from('family_members')
      .insert({
        family_id: familyId,
        user_id: userId,
        role
      })
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async getFamilyMeals(familyId) {
    const { data, error } = await supabase
      .from('family_meals')
      .select('*')
      .eq('family_id', familyId)
      .order('date', { ascending: true });

    if (error) throw error;
    return data;
  },

  async createFamilyMeal(mealData) {
    const { data, error } = await supabase
      .from('family_meals')
      .insert(mealData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateFamilyMeal(mealId, mealData) {
    const { data, error } = await supabase
      .from('family_meals')
      .update(mealData)
      .eq('id', mealId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteFamilyMeal(mealId) {
    const { error } = await supabase
      .from('family_meals')
      .delete()
      .eq('id', mealId);

    if (error) throw error;
  },

  async getFamilyTasks(familyId) {
    const { data, error } = await supabase
      .from('family_tasks')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async createFamilyTask(taskData) {
    const { data, error } = await supabase
      .from('family_tasks')
      .insert(taskData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateFamilyTask(taskId, taskData) {
    const { data, error } = await supabase
      .from('family_tasks')
      .update(taskData)
      .eq('id', taskId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteFamilyTask(taskId) {
    const { error } = await supabase
      .from('family_tasks')
      .delete()
      .eq('id', taskId);

    if (error) throw error;
  },

  async getFamilyGoals(familyId) {
    const { data, error } = await supabase
      .from('family_goals')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async createFamilyGoal(goalData) {
    const { data, error } = await supabase
      .from('family_goals')
      .insert(goalData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateFamilyGoal(goalId, goalData) {
    const { data, error } = await supabase
      .from('family_goals')
      .update(goalData)
      .eq('id', goalId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteFamilyGoal(goalId) {
    const { error } = await supabase
      .from('family_goals')
      .delete()
      .eq('id', goalId);

    if (error) throw error;
  },

  async getFamilyMilestones(familyId) {
    const { data, error } = await supabase
      .from('family_milestones')
      .select('*')
      .eq('family_id', familyId)
      .order('date', { ascending: true });

    if (error) throw error;
    return data;
  },

  async createFamilyMilestone(milestoneData) {
    const { data, error } = await supabase
      .from('family_milestones')
      .insert(milestoneData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateFamilyMilestone(milestoneId, milestoneData) {
    const { data, error } = await supabase
      .from('family_milestones')
      .update(milestoneData)
      .eq('id', milestoneId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteFamilyMilestone(milestoneId) {
    const { error } = await supabase
      .from('family_milestones')
      .delete()
      .eq('id', milestoneId);

    if (error) throw error;
  },

  async getShoppingItems(familyId) {
    const { data, error } = await supabase
      .from('shopping_items')
      .select('*')
      .eq('family_id', familyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data;
  },

  async createShoppingItem(itemData) {
    const { data, error } = await supabase
      .from('shopping_items')
      .insert(itemData)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async updateShoppingItem(itemId, itemData) {
    const { data, error } = await supabase
      .from('shopping_items')
      .update(itemData)
      .eq('id', itemId)
      .select()
      .single();

    if (error) throw error;
    return data;
  },

  async deleteShoppingItem(itemId) {
    const { error } = await supabase
      .from('shopping_items')
      .delete()
      .eq('id', itemId);

    if (error) throw error;
  }
};