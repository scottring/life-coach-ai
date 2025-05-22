import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuthState } from '../hooks/useAuthState';

function GoalProgress() {
  const { user } = useAuthState();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!user?.id) return;
    
    const fetchGoals = async () => {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('goals')
        .select(`
          *,
          task_goals!inner (
            task_id
          ),
          tasks!inner (
            id,
            status
          )
        `)
        .eq('user_id', user.id)
        .eq('status', 'active');
        
      if (!error && data) {
        // Process goal data and calculate progress
        const processedGoals = data.map(goal => {
          const totalTasks = new Set(goal.task_goals.map(tg => tg.task_id)).size;
          const completedTasks = goal.tasks.filter(t => t.status === 'completed').length;
          const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;
          
          return {
            ...goal,
            totalTasks,
            completedTasks,
            progress
          };
        });
        
        setGoals(processedGoals);
      } else {
        console.error('Error fetching goals:', error);
        // Set some mock goals for development
        setGoals([
          { id: '1', title: 'Launch MVP', timeframe: 'quarter', progress: 65 },
          { id: '2', title: 'Customer interviews', timeframe: 'month', progress: 30 },
          { id: '3', title: 'Improve work-life balance', timeframe: 'year', progress: 45 }
        ]);
      }
      
      setLoading(false);
    };
    
    fetchGoals();
  }, [user?.id]);
  
  if (loading) {
    return <div className="text-center text-gray-500">Loading goals...</div>;
  }
  
  if (goals.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 text-center shadow-sm">
        <p className="text-gray-500">No active goals. Add a goal to get started.</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {goals.map(goal => (
        <div key={goal.id} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-gray-800">{goal.title}</h3>
            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">
              {goal.timeframe}
            </span>
          </div>
          
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-500">
              <span>{goal.progress.toFixed(0)}% complete</span>
              {goal.totalTasks && (
                <span>
                  {goal.completedTasks}/{goal.totalTasks} tasks
                </span>
              )}
            </div>
            <div className="mt-1 h-2 w-full overflow-hidden rounded-full bg-gray-200">
              <div 
                className="h-full rounded-full bg-blue-600" 
                style={{ width: `${goal.progress}%` }}
              ></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default GoalProgress;