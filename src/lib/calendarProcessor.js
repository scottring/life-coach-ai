import { openai } from './openaiClient';
import { supabase } from './supabaseClient';

// Fetch upcoming events from Google Calendar
export async function fetchUpcomingEvents(accessToken, days = 7) {
  try {
    // Calculate time range
    const now = new Date();
    const end = new Date();
    end.setDate(now.getDate() + days);
    
    // Format times for Google Calendar API
    const timeMin = now.toISOString();
    const timeMax = end.toISOString();
    
    // Fetch events from Google Calendar API
    const response = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${timeMin}&timeMax=${timeMax}&singleEvents=true&orderBy=startTime`, 
      {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      }
    );
    
    if (!response.ok) {
      throw new Error(`Failed to fetch calendar events: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.items || data.items.length === 0) {
      console.log('No upcoming events found');
      return [];
    }
    
    // Process events
    const events = data.items.map(event => ({
      id: event.id,
      title: event.summary || 'Untitled Event',
      description: event.description || '',
      location: event.location || '',
      start: event.start.dateTime || event.start.date,
      end: event.end.dateTime || event.end.date,
      type: determineEventType(event),
      attendees: event.attendees?.length || 0
    }));
    
    return events;
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
      
      For each task, provide:
      1. Task title (be specific and clear)
      2. Priority (1-5, with 5 being highest)
      3. Due date (in YYYY-MM-DD format, typically before the associated event)
      4. Context (Work/Personal)
      5. Brief description (optional)
      6. Related event ID
      
      If no tasks are needed for an event, don't include it.
      Return the results as a JSON array of objects.
    `;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {role: "system", content: "You extract preparation tasks from calendar events."},
        {role: "user", content: prompt}
      ]
    });
    
    const content = completion.choices[0].message.content;
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
        }
      }
    }
    
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
      // Format task data for database
      const taskData = {
        user_id: user.id,
        title: task.title,
        description: task.description || '',
        deadline: task.dueDate || null,
        context: task.context || 'Work',
        priority: task.priority || 3,
        status: 'pending',
        source: 'calendar',
        source_id: task.relatedEventId || null,
        created_at: new Date(),
        updated_at: new Date()
      };
      
      const { data, error } = await supabase
        .from('tasks')
        .insert([taskData])
        .select();
        
      if (error) {
        console.error('Error saving calendar task:', error);
      } else if (data) {
        savedTasks.push(data[0]);
      }
    }
    
    return savedTasks;
  } catch (error) {
    console.error('Error saving calendar tasks:', error);
    return [];
  }
}