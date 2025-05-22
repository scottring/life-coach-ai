import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import TaskGoalAssigner from './TaskGoalAssigner';

function TaskDetail({ taskId, onClose, onTaskUpdate }) {
  const [task, setTask] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editedTask, setEditedTask] = useState({});
  const [saving, setSaving] = useState(false);
  
  useEffect(() => {
    const fetchTask = async () => {
      setLoading(true);
      
      try {
        const { data, error } = await supabase
          .from('tasks')
          .select('*')
          .eq('id', taskId)
          .single();
          
        if (error) throw error;
        
        setTask(data);
        setEditedTask(data);
      } catch (error) {
        console.error('Error fetching task:', error);
        // Mock data for development
        const mockTask = {
          id: taskId,
          title: 'Complete project proposal',
          description: 'Finalize the project proposal document including budget, timeline, and deliverables.',
          priority: 4,
          context: 'Work',
          status: 'pending',
          deadline: new Date().toISOString(),
          created_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
          updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
          source: 'manual',
          priority_reason: 'High priority due to upcoming client meeting and strategic importance.',
          scheduling_note: 'Morning, when focus is highest'
        };
        setTask(mockTask);
        setEditedTask(mockTask);
      } finally {
        setLoading(false);
      }
    };
    
    if (taskId) {
      fetchTask();
    }
  }, [taskId]);
  
  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setEditedTask(prev => ({ ...prev, [name]: value }));
  };
  
  const handleSave = async () => {
    setSaving(true);
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          title: editedTask.title,
          description: editedTask.description,
          priority: parseInt(editedTask.priority, 10),
          context: editedTask.context,
          deadline: editedTask.deadline,
          updated_at: new Date()
        })
        .eq('id', taskId)
        .select();
        
      if (error) throw error;
      
      setTask(data[0]);
      setEditing(false);
      if (onTaskUpdate) onTaskUpdate(data[0]);
    } catch (error) {
      console.error('Error updating task:', error);
      // For development, just update the local state
      setTask(editedTask);
      setEditing(false);
      if (onTaskUpdate) onTaskUpdate(editedTask);
    } finally {
      setSaving(false);
    }
  };
  
  const handleStatusChange = async (newStatus) => {
    setSaving(true);
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          status: newStatus,
          updated_at: new Date()
        })
        .eq('id', taskId)
        .select();
        
      if (error) throw error;
      
      setTask(data[0]);
      if (onTaskUpdate) onTaskUpdate(data[0]);
    } catch (error) {
      console.error('Error updating task status:', error);
      // For development, just update the local state
      setTask(prev => ({ ...prev, status: newStatus }));
      if (onTaskUpdate) onTaskUpdate({ ...task, status: newStatus });
    } finally {
      setSaving(false);
    }
  };
  
  const getPriorityLabel = (priority) => {
    switch (priority) {
      case 5: return 'Highest';
      case 4: return 'High';
      case 3: return 'Medium';
      case 2: return 'Low';
      case 1: return 'Lowest';
      default: return 'Medium';
    }
  };
  
  if (loading) {
    return (
      <div className="flex min-h-[300px] items-center justify-center">
        <div className="text-center">
          <svg className="mx-auto h-10 w-10 animate-spin text-blue-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="mt-4 text-gray-600">Loading task details...</p>
        </div>
      </div>
    );
  }
  
  if (!task) {
    return (
      <div className="p-4 text-center">
        <p className="text-gray-500">Task not found.</p>
        <button
          onClick={onClose}
          className="mt-4 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Close
        </button>
      </div>
    );
  }
  
  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-800">Task Details</h2>
        <button
          onClick={onClose}
          className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-500"
        >
          <svg className="h-6 w-6" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      {/* Task Content */}
      <div className="space-y-6">
        {editing ? (
          // Edit Mode
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                Title
              </label>
              <input
                type="text"
                id="title"
                name="title"
                value={editedTask.title}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              />
            </div>
            
            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                rows={3}
                value={editedTask.description || ''}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                  Priority
                </label>
                <select
                  id="priority"
                  name="priority"
                  value={editedTask.priority}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                >
                  <option value="5">Highest</option>
                  <option value="4">High</option>
                  <option value="3">Medium</option>
                  <option value="2">Low</option>
                  <option value="1">Lowest</option>
                </select>
              </div>
              
              <div>
                <label htmlFor="context" className="block text-sm font-medium text-gray-700">
                  Context
                </label>
                <select
                  id="context"
                  name="context"
                  value={editedTask.context}
                  onChange={handleInputChange}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
                >
                  <option value="Work">Work</option>
                  <option value="Personal">Personal</option>
                  <option value="Family">Family</option>
                  <option value="Learning">Learning</option>
                </select>
              </div>
            </div>
            
            <div>
              <label htmlFor="deadline" className="block text-sm font-medium text-gray-700">
                Deadline
              </label>
              <input
                type="datetime-local"
                id="deadline"
                name="deadline"
                value={editedTask.deadline ? new Date(editedTask.deadline).toISOString().slice(0, 16) : ''}
                onChange={handleInputChange}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm"
              />
            </div>
            
            <div className="flex justify-end space-x-3 pt-4">
              <button
                onClick={() => setEditing(false)}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 shadow-sm hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300"
              >
                {saving ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        ) : (
          // View Mode
          <div className="space-y-6">
            <div className="flex justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">{task.title}</h3>
                {task.description && (
                  <p className="mt-1 text-gray-600">{task.description}</p>
                )}
              </div>
              <button
                onClick={() => setEditing(true)}
                className="rounded-md bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-200"
              >
                Edit
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-4 border-t border-b border-gray-200 py-4">
              <div>
                <p className="text-sm text-gray-500">Priority</p>
                <div className="mt-1 flex items-center">
                  <div className={`mr-2 h-3 w-3 rounded-full ${getPriorityColor(task.priority)}`}></div>
                  <p className="font-medium text-gray-900">{getPriorityLabel(task.priority)}</p>
                </div>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Context</p>
                <p className="mt-1 font-medium text-gray-900">{task.context}</p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Deadline</p>
                <p className="mt-1 font-medium text-gray-900">
                  {task.deadline 
                    ? format(new Date(task.deadline), 'MMM d, yyyy h:mm a')
                    : 'No deadline'}
                </p>
              </div>
              
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <p className="mt-1 font-medium text-gray-900">{task.status.charAt(0).toUpperCase() + task.status.slice(1)}</p>
              </div>
            </div>
            
            {task.priority_reason && (
              <div>
                <p className="text-sm font-medium text-gray-500">Priority Reasoning</p>
                <p className="mt-1 text-gray-600">{task.priority_reason}</p>
              </div>
            )}
            
            {task.scheduling_note && (
              <div>
                <p className="text-sm font-medium text-gray-500">Scheduling Suggestion</p>
                <p className="mt-1 text-gray-600">{task.scheduling_note}</p>
              </div>
            )}
            
            <div className="border-t border-gray-200 pt-4">
              <p className="text-sm font-medium text-gray-500">Source</p>
              <p className="mt-1 text-gray-600">
                {task.source === 'email' ? 'Extracted from email' :
                 task.source === 'calendar' ? 'Created from calendar event' :
                 task.source === 'notion' ? 'Synced from Notion' :
                 'Manually created'}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                Created {format(new Date(task.created_at), 'MMM d, yyyy h:mm a')}
                {task.updated_at !== task.created_at && 
                  ` • Updated ${format(new Date(task.updated_at), 'MMM d, yyyy h:mm a')}`}
              </p>
            </div>
            
            <TaskGoalAssigner taskId={task.id} />
            
            <div className="flex justify-between border-t border-gray-200 pt-4">
              {task.status === 'pending' ? (
                <button
                  onClick={() => handleStatusChange('completed')}
                  disabled={saving}
                  className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:bg-green-300"
                >
                  {saving ? 'Updating...' : 'Mark as Complete'}
                </button>
              ) : (
                <button
                  onClick={() => handleStatusChange('pending')}
                  disabled={saving}
                  className="rounded-md bg-gray-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 disabled:bg-gray-300"
                >
                  {saving ? 'Updating...' : 'Mark as Pending'}
                </button>
              )}
              
              <button
                onClick={() => handleStatusChange('deleted')}
                disabled={saving}
                className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-red-600 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:text-gray-300"
              >
                Delete Task
              </button>
            </div>
          </div>
        )}
      </div>
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

export default TaskDetail;