import React, { useState, useEffect, useRef } from 'react';
import { 
  ChevronLeftIcon, 
  ChevronRightIcon,
  ClockIcon,
  UserIcon,
  CalendarDaysIcon,
  XMarkIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { CalendarWeek, CalendarEvent, DragOperation } from '../types/calendar';
import { SOP } from '../types/sop';
import { ContextMember } from '../types/context';
import { calendarService } from '../services/calendarService';
import { sopService } from '../services/sopService';
import { contextService } from '../services/contextService';
import EventDetailModal from './EventDetailModal';

interface WeeklyCalendarWidgetProps {
  contextId: string;
  userId: string;
  onEventClick?: (event: CalendarEvent) => void;
  onSOPDrop?: (sop: SOP, date: string, time: string) => void;
  onCreateEvent?: (date: string, time: string) => void;
}

const WeeklyCalendarWidget: React.FC<WeeklyCalendarWidgetProps> = ({
  contextId,
  userId,
  onEventClick,
  onSOPDrop,
  onCreateEvent
}) => {
  const [currentWeek, setCurrentWeek] = useState<string>('');
  const [calendarWeek, setCalendarWeek] = useState<CalendarWeek | null>(null);
  const [availableSOPs, setAvailableSOPs] = useState<SOP[]>([]);
  const [members, setMembers] = useState<ContextMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [draggedItem, setDraggedItem] = useState<{ type: 'sop' | 'event'; data: SOP | CalendarEvent } | null>(null);
  const [dragOverSlot, setDragOverSlot] = useState<{ date: string; time: string } | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showContextMenu, setShowContextMenu] = useState<{ x: number; y: number; event: CalendarEvent } | null>(null);
  const [eventDetailModal, setEventDetailModal] = useState<CalendarEvent | null>(null);
  
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

  const loadWeekData = async () => {
    try {
      setLoading(true);
      
      const [weekEvents, sops, membersData] = await Promise.all([
        calendarService.getWeeklyEvents(contextId, currentWeek),
        sopService.getSOPsForContext(contextId),
        contextService.getContextMembers(contextId)
      ]);
      
      setAvailableSOPs(sops.filter(sop => sop.status === 'active'));
      setMembers(membersData);
      
      // Generate calendar week
      const week = calendarService.generateCalendarWeek(currentWeek, weekEvents);
      setCalendarWeek(week);
      
    } catch (error) {
      console.error('Error loading week data:', error);
    } finally {
      setLoading(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const current = new Date(currentWeek);
    const newDate = new Date(current);
    newDate.setDate(current.getDate() + (direction === 'next' ? 7 : -7));
    setCurrentWeek(newDate.toISOString().split('T')[0]);
  };

  const handleDragStart = (e: React.DragEvent, item: SOP | CalendarEvent, type: 'sop' | 'event') => {
    setDraggedItem({ type, data: item });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, date: string, time: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverSlot({ date, time });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverSlot(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, date: string, time: string) => {
    e.preventDefault();
    setDragOverSlot(null);
    
    if (!draggedItem) return;
    
    try {
      if (draggedItem.type === 'sop') {
        // Schedule new SOP event
        const sop = draggedItem.data as SOP;
        await calendarService.scheduleSOPEvent(
          contextId,
          sop,
          { sopId: sop.id, preferredDate: date, preferredTime: time },
          userId
        );
        onSOPDrop?.(sop, date, time);
        await loadWeekData(); // Refresh calendar
      } else {
        // Move existing event
        const event = draggedItem.data as CalendarEvent;
        const operation: DragOperation = {
          eventId: event.id,
          sourceDate: event.date,
          sourceTime: event.startTime,
          targetDate: date,
          targetTime: time
        };
        
        await calendarService.handleDragOperation(operation);
        await loadWeekData(); // Refresh calendar
      }
    } catch (error) {
      console.error('Error handling drop:', error);
      // Could show a toast notification here
    } finally {
      setDraggedItem(null);
    }
  };

  const handleDeleteEvent = async (event: CalendarEvent) => {
    if (window.confirm(`Are you sure you want to remove "${event.title}"?`)) {
      try {
        await calendarService.deleteEvent(event.id);
        await loadWeekData(); // Refresh calendar
        setShowContextMenu(null);
        setSelectedEvent(null);
      } catch (error) {
        console.error('Error deleting event:', error);
        alert('Failed to delete event. Please try again.');
      }
    }
  };

  const handleRightClick = (e: React.MouseEvent, event: CalendarEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setShowContextMenu({
      x: e.clientX,
      y: e.clientY,
      event
    });
  };

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = () => {
      setShowContextMenu(null);
    };

    if (showContextMenu) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [showContextMenu]);

  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (selectedEvent && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        handleDeleteEvent(selectedEvent);
      }
      if (e.key === 'Escape') {
        setSelectedEvent(null);
        setShowContextMenu(null);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedEvent]);

  const formatTime = (time: string): string => {
    const [hours, minutes] = time.split(':').map(Number);
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${period}`;
  };

  const getEventStyle = (event: CalendarEvent, timeSlotHeight: number = 20): React.CSSProperties => {
    const startMinutes = calendarService.timeToMinutes(event.startTime);
    const baseMinutes = calendarService.timeToMinutes('05:00'); // Start of day
    const relativeMinutes = startMinutes - baseMinutes;
    
    const top = (relativeMinutes / 15) * timeSlotHeight; // 15-minute slots
    const height = Math.max((event.duration / 15) * timeSlotHeight, timeSlotHeight); // Minimum one slot height
    
    return {
      position: 'absolute',
      top: `${top}px`,
      height: `${height}px`,
      left: '2px',
      right: '2px',
      backgroundColor: event.color,
      borderRadius: '6px',
      padding: height >= 40 ? '6px 8px' : '2px 6px', // Adjust padding based on height
      zIndex: 10,
      cursor: event.isDraggable ? 'move' : 'pointer',
      opacity: draggedItem?.type === 'event' && draggedItem.data.id === event.id ? 0.5 : 1,
      border: '1px solid rgba(255,255,255,0.2)',
      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
      overflow: 'hidden'
    };
  };

  const getMemberName = (memberId: string): string => {
    const member = members.find(m => m.userId === memberId);
    return member?.displayName || 'Unknown';
  };

  if (loading || !calendarWeek) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const timeSlots = calendarService.generateTimeSlots('05:00', '22:00', 15);
  const timeSlotHeight = 20; // pixels per 15-minute slot (increased for better visibility)

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-4">
          <h3 className="text-lg font-semibold text-gray-900">Weekly Schedule</h3>
          <div className="flex items-center space-x-1">
            <button
              onClick={() => navigateWeek('prev')}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <ChevronLeftIcon className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-gray-700 min-w-[120px] text-center">
              {new Date(currentWeek).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })} - {new Date(calendarWeek.weekEnd).toLocaleDateString('en-US', { 
                month: 'short', 
                day: 'numeric' 
              })}
            </span>
            <button
              onClick={() => navigateWeek('next')}
              className="p-1 hover:bg-gray-100 rounded transition-colors"
            >
              <ChevronRightIcon className="w-4 h-4" />
            </button>
          </div>
        </div>
        
        <div className="flex items-center space-x-2 text-xs text-gray-500">
          <CalendarDaysIcon className="w-4 h-4" />
          <span>{calendarWeek.totalEvents} events</span>
          <ClockIcon className="w-4 h-4" />
          <span>{Math.round(calendarWeek.totalDuration / 60)}h</span>
        </div>
      </div>

      {/* Available SOPs for Dragging */}
      <div className="mb-4">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Drag SOPs to Schedule</h4>
        <div className="flex flex-wrap gap-2 max-h-20 overflow-y-auto">
          {availableSOPs.slice(0, 6).map(sop => (
            <div
              key={sop.id}
              draggable
              onDragStart={(e) => handleDragStart(e, sop, 'sop')}
              className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 border border-gray-200 rounded-md hover:bg-gray-200 transition-colors cursor-move text-sm"
              style={{ borderLeftColor: sop.category ? sopService.getCategoryColor(sop.category) : '#6B7280', borderLeftWidth: '3px' }}
            >
              <span className="truncate">{sop.name}</span>
              <span className="text-gray-500">{sop.estimatedDuration}m</span>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="flex-1 overflow-hidden">
        <div 
          ref={calendarRef} 
          className="h-full overflow-auto"
          onClick={() => setSelectedEvent(null)} // Deselect when clicking empty space
        >
          <div className="grid grid-cols-8 gap-px bg-gray-200 min-h-full">
            {/* Time column */}
            <div className="bg-white">
              <div className="h-8 border-b border-gray-200"></div> {/* Header spacer */}
              {timeSlots.filter((_, i) => i % 4 === 0).map(slot => ( // Show every hour
                <div
                  key={slot.time}
                  className="h-15 border-b border-gray-200 px-2 py-1 text-xs text-gray-500"
                  style={{ height: `${timeSlotHeight * 4}px` }}
                >
                  {formatTime(slot.time)}
                </div>
              ))}
            </div>

            {/* Day columns */}
            {calendarWeek.days.map(day => (
              <div key={day.date} className="bg-white relative">
                {/* Day header */}
                <div className="h-8 border-b border-gray-200 px-2 py-1 text-center">
                  <div className="text-xs font-medium text-gray-700">{day.dayName.slice(0, 3)}</div>
                  <div className={`text-xs ${day.isToday ? 'text-blue-600 font-semibold' : 'text-gray-500'}`}>
                    {new Date(day.date).getDate()}
                  </div>
                </div>

                {/* Time slots */}
                <div className="relative" style={{ height: `${timeSlots.length * timeSlotHeight}px` }}>
                  {/* Background time slots */}
                  {timeSlots.map((slot, index) => (
                    <div
                      key={slot.time}
                      className={`absolute w-full border-b border-gray-100 hover:bg-blue-50 transition-colors ${
                        dragOverSlot?.date === day.date && dragOverSlot?.time === slot.time
                          ? 'bg-blue-100 border-blue-300'
                          : ''
                      }`}
                      style={{
                        top: `${index * timeSlotHeight}px`,
                        height: `${timeSlotHeight}px`
                      }}
                      onDragOver={(e) => handleDragOver(e, day.date, slot.time)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, day.date, slot.time)}
                      onClick={() => onCreateEvent?.(day.date, slot.time)}
                    />
                  ))}

                  {/* Events */}
                  {day.events.map(event => {
                    const eventHeight = Math.max((event.duration / 15) * timeSlotHeight, timeSlotHeight);
                    const showFullInfo = eventHeight >= 60; // Show more info if tall enough
                    const showMediumInfo = eventHeight >= 40; // Show medium info if somewhat tall
                    const isSelected = selectedEvent?.id === event.id;
                    
                    return (
                      <div
                        key={event.id}
                        className={`group relative ${isSelected ? 'ring-2 ring-blue-400' : ''}`}
                        style={getEventStyle(event, timeSlotHeight)}
                        draggable={event.isDraggable}
                        onDragStart={(e) => handleDragStart(e, event, 'event')}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedEvent(isSelected ? null : event);
                          // Open detail modal for SOP events, use callback for others
                          if (event.type === 'sop' && event.sopId) {
                            setEventDetailModal(event);
                          } else {
                            onEventClick?.(event);
                          }
                        }}
                        onContextMenu={(e) => handleRightClick(e, event)}
                        title={`${event.title} (${event.startTime} - ${event.endTime})${event.assignedTo ? ` • ${getMemberName(event.assignedTo)}` : ''}${event.description ? ` • ${event.description}` : ''}`}
                      >
                        {/* Delete button - shows on hover or when selected */}
                        <button
                          className={`absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors z-20 ${
                            isSelected || eventHeight >= 40 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteEvent(event);
                          }}
                          title="Delete event"
                        >
                          <XMarkIcon className="w-3 h-3" />
                        </button>

                        <div className={`text-white font-medium truncate ${showMediumInfo ? 'text-xs' : 'text-[10px]'}`}>
                          {event.title}
                        </div>
                        
                        {showMediumInfo && (
                          <div className="text-[10px] text-white opacity-75 truncate">
                            {event.startTime} - {event.endTime}
                          </div>
                        )}
                        
                        {showFullInfo && event.assignedTo && (
                          <div className="text-[10px] text-white opacity-75 truncate flex items-center">
                            <UserIcon className="w-2.5 h-2.5 inline mr-1" />
                            {getMemberName(event.assignedTo)}
                          </div>
                        )}
                        
                        {/* Enhanced hover tooltip */}
                        <div className="invisible group-hover:visible absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-50 whitespace-nowrap min-w-max">
                          <div className="font-medium">{event.title}</div>
                          <div className="text-gray-300">{event.startTime} - {event.endTime} ({event.duration} min)</div>
                          {event.assignedTo && (
                            <div className="text-gray-300">Assigned to: {getMemberName(event.assignedTo)}</div>
                          )}
                          {event.description && (
                            <div className="text-gray-300 max-w-48 truncate">{event.description}</div>
                          )}
                          {event.type === 'sop' && (
                            <div className="text-blue-300">Standard Operating Procedure</div>
                          )}
                          <div className="text-gray-400 text-[10px] mt-1">Right-click for options</div>
                          {/* Arrow */}
                          <div className="absolute top-full left-1/2 transform -translate-x-1/2 border-4 border-transparent border-t-gray-900"></div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Context Menu */}
      {showContextMenu && (
        <div
          className="fixed bg-white border border-gray-200 rounded-lg shadow-lg py-1 z-50 min-w-[160px]"
          style={{
            left: `${Math.min(showContextMenu.x, window.innerWidth - 200)}px`,
            top: `${Math.min(showContextMenu.y, window.innerHeight - 100)}px`
          }}
        >
          <button
            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
            onClick={() => {
              if (showContextMenu.event.type === 'sop' && showContextMenu.event.sopId) {
                setEventDetailModal(showContextMenu.event);
              } else {
                onEventClick?.(showContextMenu.event);
              }
              setShowContextMenu(null);
            }}
          >
            <CalendarDaysIcon className="w-4 h-4" />
            <span>View Details</span>
          </button>
          
          {showContextMenu.event.isDraggable && (
            <>
              <div className="border-t border-gray-100 my-1"></div>
              <button
                className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-2"
                onClick={() => handleDeleteEvent(showContextMenu.event)}
              >
                <TrashIcon className="w-4 h-4" />
                <span>Remove from Calendar</span>
              </button>
            </>
          )}
        </div>
      )}

      {/* Quick Stats */}
      <div className="mt-4 pt-3 border-t border-gray-200">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold text-gray-900">{calendarWeek.totalEvents}</div>
            <div className="text-xs text-gray-500">Total Events</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {Math.round(calendarWeek.totalDuration / 60)}h
            </div>
            <div className="text-xs text-gray-500">Scheduled Time</div>
          </div>
          <div>
            <div className="text-lg font-semibold text-gray-900">
              {calendarWeek.days.filter(day => day.events.length > 0).length}
            </div>
            <div className="text-xs text-gray-500">Active Days</div>
          </div>
        </div>
      </div>

      {/* Event Detail Modal */}
      {eventDetailModal && (
        <EventDetailModal
          isOpen={!!eventDetailModal}
          onClose={() => setEventDetailModal(null)}
          event={eventDetailModal}
          onEditEvent={(event) => {
            setEventDetailModal(null);
            onEventClick?.(event);
          }}
          onDeleteEvent={(event) => {
            setEventDetailModal(null);
            handleDeleteEvent(event);
          }}
          onExecuteEvent={(event) => {
            setEventDetailModal(null);
            // Could add SOP execution logic here
            console.log('Execute SOP:', event);
          }}
        />
      )}
    </div>
  );
};

export default WeeklyCalendarWidget;