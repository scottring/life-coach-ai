import React from 'react';
import { supabase } from '../lib/supabaseClient';
import { format } from 'date-fns';

function Task({ task, onStatusChange }) {
  const handleComplete = async () => {
    const { error } = await supabase
      .from('tasks')
      .update({ 
        status: 'completed', 
        updated_at: new Date() 
      })
      .eq('id', task.id);
      
    if (!error) {
      onStatusChange(task.id, 'completed');
      
      // Store this pattern for learning
      // In a real implementation, we would call a learning system function here
      console.log('Task completion pattern stored');
    }
  };
  
  // Format deadline if exists
  const formattedDeadline = task.deadline 
    ? format(new Date(task.deadline), 'MMM d, h:mm a')
    : 'No deadline';
    
  // Determine priority class
  const priorityClass = `priority-${task.priority}`;
  
  // Determine context icon
  const contextIcon = task.context === 'Work' 
    ? '💼' 
    : task.context === 'Personal' 
      ? '🏠' 
      : '📝';
  
  return (
    <div className={`rounded-lg border border-gray-200 bg-white p-4 shadow-sm ${priorityClass}`}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3">
          <button 
            className="mt-1 h-5 w-5 rounded-full border border-gray-400 hover:bg-gray-100"
            onClick={handleComplete}
            aria-label="Mark as complete"
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
          <span className="text-lg" title={task.context}>{contextIcon}</span>
          <span className="text-gray-500">{formattedDeadline}</span>
          <div className={`h-2 w-2 rounded-full ${getPriorityColor(task.priority)}`} title={`Priority: ${task.priority}`}></div>
        </div>
      </div>
    </div>
  );
}

// Helper function to get color based on priority
function getPriorityColor(priority) {
  switch (priority) {
    case 5: return 'bg-red-500'; // Highest
    case 4: return 'bg-orange-500';
    case 3: return 'bg-yellow-500'; // Medium
    case 2: return 'bg-green-500';
    case 1: return 'bg-blue-500'; // Lowest
    default: return 'bg-gray-500';
  }
}

export default Task;