import React, { useState, useEffect } from 'react';
import { InboxIcon, PlusIcon } from '@heroicons/react/24/outline';
import { SchedulableItem } from '../types/goals';
import { goalService } from '../services/goalService';

interface InboxWidgetProps {
  contextId: string;
  userId: string;
  onItemScheduled?: () => void;
  compact?: boolean; // For dashboard vs full view
}

const InboxWidget: React.FC<InboxWidgetProps> = ({
  contextId,
  userId,
  onItemScheduled,
  compact = false
}) => {
  const [inboxItems, setInboxItems] = useState<SchedulableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);

  useEffect(() => {
    loadInboxItems();
  }, [contextId]);

  const loadInboxItems = async () => {
    try {
      setLoading(true);
      const tasks = await goalService.getTasksWithTag(contextId, 'inbox');
      setInboxItems(tasks.filter(task => !task.tags?.includes('archived')));
    } catch (error) {
      console.error('Error loading inbox items:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) return;

    try {
      const newTask = {
        title: newTaskTitle,
        contextId,
        goalId: '', // No specific goal for inbox items
        tags: ['inbox'],
        priority: 'medium' as const,
        status: 'pending' as const,
        estimatedDuration: 30,
        dependencies: [],
        isRecurring: false
      };

      await goalService.createTask(newTask);
      setNewTaskTitle('');
      setShowAddForm(false);
      await loadInboxItems();
    } catch (error) {
      console.error('Error creating task:', error);
      alert('Failed to create task. Please try again.');
    }
  };

  const handleDeferItem = async (item: SchedulableItem, deferOption: string) => {
    let deferredDate = new Date();
    
    switch (deferOption) {
      case 'evening':
        deferredDate.setHours(18, 0, 0, 0);
        break;
      case 'tomorrow':
        deferredDate.setDate(deferredDate.getDate() + 1);
        deferredDate.setHours(9, 0, 0, 0);
        break;
      case 'end-of-week':
        const daysToFriday = 5 - deferredDate.getDay();
        deferredDate.setDate(deferredDate.getDate() + daysToFriday);
        deferredDate.setHours(9, 0, 0, 0);
        break;
      case 'next-week':
        const daysToNextMonday = 7 - deferredDate.getDay() + 1;
        deferredDate.setDate(deferredDate.getDate() + daysToNextMonday);
        deferredDate.setHours(9, 0, 0, 0);
        break;
      case 'archive':
        try {
          const updatedTask = {
            ...item,
            tags: [...(item.tags || []), 'archived'].filter((tag, index, arr) => arr.indexOf(tag) === index)
          };
          await goalService.updateTask(item.id, updatedTask);
          await loadInboxItems();
          return;
        } catch (error) {
          console.error('Error archiving task:', error);
          return;
        }
    }

    try {
      const updatedTask = {
        ...item,
        dueDate: deferredDate.toISOString()
      };
      await goalService.updateTask(item.id, updatedTask);
      await loadInboxItems();
    } catch (error) {
      console.error('Error deferring task:', error);
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6">
          <div className="animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
            <div className="space-y-2">
              <div className="h-3 bg-gray-200 rounded"></div>
              <div className="h-3 bg-gray-200 rounded w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const displayItems = compact ? inboxItems.slice(0, 3) : inboxItems;

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Widget Header */}
      <div className="border-b border-gray-200 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <InboxIcon className="w-5 h-5 text-gray-500" />
            <h2 className="text-lg font-semibold text-gray-900">Inbox</h2>
            <span className="bg-blue-100 text-blue-800 text-xs font-medium px-2 py-1 rounded-full">
              {inboxItems.length}
            </span>
          </div>
          
          {!showAddForm && (
            <button
              onClick={() => setShowAddForm(true)}
              className="flex items-center space-x-1 text-sm text-blue-600 hover:text-blue-700"
            >
              <PlusIcon className="w-4 h-4" />
              <span>Add</span>
            </button>
          )}
        </div>
      </div>

      {/* Widget Content */}
      <div className="p-6">
        {/* Quick Add Form */}
        {showAddForm && (
          <div className="mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <input
              type="text"
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="Enter task title..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              autoFocus
              onKeyPress={(e) => e.key === 'Enter' && handleAddTask()}
            />
            <div className="flex justify-end space-x-2 mt-2">
              <button
                onClick={() => {
                  setShowAddForm(false);
                  setNewTaskTitle('');
                }}
                className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800"
              >
                Cancel
              </button>
              <button
                onClick={handleAddTask}
                className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
              >
                Add Task
              </button>
            </div>
          </div>
        )}

        {/* Inbox Items */}
        {displayItems.length === 0 ? (
          <div className="text-center py-8">
            <InboxIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-sm font-medium text-gray-900 mb-2">Inbox is empty</h3>
            <p className="text-sm text-gray-500">Add tasks to get started</p>
          </div>
        ) : (
          <div className="space-y-3">
            {displayItems.map((item) => (
              <div 
                key={item.id} 
                className="flex items-start justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors cursor-move"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/json', JSON.stringify({
                    type: 'schedulable_item',
                    data: item
                  }));
                }}
                title="Drag to schedule or use buttons below"
              >
                <div className="flex-1 min-w-0 pr-3">
                  <h4 className="text-sm font-medium text-gray-900 leading-snug mb-1" title={item.title}>
                    {item.title}
                  </h4>
                  {item.description && (
                    <p className="text-xs text-gray-500 truncate">{item.description}</p>
                  )}
                  <div className="flex items-center space-x-2 mt-1">
                    {item.priority && (
                      <span className={`text-xs px-2 py-0.5 rounded-full ${
                        item.priority === 'critical' ? 'bg-red-100 text-red-700' :
                        item.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                        item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {item.priority}
                      </span>
                    )}
                  </div>
                </div>
                
                {!compact && (
                  <div className="flex flex-col space-y-1 flex-shrink-0">
                    <button className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200 whitespace-nowrap">
                      📅 Schedule
                    </button>
                    <button className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded hover:bg-purple-200 whitespace-nowrap">
                      ⏰ Defer
                    </button>
                  </div>
                )}
              </div>
            ))}
            
            {compact && inboxItems.length > 3 && (
              <div className="text-center pt-2">
                <span className="text-sm text-gray-500">
                  +{inboxItems.length - 3} more items
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default InboxWidget;