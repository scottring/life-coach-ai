import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { CalendarWeek, CalendarEvent } from '../types/calendar';
import { SOP } from '../types/sop';
import { ContextMember } from '../types/context';
import { SchedulableItem } from '../types/goals';
import { calendarService } from '../services/calendarService';
import { sopService } from '../services/sopService';
import { contextService } from '../services/contextService';
import { goalService } from '../services/goalService';
import EventDetailModal from './EventDetailModal';
// import IntelligentSidebar from './IntelligentSidebar';

interface EnhancedWeeklyCalendarWidgetProps {
  contextId: string;
  userId: string;
  onEventClick?: (event: CalendarEvent) => void;
  onSOPDrop?: (sop: SOP, date: string, time: string) => void;
  onCreateEvent?: (date: string, time: string) => void;
  onCreateTask?: () => void;
  onCreateGoal?: () => void;
  onCreateProject?: () => void;
  refreshTrigger?: number;
  onItemScheduled?: () => void;
  externalRefreshTrigger?: number;
}

const EnhancedWeeklyCalendarWidget: React.FC<EnhancedWeeklyCalendarWidgetProps> = ({
  contextId,
  userId,
  onEventClick,
  onSOPDrop,
  onCreateEvent,
  onCreateTask,
  onCreateGoal,
  onCreateProject,
  refreshTrigger,
  onItemScheduled,
  externalRefreshTrigger
}) => {
  const [currentWeek, setCurrentWeek] = useState<string>('');
  const [calendarWeek, setCalendarWeek] = useState<CalendarWeek | null>(null);
  const [members, setMembers] = useState<ContextMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState<{ type: 'sop' | 'event' | 'schedulable_item'; data: SOP | CalendarEvent | SchedulableItem } | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{ date: string; time: string } | null>(null);
  const [showContextMenu, setShowContextMenu] = useState<{ x: number; y: number; event: CalendarEvent } | null>(null);
  const [eventDetailModal, setEventDetailModal] = useState<CalendarEvent | null>(null);
  // const [sidebarVisible, setSidebarVisible] = useState(true);
  const [viewMode, setViewMode] = useState<1 | 3 | 5 | 7>(7); // Number of days to show
  // const [sidebarRefreshTrigger, setSidebarRefreshTrigger] = useState(0);
  
  const calendarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Initialize with current week (Monday)
    const today = new Date();
    const monday = new Date(today);
    monday.setDate(today.getDate() - today.getDay() + 1);
    setCurrentWeek(monday.toISOString().split('T')[0]);
  }, []);

  useEffect(() => {
    if (currentWeek) {
      loadWeekData();
    }
  }, [currentWeek, contextId]);

  // Recalculate visible days when view mode changes
  useEffect(() => {
    // Force a re-render when view mode changes
    if (calendarWeek) {
      // Trigger a state update to force re-render
      setCalendarWeek({ ...calendarWeek });
    }
  }, [viewMode]);

  // Handle external refresh trigger (synchronization with other views)
  useEffect(() => {
    if (externalRefreshTrigger !== undefined && externalRefreshTrigger > 0 && currentWeek) {
      loadWeekData();
    }
  }, [externalRefreshTrigger]);

  const loadWeekData = async () => {
    try {
      setLoading(true);
      
      // Handle potential Firebase permission errors gracefully
      let weekEvents: CalendarEvent[] = [];
      let membersData: ContextMember[] = [];
      let recurringTasks: any[] = [];
      
      try {
        weekEvents = await calendarService.getWeeklyEvents(contextId, currentWeek);
      } catch (error) {
        console.warn('Failed to load week events:', error);
      }
      
      try {
        membersData = await contextService.getContextMembers(contextId);
      } catch (error) {
        console.warn('Failed to load members:', error);
      }
      
      try {
        recurringTasks = await goalService.getRecurringScheduledItems(contextId);
      } catch (error) {
        console.warn('Failed to load recurring tasks:', error);
      }
      
      setMembers(membersData);
      
      // Generate recurring events for this week
      const recurringEvents = goalService.generateRecurringEvents(recurringTasks, currentWeek);
      
      // Combine regular events with auto-generated recurring events
      const allEvents = [...weekEvents, ...recurringEvents];
      
      // Generate calendar week - this should always work even with empty events
      const week = calendarService.generateCalendarWeek(currentWeek, allEvents);
      setCalendarWeek(week);
      
      console.log('Calendar week loaded:', week.days.length, 'days');
      
    } catch (error) {
      console.error('Error loading week data:', error);
      // Create a fallback calendar week even if everything fails
      const fallbackWeek = calendarService.generateCalendarWeek(currentWeek, []);
      setCalendarWeek(fallbackWeek);
    } finally {
      setLoading(false);
    }
  };

  // Navigation functions
  const navigateWeek = (direction: 'prev' | 'next') => {
    const current = new Date(currentWeek);
    const delta = direction === 'next' ? viewMode : -viewMode;
    current.setDate(current.getDate() + delta);
    setCurrentWeek(current.toISOString().split('T')[0]);
  };

  const goToToday = () => {
    const today = new Date();
    if (viewMode === 1) {
      // For single day view, use today
      setCurrentWeek(today.toISOString().split('T')[0]);
    } else if (viewMode === 7) {
      // For weekly view, start from Monday
      const monday = new Date(today);
      monday.setDate(today.getDate() - today.getDay() + 1);
      setCurrentWeek(monday.toISOString().split('T')[0]);
    } else {
      // For 3-day and 5-day views, center around today when possible
      // But ensure we have a full week of data loaded (starting from Monday)
      const monday = new Date(today);
      monday.setDate(today.getDate() - today.getDay() + 1);
      setCurrentWeek(monday.toISOString().split('T')[0]);
    }
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, type: 'sop' | 'event', data: SOP | CalendarEvent) => {
    e.dataTransfer.effectAllowed = 'move';
    setDraggedItem({ type, data });
  };


  const handleDragOver = (e: React.DragEvent, date: string, time: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSlot({ date, time });
  };

  const handleDragLeave = () => {
    setDragOverSlot(null);
  };

  const handleDrop = async (e: React.DragEvent, date: string, time: string) => {
    e.preventDefault();
    setDragOverSlot(null);

    try {
      // Handle external drag data
      const transferData = e.dataTransfer.getData('application/json');
      if (transferData) {
        const parsed = JSON.parse(transferData);
        if (parsed.type === 'schedulable_item') {
          await handleSchedulableItemDrop(parsed.data, date, time);
          return;
        } else if (parsed.type === 'sop_item') {
          await handleSOPDrop(parsed.data, date, time);
          return;
        }
      }

      // Handle internal drag data
      if (draggedItem) {
        if (draggedItem.type === 'sop') {
          await handleSOPDrop(draggedItem.data as SOP, date, time);
        } else if (draggedItem.type === 'event') {
          await handleEventMove(draggedItem.data as CalendarEvent, date, time);
        } else if (draggedItem.type === 'schedulable_item') {
          await handleSchedulableItemDrop(draggedItem.data as SchedulableItem, date, time);
        }
      }
    } catch (error) {
      console.error('Error handling drop:', error);
    } finally {
      setDraggedItem(null);
    }
  };

  const handleSchedulableItemDrop = async (item: SchedulableItem, date: string, time: string) => {
    try {
      const endTime = calculateEndTime(time, item.estimatedDuration);
      
      if (item.type === 'task') {
        // Schedule the task
        await goalService.scheduleTask(item.id, date, time);
        
        // Create a calendar event for the scheduled task
        const eventData = {
          title: item.title,
          description: item.description || '',
          date: date,
          startTime: time,
          endTime: endTime,
          duration: item.estimatedDuration,
          type: 'goal_task' as const,
          taskId: item.id,
          goalId: item.goalId,
          projectId: item.projectId,
          milestoneId: item.milestoneId,
          assignedTo: item.assignedTo,
          priority: item.priority,
          color: getPriorityColor(item.priority),
          contextId: contextId,
          status: 'scheduled' as const,
          isDraggable: true,
          isResizable: true,
          createdBy: userId
        };

        await calendarService.createEvent(eventData);
      } else if (item.type === 'sop') {
        // Create a calendar event for the SOP
        const eventData = {
          title: item.title,
          description: item.description || '',
          date: date,
          startTime: time,
          endTime: endTime,
          duration: item.estimatedDuration,
          type: 'sop' as const,
          sopId: item.id,
          assignedTo: item.assignedTo,
          priority: item.priority,
          color: getPriorityColor(item.priority),
          contextId: contextId,
          status: 'scheduled' as const,
          isDraggable: true,
          isResizable: true,
          createdBy: userId
        };

        await calendarService.createEvent(eventData);
      } else if (item.type === 'goal') {
        // Create a calendar event for the goal review
        const eventData = {
          title: item.title,
          description: item.description || '',
          date: date,
          startTime: time,
          endTime: endTime,
          duration: item.estimatedDuration,
          type: 'goal_review' as const,
          goalId: item.goalId,
          assignedTo: item.assignedTo,
          priority: item.priority,
          color: getPriorityColor(item.priority),
          contextId: contextId,
          status: 'scheduled' as const,
          isDraggable: true,
          isResizable: true,
          createdBy: userId
        };

        await calendarService.createEvent(eventData);
      } else if (item.type === 'milestone') {
        // Create a calendar event for the milestone
        const eventData = {
          title: item.title,
          description: item.description || '',
          date: date,
          startTime: time,
          endTime: endTime,
          duration: item.estimatedDuration,
          type: 'milestone' as const,
          milestoneId: item.id,
          goalId: item.goalId,
          projectId: item.projectId,
          assignedTo: item.assignedTo,
          priority: item.priority,
          color: getPriorityColor(item.priority),
          contextId: contextId,
          status: 'scheduled' as const,
          isDraggable: true,
          isResizable: true,
          createdBy: userId
        };

        await calendarService.createEvent(eventData);
      } else if (item.type === 'project') {
        // Create a calendar event for the project review
        const eventData = {
          title: item.title,
          description: item.description || '',
          date: date,
          startTime: time,
          endTime: endTime,
          duration: item.estimatedDuration,
          type: 'project_review' as const,
          projectId: item.id,
          goalId: item.goalId,
          assignedTo: item.assignedTo,
          priority: item.priority,
          color: getPriorityColor(item.priority),
          contextId: contextId,
          status: 'scheduled' as const,
          isDraggable: true,
          isResizable: true,
          createdBy: userId
        };

        await calendarService.createEvent(eventData);
      }
      
      await loadWeekData(); // Refresh the calendar
      
      // Sidebar removed - no longer needed
      onItemScheduled?.();
    } catch (error) {
      console.error('Error scheduling item:', error);
    }
  };

  const handleSOPDrop = async (sop: SOP, date: string, time: string) => {
    try {
      const endTime = calculateEndTime(time, sop.estimatedDuration);
      
      const eventData = {
        title: sop.name,
        description: sop.description || '',
        date: date,
        startTime: time,
        endTime: endTime,
        duration: sop.estimatedDuration,
        type: 'sop' as const,
        sopId: sop.id,
        color: '#3b82f6',
        contextId: contextId,
        status: 'scheduled' as const,
        isDraggable: true,
        isResizable: true,
        createdBy: userId
      };

      await calendarService.createEvent(eventData);
      await loadWeekData(); // Refresh the calendar
      
      if (onSOPDrop) {
        onSOPDrop(sop, date, time);
      }
    } catch (error) {
      console.error('Error creating SOP event:', error);
    }
  };

  const handleEventMove = async (event: CalendarEvent, newDate: string, newTime: string) => {
    try {
      const newEndTime = calculateEndTime(newTime, event.duration);
      
      await calendarService.updateEvent(event.id, {
        date: newDate,
        startTime: newTime,
        endTime: newEndTime
      });
      
      await loadWeekData(); // Refresh the calendar
    } catch (error) {
      console.error('Error moving event:', error);
    }
  };

  // Event handlers
  const handleEventClick = (event: CalendarEvent) => {
    if (event.type === 'sop' && event.sopId) {
      setEventDetailModal(event);
    } else {
      onEventClick?.(event);
    }
  };

  const handleEventRightClick = (e: React.MouseEvent, event: CalendarEvent) => {
    e.preventDefault();
    setShowContextMenu({
      x: e.clientX,
      y: e.clientY,
      event
    });
  };

  const handleDeleteEvent = async (event: CalendarEvent) => {
    try {
      await calendarService.deleteEvent(event.id);
      await loadWeekData();
      setShowContextMenu(null);
    } catch (error) {
      console.error('Error deleting event:', error);
    }
  };

  // Utility functions
  const calculateEndTime = (startTime: string, durationMinutes: number): string => {
    const [hours, minutes] = startTime.split(':').map(Number);
    const startDate = new Date();
    startDate.setHours(hours, minutes, 0, 0);
    
    const endDate = new Date(startDate.getTime() + (durationMinutes * 60 * 1000));
    
    return `${endDate.getHours().toString().padStart(2, '0')}:${endDate.getMinutes().toString().padStart(2, '0')}`;
  };

  const getPriorityColor = (priority: string): string => {
    switch (priority) {
      case 'critical': return '#dc2626';
      case 'high': return '#ea580c';
      case 'medium': return '#d97706';
      case 'low': return '#65a30d';
      default: return '#6b7280';
    }
  };

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const formatDate = (date: string): string => {
    const dateObj = new Date(date + 'T00:00:00');
    return dateObj.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };


  const isToday = (date: string): boolean => {
    const today = new Date().toISOString().split('T')[0];
    return date === today;
  };

  // Get visible days based on view mode
  const getVisibleDays = () => {
    if (!calendarWeek) {
      console.log('No calendarWeek, generating fallback days');
      // Generate fallback days if no calendar data
      return generateFallbackDays();
    }
    
    if (viewMode === 7) {
      return calendarWeek.days;
    }
    
    // For other view modes, find the correct starting day and slice the array
    const startDate = new Date(currentWeek + 'T00:00:00');
    const allDays = calendarWeek.days;
    
    console.log('getVisibleDays:', {
      viewMode,
      currentWeek,
      totalDaysAvailable: allDays.length,
      startDate: startDate.toISOString().split('T')[0]
    });
    
    // Find the index of the current start date in the week
    const startIndex = allDays.findIndex(day => day.date === startDate.toISOString().split('T')[0]);
    
    if (startIndex === -1) {
      console.log('Start date not found, using first N days');
      // Fallback to first N days if we can't find the start date
      return allDays.slice(0, viewMode);
    }
    
    // Return viewMode number of days starting from the correct index
    const result = allDays.slice(startIndex, startIndex + viewMode);
    console.log('Returning visible days:', result.length, 'days');
    return result;
  };

  // Generate fallback days when no data is available
  const generateFallbackDays = () => {
    const startDate = new Date(currentWeek + 'T00:00:00');
    const days = [];
    
    for (let i = 0; i < viewMode; i++) {
      const date = new Date(startDate);
      date.setDate(startDate.getDate() + i);
      const dayOfWeek = date.getDay();
      const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      
      days.push({
        date: date.toISOString().split('T')[0],
        dayName: dayNames[dayOfWeek],
        isToday: date.toISOString().split('T')[0] === new Date().toISOString().split('T')[0],
        isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
        events: [],
        timeSlots: []
      });
    }
    
    console.log('Generated fallback days:', days.length);
    return days;
  };

  const getDateRange = (): string => {
    if (!currentWeek) return '';
    
    const startDate = new Date(currentWeek + 'T00:00:00');
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + (viewMode - 1));
    
    if (viewMode === 1) {
      return startDate.toLocaleDateString('en-US', { 
        weekday: 'long', 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
    
    const startMonth = startDate.toLocaleDateString('en-US', { month: 'short' });
    const endMonth = endDate.toLocaleDateString('en-US', { month: 'short' });
    const startDay = startDate.getDate();
    const endDay = endDate.getDate();
    const year = startDate.getFullYear();
    
    if (startMonth === endMonth) {
      return `${startMonth} ${startDay}-${endDay}, ${year}`;
    } else {
      return `${startMonth} ${startDay} - ${endMonth} ${endDay}, ${year}`;
    }
  };

  // Time slots (6 AM to 10 PM in 15-minute intervals)
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour <= 22; hour++) {
      for (let minute = 0; minute < 60; minute += 15) {
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        slots.push(timeString);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-full">
      {/* Main Calendar Content */}
      <div className="w-full">
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-4 relative z-20">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h2 className="text-2xl font-bold text-gray-900">
                Weekly Planning Hub
              </h2>
              <div className="text-sm text-gray-600">{getDateRange()}</div>
            </div>
            
            <div className="flex items-center space-x-4">
              {/* View Mode Selector */}
              <div className="flex items-center space-x-1 bg-gray-100 rounded-lg p-1">
                {[1, 3, 5, 7].map((days) => (
                  <button
                    key={days}
                    onClick={() => setViewMode(days as 1 | 3 | 5 | 7)}
                    className={`px-3 py-1 text-sm rounded-md transition-colors ${
                      viewMode === days
                        ? 'bg-white text-gray-900 shadow-sm'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {days === 1 ? 'Day' : `${days}D`}
                  </button>
                ))}
              </div>
              
              {/* Navigation */}
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => navigateWeek('prev')}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>
                
                <button
                  onClick={goToToday}
                  className="px-3 py-1 text-sm bg-blue-100 text-blue-700 rounded-md hover:bg-blue-200 transition-colors"
                >
                  Today
                </button>
                
                <button
                  onClick={() => navigateWeek('next')}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md"
                >
                  <ChevronRightIcon className="w-5 h-5" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 overflow-auto">
          <div ref={calendarRef} className="min-w-full">
            {/* Days Header */}
            <div className="grid border-b border-gray-200 bg-gray-50" style={{ gridTemplateColumns: `120px repeat(${getVisibleDays().length}, 1fr)` }}>
              <div className="p-2 text-center font-medium text-gray-700 border-r border-gray-200">Time</div>
              {getVisibleDays().map((day, index) => (
                <div
                  key={`${day.date}-${index}`}
                  className={`p-2 text-center font-medium border-r border-gray-200 last:border-r-0 ${
                    isToday(day.date) ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  <div className="text-sm">{formatDate(day.date)}</div>
                </div>
              ))}
            </div>

            {/* Time Grid */}
            {timeSlots.map((timeSlot, timeIndex) => (
              <div key={timeSlot} className="grid border-b border-gray-100" style={{ gridTemplateColumns: `120px repeat(${getVisibleDays().length}, 1fr)` }}>
                {/* Time Label */}
                <div className="p-2 text-xs text-gray-500 border-r border-gray-200 bg-gray-50">
                  {formatTime(timeSlot)}
                </div>
                
                {/* Day Slots */}
                {getVisibleDays().map((day, dayIndex) => {
                  const eventsInSlot = day.events.filter(event => 
                    event.startTime <= timeSlot && event.endTime > timeSlot
                  );
                  
                  const isDragOver = dragOverSlot?.date === day.date && dragOverSlot?.time === timeSlot;
                  
                  return (
                    <div
                      key={`${day.date}-${timeSlot}`}
                      className={`relative border-r border-gray-200 last:border-r-0 transition-colors ${
                        isDragOver ? 'bg-blue-100' : 'hover:bg-gray-50'
                      }`}
                      style={{ height: '20px', minHeight: '20px' }}
                      onDragOver={(e) => handleDragOver(e, day.date, timeSlot)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, day.date, timeSlot)}
                      onDoubleClick={() => onCreateEvent?.(day.date, timeSlot)}
                    >
                      {/* Events */}
                      {eventsInSlot.map((event, eventIndex) => {
                        const isEventStart = event.startTime === timeSlot;
                        if (!isEventStart) return null;
                        
                        const durationSlots = Math.ceil(event.duration / 15);
                        const height = Math.max(durationSlots * 20, 20);
                        
                        return (
                          <div
                            key={event.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, 'event', event)}
                            onClick={() => handleEventClick(event)}
                            onContextMenu={(e) => handleEventRightClick(e, event)}
                            className="absolute inset-x-0 bg-white border border-gray-300 rounded text-xs cursor-pointer hover:shadow-sm transition-shadow z-10 overflow-hidden"
                            style={{
                              height: `${height}px`,
                              backgroundColor: event.color || '#3b82f6',
                              borderColor: event.color || '#3b82f6',
                              color: 'white',
                              left: `${eventIndex * 2}px`,
                              right: `${eventIndex * 2}px`
                            }}
                            title={`${event.title}\n${formatTime(event.startTime)} - ${formatTime(event.endTime)}\n${event.description || ''}`}
                          >
                            <div className="p-1">
                              <div className="font-medium truncate">{event.title}</div>
                              {height > 30 && (
                                <div className="text-xs opacity-75 truncate">
                                  {formatTime(event.startTime)}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <>
          <div 
            className="fixed inset-0 z-30" 
            onClick={() => setShowContextMenu(null)}
          />
          <div 
            className="fixed bg-white border border-gray-200 rounded-md shadow-lg z-40 py-1"
            style={{ 
              left: showContextMenu.x, 
              top: showContextMenu.y 
            }}
          >
            <button
              onClick={() => handleDeleteEvent(showContextMenu.event)}
              className="flex items-center space-x-2 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <TrashIcon className="w-4 h-4" />
              <span>Delete Event</span>
            </button>
          </div>
        </>
      )}

      {/* Event Detail Modal */}
      {eventDetailModal && (
        <EventDetailModal
          isOpen={!!eventDetailModal}
          onClose={() => setEventDetailModal(null)}
          event={eventDetailModal}
          onEditEvent={(event) => {
            setEventDetailModal(null);
            // Handle edit event
          }}
          onDeleteEvent={async (event) => {
            await handleDeleteEvent(event);
            setEventDetailModal(null);
          }}
          onExecuteEvent={(event) => {
            setEventDetailModal(null);
            // Handle execute event
          }}
        />
      )}
    </div>
  );
};

export default EnhancedWeeklyCalendarWidget;