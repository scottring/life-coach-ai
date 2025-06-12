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
          <div className="space-y-4">
            <div>
              <input
                type="password"
                value={apiToken}
                onChange={(e) => setApiToken(e.target.value)}
                placeholder="Todoist API token"
                className="apple-input w-full px-3 py-2 apple-caption text-gray-800"
                onKeyDown={(e) => e.key === 'Enter' && handleConnect()}
              />
            </div>
            <div className="flex space-x-2">
              <button
                onClick={handleConnect}
                disabled={loading}
                className="apple-button flex-1 px-3 py-2 text-white apple-caption font-medium"
                style={{ background: loading ? 'rgba(0, 122, 255, 0.5)' : 'var(--apple-blue)' }}
              >
                {loading ? 'Connecting...' : 'Connect'}
              </button>
              <button
                onClick={() => setShowSettings(false)}
                className="apple-button px-3 py-2 text-gray-600 apple-caption"
              >
                Cancel
              </button>
            </div>
            <div className="apple-caption text-gray-600/80">
              Get your API token from Todoist Settings → Integrations
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center">
            <div className="text-gray-400/60 mb-3">
              <Cog6ToothIcon className="h-8 w-8 mx-auto sf-icon" />
            </div>
            <p className="apple-body text-gray-700/80 mb-4">Connect to Todoist to sync your tasks</p>
            <button
              onClick={() => setShowSettings(true)}
              className="apple-button px-4 py-2 text-blue-600 apple-caption"
              style={{ background: 'rgba(0, 122, 255, 0.1)' }}
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
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <div className="w-2 h-2 rounded-full mr-2" style={{ background: 'var(--apple-green)' }}></div>
          <span className="apple-caption text-gray-700/80">
            {tasks.length} task{tasks.length !== 1 ? 's' : ''}
          </span>
        </div>
        <div className="flex items-center space-x-1">
          <button
            onClick={() => setShowAddTask(true)}
            className="p-2 text-gray-600/60 hover:text-blue-600 apple-transition rounded-lg hover:bg-blue-500/10"
            title="Add task"
          >
            <PlusIcon className="h-4 w-4 sf-icon" />
          </button>
          <button
            onClick={() => setShowSettings(true)}
            className="p-2 text-gray-600/60 hover:text-gray-800 apple-transition rounded-lg hover:bg-gray-500/10"
            title="Settings"
          >
            <Cog6ToothIcon className="h-4 w-4 sf-icon" />
          </button>
        </div>
      </div>

      {error && (
        <div className="p-3 mb-3 rounded-xl border apple-caption text-red-600" 
             style={{ background: 'rgba(255, 59, 48, 0.1)', borderColor: 'rgba(255, 59, 48, 0.2)' }}>
          {error}
        </div>
      )}

      {/* Project selector */}
      {projects.length > 1 && (
        <div className="mb-4">
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="apple-input w-full px-3 py-2 apple-caption text-white"
          >
            {projects.map(project => (
              <option key={project.id} value={project.id} className="text-gray-800">
                {project.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Add task form */}
      {showAddTask && (
        <div className="mb-4 p-4 rounded-xl" style={{ background: 'rgba(0, 0, 0, 0.05)' }}>
          <input
            type="text"
            value={newTaskContent}
            onChange={(e) => setNewTaskContent(e.target.value)}
            placeholder="What needs to be done?"
            className="apple-input w-full px-3 py-2 apple-caption text-gray-800 mb-3"
            onKeyDown={(e) => e.key === 'Enter' && handleAddTask()}
            autoFocus
          />
          <div className="flex space-x-2">
            <button
              onClick={handleAddTask}
              disabled={!newTaskContent.trim() || loading}
              className="apple-button flex-1 px-3 py-2 text-white apple-caption font-medium"
              style={{ background: !newTaskContent.trim() || loading ? 'rgba(52, 199, 89, 0.5)' : 'var(--apple-green)' }}
            >
              Add Task
            </button>
            <button
              onClick={() => {
                setShowAddTask(false);
                setNewTaskContent('');
              }}
              className="apple-button px-3 py-2 text-gray-600 apple-caption"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Settings panel */}
      {showSettings && (
        <div className="mb-4 p-4 rounded-xl" style={{ background: 'rgba(0, 0, 0, 0.05)' }}>
          <div className="flex items-center justify-between mb-3">
            <span className="apple-subtitle text-gray-800">Todoist Settings</span>
            <button
              onClick={() => setShowSettings(false)}
              className="text-gray-500 hover:text-gray-700 apple-transition p-1 rounded-lg hover:bg-gray-500/10"
            >
              ×
            </button>
          </div>
          <div className="space-y-3">
            <button
              onClick={refreshTasks}
              disabled={loading}
              className="apple-button w-full px-3 py-2 text-white apple-caption font-medium"
              style={{ background: loading ? 'rgba(0, 122, 255, 0.5)' : 'var(--apple-blue)' }}
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
              className="apple-button w-full px-3 py-2 apple-caption font-medium"
              style={{ background: 'rgba(255, 59, 48, 0.1)', color: 'var(--apple-red)', border: '1px solid rgba(255, 59, 48, 0.2)' }}
            >
              Disconnect
            </button>
          </div>
        </div>
      )}

      {/* Tasks list */}
      <div className="flex-1 overflow-y-auto">
        {loading && tasks.length === 0 ? (
          <div className="flex items-center justify-center py-6">
            <div className="animate-spin rounded-full h-5 w-5 border-2 border-gray-300 border-t-blue-600"></div>
          </div>
        ) : tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.slice(0, 8).map(task => (
              <div key={task.id} className="group flex items-start space-x-3 p-3 rounded-xl apple-transition hover:bg-white/50">
                <button
                  onClick={() => handleCompleteTask(task.id)}
                  className="mt-0.5 p-1 text-gray-400/60 hover:text-green-600 apple-transition rounded-lg hover:bg-green-500/10"
                >
                  <CheckCircleIcon className="h-4 w-4 sf-icon" />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center">
                    <p className="apple-caption text-gray-800 truncate">{task.content}</p>
                    {task.priority > 1 && (
                      <span className="ml-2 text-sm">{getPriorityIcon(task.priority)}</span>
                    )}
                  </div>
                  {task.due && (
                    <div className="flex items-center mt-1 apple-caption text-gray-600/80">
                      <ClockIcon className="h-3 w-3 mr-1 sf-icon" />
                      {task.due.string}
                    </div>
                  )}
                  {task.labels.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {task.labels.slice(0, 2).map(label => (
                        <span key={label} className="inline-block px-2 py-1 rounded-full apple-caption"
                              style={{ background: 'rgba(0, 122, 255, 0.1)', color: 'var(--apple-blue)' }}>
                          {label}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
            {tasks.length > 8 && (
              <div className="flex items-center justify-center py-3 apple-caption text-gray-600/60">
                <ChevronRightIcon className="h-3 w-3 mr-1 sf-icon" />
                {tasks.length - 8} more tasks in Todoist
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <CheckCircleIcon className="h-8 w-8 text-gray-400/40 mb-3 sf-icon" />
            <p className="apple-body text-gray-700/80 mb-3">All tasks completed!</p>
            <button
              onClick={() => setShowAddTask(true)}
              className="apple-caption text-blue-600 hover:text-blue-700 apple-transition"
            >
              Add a new task
            </button>
          </div>
        )}
      </div>
    </div>
  );
}