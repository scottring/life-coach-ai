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
import { SOP, SOPCategory } from '../types/sop';
import { calendarService } from '../services/calendarService';
import { goalService } from '../services/goalService';
import { sopService } from '../services/sopService';

interface DailyItineraryViewProps {
  contextId: string;
  userId: string;
  refreshTrigger?: number;
  onDataChange?: () => void;
}

interface TimelineItem {
  id: string;
  type: 'event' | 'task' | 'sop' | 'break' | 'inbox';
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
  userId,
  refreshTrigger,
  onDataChange
}) => {
  const [timelineItems, setTimelineItems] = useState<TimelineItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editDuration, setEditDuration] = useState<number>(30);
  const [recentlyScheduled, setRecentlyScheduled] = useState<Set<string>>(new Set());
  const [schedulingHistory, setSchedulingHistory] = useState<Map<string, string>>(new Map()); // task id -> event id
  const [dismissedItems, setDismissedItems] = useState<Set<string>>(new Set());
  const [showTimeSelector, setShowTimeSelector] = useState<string | null>(null); // item ID
  const [selectedTime, setSelectedTime] = useState<string>('09:00');
  const [sopDetails, setSOPDetails] = useState<Map<string, SOP>>(new Map());
  const [editingSOPId, setEditingSOPId] = useState<string | null>(null);

  useEffect(() => {
    loadDailyData();
    
    // Update current time every minute
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, [contextId]);

  // Refresh when trigger changes (synchronization with other views)
  useEffect(() => {
    if (refreshTrigger !== undefined && refreshTrigger > 0) {
      loadDailyData();
    }
  }, [refreshTrigger]);

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
      
      // Get inbox items (unscheduled tasks with inbox tag)
      let inboxItems: SchedulableItem[] = [];
      try {
        const allUnscheduled = await goalService.getUnscheduledItems(contextId);
        inboxItems = allUnscheduled.filter(task => 
          task.tags?.includes('inbox') && 
          !recentlyScheduled.has(task.id) && 
          !dismissedItems.has(task.id)
        );
        console.log('Loaded inbox items:', inboxItems);
      } catch (error) {
        console.warn('Failed to load inbox items:', error);
      }
      
      // Load SOP details for SOP events
      const sopEvents = events.filter(event => event.type === 'sop' && event.sopId);
      const sopDetailsMap = new Map<string, SOP>();
      
      for (const sopEvent of sopEvents) {
        if (sopEvent.sopId) {
          try {
            const sop = await sopService.getSOPById(sopEvent.sopId);
            if (sop) {
              sopDetailsMap.set(sopEvent.sopId, sop);
            }
          } catch (error) {
            console.warn(`Failed to load SOP details for ${sopEvent.sopId}:`, error);
          }
        }
      }
      
      setSOPDetails(sopDetailsMap);

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

      // Add inbox items as unscheduled items
      const unscheduledInboxItems: TimelineItem[] = inboxItems
        .slice(0, 5) // Show up to 5 inbox items
        .map(task => ({
          id: `inbox-${task.id}`,
          type: 'inbox',
          title: task.title,
          description: task.description,
          duration: task.estimatedDuration,
          priority: task.priority,
          status: 'upcoming' as const,
          color: '#f9fafb',
          isScheduled: false,
          originalData: task
        }));

      // Combine and sort by time (scheduled first, then inbox items)
      const allItems = [...scheduledItems, ...unscheduledInboxItems].sort((a, b) => {
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
      case 'inbox':
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

  const handleScheduleInboxItem = async (item: TimelineItem, startTime?: string) => {
    if (!item.originalData || item.type !== 'inbox') return;
    
    try {
      let finalStartTime: string;
      let finalEndTime: string;
      
      if (startTime) {
        // Use provided time
        finalStartTime = startTime;
        finalEndTime = addMinutes(startTime, item.duration);
        
        // Check for conflicts
        const hasConflict = timelineItems.some(existingItem => 
          existingItem.isScheduled && 
          existingItem.startTime && 
          existingItem.endTime &&
          ((startTime >= existingItem.startTime && startTime < existingItem.endTime) ||
           (finalEndTime > existingItem.startTime && finalEndTime <= existingItem.endTime) ||
           (startTime <= existingItem.startTime && finalEndTime >= existingItem.endTime))
        );
        
        if (hasConflict) {
          const confirmOverlap = window.confirm(
            `This time slot overlaps with existing items. Schedule anyway?`
          );
          if (!confirmOverlap) return;
        }
      } else {
        // Auto-find time slot
        const suggestedTime = findAvailableTimeSlot(item.duration);
        if (!suggestedTime) {
          alert('No available time slots found for this duration. Try reducing the duration or scheduling for a different day.');
          return;
        }
        finalStartTime = suggestedTime.start;
        finalEndTime = suggestedTime.end;
      }
      
      // Schedule the item
      const newEvent = await calendarService.createEvent({
        title: item.originalData.title,
        description: item.originalData.description || '',
        startTime: finalStartTime,
        endTime: finalEndTime,
        duration: item.duration,
        date: new Date().toISOString().split('T')[0],
        type: 'goal_task',
        priority: item.originalData.priority || 'medium',
        contextId,
        taskId: item.originalData.id,
        assignedTo: userId,
        assignedBy: userId,
        status: 'scheduled',
        color: '#3B82F6',
        isDraggable: true,
        isResizable: true,
        createdBy: userId
      });
      
      // Track the scheduled item for undo functionality
      const taskId = item.originalData.id;
      setRecentlyScheduled(prev => {
        const newSet = new Set(prev);
        newSet.add(taskId);
        return newSet;
      });
      setSchedulingHistory(prev => {
        const newMap = new Map(prev);
        newMap.set(taskId, newEvent.id);
        return newMap;
      });
      
      // Clear time selector
      setShowTimeSelector(null);
      
      // Refresh the view and notify other views
      await loadDailyData();
      onDataChange?.();
    } catch (error) {
      console.error('Error scheduling item:', error);
      alert('Failed to schedule item. Please try again.');
    }
  };

  const handleUndoScheduling = async (eventId: string, originalTaskId: string) => {
    try {
      // Delete the scheduled event
      await calendarService.deleteEvent(eventId);
      
      // Remove from tracking
      setRecentlyScheduled(prev => {
        const newSet = new Set(prev);
        newSet.delete(originalTaskId);
        return newSet;
      });
      
      setSchedulingHistory(prev => {
        const newMap = new Map(prev);
        newMap.delete(originalTaskId);
        return newMap;
      });
      
      // Refresh the view and notify other views
      await loadDailyData();
      onDataChange?.();
    } catch (error) {
      console.error('Error undoing scheduling:', error);
      alert('Failed to undo scheduling. Please try again.');
    }
  };

  const findAvailableTimeSlot = (duration: number): { start: string; end: string } | null => {
    const workingHours = { start: '09:00', end: '17:00' };
    const scheduledItems = timelineItems.filter(item => item.isScheduled && item.startTime && item.endTime);
    
    // Simple algorithm: find first available slot
    let currentTime = workingHours.start;
    
    for (const scheduled of scheduledItems.sort((a, b) => (a.startTime || '').localeCompare(b.startTime || ''))) {
      if (scheduled.startTime && getMinutesDiff(currentTime, scheduled.startTime) >= duration) {
        const endTime = addMinutes(currentTime, duration);
        return { start: currentTime, end: endTime };
      }
      currentTime = scheduled.endTime || currentTime;
    }
    
    // Check if there's space at the end of the day
    if (getMinutesDiff(currentTime, workingHours.end) >= duration) {
      const endTime = addMinutes(currentTime, duration);
      return { start: currentTime, end: endTime };
    }
    
    return null;
  };

  const getMinutesDiff = (start: string, end: string): number => {
    const [startHour, startMin] = start.split(':').map(Number);
    const [endHour, endMin] = end.split(':').map(Number);
    return (endHour * 60 + endMin) - (startHour * 60 + startMin);
  };

  const addMinutes = (time: string, minutes: number): string => {
    const [hour, min] = time.split(':').map(Number);
    const totalMinutes = hour * 60 + min + minutes;
    const newHour = Math.floor(totalMinutes / 60);
    const newMin = totalMinutes % 60;
    return `${newHour.toString().padStart(2, '0')}:${newMin.toString().padStart(2, '0')}`;
  };

  const handleEditDuration = (itemId: string, currentDuration: number) => {
    setEditingItem(itemId);
    setEditDuration(currentDuration);
  };

  const handleSaveDuration = (itemId: string) => {
    setTimelineItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, duration: editDuration } : item
    ));
    setEditingItem(null);
  };

  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditDuration(30);
  };

  const handleDismissInboxItem = (item: TimelineItem) => {
    if (!item.originalData || item.type !== 'inbox') return;
    
    setDismissedItems(prev => {
      const newSet = new Set(prev);
      newSet.add(item.originalData!.id);
      return newSet;
    });
    
    // Remove from timeline immediately
    setTimelineItems(prev => prev.filter(i => i.id !== item.id));
  };

  const handleRemoveScheduledItem = async (item: TimelineItem) => {
    if (!item.isScheduled || !item.originalData) return;
    
    const confirmRemove = window.confirm(`Remove "${item.title}" from your schedule?`);
    if (!confirmRemove) return;
    
    try {
      // Delete the calendar event
      await calendarService.deleteEvent(item.id);
      
      // If this was a recently scheduled item, clean up tracking
      if ('id' in item.originalData) {
        const taskId = item.originalData.id;
        setRecentlyScheduled(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
        setSchedulingHistory(prev => {
          const newMap = new Map(prev);
          newMap.delete(taskId);
          return newMap;
        });
      }
      
      // Refresh the view and notify other views
      await loadDailyData();
      onDataChange?.();
    } catch (error) {
      console.error('Error removing scheduled item:', error);
      alert('Failed to remove item. Please try again.');
    }
  };

  const generateTimeOptions = (): string[] => {
    const times: string[] = [];
    for (let hour = 6; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        times.push(timeString);
      }
    }
    return times;
  };

  const getAvailableTimeSlots = (duration: number): string[] => {
    const allTimes = generateTimeOptions();
    const availableTimes: string[] = [];
    
    for (const time of allTimes) {
      const endTime = addMinutes(time, duration);
      
      // Check if this time slot conflicts with existing items
      const hasConflict = timelineItems.some(item => 
        item.isScheduled && 
        item.startTime && 
        item.endTime &&
        ((time >= item.startTime && time < item.endTime) ||
         (endTime > item.startTime && endTime <= item.endTime) ||
         (time <= item.startTime && endTime >= item.endTime))
      );
      
      if (!hasConflict) {
        availableTimes.push(time);
      }
    }
    
    return availableTimes;
  };

  const handleSOPAccess = (item: TimelineItem) => {
    if (item.type !== 'sop' || !item.originalData) return;
    
    const event = item.originalData as CalendarEvent;
    if (event.sopId) {
      const sop = sopDetails.get(event.sopId);
      if (sop) {
        // Open SOP execution modal/view
        handleExecuteSOP(sop, event);
      } else {
        alert('SOP details not available. Please try refreshing the page.');
      }
    }
  };

  const handleExecuteSOP = async (sop: SOP, event: CalendarEvent) => {
    // For now, we'll show a simple execution interface
    // In a full implementation, this would open a dedicated SOP execution modal
    const shouldExecute = window.confirm(
      `Execute SOP: ${sop.name}\n\n` +
      `Description: ${sop.description}\n` +
      `Estimated Duration: ${sop.estimatedDuration} minutes\n` +
      `Steps: ${sop.steps?.length || 0}\n\n` +
      `Would you like to start this SOP?`
    );

    if (shouldExecute) {
      try {
        // Update event status to in-progress
        await calendarService.updateEvent(event.id, {
          status: 'in-progress'
        });
        
        // In a full implementation, this would:
        // 1. Open SOP execution interface
        // 2. Track step completion
        // 3. Log execution time
        // 4. Mark as completed when done
        
        alert(`SOP "${sop.name}" execution started! This would open the step-by-step execution interface.`);
        
        // Refresh the view
        await loadDailyData();
        onDataChange?.();
      } catch (error) {
        console.error('Error starting SOP execution:', error);
        alert('Failed to start SOP execution. Please try again.');
      }
    }
  };

  const handleEditSOP = (item: TimelineItem) => {
    if (item.type !== 'sop' || !item.originalData) return;
    
    const event = item.originalData as CalendarEvent;
    if (event.sopId) {
      setEditingSOPId(event.sopId);
    }
  };

  const handleSaveSOPEdit = async (updatedSOP: SOP) => {
    try {
      await sopService.updateSOP(updatedSOP.id, updatedSOP);
      
      // Update local SOP details
      setSOPDetails(prev => {
        const newMap = new Map(prev);
        newMap.set(updatedSOP.id, updatedSOP);
        return newMap;
      });
      
      // Close edit modal
      setEditingSOPId(null);
      
      // Refresh the view to show updated SOP details
      await loadDailyData();
      onDataChange?.();
      
      alert('SOP updated successfully!');
    } catch (error) {
      console.error('Error updating SOP:', error);
      alert('Failed to update SOP. Please try again.');
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
                      
                      {/* Duration with editing capability */}
                      {editingItem === item.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="number"
                            value={editDuration}
                            onChange={(e) => setEditDuration(parseInt(e.target.value) || 30)}
                            min="5"
                            max="480"
                            className="w-16 px-2 py-1 text-xs border border-gray-300 rounded"
                          />
                          <span>min</span>
                          <button
                            onClick={() => handleSaveDuration(item.id)}
                            className="text-green-600 hover:text-green-800"
                          >
                            ✓
                          </button>
                          <button
                            onClick={handleCancelEdit}
                            className="text-red-600 hover:text-red-800"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span 
                          className={`cursor-pointer hover:text-blue-600 ${!item.isScheduled ? 'border-b border-dotted border-gray-400' : ''}`}
                          onClick={() => !item.isScheduled && handleEditDuration(item.id, item.duration)}
                          title={!item.isScheduled ? "Click to edit duration" : ""}
                        >
                          {item.duration}m
                        </span>
                      )}
                      
                      {!item.isScheduled && (
                        <span className="text-blue-600">Inbox Item</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Action buttons */}
                <div className="flex items-center space-x-2">
                  {item.status === 'upcoming' && item.isScheduled && (
                    <>
                      {item.type === 'sop' ? (
                        <>
                          <button 
                            onClick={() => handleSOPAccess(item)}
                            className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-md hover:bg-green-200"
                            title="Execute SOP"
                          >
                            ▶ Execute
                          </button>
                          <button 
                            onClick={() => handleEditSOP(item)}
                            className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-md hover:bg-purple-200"
                            title="Edit SOP"
                          >
                            ✏️
                          </button>
                        </>
                      ) : (
                        <button className="text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-md hover:bg-blue-200">
                          Start
                        </button>
                      )}
                      
                      {/* Show undo button for recently scheduled items */}
                      {item.originalData && item.type === 'task' && 
                       'taskId' in item.originalData && 
                       recentlyScheduled.has(item.originalData.taskId || '') && (
                        <button 
                          onClick={() => {
                            if (item.originalData && 'taskId' in item.originalData && item.originalData.taskId) {
                              const taskId = item.originalData.taskId;
                              const eventId = schedulingHistory.get(taskId);
                              if (eventId) {
                                handleUndoScheduling(eventId, taskId);
                              }
                            }
                          }}
                          className="flex items-center space-x-1 text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded-md hover:bg-yellow-200 transition-colors"
                          title="Undo scheduling"
                        >
                          <span>↶</span>
                          <span>Undo</span>
                        </button>
                      )}
                      
                      {/* Remove button for all scheduled items */}
                      <button 
                        onClick={() => handleRemoveScheduledItem(item)}
                        className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-md hover:bg-red-200 transition-colors"
                        title="Remove from schedule"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                  {item.status === 'current' && (
                    <>
                      {item.type === 'sop' ? (
                        <>
                          <button 
                            onClick={() => handleSOPAccess(item)}
                            className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-md hover:bg-green-200"
                            title="Continue SOP execution"
                          >
                            ▶ Continue
                          </button>
                          <button 
                            onClick={() => handleEditSOP(item)}
                            className="text-xs bg-purple-100 text-purple-700 px-2 py-1 rounded-md hover:bg-purple-200"
                            title="Edit SOP"
                          >
                            ✏️
                          </button>
                        </>
                      ) : (
                        <button className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-md hover:bg-green-200">
                          Complete
                        </button>
                      )}
                      
                      <button 
                        onClick={() => handleRemoveScheduledItem(item)}
                        className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded-md hover:bg-red-200 transition-colors"
                        title="Remove from schedule"
                      >
                        🗑️
                      </button>
                    </>
                  )}
                  {!item.isScheduled && item.type === 'inbox' && (
                    <>
                      {showTimeSelector === item.id ? (
                        // Time selector dropdown
                        <div className="flex items-center space-x-2 bg-blue-50 p-2 rounded-md border border-blue-200">
                          <select
                            value={selectedTime}
                            onChange={(e) => setSelectedTime(e.target.value)}
                            className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500"
                          >
                            <option value="">Auto-find time</option>
                            {generateTimeOptions().map(time => {
                              const endTime = addMinutes(time, item.duration);
                              const hasConflict = timelineItems.some(existingItem => 
                                existingItem.isScheduled && 
                                existingItem.startTime && 
                                existingItem.endTime &&
                                ((time >= existingItem.startTime && time < existingItem.endTime) ||
                                 (endTime > existingItem.startTime && endTime <= existingItem.endTime) ||
                                 (time <= existingItem.startTime && endTime >= existingItem.endTime))
                              );
                              
                              return (
                                <option 
                                  key={time} 
                                  value={time}
                                  style={{ color: hasConflict ? '#ef4444' : 'inherit' }}
                                >
                                  {formatTime(time)} {hasConflict ? '(conflict)' : ''}
                                </option>
                              );
                            })}
                          </select>
                          <button
                            onClick={() => handleScheduleInboxItem(item, selectedTime || undefined)}
                            className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                            title="Confirm schedule"
                          >
                            ✓
                          </button>
                          <button
                            onClick={() => setShowTimeSelector(null)}
                            className="text-xs bg-gray-500 text-white px-2 py-1 rounded hover:bg-gray-600"
                            title="Cancel"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <>
                          <button 
                            onClick={() => {
                              setShowTimeSelector(item.id);
                              setSelectedTime('');
                            }}
                            className="flex items-center space-x-1 text-xs bg-blue-100 text-blue-700 px-3 py-1 rounded-md hover:bg-blue-200 transition-colors"
                            title="Choose time to schedule"
                          >
                            <PlusIcon className="w-3 h-3" />
                            <span>Schedule</span>
                          </button>
                          <button 
                            onClick={() => handleEditDuration(item.id, item.duration)}
                            className="text-xs bg-gray-100 text-gray-700 px-2 py-1 rounded-md hover:bg-gray-200"
                            title="Edit duration"
                          >
                            ⏱️
                          </button>
                          <button 
                            onClick={() => handleDismissInboxItem(item)}
                            className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded-md hover:bg-orange-200 transition-colors"
                            title="Dismiss this item"
                          >
                            ✕
                          </button>
                        </>
                      )}
                    </>
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

      {/* SOP Edit Modal */}
      {editingSOPId && (
        <SOPEditModal
          sop={sopDetails.get(editingSOPId)!}
          onSave={handleSaveSOPEdit}
          onCancel={() => setEditingSOPId(null)}
        />
      )}
    </div>
  );

  // SOP Edit Modal Component
  function SOPEditModal({ sop, onSave, onCancel }: {
    sop: SOP;
    onSave: (updatedSOP: SOP) => void;
    onCancel: () => void;
  }) {
    const [editedSOP, setEditedSOP] = useState<SOP>({ ...sop });
    const [saving, setSaving] = useState(false);

    const handleSave = async () => {
      if (!editedSOP.name.trim()) {
        alert('SOP name is required');
        return;
      }

      setSaving(true);
      try {
        await onSave(editedSOP);
      } finally {
        setSaving(false);
      }
    };

    const addStep = () => {
      setEditedSOP(prev => ({
        ...prev,
        steps: [
          ...(prev.steps || []),
          {
            id: `step-${Date.now()}`,
            stepNumber: (prev.steps?.length || 0) + 1,
            title: '',
            description: '',
            estimatedDuration: 5,
            isOptional: false,
            type: 'standard' as const
          }
        ]
      }));
    };

    const updateStep = (stepIndex: number, field: string, value: any) => {
      setEditedSOP(prev => ({
        ...prev,
        steps: prev.steps?.map((step, index) => 
          index === stepIndex ? { ...step, [field]: value } : step
        ) || []
      }));
    };

    const removeStep = (stepIndex: number) => {
      setEditedSOP(prev => ({
        ...prev,
        steps: prev.steps?.filter((_, index) => index !== stepIndex) || []
      }));
    };

    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900">Edit SOP</h2>
              <button
                onClick={onCancel}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="space-y-6">
              {/* Basic Information */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    SOP Name *
                  </label>
                  <input
                    type="text"
                    value={editedSOP.name}
                    onChange={(e) => setEditedSOP(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter SOP name..."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={editedSOP.category}
                    onChange={(e) => setEditedSOP(prev => ({ ...prev, category: e.target.value as SOPCategory }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="morning">Morning</option>
                    <option value="evening">Evening</option>
                    <option value="leaving">Leaving</option>
                    <option value="cleanup">Cleanup</option>
                    <option value="meal-prep">Meal Prep</option>
                    <option value="work">Work</option>
                    <option value="custom">Custom</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={editedSOP.description}
                  onChange={(e) => setEditedSOP(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Describe what this SOP accomplishes..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estimated Duration (minutes)
                </label>
                <input
                  type="number"
                  value={editedSOP.estimatedDuration}
                  onChange={(e) => setEditedSOP(prev => ({ ...prev, estimatedDuration: parseInt(e.target.value) || 0 }))}
                  min="1"
                  max="480"
                  className="w-32 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Steps Section */}
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-lg font-medium text-gray-900">Steps</h3>
                  <button
                    onClick={addStep}
                    className="px-3 py-1 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
                  >
                    + Add Step
                  </button>
                </div>

                <div className="space-y-3">
                  {editedSOP.steps?.map((step, index) => (
                    <div key={step.id} className="border border-gray-200 rounded-md p-4">
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-medium text-gray-700">Step {index + 1}</span>
                        <button
                          onClick={() => removeStep(index)}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          Remove
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                        <div className="md:col-span-2">
                          <input
                            type="text"
                            value={step.title}
                            onChange={(e) => updateStep(index, 'title', e.target.value)}
                            placeholder="Step title..."
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                          />
                        </div>
                        <div>
                          <input
                            type="number"
                            value={step.estimatedDuration}
                            onChange={(e) => updateStep(index, 'estimatedDuration', parseInt(e.target.value) || 1)}
                            min="1"
                            max="120"
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                            placeholder="Minutes"
                          />
                        </div>
                      </div>

                      <div className="mt-2">
                        <textarea
                          value={step.description}
                          onChange={(e) => updateStep(index, 'description', e.target.value)}
                          rows={2}
                          placeholder="Step description..."
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 text-sm"
                        />
                      </div>
                    </div>
                  )) || (
                    <div className="text-center py-8 text-gray-500">
                      No steps defined. Click "Add Step" to get started.
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="p-6 border-t border-gray-200 flex justify-end space-x-3">
            <button
              onClick={onCancel}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving || !editedSOP.name.trim()}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
            >
              {saving ? 'Saving...' : 'Save SOP'}
            </button>
          </div>
        </div>
      </div>
    );
  }
};

export default DailyItineraryView;