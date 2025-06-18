import React, { useState, useEffect } from 'react';
import {
  ClockIcon,
  PlusIcon,
  CheckIcon,
  CalendarIcon,
  UserIcon,
  SparklesIcon,
  ArrowRightIcon,
  EllipsisHorizontalIcon
} from '@heroicons/react/24/outline';
import { format, isToday, isTomorrow, parseISO } from 'date-fns';
import { TaskDetailModal } from '../../shared/components/TaskDetailModal';
import { SOPTooltip } from '../../shared/components/SOPTooltip';
import { TaskDebugger } from '../../shared/components/TaskDebugger';
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
}

interface AIInsight {
  id: string;
  type: 'suggestion' | 'reminder' | 'optimization';
  message: string;
  actionable: boolean;
  relatedItems?: string[];
}

export const TodayView: React.FC<TodayViewProps> = ({ contextId, userId }) => {
  const [todayItems, setTodayItems] = useState<TodayItem[]>([]);
  const [aiInsights, setAiInsights] = useState<AIInsight[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCompleted, setShowCompleted] = useState(false);
  const [selectedItem, setSelectedItem] = useState<any>(null);

  // Load today's tasks from task manager
  useEffect(() => {
    const loadTodayTasks = () => {
      try {
        // Get today's tasks from task manager
        const universalTasks = taskManager.getTodayTasks(contextId);
        
        // Convert to TodayItem format
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
          notes: task.notes
        }));

        setTodayItems(todayTaskItems);

        // Generate AI insights based on actual tasks
        const insights: AIInsight[] = [];
        
        if (todayTaskItems.length > 0) {
          insights.push({
            id: 'ai1',
            type: 'optimization',
            message: `You have ${todayTaskItems.filter(t => t.status === 'pending').length} tasks planned for today. ${todayTaskItems.filter(t => t.priority === 'high').length > 0 ? 'Focus on high-priority items first.' : 'Great planning!'}`,
            actionable: true
          });
        }
        
        const unscheduledCount = todayTaskItems.filter(t => !t.time).length;
        if (unscheduledCount > 0) {
          insights.push({
            id: 'ai2',
            type: 'suggestion',
            message: `${unscheduledCount} tasks need scheduling. Visit Planning view to add them to your calendar.`,
            actionable: true
          });
        }

        setAiInsights(insights);
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

  const groupItemsByTime = () => {
    const now = new Date();
    const currentHour = now.getHours();
    
    const groups = {
      overdue: todayItems.filter(item => {
        if (!item.time) return false;
        const itemHour = parseInt(item.time.split(':')[0]);
        return itemHour < currentHour && item.status !== 'completed';
      }),
      current: todayItems.filter(item => {
        if (!item.time) return currentHour >= 9 && currentHour < 12; // Morning items without time
        const itemHour = parseInt(item.time.split(':')[0]);
        return Math.abs(itemHour - currentHour) <= 1 && item.status !== 'completed';
      }),
      upcoming: todayItems.filter(item => {
        if (!item.time) return currentHour >= 12; // Afternoon items without time
        const itemHour = parseInt(item.time.split(':')[0]);
        return itemHour > currentHour + 1 && item.status !== 'completed';
      }),
      completed: todayItems.filter(item => item.status === 'completed')
    };

    return groups;
  };

  const handleCompleteItem = async (itemId: string) => {
    // Update in task manager
    await taskManager.completeTask(itemId);
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

  // Mock SOP data for tooltips
  const getSOPData = (itemId: string) => {
    return {
      id: itemId,
      name: 'Sunday Planning Routine',
      estimatedDuration: 15,
      assignedTo: 'You',
      steps: [
        {
          id: 'step1',
          stepNumber: 1,
          title: 'Review completed tasks',
          description: 'Check off finished items from the week',
          estimatedDuration: 5,
          isOptional: false,
          type: 'standard' as const
        },
        {
          id: 'step2',
          stepNumber: 2,
          title: 'Plan next week priorities',
          description: 'Identify top 3 goals for the upcoming week',
          estimatedDuration: 10,
          isOptional: false,
          type: 'standard' as const
        }
      ]
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
          <button className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700">
            <PlusIcon className="w-4 h-4" />
            <span>Quick Add</span>
          </button>
        </div>
      </div>

      {/* AI Insights */}
      {aiInsights.length > 0 && (
        <div className="mb-8 space-y-3">
          {aiInsights.map((insight) => (
            <div key={insight.id} className="bg-amber-50 border border-amber-200 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <SparklesIcon className="w-5 h-5 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="flex-1">
                  <p className="text-amber-800 text-sm">{insight.message}</p>
                  {insight.actionable && (
                    <button className="text-amber-600 text-xs font-medium mt-2 hover:text-amber-700">
                      Take action →
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-8">
        
        {/* Overdue Items */}
        {groups.overdue.length > 0 && (
          <div>
            <h2 className="text-lg font-semibold text-red-700 mb-4 flex items-center">
              <ClockIcon className="w-5 h-5 mr-2" />
              Overdue
            </h2>
            <div className="space-y-3">
              {groups.overdue.map((item) => (
                <TodayItemCard
                  key={item.id}
                  item={item}
                  onComplete={handleCompleteItem}
                  onItemClick={handleItemClick}
                  getContextColor={getContextColor}
                  getPriorityIcon={getPriorityIcon}
                  getSOPData={getSOPData}
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
            <div className="space-y-3">
              {groups.current.map((item) => (
                <TodayItemCard
                  key={item.id}
                  item={item}
                  onComplete={handleCompleteItem}
                  onItemClick={handleItemClick}
                  getContextColor={getContextColor}
                  getPriorityIcon={getPriorityIcon}
                  getSOPData={getSOPData}
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
            <div className="space-y-3">
              {groups.upcoming.map((item) => (
                <TodayItemCard
                  key={item.id}
                  item={item}
                  onComplete={handleCompleteItem}
                  onItemClick={handleItemClick}
                  getContextColor={getContextColor}
                  getPriorityIcon={getPriorityIcon}
                  getSOPData={getSOPData}
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
              <div className="space-y-3 opacity-60">
                {groups.completed.map((item) => (
                  <TodayItemCard
                    key={item.id}
                    item={item}
                    onComplete={handleCompleteItem}
                    onItemClick={handleItemClick}
                    getContextColor={getContextColor}
                    getPriorityIcon={getPriorityIcon}
                    getSOPData={getSOPData}
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

      {/* Debug Info - Remove this in production */}
      <TaskDebugger contextId={contextId} />
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
  getSOPData: (itemId: string) => any;
  highlighted?: boolean;
  completed?: boolean;
}

const TodayItemCard: React.FC<TodayItemCardProps> = ({ 
  item, 
  onComplete, 
  onItemClick,
  getContextColor, 
  getPriorityIcon,
  getSOPData,
  highlighted = false,
  completed = false
}) => {
  const cardClasses = `
    bg-white border rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer
    ${highlighted ? 'border-blue-300 shadow-md' : 'border-gray-200'}
    ${completed ? 'opacity-60' : ''}
  `;

  const cardContent = (
    <div className={cardClasses} onClick={() => onItemClick(item)}>
      <div className="flex items-start justify-between">
        <div className="flex items-start space-x-3 flex-1">
          {/* Completion checkbox */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onComplete(item.id);
            }}
            className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
              item.status === 'completed'
                ? 'bg-green-500 border-green-500 text-white'
                : 'border-gray-300 hover:border-green-400'
            }`}
          >
            {item.status === 'completed' && <CheckIcon className="w-3 h-3" />}
          </button>

          {/* Item content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <h3 className={`font-medium ${completed ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                {getPriorityIcon(item.priority)} {item.title}
              </h3>
              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getContextColor(item.context)}`}>
                {item.context}
              </span>
            </div>
            
            {item.parentTitle && (
              <p className="text-sm text-gray-600 mb-1">
                Part of: {item.parentTitle}
              </p>
            )}
            
            <div className="flex items-center space-x-4 text-sm text-gray-500">
              {item.time && (
                <span className="flex items-center">
                  <ClockIcon className="w-4 h-4 mr-1" />
                  {item.time}
                  {item.duration && ` (${item.duration}m)`}
                </span>
              )}
              
              {item.assignedTo && (
                <span className="flex items-center">
                  <UserIcon className="w-4 h-4 mr-1" />
                  {item.assignedTo}
                </span>
              )}
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

  // Wrap SOP items with tooltip
  if (item.type === 'sop') {
    return (
      <SOPTooltip
        sopData={getSOPData(item.id)}
        placement="right"
      >
        {cardContent}
      </SOPTooltip>
    );
  }

  return cardContent;
};