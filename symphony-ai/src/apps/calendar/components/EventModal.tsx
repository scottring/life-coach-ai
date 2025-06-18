import React, { useState, useEffect } from 'react';
import { XMarkIcon, TrashIcon } from '@heroicons/react/24/outline';
import { CalendarEvent as SharedCalendarEvent } from '../../../shared/types/calendar';

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

interface EventModalProps {
  event: FullCalendarEvent;
  isOpen: boolean;
  onClose: () => void;
  onSave: (event: FullCalendarEvent) => void;
  onDelete: (eventId: string) => void;
}

const eventTypeColors = {
  sop: { bg: '#8b5cf6', name: 'SOP' },
  project_review: { bg: '#06b6d4', name: 'Project' },
  'calendar-sync': { bg: '#10b981', name: 'Calendar' },
  meal: { bg: '#f59e0b', name: 'Meal' },
  manual: { bg: '#3788d8', name: 'Event' },
  task: { bg: '#ef4444', name: 'Task' },
  goal_task: { bg: '#f97316', name: 'Goal Task' },
  recurring_task: { bg: '#84cc16', name: 'Recurring Task' },
  goal_review: { bg: '#6366f1', name: 'Goal Review' },
  milestone: { bg: '#ec4899', name: 'Milestone' },
  todoist_task: { bg: '#dc2626', name: 'Todoist Task' }
};

export const EventModal: React.FC<EventModalProps> = ({
  event,
  isOpen,
  onClose,
  onSave,
  onDelete
}) => {
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.extendedProps?.description || '');
  const [startDate, setStartDate] = useState(event.start.split('T')[0]);
  const [startTime, setStartTime] = useState(event.start.split('T')[1]?.slice(0, 5) || '09:00');
  const [endTime, setEndTime] = useState(
    event.end ? event.end.split('T')[1]?.slice(0, 5) : '10:00'
  );
  const [eventType, setEventType] = useState(event.extendedProps?.type || 'manual');
  const [priority, setPriority] = useState(event.extendedProps?.priority || 'medium');

  useEffect(() => {
    setTitle(event.title);
    setDescription(event.extendedProps?.description || '');
    setStartDate(event.start.split('T')[0]);
    setStartTime(event.start.split('T')[1]?.slice(0, 5) || '09:00');
    setEndTime(event.end ? event.end.split('T')[1]?.slice(0, 5) : '10:00');
    setEventType(event.extendedProps?.type || 'manual');
    setPriority(event.extendedProps?.priority || 'medium');
  }, [event]);

  const handleSave = () => {
    const updatedEvent: FullCalendarEvent = {
      ...event,
      title,
      start: `${startDate}T${startTime}`,
      end: `${startDate}T${endTime}`,
      backgroundColor: eventTypeColors[eventType as keyof typeof eventTypeColors]?.bg || '#3788d8',
      borderColor: eventTypeColors[eventType as keyof typeof eventTypeColors]?.bg || '#3788d8',
      extendedProps: {
        ...event.extendedProps,
        type: eventType as any,
        description,
        priority
      }
    };
    
    onSave(updatedEvent);
  };

  const handleDelete = () => {
    if (window.confirm('Are you sure you want to delete this event?')) {
      onDelete(event.id);
    }
  };

  if (!isOpen) return null;

  const typeColor = eventTypeColors[eventType as keyof typeof eventTypeColors];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-md mx-4">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <div 
              className="w-4 h-4 rounded-full"
              style={{ backgroundColor: typeColor?.bg || '#3788d8' }}
            />
            <h3 className="text-lg font-semibold text-gray-900">
              {event.id.startsWith('temp-') ? 'New Event' : 'Edit Event'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Event title"
            />
          </div>

          {/* Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Type
            </label>
            <select
              value={eventType}
              onChange={(e) => setEventType(e.target.value as SharedCalendarEvent['type'])}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="manual">Event</option>
              <option value="sop">SOP</option>
              <option value="project">Project</option>
              <option value="meal">Meal</option>
            </select>
          </div>

          {/* Date and Time */}
          <div className="grid grid-cols-1 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />
            </div>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={startTime}
                  onChange={(e) => setStartTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={endTime}
                  onChange={(e) => setEndTime(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Priority */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="critical">Critical</option>
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="Event description (optional)"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200">
          <div>
            {!event.id.startsWith('temp-') && (
              <button
                onClick={handleDelete}
                className="flex items-center space-x-2 px-3 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
              >
                <TrashIcon className="w-4 h-4" />
                <span>Delete</span>
              </button>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              {event.id.startsWith('temp-') ? 'Create' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};