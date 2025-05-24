import React, { useState } from 'react';
import { useTasks } from '../providers/TaskProvider';
import { useDailyBriefing } from '../hooks/useDailyBriefing';
import CalendarView from '../components/CalendarView';
import GoalProgress from '../components/GoalProgress';
import DailyBriefing from '../components/DailyBriefing';
import DashboardSelector from '../components/DashboardSelector';
import UpcomingEvents from '../components/UpcomingEvents';
import { TrashIcon } from '@heroicons/react/24/outline';

function DashboardPage() {
  const { tasks, loading: tasksLoading, deleteTask, updateTask } = useTasks();
  const { briefing, loading: briefingLoading } = useDailyBriefing();
  const [showBriefing, setShowBriefing] = useState(false);

  // Get high priority tasks
  const highPriorityTasks = tasks
    .filter(task => task.status === 'pending' && task.priority >= 4)
    .slice(0, 5);

  // Get travel tasks
  const travelTasks = tasks
    .filter(task => task.status === 'pending' && task.context === 'Travel')
    .slice(0, 5);

  const handleDeleteTask = async (taskId) => {
    await deleteTask(taskId);
  };

  const handleToggleComplete = async (task) => {
    await updateTask(task.id, { status: task.status === 'completed' ? 'pending' : 'completed' });
  };

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

      {/* Content Grid - Tasks, Travel, Events, Goals */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-4 mb-8">
        {/* High Priority Tasks */}
        <div className="rounded-lg bg-white p-6 shadow">
          <h2 className="mb-4 text-lg font-semibold text-gray-900">
            High Priority Tasks
          </h2>
          {highPriorityTasks.length > 0 ? (
            <div className="space-y-3">
              {highPriorityTasks.map(task => (
                <div key={task.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 group">
                  <input
                    type="checkbox"
                    checked={task.status === 'completed'}
                    onChange={() => handleToggleComplete(task)}
                    className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                    {task.deadline && (
                      <p className="text-xs text-gray-500 mt-1">
                        Due: {new Date(task.deadline).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <span className="text-xs font-medium text-red-600 bg-red-50 px-2 py-1 rounded">
                      P{task.priority}
                    </span>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
                      title="Delete task"
                    >
                      <TrashIcon className="h-4 w-4 text-gray-500 hover:text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-center text-gray-500">No high priority tasks</p>
          )}
        </div>

        {/* Travel Tasks */}
        <div className="rounded-lg bg-white p-6 shadow">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Travel Tasks</h2>
            <a 
              href="/travel" 
              className="text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              View All
            </a>
          </div>
          {travelTasks.length > 0 ? (
            <div className="space-y-3">
              {travelTasks.map(task => (
                <div key={task.id} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 group">
                  <input
                    type="checkbox"
                    checked={task.status === 'completed'}
                    onChange={() => handleToggleComplete(task)}
                    className="mt-1 h-4 w-4 text-blue-600 rounded border-gray-300 cursor-pointer"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{task.title}</p>
                    {task.deadline && (
                      <p className="text-xs text-gray-500 mt-1">
                        Due: {new Date(task.deadline).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <span className="text-xs font-medium text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      Travel
                    </span>
                    <button
                      onClick={() => handleDeleteTask(task.id)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-1 hover:bg-gray-100 rounded"
                      title="Delete task"
                    >
                      <TrashIcon className="h-4 w-4 text-gray-500 hover:text-red-600" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center text-gray-500">
              <p className="text-sm">No travel tasks</p>
              <a 
                href="/travel" 
                className="text-xs text-blue-600 hover:text-blue-700 mt-1 inline-block"
              >
                Plan a trip
              </a>
            </div>
          )}
        </div>

        {/* Upcoming Events */}
        <div className="rounded-lg bg-white p-6 shadow">
          <UpcomingEvents />
        </div>

        {/* Goal Progress */}
        <div className="rounded-lg bg-white p-6 shadow">
          <GoalProgress />
        </div>
      </div>

      {/* Full Width Calendar - Below the content grid */}
      <div className="rounded-lg bg-white p-6 shadow">
        <CalendarView />
      </div>
    </div>
  );
}

export default DashboardPage;