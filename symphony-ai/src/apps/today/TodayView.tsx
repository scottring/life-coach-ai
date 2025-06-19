import React, { useState, useEffect } from 'react';
import {
  ClockIcon,
  PlusIcon,
  CheckIcon,
  CalendarIcon,
  UserIcon,
  ArrowRightIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { TaskDetailModal } from '../../shared/components/TaskDetailModal';
import { taskManager, UniversalTask } from '../../shared/services/taskManagerService';

interface TodayViewProps {
  contextId: string;
  userId: string;
}

interface TodayItem {
  id: string;
  title: string;
  type: 'task' | 'event' | 'sop' | 'meal' | 'project' | 'note';
  time?: string;
  duration?: number;
  status: 'pending' | 'in_progress' | 'completed' | 'cancelled';
  assignedTo?: string;
  context: 'work' | 'family' | 'personal';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  parentTitle?: string; // Project name, SOP name, etc.
  notes?: string;
  tags?: string[]; // Added tags property for filtering
}


export const TodayView: React.FC<TodayViewProps> = ({ contextId, userId }) => {
  const [todayItems, setTodayItems] = useState<TodayItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Load today's tasks from task manager
  useEffect(() => {
    const loadTodayTasks = () => {
      try {
        // Get today's tasks from task manager
        const universalTasks = taskManager.getTodayTasks(contextId);
        
        // Convert to TodayItem format with tags
        const todayTaskItems: TodayItem[] = universalTasks.map(task => ({
          id: task.id,
          title: task.title,
          type: task.type,
          time: task.scheduledTime,
          duration: task.duration,
          status: task.status,
          context: task.context,
          priority: task.priority,
          assignedTo: task.assignedTo,
          notes: task.notes,
          tags: task.tags || []
        }));

        setTodayItems(todayTaskItems);
        setLoading(false);
      } catch (error) {
        console.error('Error loading today tasks:', error);
        setLoading(false);
      }
    };

    // Load tasks initially and set up real-time subscription
    taskManager.loadTasks(contextId).then(() => {
      loadTodayTasks();
    });

    // Subscribe to real-time updates
    const unsubscribeFirestore = taskManager.subscribeToTasks(contextId);
    const unsubscribeLocal = taskManager.subscribe(loadTodayTasks);
    
    return () => {
      unsubscribeFirestore();
      unsubscribeLocal();
    };
  }, [contextId]);

  // Timer to automatically refresh and hide expired SOP steps
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 30000); // Update every 30 seconds

    return () => clearInterval(timer);
  }, []);

  // Helper function to check if SOP step should be hidden
  const shouldHideSOPStep = (item: TodayItem): boolean => {
    // Only apply to SOP steps
    if (item.type !== 'sop' || !item.tags?.includes('sop-step')) {
      return false;
    }
    
    // Need both time and duration to calculate end time
    if (!item.time || !item.duration) {
      return false;
    }
    
    const now = currentTime;
    
    // Parse the scheduled time (format: "HH:MM")
    const [hours, minutes] = item.time.split(':').map(Number);
    const scheduledStart = new Date();
    scheduledStart.setHours(hours, minutes, 0, 0);
    
    // Calculate end time
    const scheduledEnd = new Date(scheduledStart.getTime() + item.duration * 60000);
    
    // Add 20% buffer to duration
    const bufferMs = item.duration * 60000 * 0.2; // 20% of duration in milliseconds
    const endWithBuffer = new Date(scheduledEnd.getTime() + bufferMs);
    
    // Hide if current time is past end time + buffer
    return now > endWithBuffer;
  };

  // Group items by time with simple sorting
  const groupItemsByTime = () => {
    const now = new Date();
    const currentHour = now.getHours();
    
    // Filter out SOP steps that should be hidden based on time
    const filteredItems = todayItems.filter(item => !shouldHideSOPStep(item));
    
    // Sort with SOP hierarchy in mind
    const sortedItems = [...filteredItems].sort((a, b) => {
      const aIsSOPContainer = a.tags?.includes('sop-container');
      const bIsSOPContainer = b.tags?.includes('sop-container');
      const aIsSOPStep = a.tags?.includes('sop-step');
      const bIsSOPStep = b.tags?.includes('sop-step');
      
      // Get container IDs for steps
      const aContainerTag = a.tags?.find(tag => tag.startsWith('container:'));
      const bContainerTag = b.tags?.find(tag => tag.startsWith('container:'));
      const aContainerId = aContainerTag ? aContainerTag.split(':')[1] : null;
      const bContainerId = bContainerTag ? bContainerTag.split(':')[1] : null;
      
      // If both are from the same SOP, container comes first, then steps by time
      if (aIsSOPContainer && bIsSOPStep && bContainerId === a.id) {
        return -1; // Container before its steps
      }
      if (bIsSOPContainer && aIsSOPStep && aContainerId === b.id) {
        return 1; // Container before its steps
      }
      
      // If both are steps from the same container, sort by time
      if (aIsSOPStep && bIsSOPStep && aContainerId === bContainerId) {
        if (a.time && b.time) {
          return a.time.localeCompare(b.time);
        }
        return a.title.localeCompare(b.title);
      }
      
      // For different SOPs or regular items, sort by time first
      if (a.time && b.time) {
        return a.time.localeCompare(b.time);
      }
      if (!a.time && b.time) return 1;
      if (a.time && !b.time) return -1;
      
      // Then by title for consistency
      return a.title.localeCompare(b.title);
    });
    
    const groups = {
      overdue: sortedItems.filter(item => {
        if (!item.time) return false;
        const itemHour = parseInt(item.time.split(':')[0]);
        return itemHour < currentHour && item.status !== 'completed';
      }),
      current: sortedItems.filter(item => {
        if (!item.time) return false;
        const itemHour = parseInt(item.time.split(':')[0]);
        return Math.abs(itemHour - currentHour) <= 1 && item.status !== 'completed';
      }),
      upcoming: sortedItems.filter(item => {
        if (!item.time) return item.status !== 'completed';
        const itemHour = parseInt(item.time.split(':')[0]);
        return itemHour > currentHour + 1 && item.status !== 'completed';
      }),
      completed: sortedItems.filter(item => item.status === 'completed')
    };

    return groups;
  };

  const handleCompleteItem = async (itemId: string) => {
    // Update in task manager
    await taskManager.completeTask(itemId);
  };

  const handleQuickAdd = async () => {
    const title = window.prompt('Enter task title:');
    if (!title?.trim()) return;

    try {
      const taskData = {
        id: `task_${Math.random().toString(36).substr(2, 8)}`,
        title: title.trim(),
        type: 'task' as const,
        status: 'pending' as const,
        priority: 'medium' as const,
        contextId: contextId,
        context: contextId as any,
        createdBy: 'user',
        source: 'manual' as const
      };

      await taskManager.createTask(taskData);
      console.log('✅ Quick add task created successfully');
    } catch (error) {
      console.error('Error creating quick add task:', error);
      alert('Failed to create task. Please try again.');
    }
  };

  const getContextColor = (context: string) => {
    switch (context) {
      case 'work': return 'bg-green-100 text-green-800';
      case 'family': return 'bg-blue-100 text-blue-800';
      case 'personal': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'urgent': return '🔴';
      case 'high': return '🟠';
      case 'medium': return '🟡';
      default: return '';
    }
  };

  const groups = groupItemsByTime();

  // Get tooltip data for items
  const getTooltipData = (item: TodayItem) => {
    return {
      id: item.id,
      name: item.title,
      estimatedDuration: item.duration || 30,
      assignedTo: item.assignedTo || 'You',
      context: item.context,
      priority: item.priority,
      notes: item.notes,
      type: item.type,
      time: item.time,
      status: item.status,
      parentTitle: item.parentTitle
    };
  };

  const handleItemClick = (item: TodayItem) => {
    // Convert TodayItem to CalendarEvent format for modal
    const calendarEvent = {
      id: item.id,
      title: item.title,
      start: item.time ? new Date(`${new Date().toDateString()} ${item.time}`) : new Date(),
      end: item.time && item.duration 
        ? new Date(`${new Date().toDateString()} ${item.time}`) 
        : new Date(),
      type: item.type,
      context: item.context,
      assignedTo: item.assignedTo
    };
    
    if (calendarEvent.end && item.duration) {
      calendarEvent.end = new Date(calendarEvent.end.getTime() + item.duration * 60000);
    }
    
    setSelectedItem(calendarEvent as any);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading your day...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Today</h1>
          <p className="text-gray-500 mt-1">
            {format(new Date(), 'EEEE, MMMM d, yyyy')}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          <button 
            onClick={handleQuickAdd}
            className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4" />
            <span>Quick Add</span>
          </button>
        </div>
      </div>


      {/* Main Content */}
      <div className="space-y-8">
        
        {/* Overdue Items */}
        {groups.overdue.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-red-700 mb-4 flex items-center">
              <ClockIcon className="w-5 h-5 mr-2" />
              Overdue
            </h2>
            <div className="space-y-2">
              {groups.overdue.map((item) => (
                <TodayItemCard
                  key={item.id}
                  item={item}
                  onComplete={handleCompleteItem}
                  onItemClick={handleItemClick}
                  getContextColor={getContextColor}
                  getPriorityIcon={getPriorityIcon}
                  getTooltipData={getTooltipData}
                />
              ))}
            </div>
          </div>
        )}

        {/* Current/Now Items */}
        {groups.current.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <ArrowRightIcon className="w-5 h-5 mr-2 text-blue-600" />
              Now
            </h2>
            <div className="space-y-2">
              {groups.current.map((item) => (
                <TodayItemCard
                  key={item.id}
                  item={item}
                  onComplete={handleCompleteItem}
                  onItemClick={handleItemClick}
                  getContextColor={getContextColor}
                  getPriorityIcon={getPriorityIcon}
                  getTooltipData={getTooltipData}
                  highlighted={true}
                />
              ))}
            </div>
          </div>
        )}

        {/* Upcoming Items */}
        {groups.upcoming.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <CalendarIcon className="w-5 h-5 mr-2" />
              Coming Up
            </h2>
            <div className="space-y-2">
              {groups.upcoming.map((item) => (
                <TodayItemCard
                  key={item.id}
                  item={item}
                  onComplete={handleCompleteItem}
                  onItemClick={handleItemClick}
                  getContextColor={getContextColor}
                  getPriorityIcon={getPriorityIcon}
                  getTooltipData={getTooltipData}
                />
              ))}
            </div>
          </div>
        )}

        {/* Completed Items (Collapsible) */}
        {groups.completed.length > 0 && (
          <div>
            <button
              onClick={() => setShowCompleted(!showCompleted)}
              className="flex items-center text-gray-600 hover:text-gray-800 mb-4"
            >
              <CheckIcon className="w-5 h-5 mr-2" />
              <span className="font-medium">
                Completed ({groups.completed.length})
              </span>
              <ArrowRightIcon 
                className={`w-4 h-4 ml-2 transition-transform ${showCompleted ? 'rotate-90' : ''}`}
              />
            </button>
            
            {showCompleted && (
              <div className="space-y-2 opacity-60">
                {groups.completed.map((item) => (
                  <TodayItemCard
                    key={item.id}
                    item={item}
                    onComplete={handleCompleteItem}
                    onItemClick={handleItemClick}
                    getContextColor={getContextColor}
                    getPriorityIcon={getPriorityIcon}
                    getTooltipData={getTooltipData}
                    completed={true}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        isOpen={!!selectedItem}
        onClose={() => setSelectedItem(null)}
        event={selectedItem}
      />

    </div>
  );
};

// Individual item card component
interface TodayItemCardProps {
  item: TodayItem;
  onComplete: (id: string) => void;
  onItemClick: (item: TodayItem) => void;
  getContextColor: (context: string) => string;
  getPriorityIcon: (priority: string) => string;
  getTooltipData: (item: TodayItem) => any;
  highlighted?: boolean;
  completed?: boolean;
}

const TodayItemCard: React.FC<TodayItemCardProps> = ({ 
  item, 
  onComplete, 
  onItemClick,
  getContextColor, 
  getPriorityIcon,
  getTooltipData,
  highlighted = false,
  completed = false
}) => {
  // Determine SOP relationship for visual grouping
  const isSOPContainer = item.tags?.includes('sop-container');
  const isSOPStep = item.tags?.includes('sop-step');
  const containerTag = item.tags?.find((tag: string) => tag.startsWith('container:'));
  const containerId = containerTag ? containerTag.split(':')[1] : null;
  
  // Get container name for step cards
  const containerName = isSOPStep && containerId ? (() => {
    const containerTask = taskManager.getTask(containerId);
    return containerTask?.title?.replace('📋 ', '') || 'SOP';
  })() : null;
  
  const cardClasses = `
    bg-white border rounded-lg p-3 hover:shadow-md transition-shadow cursor-pointer
    ${highlighted ? 'border-blue-300 shadow-md' : 'border-gray-200'}
    ${completed ? 'opacity-60' : ''}
    ${isSOPContainer ? 'border-l-4 border-l-purple-500 bg-purple-50' : ''}
    ${isSOPStep ? 'border-l-4 border-l-purple-300 ml-2' : ''}
  `;

  const cardContent = (
    <div className={cardClasses} onClick={() => onItemClick(item)}>
      <div className="flex items-start justify-between">
        <div className="flex items-center space-x-3 flex-1">
          {/* Completion checkbox */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onComplete(item.id);
            }}
            className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              item.status === 'completed'
                ? 'bg-green-500 border-green-500 text-white'
                : 'border-gray-300 hover:border-green-400'
            }`}
          >
            {item.status === 'completed' && <CheckIcon className="w-3 h-3" />}
          </button>

          {/* Item content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <h3 className={`font-medium text-sm ${completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                  {getPriorityIcon(item.priority)} {item.title}
                </h3>
                {isSOPStep && containerName && (
                  <span className="text-xs text-purple-600 bg-purple-100 px-2 py-0.5 rounded-full">
                    {containerName}
                  </span>
                )}
                {item.parentTitle && !isSOPStep && (
                  <span className="text-xs text-gray-500">
                    • {item.parentTitle}
                  </span>
                )}
              </div>
              
              <div className="flex items-center space-x-2 text-xs">
                <span className={`px-2 py-1 rounded-full font-medium ${getContextColor(item.context)}`}>
                  {item.context}
                </span>
                
                {item.time && (
                  <span className="flex items-center text-gray-500">
                    <ClockIcon className="w-3 h-3 mr-1" />
                    {item.time}
                    {item.duration && ` (${item.duration}m)`}
                  </span>
                )}
                
                {item.assignedTo && (
                  <span className="flex items-center text-gray-500">
                    <UserIcon className="w-3 h-3 mr-1" />
                    {item.assignedTo}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>


        {/* Actions menu */}
        <button 
          onClick={(e) => e.stopPropagation()}
          className="text-gray-400 hover:text-gray-600"
        >
          <EllipsisHorizontalIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  // Wrap all items with tooltip showing relevant information
  return (
    <div className="relative group">
      {cardContent}
      
      {/* Custom tooltip */}
      <div className="absolute left-full top-0 ml-3 w-64 bg-gray-900 text-white text-xs rounded-lg p-3 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
        <div className="space-y-2">
          <div className="font-medium">{item.title}</div>
          
          {item.time && (
            <div className="text-gray-300">
              ⏰ {item.time}{item.duration && ` (${item.duration}m)`}
            </div>
          )}
          
          {item.assignedTo && (
            <div className="text-gray-300">
              👤 {item.assignedTo}
            </div>
          )}
          
          <div className="text-gray-300">
            📁 {item.context} • {item.priority} priority
          </div>
          
          {item.parentTitle && (
            <div className="text-gray-300">
              📋 Part of: {item.parentTitle}
            </div>
          )}
          
          {item.notes && (
            <div className="text-gray-300 border-t border-gray-700 pt-2 mt-2">
              {item.notes}
            </div>
          )}
        </div>
        
        {/* Arrow */}
        <div className="absolute right-full top-3 w-0 h-0 border-t-4 border-b-4 border-r-4 border-transparent border-r-gray-900"></div>
      </div>
    </div>
  );
};