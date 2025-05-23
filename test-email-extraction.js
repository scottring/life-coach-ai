// Test script to demonstrate enhanced email task extraction
// This shows how the AI would process your vet email example

const mockEmails = [
  {
    id: 'vet-sent-email',
    threadId: 'thread-123',
    subject: 'Re: Jax appointment scheduling',
    from: 'you@email.com',
    to: 'vet@animalclinic.com',
    body: `Hi Dr. Smith,

Thank you for reaching out about Jax's follow-up appointment. I'll have to talk to my parents who are taking care of Jax while I'm gone. I will get back to you shortly about when they can bring him in.

Best regards,
Scott`,
    timestamp: '2024-01-15T10:30:00Z',
    isFromSentFolder: true
  },
  {
    id: 'work-sent-email', 
    threadId: 'thread-456',
    subject: 'Re: Q4 Budget Review Meeting',
    from: 'you@work.com',
    to: 'manager@work.com',
    body: `Hi Sarah,

I'll review the Q4 numbers tonight and send you my analysis by tomorrow morning. I also need to schedule a follow-up meeting with the finance team to discuss the variances we found.

Let me know if you need anything else before our presentation on Friday.

Thanks,
Scott`,
    timestamp: '2024-01-15T14:20:00Z',
    isFromSentFolder: true
  },
  {
    id: 'received-email',
    threadId: 'thread-789', 
    subject: 'Can you help with the client presentation?',
    from: 'colleague@work.com',
    to: 'you@work.com',
    body: `Hey Scott,

Can you help me prepare the slides for the Johnson client presentation next week? I need someone to review the financial projections and make sure our numbers are accurate.

The presentation is scheduled for Wednesday at 2 PM. Please let me know if you can assist.

Thanks!
Mike`,
    timestamp: '2024-01-15T16:45:00Z',
    isFromSentFolder: false
  }
];

// Mock AI extraction function
function mockExtractTasks(email) {
  const isFromSent = email.isFromSentFolder;
  const emailType = isFromSent ? 'SENT EMAIL' : 'RECEIVED EMAIL';
  
  console.log(`\n📧 Processing ${emailType}: "${email.subject}"`);
  console.log(`📝 Body: ${email.body.substring(0, 100)}...`);
  
  // Simulated AI extraction results
  let extractedTasks = [];
  
  if (email.id === 'vet-sent-email') {
    extractedTasks = [
      {
        title: "Talk to parents about Jax's vet appointment scheduling",
        description: "Need to discuss when they can bring Jax for his appointment while I'm away",
        priority: 4,
        dueDate: "None",
        context: "Personal",
        reasoning: "Direct commitment 'I'll have to talk to my parents' regarding pet care"
      },
      {
        title: "Call vet back about Jax's appointment",
        description: "Follow up with veterinarian after talking to parents about scheduling",
        priority: 4,
        dueDate: "None", 
        context: "Personal",
        reasoning: "Explicit promise 'I will get back to you shortly' to the vet"
      }
    ];
  } else if (email.id === 'work-sent-email') {
    extractedTasks = [
      {
        title: "Review Q4 numbers and send analysis",
        description: "Review Q4 financial numbers and send analysis to Sarah",
        priority: 5,
        dueDate: "2024-01-16",
        context: "Work", 
        reasoning: "Specific commitment 'I'll review... and send you my analysis by tomorrow morning'"
      },
      {
        title: "Schedule follow-up meeting with finance team",
        description: "Set up meeting to discuss Q4 budget variances found in analysis",
        priority: 3,
        dueDate: "None",
        context: "Work",
        reasoning: "Stated action 'I need to schedule a follow-up meeting with the finance team'"
      }
    ];
  } else if (email.id === 'received-email') {
    extractedTasks = [
      {
        title: "Review financial projections for Johnson client presentation", 
        description: "Help Mike prepare slides and verify accuracy of financial numbers for Wednesday 2 PM presentation",
        priority: 4,
        dueDate: "2024-01-24",
        context: "Work",
        reasoning: "Direct request 'Can you help me prepare the slides' with specific deadline"
      }
    ];
  }
  
  console.log(`✅ Extracted ${extractedTasks.length} tasks:`);
  extractedTasks.forEach((task, index) => {
    console.log(`   ${index + 1}. "${task.title}" (${task.context}, Priority ${task.priority})`);
    console.log(`      💭 ${task.reasoning}`);
  });
  
  return extractedTasks;
}

// Test the extraction
console.log('🧪 Testing Enhanced Email Task Extraction\n');
console.log('=' .repeat(60));

const allTasks = [];
mockEmails.forEach(email => {
  const tasks = mockExtractTasks(email);
  allTasks.push(...tasks);
});

console.log(`\n📊 SUMMARY: Extracted ${allTasks.length} total tasks`);
console.log('🔸 Personal tasks:', allTasks.filter(t => t.context === 'Personal').length);
console.log('🔸 Work tasks:', allTasks.filter(t => t.context === 'Work').length);
console.log('🔸 High priority (4-5):', allTasks.filter(t => t.priority >= 4).length);
console.log('🔸 Tasks with deadlines:', allTasks.filter(t => t.dueDate !== 'None').length);

console.log('\n🎉 Enhanced email processing demonstrates:');
console.log('✅ Extracts commitments from SENT emails (your promises)');
console.log('✅ Extracts requests from RECEIVED emails');  
console.log('✅ Understands context clues (family pets → Personal)');
console.log('✅ Identifies implicit deadlines and priorities');
console.log('✅ Provides reasoning for each extracted task');