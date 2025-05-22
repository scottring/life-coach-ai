import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

function TaskGoalAssigner({ taskId }) {
  const [goals, setGoals] = useState([]);
  const [assignedGoals, setAssignedGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      
      try {
        // Fetch all user's goals
        const { data: goalsData, error: goalsError } = await supabase
          .from('goals')
          .select('*')
          .eq('user_id', supabase.auth.user()?.id)
          .eq('status', 'active');
          
        if (goalsError) throw goalsError;
        
        // Fetch currently assigned goals for this task
        const { data: assignedData, error: assignedError } = await supabase
          .from('task_goals')
          .select('goal_id')
          .eq('task_id', taskId);
          
        if (assignedError) throw assignedError;
        
        // Set state
        setGoals(goalsData || []);
        setAssignedGoals(assignedData?.map(a => a.goal_id) || []);
      } catch (error) {
        console.error('Error fetching goals data:', error);
        
        // Mock data for development
        setGoals([
          { id: '1', title: 'Launch MVP', timeframe: 'quarter' },
          { id: '2', title: 'Customer interviews', timeframe: 'month' },
          { id: '3', title: 'Improve work-life balance', timeframe: 'year' }
        ]);
        setAssignedGoals(['1']);
      } finally {
        setLoading(false);
      }
    };
    
    if (taskId) {
      fetchData();
    }
  }, [taskId]);
  
  const handleToggleGoal = async (goalId) => {
    setSaving(true);
    
    try {
      const isAssigned = assignedGoals.includes(goalId);
      
      if (isAssigned) {
        // Remove goal assignment
        await supabase
          .from('task_goals')
          .delete()
          .eq('task_id', taskId)
          .eq('goal_id', goalId);
          
        setAssignedGoals(prev => prev.filter(id => id !== goalId));
      } else {
        // Add goal assignment
        await supabase
          .from('task_goals')
          .insert([{ task_id: taskId, goal_id: goalId }]);
          
        setAssignedGoals(prev => [...prev, goalId]);
      }
    } catch (error) {
      console.error('Error updating goal assignment:', error);
      
      // For development, just toggle the state
      if (assignedGoals.includes(goalId)) {
        setAssignedGoals(prev => prev.filter(id => id !== goalId));
      } else {
        setAssignedGoals(prev => [...prev, goalId]);
      }
    } finally {
      setSaving(false);
    }
  };
  
  if (loading) {
    return <div className="text-center text-sm text-gray-500">Loading goals...</div>;
  }
  
  if (goals.length === 0) {
    return (
      <div className="rounded-md bg-gray-50 p-3 text-center text-sm text-gray-500">
        No active goals. Create goals to align tasks with your objectives.
      </div>
    );
  }
  
  return (
    <div className="mt-4">
      <h3 className="text-sm font-medium text-gray-700">Align with Goals</h3>
      
      <div className="mt-2 space-y-2">
        {goals.map(goal => (
          <label key={goal.id} className="flex items-center">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
              checked={assignedGoals.includes(goal.id)}
              onChange={() => handleToggleGoal(goal.id)}
              disabled={saving}
            />
            <div className="ml-2 flex items-center">
              <span className="text-sm text-gray-700">{goal.title}</span>
              <span className="ml-1 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-800">
                {goal.timeframe}
              </span>
            </div>
          </label>
        ))}
      </div>
      
      {saving && (
        <div className="mt-2 text-xs text-gray-500">Saving changes...</div>
      )}
    </div>
  );
}

export default TaskGoalAssigner;