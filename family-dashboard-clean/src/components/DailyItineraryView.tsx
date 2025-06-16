import React, { useState, useEffect } from 'react';
import {
  ClockIcon,
  CheckCircleIcon,
  FlagIcon,
  CalendarDaysIcon,
  ClipboardDocumentListIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import { CalendarEvent } from '../types/calendar';
import { SchedulableItem, GoalPriority } from '../types/goals';
import { calendarService } from '../services/calendarService';
import { goalService } from '../services/goalService';

interface DailyItineraryViewProps {
  contextId: string;
  userId: string;
}

interface TimelineItem {
  id: string;
  type: 'event' | 'task' | 'sop' | 'break' | 'suggestion';
  title: string;
  description?: string;
  startTime?: string;
  endTime?: string;
  duration: number;
  priority?: GoalPriority;
  status: 'upcoming' | 'current' | 'completed' | 'overdue';
  color: string;
  isScheduled: boolean;
  originalData?: CalendarEvent | SchedulableItem;
}

const DailyItineraryView: React.FC<DailyItineraryViewProps> = ({
  contextId,
  userId
}) => {
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());

  useEffect(() => {
    loadDailyData();
    
    // Update current time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, [contextId]);

  const loadDailyData = async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      
      // Get scheduled events for today
      let events: CalendarEvent[] = [];
      try {
        events = await calendarService.getEventsForDateRange(contextId, today, today);
        console.log('Loaded events for today:', events);
      } catch (error) {
        console.warn('Failed to load calendar events:', error);
      }
      
      // Get unscheduled tasks
      let unscheduledTasks: SchedulableItem[] = [];
      try {
        unscheduledTasks = await goalService.getUnscheduledItems(contextId);
        console.log('Loaded unscheduled tasks:', unscheduledTasks);
      } catch (error) {
        console.warn('Failed to load unscheduled tasks:', error);
      }
      
      // Convert to timeline items
      const scheduledItems: TimelineItem[] = events.map(event => ({
        id: event.id,
        type: getEventType(event.type),
        title: event.title,
        description: event.description,
        startTime: event.startTime,
        endTime: event.endTime,
        duration: event.duration,
        priority: event.priority as GoalPriority,
        status: getEventStatus(event, currentTime),
        color: event.color,
        isScheduled: true,
        originalData: event
      }));

      // Add suggested unscheduled items for gaps
      const suggestedItems: TimelineItem[] = unscheduledTasks
        .slice(0, 3) // Limit suggestions
        .map(task => ({
          id: `suggestion-${task.id}`,
          type: 'suggestion',
          title: `Suggestion: ${task.title}`,
          description: task.description,
          duration: task.estimatedDuration,
          priority: task.priority,
          status: 'upcoming' as const,
          color: '#f3f4f6',
          isScheduled: false,
          originalData: task
        }));

      // Combine and sort by time
      const allItems = [...scheduledItems, ...suggestedItems].sort((a, b) => {
        if (!a.startTime && !b.startTime) return 0;
        if (!a.startTime) return 1;
        if (!b.startTime) return -1;
        return a.startTime.localeCompare(b.startTime);
      });

      setTimelineItems(allItems);
    } catch (error) {
      console.error('Error loading daily data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getEventType = (type: string): TimelineItem['type'] => {
    switch (type) {
      case 'sop': return 'sop';
      case 'goal_task':
      case 'task': return 'task';
      default: return 'event';
    }
  };

  const getEventStatus = (event: CalendarEvent, currentTime: Date): TimelineItem['status'] => {
    if (!event.startTime) return 'upcoming';
    
    const now = currentTime.toTimeString().slice(0, 5);
    const start = event.startTime;
    const end = event.endTime;
    
    if (now < start) return 'upcoming';
    if (now >= start && now <= end) return 'current';
    if (event.status === 'completed') return 'completed';
    if (now > end) return 'overdue';
    return 'upcoming';
  };

  const getCurrentTimePosition = (): string => {
    const now = currentTime.toTimeString().slice(0, 5);
    const [hours, minutes] = now.split(':').map(Number);
    const totalMinutes = hours * 60 + minutes;
    const startMinutes = 6 * 60; // 6 AM
    const endMinutes = 22 * 60; // 10 PM
    
    if (totalMinutes < startMinutes || totalMinutes > endMinutes) return '0%';
    
    const percentage = ((totalMinutes - startMinutes) / (endMinutes - startMinutes)) * 100;
    return `${Math.max(0, Math.min(100, percentage))}%`;
  };

  const formatTime = (time?: string): string => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
    return `${displayHour}:${minutes} ${ampm}`;
  };

  const getTypeIcon = (type: TimelineItem['type']) => {
    switch (type) {
      case 'task':
        return <CheckCircleIcon className="w-5 h-5" />;
      case 'sop':
        return <ClipboardDocumentListIcon className="w-5 h-5" />;
      case 'event':
        return <CalendarDaysIcon className="w-5 h-5" />;
      case 'suggestion':
        return <PlusIcon className="w-5 h-5" />;
      default:
        return <ClockIcon className="w-5 h-5" />;
    }
  };

  const getStatusColor = (status: TimelineItem['status']): string => {
    switch (status) {
      case 'current': return 'border-l-blue-500 bg-blue-50';
      case 'completed': return 'border-l-green-500 bg-green-50';
      case 'overdue': return 'border-l-red-500 bg-red-50';
      default: return 'border-l-gray-300 bg-white';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">
          Today's Itinerary
        </h2>
        <p className="text-gray-600">
          {new Date().toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </p>
      </div>

      {/* Timeline */}
      <div className="relative">
        {/* Current time indicator */}
        <div 
          className="absolute left-0 w-full h-0.5 bg-red-500 z-10"
          style={{ top: getCurrentTimePosition() }}
        >
          <div className="absolute -left-2 -top-2 w-4 h-4 bg-red-500 rounded-full"></div>
          <div className="absolute left-4 -top-3 bg-red-500 text-white text-xs px-2 py-1 rounded">
            {currentTime.toTimeString().slice(0, 5)}
          </div>
        </div>

        {/* Timeline items */}
        <div className="space-y-3">
          {timelineItems.map((item) => (
            <div
              key={item.id}
              className={`border-l-4 rounded-lg p-4 transition-all duration-200 hover:shadow-md ${getStatusColor(item.status)}`}
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3">
                  <div className={`p-2 rounded-lg ${
                    item.status === 'current' ? 'bg-blue-100 text-blue-600' :
                    item.status === 'completed' ? 'bg-green-100 text-green-600' :
                    item.status === 'overdue' ? 'bg-red-100 text-red-600' :
                    'bg-gray-100 text-gray-600'
                  }`}>
                    {getTypeIcon(item.type)}
                  </div>
                  
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <h3 className="font-medium text-gray-900">{item.title}</h3>
                      {item.priority && (
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          item.priority === 'critical' ? 'bg-red-100 text-red-700' :
                          item.priority === 'high' ? 'bg-orange-100 text-orange-700' :
                          item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {item.priority}
                        </span>
                      )}
                    </div>
                    
                    {item.description && (
                      <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                    )}
                    
                    <div className="flex items-center space-x-4 text-xs text-gray-500">
                      {item.startTime && (
                        <span className="flex items-center space-x-1">
                          <ClockIcon className="w-3 h-3" />
                          <span>{formatTime(item.startTime)} - {formatTime(item.endTime)}</span>
                        </span>
                      )}
                      <span>{item.duration}m</span>
                      {!item.isScheduled && (
                        <span className="text-blue-600">Suggestion</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center space-x-2">
                  {item.status === 'upcoming' && item.isScheduled && (
                    <button className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-md hover:bg-blue-200">
                      Start
                    </button>
                  )}
                  {item.status === 'current' && (
                    <button className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-md hover:bg-green-200">
                      Complete
                    </button>
                  )}
                  {!item.isScheduled && (
                    <button className="text-xs bg-gray-100 text-gray-700 px-3 py-1 rounded-md hover:bg-gray-200">
                      Schedule
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>

        {timelineItems.length === 0 && (
          <div className="text-center py-12">
            <CalendarDaysIcon className="w-12 h-12 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No items for today</h3>
            <p className="text-gray-500">Your day is wide open! Consider adding some tasks or events.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default DailyItineraryView;