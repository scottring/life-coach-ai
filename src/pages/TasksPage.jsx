import React, { useState, useEffect } from 'react';
import TaskDetail from '../components/TaskDetail';
import TaskCreator from '../components/TaskCreator';
import { useTasks } from '../providers/TaskProvider';
import { useAuthState } from '../hooks/useAuthState';

function TasksPage() {
  const { tasks: allTasks, updateTask, completeTask, reprioritizeTasks } = useTasks();
  const { user } = useAuthState();
  
  const [activeFilter, setActiveFilter] = useState('pending');
  const [activeContext, setActiveContext] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTask, setSelectedTask] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [reprioritizing, setReprioritizing] = useState(false);
  
  // Filter tasks based on current filters
  const filteredTasks = allTasks.filter(task => {
    const statusMatch = activeFilter === 'all' || task.status === activeFilter;
    const contextMatch = activeContext === 'all' || task.context === activeContext;
    const searchMatch = !searchQuery || task.title.toLowerCase().includes(searchQuery.toLowerCase());
    
    return statusMatch && contextMatch && searchMatch;
  });
  
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      if (newStatus === 'completed') {
        await completeTask(taskId);
      } else {
        await updateTask(taskId, { status: newStatus });
      }
    } catch (error) {
      console.error('Error updating task status:', error);
    }
  };
  
  const handleTaskClick = (task) => {
    setSelectedTask(task);
    setShowDetailModal(true);
  };
  
  const handleTaskUpdate = async (updatedTask) => {
    await updateTask(updatedTask.id, updatedTask);
  };
  
  const handleReprioritize = async () => {
    if (filteredTasks.length === 0) return;
    
    setReprioritizing(true);
    
    try {
      // Only reprioritize pending tasks
      const pendingTasks = filteredTasks.filter(task => task.status === 'pending');
      
      if (pendingTasks.length === 0) return;
      
      await reprioritizeTasks({});
    } catch (error) {
      console.error('Error reprioritizing tasks:', error);
    } finally {
      setReprioritizing(false);
    }
  };
  
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col justify-between sm:flex-row sm:items-center">
        <h1 className="text-2xl font-bold text-gray-900">Tasks</h1>
        
        <button
          onClick={handleReprioritize}
          disabled={reprioritizing || filteredTasks.filter(t => t.status === 'pending').length === 0}
          className="mt-2 inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300 sm:mt-0"
        >
          {reprioritizing ? 'Reprioritizing...' : 'Reprioritize Tasks'}
        </button>
      </div>
      
      <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-4">
        <div className="md:col-span-1">
          <TaskCreator onTaskCreated={() => {
            // TaskProvider will automatically update the tasks list
          }} />
        </div>
        
        <div className="md:col-span-3 rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex flex-col space-y-4 md:flex-row md:items-center md:justify-between md:space-y-0">
            <div className="flex flex-1 space-x-4">
              <select
                value={activeContext}
                onChange={(e) => setActiveContext(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              >
                <option value="all">All Contexts</option>
                <option value="Work">Work</option>
                <option value="Personal">Personal</option>
                <option value="Family">Family</option>
                <option value="Learning">Learning</option>
              </select>
              
              <select
                value={activeFilter}
                onChange={(e) => setActiveFilter(e.target.value)}
                className="rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              >
                <option value="all">All Status</option>
                <option value="pending">Pending</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            
            <div className="flex-1 md:max-w-xs">
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search tasks..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="block w-full rounded-md border border-gray-300 px-4 py-2 pr-8 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  <svg className="h-4 w-4 text-gray-400" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            </div>
          </div>
        
        {filteredTasks.length === 0 ? (
          <div className="flex h-64 items-center justify-center">
            <div className="text-center">
              <svg className="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
              </svg>
              <p className="mt-2 text-gray-500">No tasks found matching your filters</p>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTasks.map(task => (
              <div 
                key={task.id}
                className="cursor-pointer"
                onClick={() => handleTaskClick(task)}
              >
                <div className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm priority-${task.priority}`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-3">
                      <button 
                        className="mt-1 h-5 w-5 rounded-full border border-gray-400 hover:bg-gray-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStatusChange(task.id, task.status === 'pending' ? 'completed' : 'pending');
                        }}
                        aria-label="Toggle completion"
                      >
                        {task.status === 'completed' ? '✓' : ''}
                      </button>
                      
                      <div className="task-content">
                        <h3 className={`text-lg font-semibold ${task.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
                          {task.title}
                        </h3>
                        {task.description && (
                          <p className="mt-1 text-sm text-gray-600">{task.description}</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2 text-sm">
                      <span className="text-lg" title={task.context}>
                        {task.context === 'Work' ? '💼' : 
                         task.context === 'Personal' ? '🏠' : 
                         task.context === 'Family' ? '👨‍👩‍👧‍👦' :
                         task.context === 'Learning' ? '📚' : '📝'}
                      </span>
                      
                      <span className="text-gray-500">
                        {task.deadline ? new Date(task.deadline).toLocaleDateString() : 'No deadline'}
                      </span>
                      
                      <div 
                        className={`h-2 w-2 rounded-full ${getPriorityColor(task.priority)}`} 
                        title={`Priority: ${task.priority}`}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        </div>
      </div>
      
      {/* Task Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 z-10 overflow-y-auto">
          <div className="flex min-h-screen items-end justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
            </div>
            
            <span className="hidden sm:inline-block sm:h-screen sm:align-middle" aria-hidden="true">&#8203;</span>
            
            <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-2xl sm:align-middle">
              <TaskDetail 
                task={selectedTask}
                onClose={() => setShowDetailModal(false)}
                onUpdate={handleTaskUpdate}
                onStatusChange={handleStatusChange}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Helper function to get color based on priority
function getPriorityColor(priority) {
  switch (priority) {
    case 5: return 'bg-red-500';
    case 4: return 'bg-orange-500';
    case 3: return 'bg-yellow-500';
    case 2: return 'bg-green-500';
    case 1: return 'bg-blue-500';
    default: return 'bg-gray-500';
  }
}

export default TasksPage;