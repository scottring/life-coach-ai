import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuthState } from './useAuthState';
import { fetchUpcomingEvents, extractTasksFromEvents, saveCalendarTasks } from '../lib/calendarProcessor';

export function useCalendarIntegration() {
  const { user } = useAuthState();
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [lastSync, setLastSync] = useState(null);
  const [error, setError] = useState(null);
  
  // Fetch calendar events
  const fetchEvents = async (days = 7) => {
    if (!user?.id) return [];
    
    setLoading(true);
    setError(null);
    
    try {
      // Get access token using dynamic import to avoid SSR issues
      const { getAccessToken } = await import('../lib/googleAuth');
      const accessToken = await getAccessToken('google_calendar');
      
      if (!accessToken) {
        console.log('Calendar not connected - using mock data');
        // Use mock data for development
        const mockEvents = [
          {
            id: '1',
            title: 'Team Standup',
            description: 'Daily team standup meeting',
            location: 'Zoom',
            start: new Date(new Date().setHours(10, 0, 0, 0)).toISOString(),
            end: new Date(new Date().setHours(10, 30, 0, 0)).toISOString(),
            type: 'meeting',
            attendees: 5
          },
          {
            id: '2',
            title: 'Product Review',
            description: 'Review latest product features with stakeholders',
            location: 'Conference Room A',
            start: new Date(new Date().setHours(14, 0, 0, 0)).toISOString(),
            end: new Date(new Date().setHours(15, 0, 0, 0)).toISOString(),
            type: 'meeting',
            attendees: 8
          },
          {
            id: '3',
            title: 'Dentist Appointment',
            description: 'Regular checkup',
            location: 'Dental Clinic',
            start: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString(),
            end: new Date(new Date().setDate(new Date().getDate() + 2)).toISOString(),
            type: 'appointment',
            attendees: 0
          }
        ];
        
        setEvents(mockEvents);
        setLastSync(new Date());
        setLoading(false);
        return mockEvents;
      }
      
      // Fetch events from Google Calendar using the access token
      const calendarEvents = await fetchUpcomingEvents(accessToken, days);
      setEvents(calendarEvents);
      
      // Extract tasks from events
      const tasks = await extractTasksFromEvents(calendarEvents);
      
      // Save tasks to Supabase
      if (tasks.length > 0) {
        await saveCalendarTasks(tasks);
      }
      
      // Update last sync time
      const now = new Date();
      setLastSync(now);
      
      // Store sync info in Supabase
      await supabase
        .from('user_preferences')
        .update({ 
          last_calendar_sync: now.toISOString(),
        })
        .eq('user_id', user.id);
        
      return calendarEvents;
    } catch (err) {
      console.error('Error fetching calendar events:', err);
      setError('Failed to fetch calendar events: ' + (err.message || 'Unknown error'));
      return [];
    } finally {
      setLoading(false);
    }
  };
  
  // Auto-fetch on component mount if enabled
  useEffect(() => {
    if (!user?.id) return;
    
    const checkAutoFetch = async () => {
      try {
        const { data } = await supabase
          .from('user_preferences')
          .select('calendar_sync_enabled, last_calendar_sync')
          .eq('user_id', user.id)
          .single();
          
        if (data?.calendar_sync_enabled) {
          // Only fetch if last sync was more than 30 minutes ago
          const lastSyncTime = data?.last_calendar_sync ? new Date(data.last_calendar_sync) : null;
          const thirtyMinutesAgo = new Date(Date.now() - 30 * 60 * 1000);
          
          if (!lastSyncTime || lastSyncTime < thirtyMinutesAgo) {
            fetchEvents();
          } else {
            setLastSync(lastSyncTime);
          }
        }
      } catch (err) {
        console.error('Error checking auto-fetch settings:', err);
      }
    };
    
    // Always fetch events with mock data for development
    fetchEvents();
  }, [user?.id]);
  
  return { events, loading, lastSync, error, fetchEvents };
}