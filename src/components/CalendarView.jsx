import React, { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameDay } from 'date-fns';
import { useTasks } from '../providers/TaskProvider';
import { useCalendarIntegration } from '../hooks/useCalendarIntegration';

function CalendarView() {
  const { tasks } = useTasks();
  const { events: calendarEvents, loading: calendarLoading, fetchEvents } = useCalendarIntegration();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekDays, setWeekDays] = useState([]);
  
  // Convert tasks with deadlines to calendar events
  const taskEvents = tasks
    .filter(task => task.deadline && task.status !== 'completed')
    .map(task => ({
      id: `task-${task.id}`,
      title: task.title,
      description: task.description,
      start: task.deadline,
      end: task.deadline,
      type: 'deadline',
      priority: task.priority,
      context: task.context
    }));
  
  // Combine calendar events and task deadlines
  const allEvents = [...calendarEvents, ...taskEvents];
  
  // Set up days for the week view
  useEffect(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 1 }); // Start on Monday
    const end = endOfWeek(currentDate, { weekStartsOn: 1 });
    const days = eachDayOfInterval({ start, end });
    setWeekDays(days);
  }, [currentDate]);
  
  const goToPreviousWeek = () => {
    setCurrentDate(date => addDays(date, -7));
  };
  
  const goToNextWeek = () => {
    setCurrentDate(date => addDays(date, 7));
  };
  
  const goToToday = () => {
    setCurrentDate(new Date());
  };
  
  // Get events for a specific day
  const getEventsForDay = (day) => {
    return allEvents.filter(event => {
      const eventDate = new Date(event.start);
      return isSameDay(eventDate, day);
    });
  };
  
  // Get color based on priority and type
  const getEventTypeColor = (event) => {
    if (event.type === 'deadline') {
      // Color based on priority for task deadlines
      switch (event.priority) {
        case 5: return 'bg-red-100 text-red-800 border-red-200';
        case 4: return 'bg-orange-100 text-orange-800 border-orange-200';
        case 3: return 'bg-yellow-100 text-yellow-800 border-yellow-200';
        case 2: return 'bg-green-100 text-green-800 border-green-200';
        case 1: return 'bg-blue-100 text-blue-800 border-blue-200';
        default: return 'bg-gray-100 text-gray-800 border-gray-200';
      }
    }
    
    // Default colors for other event types
    switch (event.type) {
      case 'meeting':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'appointment':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-green-100 text-green-800 border-green-200';
    }
  };
  
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-lg font-medium text-gray-800">Calendar</h2>
        
        <div className="flex space-x-2">
          <button
            onClick={goToPreviousWeek}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Previous
          </button>
          <button
            onClick={goToToday}
            className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
          >
            Today
          </button>
          <button
            onClick={goToNextWeek}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Next
          </button>
          <button
            onClick={() => fetchEvents()}
            disabled={calendarLoading}
            className="rounded-md border border-gray-300 bg-white px-3 py-1 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {calendarLoading ? 'Refreshing...' : 'Refresh'}
          </button>
        </div>
      </div>
      
      <div className="overflow-hidden rounded-lg border border-gray-200">
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {weekDays.map((day) => (
            <div 
              key={day.toString()} 
              className={`px-2 py-3 text-center text-sm font-medium ${
                isToday(day) ? 'bg-blue-50 text-blue-700' : 'text-gray-500'
              }`}
            >
              <div>{format(day, 'EEE')}</div>
              <div className={`text-lg ${isToday(day) ? 'font-bold text-blue-700' : 'text-gray-900'}`}>
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>
        
        <div className="grid grid-cols-7 divide-x divide-gray-200">
          {weekDays.map((day) => {
            const dayEvents = getEventsForDay(day);
            
            return (
              <div 
                key={day.toString()} 
                className={`min-h-[200px] p-2 ${isToday(day) ? 'bg-blue-50' : 'bg-white'}`}
              >
                {dayEvents.length === 0 ? (
                  <div className="flex h-full items-center justify-center text-xs text-gray-400">
                    No events
                  </div>
                ) : (
                  <div className="space-y-2">
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        className={`cursor-pointer rounded-md border px-2 py-1 text-xs ${getEventTypeColor(event)}`}
                        title={event.description || event.title}
                      >
                        <div className="font-medium">{event.title}</div>
                        <div className="text-xs opacity-80">
                          {event.type === 'deadline' ? 'Due' : format(new Date(event.start), 'h:mm a')}
                          {event.context && ` • ${event.context}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {allEvents.length === 0 && !calendarLoading && (
        <div className="mt-4 text-center text-sm text-gray-500">
          No upcoming events or task deadlines. Add tasks with deadlines or connect your Google Calendar to see events here.
        </div>
      )}
      
      {calendarLoading && (
        <div className="mt-4 text-center text-sm text-gray-500">
          <div className="inline-flex items-center">
            <svg className="mr-2 h-4 w-4 animate-spin" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            Loading calendar events...
          </div>
        </div>
      )}
      
      <div className="mt-4 flex items-center justify-between">
        <div className="text-xs text-gray-500">
          Showing calendar events and task deadlines
        </div>
        <div className="flex items-center space-x-4 text-xs">
          <div className="flex items-center space-x-1">
            <div className="h-2 w-2 rounded-full bg-blue-200"></div>
            <span>Meetings</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="h-2 w-2 rounded-full bg-purple-200"></div>
            <span>Appointments</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="h-2 w-2 rounded-full bg-red-200"></div>
            <span>High Priority Tasks</span>
          </div>
          <div className="flex items-center space-x-1">
            <div className="h-2 w-2 rounded-full bg-yellow-200"></div>
            <span>Medium Priority Tasks</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CalendarView;