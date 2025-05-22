import { openai } from './openaiClient';
import { supabase } from './supabaseClient';

// Prioritize tasks using OpenAI
export async function prioritizeTasks(tasks, userContext) {
  if (!tasks || tasks.length === 0) return [];
  
  try {
    const prompt = `
      Given the following tasks and user context, prioritize them from highest to lowest importance:
      
      User Context:
      - Current time: ${new Date().toLocaleTimeString()}
      - Day of week: ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}
      - Current focus: ${userContext.current_focus || 'Not specified'}
      - Energy level: ${userContext.energy_level || 'Medium'}
      - Available time: ${userContext.available_time || 60} minutes
      
      Tasks:
      ${tasks.map((t, i) => `${i+1}. ${t.title} (ID: ${t.id}, Due: ${t.deadline ? new Date(t.deadline).toLocaleDateString() : 'No deadline'}, Context: ${t.context}, Current Priority: ${t.priority})`).join('\n')}
      
      For each task, provide:
      1. Task ID (from the list above)
      2. New priority (1-5, with 5 being highest)
      3. Brief reason for this priority (1-2 sentences)
      4. Suggested time block for completion (e.g., "Morning", "Afternoon", "Next available 30 min block")
      
      Consider these factors for prioritization:
      - Urgency (deadline proximity)
      - Importance (alignment with user goals)
      - Context match (matching current user focus)
      - Energy level required vs. user's current energy
      - Time required vs. available time
      
      Return as a JSON array of objects.
    `;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {role: "system", content: "You are an expert productivity assistant that prioritizes tasks optimally."},
        {role: "user", content: prompt}
      ]
    });
    
    const content = completion.choices[0].message.content;
    let prioritizedTasks = [];
    
    try {
      prioritizedTasks = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse OpenAI response as JSON:', e);
      // Attempt to extract JSON from the text response
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          prioritizedTasks = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          console.error('Failed to extract JSON from response:', e2);
        }
      }
    }
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    const updatedTasks = [];
    
    for (const task of prioritizedTasks) {
      const { data, error } = await supabase
        .from('tasks')
        .update({ 
          priority: task.priority,
          scheduling_note: task.timeBlock,
          priority_reason: task.reason,
          updated_at: new Date()
        })
        .eq('id', task.taskId)
        .eq('user_id', user.id)
        .select();
        
      if (error) {
        console.error('Error updating task priority:', error);
      } else if (data && data.length > 0) {
        updatedTasks.push(data[0]);
      }
    }
    
    return updatedTasks;
  } catch (error) {
    console.error('Error prioritizing tasks:', error);
    return [];
  }
}

// Generate daily briefing based on tasks and events
export async function generateDailyBriefing(tasks, events, userContext) {
  try {
    const prompt = `
      Generate a personalized daily briefing for the user based on their tasks, events, and context.
      
      User Context:
      - Current time: ${new Date().toLocaleTimeString()}
      - Day of week: ${new Date().toLocaleDateString('en-US', { weekday: 'long' })}
      - Current focus: ${userContext.current_focus || 'Not specified'}
      - Energy level: ${userContext.energy_level || 'Medium'}
      - Available time: ${userContext.available_time || 60} minutes
      
      Today's Tasks (Top 5 by Priority):
      ${tasks.slice(0, 5).map((t, i) => `${i+1}. ${t.title} (Priority: ${t.priority}, Due: ${t.deadline ? new Date(t.deadline).toLocaleDateString() : 'No deadline'}, Context: ${t.context})`).join('\n')}
      
      Today's Events:
      ${events.map((e, i) => `${i+1}. ${e.title} (${new Date(e.start).toLocaleTimeString()} - ${new Date(e.end).toLocaleTimeString()}, Type: ${e.type})`).join('\n')}
      
      Generate a concise but helpful briefing with these sections:
      1. Summary - Overall assessment of the day (1-2 sentences)
      2. Focus Areas - 2-4 priority items to focus on today
      3. Insights - Helpful observation or suggestion based on tasks and schedule
      
      Return as a JSON object with summary, focusAreas (array), and insights fields.
    `;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {role: "system", content: "You are an insightful productivity coach providing valuable daily briefings."},
        {role: "user", content: prompt}
      ]
    });
    
    const content = completion.choices[0].message.content;
    let briefing = {};
    
    try {
      briefing = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse OpenAI response as JSON:', e);
      // Attempt to extract JSON from the text response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          briefing = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          console.error('Failed to extract JSON from response:', e2);
          // Create a fallback briefing
          briefing = {
            summary: "Here's your schedule for today.",
            focusAreas: tasks.slice(0, 3).map(t => t.title),
            insights: "Prioritize your highest impact tasks first."
          };
        }
      }
    }
    
    return briefing;
  } catch (error) {
    console.error('Error generating daily briefing:', error);
    // Return a fallback briefing
    return {
      summary: "Here's your schedule for today.",
      focusAreas: tasks.slice(0, 3).map(t => t.title),
      insights: "Prioritize your highest impact tasks first."
    };
  }
}