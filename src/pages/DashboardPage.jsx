import React, { useState } from 'react';
import { useTasks } from '../providers/TaskProvider';
import { useDailyBriefing } from '../hooks/useDailyBriefing';
import CalendarView from '../components/CalendarView';
import TaskList from '../components/TaskList';
import GoalProgress from '../components/GoalProgress';
import DailyBriefing from '../components/DailyBriefing';
import DashboardSelector from '../components/DashboardSelector';

function DashboardPage() {
  const { tasks, loading: tasksLoading } = useTasks();
  const { briefing, loading: briefingLoading } = useDailyBriefing();
  const [showBriefing, setShowBriefing] = useState(false);
  const [showInsights, setShowInsights] = useState(false);

  // Filter today's tasks
  const today = new Date().toISOString().split('T')[0];
  const todaysTasks = tasks.filter(task => {
    if (task.status !== 'pending') return false;
    if (!task.deadline) return task.priority >= 4;
    
    const taskDate = new Date(task.deadline).toISOString().split('T')[0];
    return taskDate <= today;
  });

  // Get high priority tasks
  const highPriorityTasks = tasks
    .filter(task => task.status === 'pending' && task.priority >= 4)
    .slice(0, 5);

  if (tasksLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Streamlined Header */}
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="mt-1 text-gray-600">
            {new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setShowBriefing(!showBriefing)}
            className="rounded-md border border-gray-300 px-3 py-2 text-sm font-medium hover:bg-gray-50"
          >
            {showBriefing ? 'Hide' : 'Show'} Briefing
          </button>
          <DashboardSelector />
        </div>
      </div>

      {/* Optional Daily Briefing */}
      {showBriefing && (
        <div className="mb-8">
          <DailyBriefing briefing={briefingLoading ? null : briefing} />
        </div>
      )}

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Calendar - Takes up 2 columns */}
        <div className="lg:col-span-2">
          <CalendarView />
        </div>

        {/* Today's Tasks - Right column */}
        <div className="space-y-6">
          {/* Today's Focus */}
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              Today's Focus ({todaysTasks.length})
            </h2>
            {todaysTasks.length > 0 ? (
              <TaskList 
                tasks={todaysTasks} 
                showContext={false}
                compact={true}
              />
            ) : (
              <p className="text-center text-gray-500">
                No urgent tasks for today
              </p>
            )}
          </div>

          {/* Goal Progress */}
          <GoalProgress />
        </div>
      </div>

      {/* High Priority Tasks - Full width below */}
      {highPriorityTasks.length > 0 && (
        <div className="mt-8">
          <div className="rounded-lg bg-white p-6 shadow">
            <h2 className="mb-4 text-lg font-semibold text-gray-900">
              High Priority Tasks
            </h2>
            <TaskList 
              tasks={highPriorityTasks} 
              showContext={true}
              compact={true}
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default DashboardPage;