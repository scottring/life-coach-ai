import { openai } from './openaiClient';
import { supabase } from './supabaseClient';

// Fetch all available calendars for the user
export async function fetchUserCalendars(accessToken) {
  try {
    const response = await fetch(
      'https://www.googleapis.com/calendar/v3/users/me/calendarList',
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch calendars: ${response.status}`);
    }
    
    const data = await response.json();
    
    return data.items?.map(calendar => ({
      id: calendar.id,
      summary: calendar.summary,
      description: calendar.description || '',
      primary: calendar.primary || false,
      accessRole: calendar.accessRole,
      backgroundColor: calendar.backgroundColor,
      foregroundColor: calendar.foregroundColor,
      selected: calendar.selected !== false, // Default to true unless explicitly false
      hidden: calendar.hidden || false
    })) || [];
  } catch (error) {
    console.error('Error fetching calendars:', error);
    return [];
  }
}

// Fetch upcoming events from Google Calendar
export async function fetchUpcomingEvents(accessToken, days = 7, calendarIds = null) {
  try {
    // Calculate time range
    const now = new Date();
    const end = new Date();
    end.setDate(now.getDate() + days);
    
    // Format times for Google Calendar API
    const timeMin = now.toISOString();
    const timeMax = end.toISOString();
    
    let calendarsToFetch = calendarIds;
    
    // If no specific calendars provided, fetch all available calendars
    if (!calendarsToFetch) {
      console.log('No specific calendars provided, fetching all available calendars...');
      const userCalendars = await fetchUserCalendars(accessToken);
      calendarsToFetch = userCalendars
        .filter(cal => !cal.hidden && cal.accessRole !== 'freeBusyReader')
        .map(cal => cal.id);
      console.log(`Found ${calendarsToFetch.length} calendars to sync:`, userCalendars.map(c => c.summary));
    }
    
    const allEvents = [];
    
    // Fetch events from each calendar
    for (const calendarId of calendarsToFetch) {
      try {
        console.log(`Fetching events from calendar: ${calendarId}`);
        const response = await fetch(
          `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendarId)}/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`, 
          {
            headers: {
              'Authorization': `Bearer ${accessToken}`,
            },
          }
        );
        
        if (!response.ok) {
          console.warn(`Failed to fetch events from calendar ${calendarId}: ${response.status}`);
          continue;
        }
        
        const data = await response.json();
        
        if (data.items && data.items.length > 0) {
          console.log(`Found ${data.items.length} events in calendar ${calendarId}`);
          // Process events and add calendar info
          const events = data.items.map(event => ({
            id: event.id,
            calendarId: calendarId,
            title: event.summary || 'Untitled Event',
            description: event.description || '',
            location: event.location || '',
            start: event.start.dateTime || event.start.date,
            end: event.end.dateTime || event.end.date,
            type: determineEventType(event),
            attendees: event.attendees?.length || 0,
            status: event.status || 'confirmed'
          }));
          
          allEvents.push(...events);
        }
      } catch (calError) {
        console.error(`Error fetching events from calendar ${calendarId}:`, calError);
        continue;
      }
    }
    
    // Sort all events by start time
    allEvents.sort((a, b) => new Date(a.start) - new Date(b.start));
    
    console.log(`Total events fetched from all calendars: ${allEvents.length}`);
    return allEvents;
  } catch (error) {
    console.error('Error fetching calendar events:', error);
    return [];
  }
}

// Determine the type of event (meeting, appointment, etc.)
function determineEventType(event) {
  if (event.attendees && event.attendees.length > 1) {
    return 'meeting';
  }
  
  const summary = (event.summary || '').toLowerCase();
  if (summary.includes('appointment') || summary.includes('doctor') || summary.includes('dentist')) {
    return 'appointment';
  }
  
  if (summary.includes('deadline') || summary.includes('due')) {
    return 'deadline';
  }
  
  return 'event';
}

// Extract tasks from calendar events
export async function extractTasksFromEvents(events) {
  try {
    if (!events || events.length === 0) return [];
    
    const prompt = `
      Extract actionable tasks from these calendar events:
      
      ${events.map(event => `
      Event: ${event.title}
      Description: ${event.description || 'No description'}
      Date/Time: ${new Date(event.start).toLocaleString()} - ${new Date(event.end).toLocaleString()}
      Type: ${event.type}
      ${event.location ? `Location: ${event.location}` : ''}
      ${event.attendees > 0 ? `Attendees: ${event.attendees}` : ''}
      `).join('\n\n')}
      
      For each task, provide a JSON object with these exact field names:
      - "title": Task title (be specific and clear)
      - "priority": Priority number (1-5, with 5 being highest)
      - "due_date": Due date (in YYYY-MM-DD format, typically before the associated event)
      - "context": Either "Work" or "Personal"
      - "description": Brief description (optional)
      - "related_event_id": ID of the related calendar event
      
      If no tasks are needed for an event, don't include it.
      Return the results as a JSON array of objects with the exact field names above.
    `;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {role: "system", content: "You extract preparation tasks from calendar events."},
        {role: "user", content: prompt}
      ]
    });
    
    const content = completion.choices[0].message.content;
    console.log('OpenAI response for task extraction:', content);
    
    let tasks = [];
    
    try {
      tasks = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse OpenAI response as JSON:', e);
      // Attempt to extract JSON from the text response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          tasks = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          console.error('Failed to extract JSON from response:', e2);
          console.log('Raw response:', content);
          return []; // Return empty array if we can't parse
        }
      } else {
        console.log('No JSON array found in response:', content);
        return []; // Return empty array if no JSON found
      }
    }
    
    console.log('Extracted tasks from OpenAI:', tasks);
    
    // Add source information to each task
    return tasks.map(task => ({
      ...task,
      source: 'calendar'
    }));
  } catch (error) {
    console.error('Error extracting tasks from events:', error);
    return [];
  }
}

// Save calendar tasks to Supabase
export async function saveCalendarTasks(tasks) {
  try {
    if (!tasks || tasks.length === 0) return [];
    
    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    const savedTasks = [];
    
    // Process each task
    for (const task of tasks) {
      // Handle different field names from OpenAI
      const taskTitle = task.title || task.task_title || task.name;
      const taskDescription = task.description || task.task_description || '';
      const taskDueDate = task.dueDate || task.due_date || task.deadline || null;
      const taskRelatedId = task.relatedEventId || task.related_event_id || task.event_id || null;
      
      // Skip tasks without a valid title
      if (!taskTitle || typeof taskTitle !== 'string' || taskTitle.trim() === '') {
        console.warn('Skipping task with invalid title:', task);
        continue;
      }
      
      // Format task data for database
      const taskData = {
        user_id: user.id,
        title: taskTitle.trim(),
        description: taskDescription,
        deadline: taskDueDate,
        context: task.context || 'Work',
        priority: task.priority || 3,
        status: 'pending',
        source: 'calendar',
        source_id: taskRelatedId,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const { data, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select();
        
      if (error) {
        console.error('Error saving calendar task:', error, 'Task data:', taskData);
      } else if (data) {
        savedTasks.push(data[0]);
        console.log('Successfully saved calendar task:', data[0].title);
      }
    }
    
    return savedTasks;
  } catch (error) {
    console.error('Error saving calendar tasks:', error);
    return [];
  }
}