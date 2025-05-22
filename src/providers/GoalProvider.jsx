import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuthState } from '../hooks/useAuthState';
import { supabase } from '../lib/supabaseClient';
import { Goal } from '../models/Goal';

// Create context
const GoalContext = createContext();

// Provider component
export const GoalProvider = ({ children }) => {
  const { user } = useAuthState();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  const userId = user?.id;
  
  // Load goals when user changes
  useEffect(() => {
    const loadGoals = async () => {
      if (!userId) {
        setGoals(getMockGoals());
        setLoading(false);
        return;
      }
      
      setLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('goals')
          .select('*')
          .eq('user_id', userId)
          .eq('status', 'active')
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        const fetchedGoals = (data || []).map(goal => Goal.fromDB(goal));
        setGoals(fetchedGoals);
      } catch (error) {
        console.error('Error loading goals:', error);
        // Fall back to mock data on error
        setGoals(getMockGoals());
      } finally {
        setLoading(false);
      }
    };
    
    loadGoals();
  }, [userId]);
  
  // Create a new goal
  const createGoal = async (goalData) => {
    if (!userId) return null;
    
    try {
      const goal = new Goal({
        ...goalData,
        user_id: userId
      });
      
      const { data, error } = await supabase
        .from('goals')
        .insert([goal.toDB()])
        .select()
        .single();
        
      if (error) throw error;
      
      const newGoal = Goal.fromDB(data);
      setGoals(prev => [newGoal, ...prev]);
      return newGoal;
    } catch (error) {
      console.error('Error creating goal:', error);
      return null;
    }
  };
  
  // Update a goal
  const updateGoal = async (goalId, updates) => {
    if (!userId) return null;
    
    try {
      const { data, error } = await supabase
        .from('goals')
        .update({
          ...updates,
          updated_at: new Date().toISOString()
        })
        .eq('id', goalId)
        .eq('user_id', userId)
        .select()
        .single();
        
      if (error) throw error;
      
      const updatedGoal = Goal.fromDB(data);
      setGoals(prev => prev.map(goal => 
        goal.id === goalId ? updatedGoal : goal
      ));
      
      return updatedGoal;
    } catch (error) {
      console.error('Error updating goal:', error);
      return null;
    }
  };
  
  // Archive a goal
  const archiveGoal = async (goalId) => {
    return updateGoal(goalId, { status: 'archived' });
  };
  
  // Fetch a goal with its tasks
  const getGoalWithTasks = async (goalId) => {
    if (!userId) return null;
    
    try {
      // Get the goal
      const { data: goalData, error: goalError } = await supabase
        .from('goals')
        .select('*')
        .eq('id', goalId)
        .eq('user_id', userId)
        .single();
        
      if (goalError) throw goalError;
      
      // Get associated tasks
      const { data: taskData, error: taskError } = await supabase
        .from('task_goals')
        .select(`
          task_id,
          tasks (*)
        `)
        .eq('goal_id', goalId);
        
      if (taskError) throw taskError;
      
      const goal = Goal.fromDB(goalData);
      goal.tasks = taskData.map(tg => tg.tasks);
      goal.progress = goal.calculateProgress(goal.tasks);
      
      return goal;
    } catch (error) {
      console.error('Error fetching goal with tasks:', error);
      return null;
    }
  };
  
  // Assign a task to a goal
  const assignTaskToGoal = async (taskId, goalId) => {
    if (!userId) return false;
    
    try {
      const { error } = await supabase
        .from('task_goals')
        .insert([{ task_id: taskId, goal_id: goalId }]);
        
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error assigning task to goal:', error);
      return false;
    }
  };
  
  // Remove a task from a goal
  const removeTaskFromGoal = async (taskId, goalId) => {
    if (!userId) return false;
    
    try {
      const { error } = await supabase
        .from('task_goals')
        .delete()
        .eq('task_id', taskId)
        .eq('goal_id', goalId);
        
      if (error) throw error;
      
      return true;
    } catch (error) {
      console.error('Error removing task from goal:', error);
      return false;
    }
  };
  
  // Provider value
  const value = {
    goals,
    loading,
    createGoal,
    updateGoal,
    archiveGoal,
    getGoalWithTasks,
    assignTaskToGoal,
    removeTaskFromGoal
  };
  
  return (
    <GoalContext.Provider value={value}>
      {children}
    </GoalContext.Provider>
  );
};

// Custom hook to use the goal context
export const useGoals = () => {
  const context = useContext(GoalContext);
  
  if (context === undefined) {
    throw new Error('useGoals must be used within a GoalProvider');
  }
  
  return context;
};

// Mock data helper (fallback when no auth or Supabase errors)
function getMockGoals() {
  const mockGoals = [
    {
      id: '1',
      title: 'Launch Product MVP',
      description: 'Complete and launch the minimum viable product for our new app',
      timeframe: 'quarter',
      status: 'active',
      created_at: new Date().toISOString()
    },
    {
      id: '2',
      title: 'Improve Health & Fitness',
      description: 'Establish consistent workout routine and improve overall health',
      timeframe: 'year',
      status: 'active',
      created_at: new Date().toISOString()
    },
    {
      id: '3',
      title: 'Learn New Skills',
      description: 'Complete online courses in AI and machine learning',
      timeframe: 'quarter',
      status: 'active',
      created_at: new Date().toISOString()
    }
  ].map(goal => Goal.fromDB(goal));
  
  return mockGoals;
}