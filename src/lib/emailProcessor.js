import { openai } from './openaiClient';
import { supabase } from './supabaseClient';

// Process emails and extract tasks
export async function processEmails(accessToken) {
  try {
    // Get emails using Gmail API
    const response = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=10&q=is:unread', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch emails: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.messages || data.messages.length === 0) {
      console.log('No new emails to process');
      return [];
    }
    
    // Process each email
    const extractedTasks = [];
    for (const message of data.messages) {
      const emailDetails = await fetchEmailDetails(accessToken, message.id);
      const tasks = await extractTasksFromEmail(emailDetails, message.id);
      
      // Save extracted tasks to Supabase
      for (const task of tasks) {
        const savedTask = await saveTask(task);
        if (savedTask) {
          extractedTasks.push(savedTask);
        }
      }
    }
    
    return extractedTasks;
  } catch (error) {
    console.error('Error processing emails:', error);
    return [];
  }
}

// Fetch details for a specific email
async function fetchEmailDetails(accessToken, messageId) {
  try {
    const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });
    
    if (!response.ok) {
      throw new Error(`Failed to fetch email details: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Extract email details
    const headers = data.payload.headers;
    const subject = headers.find(h => h.name.toLowerCase() === 'subject')?.value || 'No Subject';
    const from = headers.find(h => h.name.toLowerCase() === 'from')?.value || 'Unknown Sender';
    
    // Extract body content
    let body = '';
    if (data.payload.parts && data.payload.parts.length > 0) {
      // Search for text/plain parts first
      const textPart = data.payload.parts.find(part => part.mimeType === 'text/plain');
      if (textPart && textPart.body.data) {
        body = Buffer.from(textPart.body.data, 'base64').toString('utf-8');
      } else {
        // Fall back to text/html if text/plain is not available
        const htmlPart = data.payload.parts.find(part => part.mimeType === 'text/html');
        if (htmlPart && htmlPart.body.data) {
          const htmlBody = Buffer.from(htmlPart.body.data, 'base64').toString('utf-8');
          // Strip HTML tags for simpler processing
          body = htmlBody.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
        }
      }
    } else if (data.payload.body && data.payload.body.data) {
      // Handle single part messages
      body = Buffer.from(data.payload.body.data, 'base64').toString('utf-8');
    }
    
    return {
      id: messageId,
      subject,
      from,
      body,
      timestamp: new Date(parseInt(data.internalDate)).toISOString()
    };
  } catch (error) {
    console.error('Error fetching email details:', error);
    throw error;
  }
}

// Extract tasks from email content using OpenAI
async function extractTasksFromEmail(email, emailId) {
  try {
    const prompt = `
      Extract actionable tasks from this email:
      
      Subject: ${email.subject}
      From: ${email.from}
      Body: ${email.body.slice(0, 1500)} ${email.body.length > 1500 ? '...' : ''}
      
      For each task, provide:
      1. Task title (be specific and clear)
      2. Priority (1-5, with 5 being highest)
      3. Due date if mentioned (in YYYY-MM-DD format, or "None" if not specified)
      4. Context (Work/Personal)
      5. Brief description (optional)
      
      If no tasks are found, return an empty array.
      Return the results as a JSON array of objects.
    `;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {role: "system", content: "You extract actionable tasks from emails accurately."},
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
    
    // Add email source information to each task
    return tasks.map(task => ({
      ...task,
      emailId,
      source: 'email'
    }));
  } catch (error) {
    console.error('Error extracting tasks from email:', error);
    return [];
  }
}

// Save task to Supabase
async function saveTask(task) {
  try {
    // Get current user ID
    const user = supabase.auth.user();
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    // Format task data for database
    const taskData = {
      user_id: user.id,
      title: task.title,
      description: task.description || '',
      deadline: task.dueDate && task.dueDate !== 'None' ? task.dueDate : null,
      context: task.context || 'Work',
      priority: task.priority || 3,
      status: 'pending',
      source: 'email',
      source_id: task.emailId || null,
      created_at: new Date(),
      updated_at: new Date()
    };
    
    const { data, error } = await supabase
      .from('tasks')
      .insert([taskData])
      .select();
      
    if (error) {
      throw error;
    }
    
    return data[0];
  } catch (error) {
    console.error('Error saving task:', error);
    return null;
  }
}