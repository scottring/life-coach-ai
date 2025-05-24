import React, { useState, useEffect } from 'react';
import { format, addDays, startOfWeek, endOfWeek, eachDayOfInterval, isToday, isSameDay, setHours, setMinutes } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import EventDetail from './EventDetail';

function CalendarView() {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [weekDays, setWeekDays] = useState([]);
  const [calendarEvents, setCalendarEvents] = useState([]);
  const [selectedEvent, setSelectedEvent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [selectedDate, setSelectedDate] = useState(null);
  
  // Fetch calendar events from database
  useEffect(() => {
    fetchCalendarEvents();
  }, [currentDate]);
  
  const fetchCalendarEvents = async () => {
    try {
      const start = startOfWeek(currentDate, { weekStartsOn: 1 });
      const end = endOfWeek(currentDate, { weekStartsOn: 1 });
      
      console.log('Fetching events for week:', start.toDateString(), 'to', end.toDateString());
      
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .gte('start_time', start.toISOString())
        .lte('start_time', end.toISOString())
        .order('start_time', { ascending: true });
      
      if (error) throw error;
      
      console.log('Found events for this week:', data?.length || 0);
      setCalendarEvents(data || []);
    } catch (error) {
      console.error('Error fetching calendar events:', error);
    } finally {
      setLoading(false);
    }
  };
  
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
    return calendarEvents.filter(event => 
      isSameDay(new Date(event.start_time), day)
    );
  };
  
  // Get event color based on type and calendar
  const getEventColor = (event) => {
    if (event.calendar_type === 'work') {
      return 'bg-blue-100 hover:bg-blue-200 text-blue-800 border-blue-300';
    } else if (event.calendar_type === 'personal') {
      return 'bg-green-100 hover:bg-green-200 text-green-800 border-green-300';
    }
    return 'bg-gray-100 hover:bg-gray-200 text-gray-800 border-gray-300';
  };
  
  // Get event icon based on type
  const getEventIcon = (event) => {
    const icons = {
      flight: '✈️',
      meeting: '💼',
      medical: '🏥',
      social: '🍽️',
      interview: '🎯',
      presentation: '📊',
      personal: '👤',
      family: '👨‍👩‍👧‍👦',
      travel: '🚗'
    };
    return icons[event.event_type] || '📅';
  };
  
  const handleEventUpdate = (updatedEvent) => {
    setCalendarEvents(prev => 
      prev.map(e => e.id === updatedEvent.id ? updatedEvent : e)
    );
    fetchCalendarEvents(); // Refresh to get latest data
  };

  const createEvent = async (eventData) => {
    try {
      const { error } = await supabase
        .from('calendar_events')
        .insert({
          ...eventData,
          google_event_id: `local-${Date.now()}`,
          calendar_id: 'local-calendar',
          calendar_type: 'personal',
          status: 'confirmed',
          attendees: [],
          all_day: false,
          timezone: 'America/New_York'
        });
      
      if (error) throw error;
      
      fetchCalendarEvents();
      setShowCreateModal(false);
      setSelectedDate(null);
    } catch (error) {
      console.error('Error creating event:', error);
      alert('Failed to create event');
    }
  };

  const deleteEvent = async (eventId) => {
    if (!confirm('Are you sure you want to delete this event?')) return;
    
    try {
      const { error } = await supabase
        .from('calendar_events')
        .delete()
        .eq('id', eventId);
      
      if (error) throw error;
      
      fetchCalendarEvents();
      setSelectedEvent(null);
    } catch (error) {
      console.error('Error deleting event:', error);
      alert('Failed to delete event');
    }
  };
  
  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Loading calendar...</div>
      </div>
    );
  }
  
  return (
    <div className="rounded-lg bg-white p-6 shadow">
      {/* Calendar Header */}
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-800">Calendar</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => {
              setSelectedDate(new Date());
              setShowCreateModal(true);
            }}
            className="rounded-md bg-blue-600 px-3 py-1 text-sm font-medium text-white hover:bg-blue-700"
          >
            + New Event
          </button>
          <div className="ml-2 flex items-center gap-1 border-l pl-2">
            <button
              onClick={goToPreviousWeek}
              className="rounded-md p-2 hover:bg-gray-100"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button
              onClick={goToToday}
              className="rounded-md px-3 py-1 text-sm font-medium hover:bg-gray-100"
            >
              Today
            </button>
            <button
              onClick={goToNextWeek}
              className="rounded-md p-2 hover:bg-gray-100"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      </div>
      
      {/* Week View */}
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-lg border border-gray-200 bg-gray-200">
        {/* Day Headers */}
        {weekDays.map((day, index) => (
          <div
            key={index}
            className={`bg-gray-50 p-2 text-center ${
              isToday(day) ? 'bg-blue-50' : ''
            }`}
          >
            <div className="text-xs font-medium text-gray-600">
              {format(day, 'EEE')}
            </div>
            <div className={`mt-1 text-sm font-semibold ${
              isToday(day) ? 'text-blue-600' : 'text-gray-900'
            }`}>
              {format(day, 'd')}
            </div>
          </div>
        ))}
        
        {/* Day Cells */}
        {weekDays.map((day, index) => {
          const dayEvents = getEventsForDay(day);
          
          return (
            <div
              key={index}
              className={`min-h-[120px] bg-white p-2 ${
                isToday(day) ? 'bg-blue-50/30' : ''
              }`}
            >
              <div className="space-y-1">
                {dayEvents.slice(0, 3).map((event) => (
                  <button
                    key={event.id}
                    onClick={() => setSelectedEvent(event)}
                    className={`block w-full rounded px-2 py-1 text-left text-xs transition-colors ${
                      getEventColor(event)
                    } border`}
                  >
                    <div className="flex items-center gap-1">
                      <span>{getEventIcon(event)}</span>
                      <span className="truncate font-medium">
                        {format(new Date(event.start_time), 'HH:mm')}
                      </span>
                    </div>
                    <div className="truncate">{event.title}</div>
                  </button>
                ))}
                {dayEvents.length > 3 && (
                  <div className="px-2 text-xs text-gray-500">
                    +{dayEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      {/* Calendar Legend */}
      <div className="mt-4 flex items-center gap-4 text-xs">
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-blue-200"></div>
          <span>Work Calendar</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-3 w-3 rounded bg-green-200"></div>
          <span>Personal Calendar</span>
        </div>
      </div>
      
      {/* Sync Status */}
      <div className="mt-4 text-xs text-gray-500">
        Synced with Google Calendar • Last update: {format(new Date(), 'HH:mm')}
      </div>
      
      {/* Event Detail Modal */}
      {selectedEvent && (
        <EventDetail
          event={selectedEvent}
          onClose={() => setSelectedEvent(null)}
          onUpdate={handleEventUpdate}
          onDelete={() => deleteEvent(selectedEvent.id)}
        />
      )}

      {/* Create Event Modal */}
      {showCreateModal && (
        <CreateEventModal
          selectedDate={selectedDate}
          onClose={() => {
            setShowCreateModal(false);
            setSelectedDate(null);
          }}
          onCreate={createEvent}
        />
      )}
    </div>
  );
}

// Create Event Modal Component
function CreateEventModal({ selectedDate, onClose, onCreate }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    location: '',
    start_time: selectedDate ? format(selectedDate, "yyyy-MM-dd'T'HH:mm") : format(new Date(), "yyyy-MM-dd'T'HH:mm"),
    end_time: selectedDate ? format(addDays(selectedDate, 0), "yyyy-MM-dd'T'") + format(addDays(selectedDate, 0), 'HH:mm') : format(addDays(new Date(), 0), "yyyy-MM-dd'T'HH:mm"),
    event_type: 'meeting'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.title) {
      alert('Please enter a title');
      return;
    }
    onCreate(formData);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="text-lg font-semibold">New Event</h3>
          <button
            onClick={onClose}
            className="rounded-md p-1 hover:bg-gray-100"
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Title</label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Event title"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Description</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              rows={3}
              placeholder="Event description (optional)"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Location</label>
            <input
              type="text"
              value={formData.location}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              placeholder="Location (optional)"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Start Time</label>
              <input
                type="datetime-local"
                value={formData.start_time}
                onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700">End Time</label>
              <input
                type="datetime-local"
                value={formData.end_time}
                onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700">Event Type</label>
            <select
              value={formData.event_type}
              onChange={(e) => setFormData({ ...formData, event_type: e.target.value })}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            >
              <option value="meeting">Meeting</option>
              <option value="personal">Personal</option>
              <option value="family">Family</option>
              <option value="medical">Medical</option>
              <option value="travel">Travel</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="flex gap-2 pt-4">
            <button
              type="submit"
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              Create Event
            </button>
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default CalendarView;