import React, { useState } from 'react';
import { 
  CheckCircleIcon,
  PlusIcon,
  Cog6ToothIcon,
  ClockIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { useTodoistIntegration } from '../hooks/useTodoistIntegration';

interface TodoWidgetProps {
  familyId: string;
  userId: string;
}

export default function TodoWidget({ familyId, userId }: TodoWidgetProps) {
  const {
    isConnected,
    tasks,
    projects,
    selectedProject,
    loading,
    error,
    connectTodoist,
    disconnectTodoist,
    setSelectedProject,
    createTask,
    completeTask,
    refreshTasks
  } = useTodoistIntegration();

  const [showSettings, setShowSettings] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [apiToken, setApiToken] = useState('');
  const [newTaskContent, setNewTaskContent] = useState('');

  const handleConnect = async () => {
    if (!apiToken.trim()) return;
    
    const success = await connectTodoist(apiToken);
    if (success) {
      setShowSettings(false);
      setApiToken('');
    }
  };

  const handleAddTask = async () => {
    if (!newTaskContent.trim()) return;
    
    const success = await createTask(newTaskContent, {
      labels: ['family']
    });
    
    if (success) {
      setNewTaskContent('');
      setShowAddTask(false);
    }
  };

  const handleCompleteTask = async (taskId: string) => {
    await completeTask(taskId);
  };

  const getPriorityIcon = (priority: number) => {
    switch (priority) {
      case 4: return '🔥'; // Urgent
      case 3: return '⚡'; // High
      case 2: return '💙'; // Medium
      default: return ''; // Normal
    }
  };

  // Show connection setup if not connected
  if (!isConnected) {
    return (
      <div className="h-full flex flex-col">
        {error && (
          <div className="p-2 mb-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
            {error}
          </div>
        )}
        
        {showSettings ? (
          <div className="space-y-3">
            <div>
              <input
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Todoist API token"
                className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                onKeyPress={(e) => e.key === 'Enter' && handleConnect()}
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleConnect}
                disabled={loading}
                className="flex-1 px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:bg-blue-300"
              >
                {loading ? 'Connecting...' : 'Connect'}
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="px-2 py-1 border border-gray-300 text-gray-600 rounded text-xs hover:bg-gray-50"
              >
                Cancel
              </button>
            </div>
            <div className="text-xs text-gray-500">
              Get your API token from Todoist Settings → Integrations
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="text-gray-400 mb-2">
              <Cog6ToothIcon className="h-8 w-8 mx-auto" />
            </div>
            <p className="text-sm text-gray-600 mb-3">Connect to Todoist to sync your tasks</p>
            <button
              onClick={() => setShowSettings(true)}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm font-medium hover:bg-blue-700"
            >
              Connect Todoist
            </button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header with settings */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center">
          <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
          <span className="text-xs text-gray-600">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setShowAddTask(true)}
            className="p-1 text-gray-400 hover:text-blue-600"
            title="Add task"
          >
            <PlusIcon className="h-4 w-4" />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-1 text-gray-400 hover:text-gray-600"
            title="Settings"
          >
            <Cog6ToothIcon className="h-4 w-4" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-2 mb-2 bg-red-50 border border-red-200 rounded text-xs text-red-700">
          {error}
        </div>
      )}

      {/* Project selector */}
      {projects.length > 1 && (
        <div className="mb-3">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
          >
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Add task form */}
      {showAddTask && (
        <div className="mb-3 p-2 bg-gray-50 rounded">
          <input
            type="text"
            value={newTaskContent}
            onChange={(e) => setNewTaskContent(e.target.value)}
            placeholder="What needs to be done?"
            className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500 mb-2"
            onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
            autoFocus
          />
          <div className="flex space-x-2">
            <button
              onClick={handleAddTask}
              disabled={!newTaskContent.trim() || loading}
              className="flex-1 px-2 py-1 bg-green-600 text-white rounded text-xs font-medium hover:bg-green-700 disabled:bg-green-300"
            >
              Add Task
            </button>
            <button
              onClick={() => {
                setShowAddTask(false);
                setNewTaskContent('');
              }}
              className="px-2 py-1 border border-gray-300 text-gray-600 rounded text-xs hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Settings panel */}
      {showSettings && (
        <div className="mb-3 p-2 bg-gray-50 rounded">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-700">Todoist Settings</span>
            <button
              onClick={() => setShowSettings(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          </div>
          <div className="space-y-2">
            <button
              onClick={refreshTasks}
              disabled={loading}
              className="w-full px-2 py-1 bg-blue-600 text-white rounded text-xs font-medium hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? 'Refreshing...' : 'Refresh Tasks'}
            </button>
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to disconnect from Todoist?')) {
                  disconnectTodoist();
                  setShowSettings(false);
                }
              }}
              className="w-full px-2 py-1 border border-red-300 text-red-600 rounded text-xs font-medium hover:bg-red-50"
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {/* Tasks list */}
      <div className="flex-1 overflow-y-auto">
        {loading && tasks.length === 0 ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          </div>
        ) : tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.slice(0, 8).map(task => (
              <div key={task.id} className="group flex items-start space-x-2 p-2 hover:bg-gray-50 rounded">
                <button
                  onClick={() => handleCompleteTask(task.id)}
                  className="mt-0.5 p-0.5 text-gray-400 hover:text-green-600"
                >
                  <CheckCircleIcon className="h-4 w-4" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center">
                    <p className="text-xs text-gray-900 truncate">{task.content}</p>
                    {task.priority > 1 && (
                      <span className="ml-1 text-xs">{getPriorityIcon(task.priority)}</span>
                    )}
                  </div>
                  {task.due && (
                    <div className="flex items-center mt-1 text-xs text-gray-500">
                      <ClockIcon className="h-3 w-3 mr-1" />
                      {task.due.string}
                    </div>
                  )}
                  {task.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {task.labels.slice(0, 2).map(label => (
                        <span key={label} className="inline-block px-1 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {tasks.length > 8 && (
              <div className="flex items-center justify-center py-2 text-xs text-gray-500">
                <ChevronRightIcon className="h-3 w-3 mr-1" />
                {tasks.length - 8} more tasks in Todoist
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircleIcon className="h-8 w-8 text-gray-300 mb-2" />
            <p className="text-sm text-gray-600 mb-2">All tasks completed!</p>
            <button
              onClick={() => setShowAddTask(true)}
              className="text-xs text-blue-600 hover:text-blue-700"
            >
              Add a new task
            </button>
          </div>
        )}
      </div>
    </div>
  );
}