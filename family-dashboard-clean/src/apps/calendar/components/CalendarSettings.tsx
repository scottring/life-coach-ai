import React, { useState } from 'react';
import { XMarkIcon, KeyIcon, EyeIcon, EyeSlashIcon } from '@heroicons/react/24/outline';

interface CalendarSettingsProps {
  settings: {
    googleCalendarApiKey: string;
    googleCalendarId: string;
    showGoogleEvents: boolean;
    showSOPEvents: boolean;
    showProjectEvents: boolean;
    showMealEvents: boolean;
    timeZone: string;
    weekStartsOn: number;
    businessHours: {
      start: string;
      end: string;
    };
  };
  isOpen: boolean;
  onClose: () => void;
  onSave: (settings: any) => void;
}

export const CalendarSettings: React.FC<CalendarSettingsProps> = ({
  settings,
  isOpen,
  onClose,
  onSave
}) => {
  const [formData, setFormData] = useState(settings);
  const [showApiKey, setShowApiKey] = useState(false);

  const handleSave = () => {
    onSave(formData);
    onClose();
  };

  const updateSetting = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }));
  };

  const updateBusinessHours = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      businessHours: { ...prev.businessHours, [key]: value }
    }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Calendar Settings</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Google Calendar Integration */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Google Calendar Integration</h4>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Google Calendar API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={formData.googleCalendarApiKey}
                    onChange={(e) => updateSetting('googleCalendarApiKey', e.target.value)}
                    className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Enter your Google Calendar API key"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showApiKey ? (
                      <EyeSlashIcon className="w-4 h-4" />
                    ) : (
                      <EyeIcon className="w-4 h-4" />
                    )}
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Get your API key from the Google Cloud Console
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Google Calendar ID
                </label>
                <input
                  type="text"
                  value={formData.googleCalendarId}
                  onChange={(e) => updateSetting('googleCalendarId', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="your-email@gmail.com"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Usually your Gmail address
                </p>
              </div>
            </div>
          </div>

          {/* Event Visibility */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Event Visibility</h4>
            <div className="space-y-3">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.showGoogleEvents}
                  onChange={(e) => updateSetting('showGoogleEvents', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Show Google Calendar events</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.showSOPEvents}
                  onChange={(e) => updateSetting('showSOPEvents', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Show SOP events</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.showProjectEvents}
                  onChange={(e) => updateSetting('showProjectEvents', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Show project events</span>
              </label>

              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.showMealEvents}
                  onChange={(e) => updateSetting('showMealEvents', e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                />
                <span className="ml-2 text-sm text-gray-700">Show meal events</span>
              </label>
            </div>
          </div>

          {/* Time Settings */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Time Settings</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Week starts on
                </label>
                <select
                  value={formData.weekStartsOn}
                  onChange={(e) => updateSetting('weekStartsOn', parseInt(e.target.value))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value={0}>Sunday</option>
                  <option value={1}>Monday</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Time Zone
                </label>
                <select
                  value={formData.timeZone}
                  onChange={(e) => updateSetting('timeZone', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="local">Local Time</option>
                  <option value="UTC">UTC</option>
                  <option value="America/New_York">Eastern Time</option>
                  <option value="America/Chicago">Central Time</option>
                  <option value="America/Denver">Mountain Time</option>
                  <option value="America/Los_Angeles">Pacific Time</option>
                </select>
              </div>
            </div>
          </div>

          {/* Business Hours */}
          <div>
            <h4 className="text-md font-medium text-gray-900 mb-4">Business Hours</h4>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Start Time
                </label>
                <input
                  type="time"
                  value={formData.businessHours.start}
                  onChange={(e) => updateBusinessHours('start', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  End Time
                </label>
                <input
                  type="time"
                  value={formData.businessHours.end}
                  onChange={(e) => updateBusinessHours('end', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Business hours are highlighted on the calendar
            </p>
          </div>

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <KeyIcon className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <h5 className="text-sm font-medium text-blue-900">Google Calendar Setup</h5>
                <div className="text-sm text-blue-700 mt-1 space-y-1">
                  <p>1. Go to Google Cloud Console → APIs & Services → Credentials</p>
                  <p>2. Create an API key and enable the Calendar API</p>
                  <p>3. Paste your API key above to sync with Google Calendar</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end space-x-3 p-6 border-t border-gray-200">
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
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};