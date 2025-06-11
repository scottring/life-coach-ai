import React, { useState, useEffect } from 'react';
import { 
  CheckCircleIcon,
  ExclamationCircleIcon,
  Cog6ToothIcon,
  PlusIcon,
  ClockIcon,
  TagIcon
} from '@heroicons/react/24/outline';
import { todoistService, TodoistTask, TodoistProject } from '../services/todoistService';

interface TodoistIntegrationProps {
  familyId: string;
  userId: string;
}

export default function TodoistIntegration({ familyId, userId }: TodoistIntegrationProps) {
  const [isConnected, setIsConnected] = useState(false);
  const [apiToken, setApiToken] = useState('');
  const [tasks, setTasks] = useState<TodoistTask[]>([]);
  const [projects, setProjects] = useState<TodoistProject[]>([]);
  const [selectedProject, setSelectedProject] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showSettings, setShowSettings] = useState(false);

  useEffect(() => {
    // Check if API token is already configured
    const savedToken = localStorage.getItem('todoist_api_token');
    if (savedToken) {
      setApiToken(savedToken);
      todoistService.setApiToken(savedToken);
      testConnection();
    }
  }, []);

  const testConnection = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const connected = await todoistService.testConnection();
      setIsConnected(connected);
      
      if (connected) {
        await loadProjects();
        await loadTasks();
      }
    } catch (err) {
      setError('Failed to connect to Todoist. Please check your API token.');
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const connectTodoist = async () => {
    if (!apiToken.trim()) {
      setError('Please enter your Todoist API token');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Save token and configure service
      localStorage.setItem('todoist_api_token', apiToken);
      todoistService.setApiToken(apiToken);
      
      // Test the connection
      const connected = await todoistService.testConnection();
      setIsConnected(connected);
      
      if (connected) {
        await loadProjects();
        await loadTasks();
        setShowSettings(false);
      } else {
        setError('Invalid API token. Please check and try again.');
      }
    } catch (err) {
      setError('Failed to connect to Todoist. Please check your API token.');
      setIsConnected(false);
    } finally {
      setLoading(false);
    }
  };

  const disconnectTodoist = () => {
    localStorage.removeItem('todoist_api_token');
    setApiToken('');
    setIsConnected(false);
    setTasks([]);
    setProjects([]);
    setSelectedProject('');
    setShowSettings(false);
  };

  const loadProjects = async () => {
    try {
      const projectList = await todoistService.getProjects();
      setProjects(projectList);
      
      // Auto-select the first project if none selected
      if (!selectedProject && projectList.length > 0) {
        setSelectedProject(projectList[0].id);
      }
    } catch (err) {
      console.error('Error loading projects:', err);
      setError('Failed to load projects');
    }
  };

  const loadTasks = async () => {
    try {
      const taskList = await todoistService.getTasks(selectedProject || undefined);
      setTasks(taskList.filter(task => !task.is_completed).slice(0, 10)); // Show only active tasks, limit to 10
    } catch (err) {
      console.error('Error loading tasks:', err);
      setError('Failed to load tasks');
    }
  };

  const createSampleMealTask = async () => {
    if (!selectedProject) {
      setError('Please select a project first');
      return;
    }

    setLoading(true);
    try {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      const dateString = tomorrow.toISOString().split('T')[0];

      await todoistService.createMealPlanningTask(
        'Plan family dinner',
        dateString,
        familyId,
        selectedProject
      );
      
      await loadTasks(); // Refresh tasks
    } catch (err) {
      setError('Failed to create meal planning task');
    } finally {
      setLoading(false);
    }
  };

  const completeTask = async (taskId: string) => {
    try {
      await todoistService.completeTask(taskId);
      await loadTasks(); // Refresh tasks
    } catch (err) {
      setError('Failed to complete task');
    }
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 4: return 'text-red-600 bg-red-100';
      case 3: return 'text-orange-600 bg-orange-100';
      case 2: return 'text-blue-600 bg-blue-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getPriorityLabel = (priority: number) => {
    switch (priority) {
      case 4: return 'Urgent';
      case 3: return 'High';
      case 2: return 'Medium';
      default: return 'Normal';
    }
  };

  if (showSettings || !isConnected) {
    return (
      <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Todoist Integration</h3>
          {isConnected && (
            <button
              onClick={() => setShowSettings(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ×
            </button>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <div className="flex">
              <ExclamationCircleIcon className="h-5 w-5 text-red-400 mr-2" />
              <p className="text-sm text-red-700">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Todoist API Token
            </label>
            <input
              type="password"
              value={apiToken}
              onChange={(e) => setApiToken(e.target.value)}
              placeholder="Enter your Todoist API token"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <p className="mt-1 text-xs text-gray-500">
              You can find your API token in Todoist Settings → Integrations → API token
            </p>
          </div>

          <div className="flex space-x-3">
            <button
              onClick={connectTodoist}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-blue-300"
            >
              {loading ? 'Connecting...' : 'Connect to Todoist'}
            </button>
            
            {isConnected && (
              <button
                onClick={disconnectTodoist}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50"
              >
                Disconnect
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <CheckCircleIcon className="h-6 w-6 text-green-600 mr-2" />
          <h3 className="text-lg font-medium text-gray-900">Todoist Integration</h3>
        </div>
        <button
          onClick={() => setShowSettings(true)}
          className="text-gray-400 hover:text-gray-600"
        >
          <Cog6ToothIcon className="h-5 w-5" />
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="flex">
            <ExclamationCircleIcon className="h-5 w-5 text-red-400 mr-2" />
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Project Selection */}
      {projects.length > 0 && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Active Project
          </label>
          <select
            value={selectedProject}
            onChange={(e) => {
              setSelectedProject(e.target.value);
              loadTasks();
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {projects.map(project => (
              <option key={project.id} value={project.id}>
                {project.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Quick Actions */}
      <div className="mb-6">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Quick Actions</h4>
        <div className="flex space-x-2">
          <button
            onClick={createSampleMealTask}
            disabled={loading || !selectedProject}
            className="px-3 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700 disabled:bg-green-300"
          >
            <PlusIcon className="h-4 w-4 inline mr-1" />
            Add Meal Task
          </button>
          <button
            onClick={loadTasks}
            disabled={loading}
            className="px-3 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50"
          >
            Refresh Tasks
          </button>
        </div>
      </div>

      {/* Recent Tasks */}
      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3">Recent Tasks</h4>
        {loading ? (
          <div className="flex items-center justify-center py-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
          </div>
        ) : tasks.length > 0 ? (
          <div className="space-y-2">
            {tasks.map(task => (
              <div key={task.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md">
                <div className="flex-1">
                  <div className="flex items-center">
                    <h5 className="text-sm font-medium text-gray-900">{task.content}</h5>
                    <span className={`ml-2 px-2 py-1 rounded-full text-xs font-medium ${getPriorityColor(task.priority)}`}>
                      {getPriorityLabel(task.priority)}
                    </span>
                  </div>
                  <div className="flex items-center mt-1 text-xs text-gray-500">
                    {task.due && (
                      <div className="flex items-center mr-3">
                        <ClockIcon className="h-3 w-3 mr-1" />
                        {task.due.string}
                      </div>
                    )}
                    {task.labels.length > 0 && (
                      <div className="flex items-center">
                        <TagIcon className="h-3 w-3 mr-1" />
                        {task.labels.join(', ')}
                      </div>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => completeTask(task.id)}
                  className="ml-3 p-1 text-gray-400 hover:text-green-600"
                  title="Mark as complete"
                >
                  <CheckCircleIcon className="h-5 w-5" />
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 py-4">No active tasks found</p>
        )}
      </div>
    </div>
  );
}