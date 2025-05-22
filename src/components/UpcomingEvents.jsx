import React from 'react';
import { format } from 'date-fns';

function UpcomingEvents({ events = [] }) {
  if (events.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
        <p className="text-center text-gray-500">No upcoming events</p>
      </div>
    );
  }
  
  return (
    <div className="space-y-3">
      {events.map((event, index) => (
        <div key={index} className="rounded-lg border border-gray-200 bg-white p-3 shadow-sm">
          <div className="flex items-start space-x-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100 text-blue-800">
              <span role="img" aria-label="calendar" className="text-lg">
                {event.type === 'meeting' ? '👥' : '📅'}
              </span>
            </div>
            
            <div>
              <h3 className="font-medium text-gray-800">{event.title}</h3>
              <p className="text-sm text-gray-500">
                {formatEventTime(event.start, event.end)}
              </p>
              {event.location && (
                <p className="mt-1 text-xs text-gray-500">
                  {event.location}
                </p>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

// Helper function to format event time
function formatEventTime(start, end) {
  const startDate = new Date(start);
  const endDate = new Date(end);
  
  const isToday = new Date().toDateString() === startDate.toDateString();
  
  return isToday
    ? `Today, ${format(startDate, 'h:mm a')} - ${format(endDate, 'h:mm a')}`
    : `${format(startDate, 'MMM d, h:mm a')} - ${format(endDate, 'h:mm a')}`;
}

export default UpcomingEvents;