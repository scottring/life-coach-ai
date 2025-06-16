import React, { useState } from 'react';
import { 
  CheckCircleIcon,
  PlusIcon,
  ClockIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';

interface TodoWidgetProps {
  familyId: string;
  userId: string;
}

export default function TodoWidget({ familyId, userId }: TodoWidgetProps) {
  // Todoist integration temporarily disabled - using native task system instead
  const [mockTasks] = useState([
    { id: '1', content: 'Review quarterly goals', completed: false, priority: 'high' },
    { id: '2', content: 'Plan family vacation', completed: false, priority: 'medium' },
    { id: '3', content: 'Grocery shopping', completed: true, priority: 'low' },
    { id: '4', content: 'Schedule dentist appointment', completed: false, priority: 'medium' },
  ]);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 h-full">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">🎯 Tasks & Goals</h3>
            <p className="text-sm text-gray-600">
              {mockTasks.filter(t => !t.completed).length} active tasks
            </p>
          </div>
          <button className="p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tasks List */}
      <div className="p-6">
        <div className="space-y-3">
          {mockTasks.slice(0, 6).map((task) => (
            <div
              key={task.id}
              className={`flex items-center space-x-3 p-3 rounded-lg border transition-colors ${
                task.completed 
                  ? 'bg-green-50 border-green-200' 
                  : 'bg-gray-50 border-gray-200 hover:bg-gray-100'
              }`}
            >
              <button className={`p-1 rounded-full ${
                task.completed 
                  ? 'text-green-600' 
                  : 'text-gray-400 hover:text-green-600'
              }`}>
                <CheckCircleIcon className="w-5 h-5" />
              </button>
              
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium ${
                  task.completed 
                    ? 'text-green-800 line-through' 
                    : 'text-gray-900'
                }`}>
                  {task.content}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    task.priority === 'high' ? 'bg-red-100 text-red-700' :
                    task.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-gray-100 text-gray-700'
                  }`}>
                    {task.priority}
                  </span>
                </div>
              </div>
              
              <ChevronRightIcon className="w-4 h-4 text-gray-400" />
            </div>
          ))}
        </div>

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