// Simulate processing your actual Jax email to show task extraction
import { openai } from './src/lib/openaiClient.js';

const yourActualJaxEmail = {
  id: 'real-jax-email',
  threadId: 'thread-vet-123',
  subject: 'Re: Jax appointment scheduling',
  from: 'you@youremail.com',
  to: 'vet@animalclinic.com',
  body: `Hi Dr. Smith,

Thank you for reaching out about Jax's follow-up appointment. I'll have to talk to my parents who are taking care of Jax while I'm gone. I will get back to you shortly.

Best regards,
Scott`,
  timestamp: '2024-01-15T10:30:00Z',
  isFromSentFolder: true
};

async function extractTasksFromJaxEmail(email) {
  try {
    const isFromSent = email.isFromSentFolder;
    const emailType = isFromSent ? 'SENT EMAIL (my commitments and promises)' : 'RECEIVED EMAIL (requests from others)';
    
    const prompt = `
      You are an expert at extracting actionable tasks from emails. Pay special attention to commitments, promises, and follow-up actions.
      
      EMAIL TYPE: ${emailType}
      
      Subject: ${email.subject}
      From: ${email.from}
      To: ${email.to}
      Body: ${email.body}
      
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
      
      Return ONLY the JSON array. If no tasks found, return [].
    `;
    
    console.log('🤖 Sending your actual Jax email to OpenAI for task extraction...\n');
    
    const completion = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        {
          role: "system", 
          content: "You are an expert at extracting actionable tasks from emails. You excel at identifying commitments, promises, and follow-up actions from both sent and received emails. You understand context clues and can infer appropriate task priorities and contexts."
        },
        {role: "user", content: prompt}
      ],
      temperature: 0.1
    });
    
    const content = completion.choices[0].message.content;
    console.log('📝 Raw AI Response:');
    console.log(content);
    console.log('\n' + '='.repeat(60) + '\n');
    
    let tasks = [];
    try {
      tasks = JSON.parse(content);
    } catch (e) {
      console.error('Failed to parse OpenAI response as JSON:', e);
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        try {
          tasks = JSON.parse(jsonMatch[0]);
        } catch (e2) {
          console.error('Failed to extract JSON from response:', e2);
        }
      }
    }
    
    console.log(`✅ Successfully extracted ${tasks.length} tasks from your Jax email:`);
    tasks.forEach((task, index) => {
      console.log(`\n${index + 1}. "${task.title}"`);
      console.log(`   📋 Description: ${task.description}`);
      console.log(`   🎯 Context: ${task.context}`);
      console.log(`   🔥 Priority: ${task.priority}/5`);
      console.log(`   📅 Due Date: ${task.dueDate}`);
      console.log(`   💭 Reasoning: ${task.reasoning}`);
    });
    
    return tasks;
  } catch (error) {
    console.error('Error extracting tasks from email:', error);
    return [];
  }
}

// Run the extraction
console.log('🐕 Processing Your Actual Jax Email for Task Extraction\n');
console.log('Email Content:');
console.log(`Subject: ${yourActualJaxEmail.subject}`);
console.log(`Body: ${yourActualJaxEmail.body}`);
console.log('\n' + '='.repeat(60) + '\n');

extractTasksFromJaxEmail(yourActualJaxEmail);