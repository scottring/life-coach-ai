import { useState, useEffect } from 'react';
import { useTasks } from '../providers/TaskProvider';
import { useUserContext } from '../providers/UserContextProvider';
import { generateDailyBriefing } from '../lib/taskPrioritizer';

export function useDailyBriefing() {
  const { tasks } = useTasks();
  const { context } = useUserContext();
  const [briefing, setBriefing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const refreshBriefing = async () => {
    if (tasks.length === 0) {
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Filter to today's and overdue tasks
      const today = new Date();
      const todayStr = today.toISOString().split('T')[0];
      
      const relevantTasks = tasks.filter(task => {
        if (task.status !== 'pending') return false;
        if (!task.deadline) return task.priority >= 4; // High priority tasks without deadlines
        
        const taskDate = new Date(task.deadline).toISOString().split('T')[0];
        return taskDate <= todayStr; // Today or overdue
      });

      // Mock events for now (will connect to calendar later)
      const mockEvents = [
        {
          title: 'Team Standup',
          start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 0),
          end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 9, 30),
          type: 'meeting'
        },
        {
          title: 'Focus Block',
          start: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 14, 0),
          end: new Date(today.getFullYear(), today.getMonth(), today.getDate(), 16, 0),
          type: 'focus'
        }
      ];

      const generatedBriefing = await generateDailyBriefing(relevantTasks, mockEvents, context);
      setBriefing(generatedBriefing);
    } catch (err) {
      console.error('Error generating daily briefing:', err);
      setError(err.message);
      
      // Fallback briefing
      setBriefing({
        summary: "Ready to tackle your tasks for today!",
        focusAreas: tasks.slice(0, 3).map(t => t.title),
        insights: "Consider starting with your highest priority tasks when your energy is highest."
      });
    } finally {
      setLoading(false);
    }
  };

  // Generate briefing when tasks or context changes
  useEffect(() => {
    refreshBriefing();
  }, [tasks.length, context.current_focus, context.energy_level]);

  return {
    briefing,
    loading,
    error,
    refreshBriefing
  };
}