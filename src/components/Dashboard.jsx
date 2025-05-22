import React from 'react';
import { useTasks } from '../providers/TaskProvider';
import { useUserContext } from '../providers/UserContextProvider';
import { useDailyBriefing } from '../hooks/useDailyBriefing';
import TaskList from './TaskList';
import GoalProgress from './GoalProgress';
import DailyBriefing from './DailyBriefing';
import SmartPrioritizer from './SmartPrioritizer';
import UpcomingEvents from './UpcomingEvents';

function Dashboard() {
  const { tasks, loading: tasksLoading } = useTasks();
  const { context } = useUserContext();
  const { briefing, loading: briefingLoading } = useDailyBriefing();
  
  // Filter today's tasks
  const today = new Date().toISOString().split('T')[0];
  const todaysTasks = tasks.filter(task => {
    if (task.status !== 'pending') return false;
    if (!task.deadline) return task.priority >= 4; // High priority tasks
    
    const taskDate = new Date(task.deadline).toISOString().split('T')[0];
    return taskDate <= today; // Today or overdue
  });

  // Get high priority tasks
  const highPriorityTasks = tasks
    .filter(task => task.status === 'pending' && task.priority >= 4)
    .slice(0, 6);

  if (tasksLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent"></div>
          <p className="mt-2 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">
          Good {getTimeOfDay()}, ready to be productive?
        </h1>
        <p className="mt-1 text-sm text-gray-600">
          Here's your personalized overview for {new Date().toLocaleDateString()}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Daily Briefing */}
          <DailyBriefing briefing={briefingLoading ? null : briefing} />
          
          {/* Smart Prioritizer */}
          <SmartPrioritizer />
          
          {/* Today's Tasks */}
          <div className="rounded-lg bg-white p-6 shadow">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">
                Today's Focus ({todaysTasks.length})
              </h2>
              <span className="text-sm text-gray-500">
                {context.current_focus} • {context.energy_level} Energy
              </span>
            </div>
            
            {todaysTasks.length > 0 ? (
              <TaskList 
                tasks={todaysTasks} 
                showContext={false}
                compact={true}
              />
            ) : (
              <div className="text-center py-6">
                <p className="text-gray-500">No urgent tasks for today. Great job staying ahead!</p>
                <p className="text-sm text-gray-400 mt-1">
                  Consider working on your longer-term goals.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Upcoming Events */}
          <UpcomingEvents />
          
          {/* Goal Progress */}
          <GoalProgress />
          
          {/* High Priority Tasks */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              High Priority Tasks
            </h2>
            
            {highPriorityTasks.length > 0 ? (
              <div className="space-y-3">
                {highPriorityTasks.map(task => (
                  <div key={task.id} className="flex items-center justify-between p-3 rounded border">
                    <div>
                      <p className="font-medium text-sm">{task.title}</p>
                      <p className="text-xs text-gray-500">{task.context}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="inline-flex items-center rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-800">
                        P{task.priority}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500 text-sm">No high priority tasks at the moment.</p>
            )}
          </div>
          
          {/* Context Overview */}
          <div className="rounded-lg bg-gray-50 p-4">
            <h3 className="font-medium text-gray-900 mb-3">Current Context</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600">Focus Area:</span>
                <span className="font-medium">{context.current_focus}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Energy Level:</span>
                <span className="font-medium">{context.energy_level}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Available Time:</span>
                <span className="font-medium">{context.available_time} minutes</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to get time of day greeting
function getTimeOfDay() {
  const hour = new Date().getHours();
  if (hour < 12) return 'morning';
  if (hour < 17) return 'afternoon';
  return 'evening';
}

export default Dashboard;