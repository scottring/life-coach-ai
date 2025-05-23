import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

function EventDetail({ event, onClose, onUpdate }) {
  const [isEditing, setIsEditing] = useState(false);
  const [eventData, setEventData] = useState({
    event_type: event.event_type || '',
    preparation_time: event.preparation_time || 15,
    importance_score: event.importance_score || 3,
    notes: event.notes || ''
  });
  const [saving, setSaving] = useState(false);

  const eventTypes = [
    { value: 'meeting', label: '💼 Meeting' },
    { value: 'flight', label: '✈️ Flight' },
    { value: 'medical', label: '🏥 Medical' },
    { value: 'social', label: '🍽️ Social' },
    { value: 'interview', label: '🎯 Interview' },
    { value: 'presentation', label: '📊 Presentation' },
    { value: 'personal', label: '👤 Personal' },
    { value: 'family', label: '👨‍👩‍👧‍👦 Family' },
    { value: 'travel', label: '🚗 Travel' },
    { value: 'other', label: '📌 Other' }
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      // Update the event with new metadata
      const { error } = await supabase
        .from('calendar_events')
        .update({
          ...eventData,
          updated_at: new Date().toISOString()
        })
        .eq('id', event.id);

      if (error) throw error;


      // Notify parent component
      onUpdate({ ...event, ...eventData });
      setIsEditing(false);
    } catch (error) {
      console.error('Error saving event:', error);
      alert('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };


  const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-2xl rounded-lg bg-white shadow-xl">
        {/* Header */}
        <div className="border-b border-gray-200 p-6">
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-2xl font-bold text-gray-900">{event.title}</h2>
              <p className="mt-1 text-sm text-gray-600">
                {formatDateTime(event.start_time)} - {formatDateTime(event.end_time)}
              </p>
              {event.location && (
                <p className="mt-1 text-sm text-gray-600">📍 {event.location}</p>
              )}
            </div>
            <button
              onClick={onClose}
              className="rounded-md p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {event.description && (
            <div className="mb-6">
              <h3 className="mb-2 text-sm font-medium text-gray-700">Description</h3>
              <p className="text-gray-600">{event.description}</p>
            </div>
          )}

          {/* Metadata Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">Event Details</h3>
              {!isEditing && (
                <button
                  onClick={() => setIsEditing(true)}
                  className="text-sm text-blue-600 hover:text-blue-700"
                >
                  Edit Details
                </button>
              )}
            </div>

            {isEditing ? (
              <div className="space-y-4">
                {/* Event Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Event Type</label>
                  <select
                    value={eventData.event_type}
                    onChange={(e) => setEventData({ ...eventData, event_type: e.target.value })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">Select type...</option>
                    {eventTypes.map(type => (
                      <option key={type.value} value={type.value}>
                        {type.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Importance */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Importance</label>
                  <div className="mt-1 flex gap-2">
                    {[1, 2, 3, 4, 5].map(score => (
                      <button
                        key={score}
                        onClick={() => setEventData({ ...eventData, importance_score: score })}
                        className={`h-10 w-10 rounded-md border ${
                          eventData.importance_score === score
                            ? 'border-blue-500 bg-blue-50 text-blue-600'
                            : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {score}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Preparation Time */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">
                    Preparation Time (minutes)
                  </label>
                  <input
                    type="number"
                    value={eventData.preparation_time}
                    onChange={(e) => setEventData({ ...eventData, preparation_time: parseInt(e.target.value) || 0 })}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                  />
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700">Notes</label>
                  <textarea
                    value={eventData.notes}
                    onChange={(e) => setEventData({ ...eventData, notes: e.target.value })}
                    rows={3}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2"
                    placeholder="Add any additional notes..."
                  />
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-4">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-50"
                  >
                    {saving ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button
                    onClick={() => setIsEditing(false)}
                    className="flex-1 rounded-md border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Type</span>
                  <span className="text-sm font-medium">
                    {eventTypes.find(t => t.value === eventData.event_type)?.label || 'Not set'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Importance</span>
                  <span className="text-sm font-medium">{'⭐'.repeat(eventData.importance_score)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-sm text-gray-600">Preparation Time</span>
                  <span className="text-sm font-medium">{eventData.preparation_time} minutes</span>
                </div>
                {eventData.travel_time > 0 && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Travel Time</span>
                    <span className="text-sm font-medium">{eventData.travel_time} minutes</span>
                  </div>
                )}
                {eventData.client_name && (
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Client/Project</span>
                    <span className="text-sm font-medium">{eventData.client_name}</span>
                  </div>
                )}
                {eventData.notes && (
                  <div>
                    <span className="text-sm text-gray-600">Notes</span>
                    <p className="mt-1 text-sm">{eventData.notes}</p>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}

export default EventDetail;