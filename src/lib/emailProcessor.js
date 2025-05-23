import { openai } from './openaiClient';
import { supabase } from './supabaseClient';
import { DeduplicationService } from './deduplicationService';

// Process emails and extract tasks
export async function processEmails(accessToken, options = {}) {
  try {
    const {
      includeRead = false,
      includeSent = true,
      maxResults = 20,
      daysBack = 7
    } = options;

    // Build Gmail search query
    let queries = [];
    
    // Get recent received emails (unread + some read)
    if (includeRead) {
      queries.push(`in:inbox newer_than:${daysBack}d`);
    } else {
      queries.push('is:unread');
    }
    
    // Get recent sent emails (this is key for task extraction!)
    if (includeSent) {
      queries.push(`in:sent newer_than:${daysBack}d`);
    }

    // Process each query and collect emails
    const allEmailDetails = [];
    
    for (const query of queries) {
      const response = await fetch(`https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=${maxResults}&q=${encodeURIComponent(query)}`, {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });
      
      if (!response.ok) {
        console.warn(`Failed to fetch emails for query "${query}": ${response.status}`);
        continue;
      }
      
      const data = await response.json();
      
      if (data.messages && data.messages.length > 0) {
        // Get full details for all messages in this query
        for (const message of data.messages) {
          try {
            const details = await fetchEmailDetails(accessToken, message.id);
            details.isFromSentFolder = query.includes('in:sent');
            allEmailDetails.push(details);
          } catch (error) {
            console.warn(`Failed to fetch email details for ${message.id}:`, error);
          }
        }
      }
    }

    if (allEmailDetails.length === 0) {
      console.log('No emails to process');
      return [];
    }
    
    // Deduplicate emails (shared mailboxes, forwards, etc.)
    const uniqueEmails = DeduplicationService.deduplicateEmails(allEmailDetails);
    console.log(`Processing ${uniqueEmails.length} unique emails (filtered from ${allEmailDetails.length} total)`);
    
    // Process each unique email
    const extractedTasks = [];
    for (const emailDetail of uniqueEmails) {
      const tasks = await extractTasksFromEmail(emailDetail, emailDetail.id);
      
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
    const to = headers.find(h => h.name.toLowerCase() === 'to')?.value || '';
    const threadId = data.threadId;
    
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
      threadId,
      subject,
      from,
      to,
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
    const isFromSent = email.isFromSentFolder;
    const emailType = isFromSent ? 'SENT EMAIL (my commitments and promises)' : 'RECEIVED EMAIL (requests from others)';
    
    const prompt = `
      You are an expert at extracting actionable tasks from emails. Pay special attention to commitments, promises, and follow-up actions.
      
      EMAIL TYPE: ${emailType}
      
      Subject: ${email.subject}
      From: ${email.from}
      To: ${email.to}
      Body: ${email.body.slice(0, 2000)} ${email.body.length > 2000 ? '...' : ''}
      
      EXTRACTION GUIDELINES:
      
      ${isFromSent ? `
      FOR SENT EMAILS - Look for MY commitments and promises:
      - "I will..." / "I'll..." / "I'm going to..."
      - "I need to..." / "I have to..." / "I should..."
      - "Let me..." / "I can..." / "I'm planning to..."
      - "I'll get back to you..." / "I'll follow up..."
      - "I'll talk to..." / "I'll check with..." / "I'll ask..."
      - "I'll send..." / "I'll call..." / "I'll schedule..."
      - Promises to provide information, make decisions, or take actions
      - Follow-up commitments and deadlines I've set for myself
      
      CONTEXT CLUES:
      - If discussing family pets, appointments → likely Personal context
      - If discussing work projects, meetings → likely Work context
      - If mentioning parents, family members → likely Family context
      - Use the email recipient and subject to infer relationships and context
      ` : `
      FOR RECEIVED EMAILS - Look for requests and actions needed:
      - Direct requests: "Can you..." / "Please..." / "Could you..."
      - Implied actions: deadlines, meeting requests, information requests
      - Follow-up requirements: "Let me know..." / "Please confirm..."
      - Scheduled items that require my participation
      `}
      
      For each task found, extract:
      {
        "title": "Clear, specific task description",
        "description": "Additional context from the email (optional but helpful)",
        "priority": 1-5 (5=urgent, 4=high, 3=medium, 2=low, 1=someday),
        "dueDate": "YYYY-MM-DD or 'None'",
        "context": "Work/Personal/Family/Learning",
        "reasoning": "Brief explanation of why this is a task"
      }
      
      PRIORITY GUIDELINES:
      - 5: Urgent commitments with deadlines
      - 4: Important promises or time-sensitive items
      - 3: Standard follow-ups and routine tasks
      - 2: Nice-to-have or longer-term items
      - 1: Vague or someday tasks
      
      EXAMPLE from your vet scenario:
      Email: "I'll have to talk to my parents who are taking care of Jax while I'm gone. I will get back to you shortly."
      
      Tasks:
      [
        {
          "title": "Talk to parents about Jax's vet appointment scheduling",
          "description": "Need to discuss when they can bring Jax for his appointment while I'm away",
          "priority": 4,
          "dueDate": "None",
          "context": "Personal",
          "reasoning": "Direct commitment 'I'll have to talk to my parents' regarding pet care"
        },
        {
          "title": "Call vet back about Jax's appointment",
          "description": "Follow up with veterinarian after talking to parents about scheduling",
          "priority": 4,
          "dueDate": "None",
          "context": "Personal", 
          "reasoning": "Explicit promise 'I will get back to you shortly' to the vet"
        }
      ]
      
      Return ONLY the JSON array. If no tasks found, return [].
    `;
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system", 
          content: "You are an expert at extracting actionable tasks from emails. You excel at identifying commitments, promises, and follow-up actions from both sent and received emails. You understand context clues and can infer appropriate task priorities and contexts."
        },
        {role: "user", content: prompt}
      ],
      temperature: 0.1 // Lower temperature for more consistent extraction
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
    const enrichedTasks = tasks.map(task => ({
      ...task,
      emailId,
      source: 'email',
      emailType: isFromSent ? 'sent' : 'received',
      emailSubject: email.subject
    }));
    
    if (enrichedTasks.length > 0) {
      console.log(`📧 Extracted ${enrichedTasks.length} tasks from ${emailType}:`, 
        enrichedTasks.map(t => `"${t.title}" (${t.context}, P${t.priority})`).join(', '));
    }
    
    return enrichedTasks;
  } catch (error) {
    console.error('Error extracting tasks from email:', error);
    return [];
  }
}

// Save task to Supabase using deduplication
async function saveTask(task) {
  try {
    // Get current user ID
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      throw new Error('No authenticated user found');
    }
    
    // Format task data for database
    const taskData = {
      title: task.title,
      description: task.description || (task.reasoning ? `[${task.emailType} email] ${task.reasoning}` : ''),
      deadline: task.dueDate && task.dueDate !== 'None' ? task.dueDate : null,
      context: task.context || 'Work',
      priority: task.priority || 3,
      status: 'pending'
    };
    
    // Use deduplication service to create task only if unique
    const savedTask = await DeduplicationService.createTaskIfUnique(
      user.id, 
      taskData, 
      'email', 
      task.emailId
    );
    
    if (savedTask) {
      console.log('Successfully saved unique email task:', savedTask.title);
      return savedTask;
    } else {
      console.log('Skipped duplicate email task:', task.title);
      return null;
    }
  } catch (error) {
    console.error('Error saving email task:', error);
    return null;
  }
}