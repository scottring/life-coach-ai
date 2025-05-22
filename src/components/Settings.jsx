import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuthState } from '../hooks/useAuthState';

function Settings() {
  const { user } = useAuthState();
  const [preferences, setPreferences] = useState({
    email_sync_enabled: true,
    calendar_sync_enabled: true,
    notion_sync_enabled: false,
    notification_preferences: {
      morning_briefing: true,
      task_reminders: true
    },
    ui_preferences: {
      theme: 'light',
      compact_view: false
    }
  });
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  
  useEffect(() => {
    if (!user?.id) return;
    
    const fetchPreferences = async () => {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('*')
        .eq('user_id', user.id)
        .single();
        
      if (!error && data) {
        setPreferences(data);
      }
      
      setLoading(false);
    };
    
    fetchPreferences();
  }, [user?.id]);
  
  const handleToggleChange = (field) => {
    setPreferences(prev => ({
      ...prev,
      [field]: !prev[field]
    }));
  };
  
  const handleNotificationToggle = (field) => {
    setPreferences(prev => ({
      ...prev,
      notification_preferences: {
        ...prev.notification_preferences,
        [field]: !prev.notification_preferences[field]
      }
    }));
  };
  
  const handleUIToggle = (field) => {
    setPreferences(prev => ({
      ...prev,
      ui_preferences: {
        ...prev.ui_preferences,
        [field]: !prev.ui_preferences[field]
      }
    }));
  };
  
  const handleThemeChange = (theme) => {
    setPreferences(prev => ({
      ...prev,
      ui_preferences: {
        ...prev.ui_preferences,
        theme
      }
    }));
  };
  
  const handleSavePreferences = async () => {
    if (!user?.id) return;
    
    setSaving(true);
    
    const { error } = await supabase
      .from('user_preferences')
      .upsert([
        {
          user_id: user.id,
          ...preferences,
          updated_at: new Date()
        }
      ]);
      
    if (!error) {
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } else {
      console.error('Error saving preferences:', error);
    }
    
    setSaving(false);
  };
  
  if (loading) {
    return <div className="p-8 text-center text-gray-500">Loading your preferences...</div>;
  }
  
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      
      <div className="mt-8 space-y-8">
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-gray-800">Integrations</h2>
          
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-700">Gmail Integration</h3>
                <p className="text-sm text-gray-500">Extract tasks from emails automatically</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input 
                  type="checkbox" 
                  className="peer sr-only" 
                  checked={preferences.email_sync_enabled}
                  onChange={() => handleToggleChange('email_sync_enabled')}
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-700">Google Calendar Integration</h3>
                <p className="text-sm text-gray-500">Sync schedule and time blocks</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input 
                  type="checkbox" 
                  className="peer sr-only" 
                  checked={preferences.calendar_sync_enabled}
                  onChange={() => handleToggleChange('calendar_sync_enabled')}
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-700">Notion Integration</h3>
                <p className="text-sm text-gray-500">Sync with Notion pages and databases</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input 
                  type="checkbox" 
                  className="peer sr-only" 
                  checked={preferences.notion_sync_enabled}
                  onChange={() => handleToggleChange('notion_sync_enabled')}
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
              </label>
            </div>
          </div>
        </div>
        
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-gray-800">Notifications</h2>
          
          <div className="mt-4 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-700">Morning Briefing</h3>
                <p className="text-sm text-gray-500">Daily summary of tasks and schedule</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input 
                  type="checkbox" 
                  className="peer sr-only" 
                  checked={preferences.notification_preferences.morning_briefing}
                  onChange={() => handleNotificationToggle('morning_briefing')}
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
              </label>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-700">Task Reminders</h3>
                <p className="text-sm text-gray-500">Reminders for upcoming and due tasks</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input 
                  type="checkbox" 
                  className="peer sr-only" 
                  checked={preferences.notification_preferences.task_reminders}
                  onChange={() => handleNotificationToggle('task_reminders')}
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
              </label>
            </div>
          </div>
        </div>
        
        <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-medium text-gray-800">Interface Preferences</h2>
          
          <div className="mt-4 space-y-4">
            <div>
              <h3 className="font-medium text-gray-700">Theme</h3>
              <div className="mt-2 flex space-x-4">
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="theme" 
                    value="light" 
                    checked={preferences.ui_preferences.theme === 'light'}
                    onChange={() => handleThemeChange('light')}
                    className="mr-2 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Light
                </label>
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="theme" 
                    value="dark" 
                    checked={preferences.ui_preferences.theme === 'dark'}
                    onChange={() => handleThemeChange('dark')}
                    className="mr-2 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  Dark
                </label>
                <label className="flex items-center">
                  <input 
                    type="radio" 
                    name="theme" 
                    value="system" 
                    checked={preferences.ui_preferences.theme === 'system'}
                    onChange={() => handleThemeChange('system')}
                    className="mr-2 h-4 w-4 border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  System
                </label>
              </div>
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-gray-700">Compact View</h3>
                <p className="text-sm text-gray-500">Display more items on screen with compact layout</p>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input 
                  type="checkbox" 
                  className="peer sr-only" 
                  checked={preferences.ui_preferences.compact_view}
                  onChange={() => handleUIToggle('compact_view')}
                />
                <div className="peer h-6 w-11 rounded-full bg-gray-200 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:border after:border-gray-300 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-600 peer-checked:after:translate-x-full peer-checked:after:border-white peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300"></div>
              </label>
            </div>
          </div>
        </div>
        
        <div className="flex justify-end">
          <button
            onClick={handleSavePreferences}
            disabled={saving}
            className="inline-flex items-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300"
          >
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
          
          {saveSuccess && (
            <div className="ml-4 rounded-md bg-green-50 p-2 text-sm text-green-700">
              Settings saved successfully!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Settings;