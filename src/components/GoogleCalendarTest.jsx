import React, { useState, useEffect } from 'react';

function GoogleCalendarTest() {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [authModule, setAuthModule] = useState(null);
  const [processorModule, setProcessorModule] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Dynamically import the modules to avoid SSR issues
    const loadModules = async () => {
      try {
        const [authMod, processorMod] = await Promise.all([
          import('../lib/googleAuth'),
          import('../lib/calendarProcessor')
        ]);
        setAuthModule(authMod);
        setProcessorModule(processorMod);
      } catch (err) {
        console.error('Error loading modules:', err);
        setError('Failed to load Google Calendar modules');
      }
    };

    loadModules();
  }, []);

  const handleConnect = async () => {
    if (!authModule) {
      setError('Google Auth module not loaded');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await authModule.startGoogleCalendarAuth();
      setConnected(true);
      alert('Google Calendar connected successfully!');
    } catch (err) {
      console.error('Error connecting to Google Calendar:', err);
      setError('Failed to connect to Google Calendar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFetchEvents = async () => {
    if (!authModule || !processorModule) {
      setError('Modules not loaded');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const accessToken = await authModule.getAccessToken('google_calendar');
      
      if (!accessToken) {
        setError('Please connect to Google Calendar first');
        return;
      }

      const calendarEvents = await processorModule.fetchUpcomingEvents(accessToken, 7);
      setEvents(calendarEvents);
      console.log('Fetched events:', calendarEvents);
    } catch (err) {
      console.error('Error fetching events:', err);
      setError('Failed to fetch calendar events: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = async () => {
    if (!authModule) {
      setError('Google Auth module not loaded');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      await authModule.disconnectGoogleService('google_calendar');
      setConnected(false);
      setEvents([]);
      alert('Google Calendar disconnected successfully!');
    } catch (err) {
      console.error('Error disconnecting:', err);
      setError('Failed to disconnect from Google Calendar: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!authModule || !processorModule) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <h2 className="mb-4 text-lg font-medium text-gray-800">Google Calendar Test</h2>
        <div className="text-center text-gray-500">Loading Google Calendar modules...</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
      <h2 className="mb-4 text-lg font-medium text-gray-800">Google Calendar Test</h2>
      
      {error && (
        <div className="mb-4 rounded-md bg-red-50 p-4">
          <div className="text-sm text-red-800">{error}</div>
        </div>
      )}
      
      <div className="space-y-4">
        <div className="flex space-x-2">
          <button
            onClick={handleConnect}
            disabled={loading || connected}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Connecting...' : 'Connect Google Calendar'}
          </button>
          
          <button
            onClick={handleFetchEvents}
            disabled={loading || !connected}
            className="rounded-md bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Fetching...' : 'Fetch Events'}
          </button>
          
          <button
            onClick={handleDisconnect}
            disabled={loading || !connected}
            className="rounded-md bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 disabled:opacity-50"
          >
            {loading ? 'Disconnecting...' : 'Disconnect'}
          </button>
        </div>

        {events.length > 0 && (
          <div>
            <h3 className="mb-2 text-md font-medium text-gray-800">Fetched Events ({events.length})</h3>
            <div className="space-y-2">
              {events.map((event, index) => (
                <div key={index} className="rounded-md border border-gray-200 p-3">
                  <div className="font-medium">{event.title}</div>
                  <div className="text-sm text-gray-600">
                    {new Date(event.start).toLocaleString()} - {new Date(event.end).toLocaleString()}
                  </div>
                  {event.description && (
                    <div className="text-sm text-gray-500">{event.description}</div>
                  )}
                  {event.location && (
                    <div className="text-sm text-gray-500">📍 {event.location}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default GoogleCalendarTest;