import React, { useState, useEffect } from 'react';
import { 
  CheckCircleIcon,
  PlusIcon,
  ClockIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { SchedulableItem } from '../types/goals';
import { goalService } from '../services/goalService';

interface TodoWidgetProps {
  contextId?: string; // Renamed from familyId to be more generic
  userId: string;
  domain?: string; // Optional domain filter (e.g., 'family', 'work', etc.)
}

export default function TodoWidget({ contextId, userId, domain }: TodoWidgetProps) {
  const [tasks, setTasks] = useState<SchedulableItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadTasks();
  }, [contextId, domain]);

  const loadTasks = async () => {
    if (!contextId) return;
    
    try {
      setLoading(true);
      let allTasks = await goalService.getSchedulableTasks(contextId);
      
      // Filter by domain if specified
      if (domain) {
        allTasks = allTasks.filter(task => 
          task.tags?.includes(domain) || 
          (domain === 'family' && task.tags?.includes('family'))
        );
      }
      
      // Sort by priority and due date
      allTasks.sort((a, b) => {
        const priorityOrder = { 'critical': 0, 'high': 1, 'medium': 2, 'low': 3 };
        const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4;
        const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4;
        
        if (aPriority !== bPriority) return aPriority - bPriority;
        
        if (a.dueDate && b.dueDate) {
          return new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        }
        
        return 0;
      });
      
      setTasks(allTasks);
    } catch (error) {
      console.error('Error loading tasks:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">
              🎯 {domain ? `${domain.charAt(0).toUpperCase() + domain.slice(1)} ` : ''}Tasks & Goals
            </h3>
            <p className="text-sm text-gray-600">
              {loading ? 'Loading...' : `${tasks.filter(t => t.status !== 'completed').length} active tasks`}
            </p>
          </div>
          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tasks List */}
      <div className="p-6">
        {loading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          </div>
        ) : (
          <div className="space-y-3">
            {tasks.slice(0, 6).map((task) => (
              <div
                key={task.id}
                className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors cursor-move ${
                  task.status === 'completed' 
                    ? 'bg-green-50 border-green-200' 
                    : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
                }`}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/json', JSON.stringify({
                    type: 'schedulable_item',
                    data: task
                  }));
                }}
                title="Drag to schedule"
              >
                <button
                  className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors ${
                    task.status === 'completed'
                      ? 'bg-green-500 border-green-500 text-white'
                      : 'border-gray-300 hover:border-green-400'
                  }`}
                  onClick={() => {
                    // TODO: Toggle task completion
                    console.log('Toggle task completion:', task.id);
                  }}
                >
                  {task.status === 'completed' && <CheckCircleIcon className="w-3 h-3" />}
                </button>
                
                <div className="flex-1 min-w-0">
                  <p className={`text-sm font-medium ${task.status === 'completed' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                    {task.title}
                  </p>
                  <div className="flex items-center space-x-2 mt-1">
                    {task.priority && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        task.priority === 'critical' ? 'bg-red-100 text-red-700' :
                        task.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {task.priority}
                      </span>
                    )}
                    {task.dueDate && (
                      <span className="text-xs text-gray-500 flex items-center">
                        <ClockIcon className="w-3 h-3 mr-1" />
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                </div>
                
                <ChevronRightIcon className="w-4 h-4 text-gray-400" />
              </div>
            ))}
          </div>
        )}

        {/* Native Integration Notice */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
          <div className="flex items-start space-x-3">
            <div className="text-blue-600">💼</div>
            <div>
              <h4 className="text-sm font-medium text-blue-900">Native Task System</h4>
              <p className="text-xs text-blue-700 mt-1">
                Using integrated task system for seamless coordination across life areas.
                Todoist integration temporarily disabled.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}