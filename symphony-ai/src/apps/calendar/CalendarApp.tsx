import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import interactionPlugin from '@fullcalendar/interaction';
import googleCalendarPlugin from '@fullcalendar/google-calendar';
import listPlugin from '@fullcalendar/list';
import { 
  CalendarIcon,
  PlusIcon,
  Cog6ToothIcon
} from '@heroicons/react/24/outline';
import { EventModal } from './components/EventModal';
import { CalendarSidebar } from './components/CalendarSidebar';
import { CalendarSettings } from './components/CalendarSettings';
import { calendarService } from '../../shared/services/calendarService';
import { CalendarEvent as SharedCalendarEvent } from '../../shared/types/calendar';

interface CalendarAppProps {
  contextId: string;
  userId: string;
}

interface FullCalendarEvent {
  id: string;
  title: string;
  start: string;
  end?: string;
  backgroundColor?: string;
  borderColor?: string;
  textColor?: string;
  extendedProps?: {
    type: SharedCalendarEvent['type'];
    description?: string;
    source?: string;
    priority?: string;
  };
}

export const CalendarApp: React.FC<CalendarAppProps> = ({ contextId, userId }) => {
  const navigate = useNavigate();
  const calendarRef = useRef<FullCalendar>(null);
  
  const [events, setEvents] = useState<FullCalendarEvent[]>([]);
  const [currentView, setCurrentView] = useState('timeGridWeek');
  const [selectedEvent, setSelectedEvent] = useState<FullCalendarEvent | null>(null);
  const [showEventModal, setShowEventModal] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // Calendar settings
  const [calendarSettings, setCalendarSettings] = useState({
    googleCalendarApiKey: '',
    googleCalendarId: '',
    showGoogleEvents: true,
    showSOPEvents: true,
    showProjectEvents: true,
    showMealEvents: true,
    timeZone: 'local',
    weekStartsOn: 1, // Monday
    businessHours: {
      start: '09:00',
      end: '17:00'
    }
  });

  const loadEvents = useCallback(async () => {
    try {
      setLoading(true);
      // Load events for the next month
      const startDate = new Date();
      const endDate = new Date();
      endDate.setMonth(endDate.getMonth() + 1);
      
      const calendarEvents = await calendarService.getEventsForDateRange(
        contextId,
        startDate.toISOString().split('T')[0],
        endDate.toISOString().split('T')[0]
      );
      
      // Transform to FullCalendar format
      const formattedEvents: FullCalendarEvent[] = calendarEvents.map(event => ({
        id: event.id,
        title: event.title,
        start: `${event.date}T${event.startTime}`,
        end: event.endTime ? `${event.date}T${event.endTime}` : undefined,
        backgroundColor: event.color || '#3788d8',
        borderColor: event.color || '#3788d8',
        textColor: '#ffffff',
        extendedProps: {
          type: event.type || 'manual',
          description: event.description,
          source: 'internal',
          priority: event.priority
        }
      }));
      
      setEvents(formattedEvents);
    } catch (error) {
      console.error('Error loading calendar events:', error);
    } finally {
      setLoading(false);
    }
  }, [contextId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const handleEventClick = (info: any) => {
    const event: FullCalendarEvent = {
      id: info.event.id,
      title: info.event.title,
      start: info.event.start?.toISOString() || '',
      end: info.event.end?.toISOString(),
      backgroundColor: info.event.backgroundColor,
      borderColor: info.event.borderColor,
      textColor: info.event.textColor,
      extendedProps: info.event.extendedProps
    };
    
    setSelectedEvent(event);
    setShowEventModal(true);
  };

  const handleDateSelect = (info: any) => {
    const newEvent: FullCalendarEvent = {
      id: `temp-${Date.now()}`,
      title: 'New Event',
      start: info.start.toISOString(),
      end: info.end?.toISOString(),
      backgroundColor: '#3788d8',
      borderColor: '#3788d8',
      textColor: '#ffffff',
      extendedProps: {
        type: 'manual',
        description: '',
        source: 'internal'
      }
    };
    
    setSelectedEvent(newEvent);
    setShowEventModal(true);
  };

  const handleEventDrop = async (info: any) => {
    try {
      // Update event in your service
      const eventId = info.event.id;
      const newStart = info.event.start;
      const newEnd = info.event.end;
      
      console.log('Event moved:', eventId, newStart, newEnd);
    } catch (error) {
      console.error('Error moving event:', error);
      info.revert(); // Revert the move if it failed
    }
  };

  const handleExternalDrop = (info: any) => {
    try {
      const draggedData = info.draggedEl.dataset;
      let eventData: FullCalendarEvent;

      if (draggedData.type === 'sop') {
        eventData = {
          id: `sop-${Date.now()}`,
          title: draggedData.title || 'SOP Event',
          start: info.date.toISOString(),
          end: new Date(info.date.getTime() + (parseInt(draggedData.duration || '30') * 60000)).toISOString(),
          backgroundColor: '#8b5cf6',
          borderColor: '#8b5cf6',
          textColor: '#ffffff',
          extendedProps: {
            type: 'sop',
            description: draggedData.description,
            source: 'sop-manager'
          }
        };
      } else if (draggedData.type === 'project') {
        eventData = {
          id: `project-${Date.now()}`,
          title: draggedData.title || 'Project Task',
          start: info.date.toISOString(),
          end: new Date(info.date.getTime() + (parseInt(draggedData.duration || '60') * 60000)).toISOString(),
          backgroundColor: '#06b6d4',
          borderColor: '#06b6d4',
          textColor: '#ffffff',
          extendedProps: {
            type: 'project_review',
            description: draggedData.description,
            source: 'projects'
          }
        };
      } else {
        return;
      }

      // Add to calendar
      setEvents(prev => [...prev, eventData]);
      
    } catch (error) {
      console.error('Error handling external drop:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <CalendarIcon className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Calendar</h1>
              <p className="text-gray-600">Schedule, time-block, and manage your time</p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={() => setShowSettings(true)}
              className="flex items-center space-x-2 px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              <Cog6ToothIcon className="w-4 h-4" />
              <span>Settings</span>
            </button>
            
            <button
              onClick={() => handleDateSelect({ 
                start: new Date(), 
                end: new Date(Date.now() + 60 * 60 * 1000) 
              })}
              className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <PlusIcon className="w-5 h-5" />
              <span>New Event</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Calendar Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Calendar - Main Content (3 columns) */}
        <div className="lg:col-span-3">
          <div className="bg-white rounded-lg border border-gray-200 p-6">
            <FullCalendar
              ref={calendarRef}
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin, googleCalendarPlugin, listPlugin]}
              headerToolbar={{
                left: 'prev,next today',
                center: 'title',
                right: 'dayGridMonth,timeGridWeek,timeGridDay,listWeek'
              }}
              initialView={currentView}
              viewDidMount={(info) => setCurrentView(info.view.type)}
              height="auto"
              googleCalendarApiKey={calendarSettings.googleCalendarApiKey}
              events={events}
              editable={true}
              selectable={true}
              selectMirror={true}
              droppable={true}
              weekends={true}
              dayMaxEvents={true}
              businessHours={{
                startTime: calendarSettings.businessHours.start,
                endTime: calendarSettings.businessHours.end
              }}
              slotMinTime="06:00:00"
              slotMaxTime="23:00:00"
              slotDuration="00:15:00"
              snapDuration="00:15:00"
              allDaySlot={false}
              nowIndicator={true}
              eventClick={handleEventClick}
              select={handleDateSelect}
              eventDrop={handleEventDrop}
              eventResize={handleEventDrop}
              drop={handleExternalDrop}
              eventClassNames={(arg) => {
                const type = arg.event.extendedProps?.type;
                return [
                  'fc-event-custom',
                  type ? `fc-event-${type}` : ''
                ].filter(Boolean);
              }}
            />
          </div>
        </div>

        {/* Sidebar - Connected Apps (1 column) */}
        <div className="lg:col-span-1">
          <CalendarSidebar
            contextId={contextId}
            userId={userId}
            onNavigate={navigate}
          />
        </div>
      </div>

      {/* Event Modal */}
      {showEventModal && selectedEvent && (
        <EventModal
          event={selectedEvent}
          isOpen={showEventModal}
          onClose={() => {
            setShowEventModal(false);
            setSelectedEvent(null);
          }}
          onSave={(eventData) => {
            // Handle save
            setEvents(prev => prev.map(e => e.id === eventData.id ? eventData : e));
            setShowEventModal(false);
            setSelectedEvent(null);
          }}
          onDelete={(eventId) => {
            // Handle delete
            setEvents(prev => prev.filter(e => e.id !== eventId));
            setShowEventModal(false);
            setSelectedEvent(null);
          }}
        />
      )}

      {/* Settings Modal */}
      {showSettings && (
        <CalendarSettings
          settings={calendarSettings}
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          onSave={setCalendarSettings}
        />
      )}
    </div>
  );
};