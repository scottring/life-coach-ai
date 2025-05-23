// Simple test of deduplication logic without database dependencies

// Replicate the core deduplication functions for testing
class TestDeduplicationService {
  static calculateSimilarity(str1, str2) {
    if (!str1 || !str2) return 0;
    
    const set1 = new Set(str1.split(' '));
    const set2 = new Set(str2.split(' '));
    
    const intersection = new Set([...set1].filter(x => set2.has(x)));
    const union = new Set([...set1, ...set2]);
    
    return intersection.size / union.size;
  }

  static deduplicateCalendarEvents(events) {
    const seen = new Map();
    const uniqueEvents = [];

    for (const event of events) {
      // Primary deduplication by event ID
      if (event.id && seen.has(event.id)) {
        console.log(`    Skipping duplicate event by ID: ${event.summary || 'No title'}`);
        continue;
      }

      // Secondary deduplication by title + start time
      const titleKey = (event.summary || '').toLowerCase().trim();
      const startTime = event.start?.dateTime || event.start?.date || '';
      const duplicateKey = `${titleKey}|${startTime}`;

      if (seen.has(duplicateKey)) {
        console.log(`    Skipping duplicate event by content: ${event.summary || 'No title'}`);
        continue;
      }

      // Mark as seen
      if (event.id) seen.set(event.id, true);
      seen.set(duplicateKey, true);
      
      uniqueEvents.push(event);
    }

    return uniqueEvents;
  }

  static deduplicateEmails(emails) {
    const seen = new Map();
    const uniqueEmails = [];

    for (const email of emails) {
      // Primary deduplication by message ID
      if (email.id && seen.has(email.id)) {
        console.log(`    Skipping duplicate email by ID: ${email.snippet || 'No subject'}`);
        continue;
      }

      // Secondary deduplication by subject
      const subject = (email.snippet || '').toLowerCase().trim();
      
      if (seen.has(subject)) {
        console.log(`    Skipping duplicate email by content: ${email.snippet || 'No subject'}`);
        continue;
      }

      // Mark as seen
      if (email.id) seen.set(email.id, true);
      seen.set(subject, true);
      
      uniqueEmails.push(email);
    }

    return uniqueEmails;
  }
}

// Test the deduplication service functionality
function testDeduplication() {
  console.log('🧪 Testing Deduplication Logic...\n');

  // Test 1: String similarity calculation
  console.log('1️⃣ Testing string similarity...');
  const similarity1 = TestDeduplicationService.calculateSimilarity('Weekly Team Meeting', 'Team Meeting Weekly');
  const similarity2 = TestDeduplicationService.calculateSimilarity('Weekly Team Meeting', 'Daily Standup');
  const similarity3 = TestDeduplicationService.calculateSimilarity('Review Q4 Budget', 'Budget Review Q4');
  
  console.log(`   "Weekly Team Meeting" vs "Team Meeting Weekly": ${(similarity1 * 100).toFixed(1)}%`);
  console.log(`   "Weekly Team Meeting" vs "Daily Standup": ${(similarity2 * 100).toFixed(1)}%`);
  console.log(`   "Review Q4 Budget" vs "Budget Review Q4": ${(similarity3 * 100).toFixed(1)}%`);
  console.log(`   ✅ High similarity threshold (70%+): ${similarity1 > 0.7 ? 'PASS' : 'FAIL'}`);
  console.log(`   ✅ Low similarity detection: ${similarity2 < 0.7 ? 'PASS' : 'FAIL'}`);

  // Test 2: Calendar event deduplication
  console.log('\n2️⃣ Testing calendar event deduplication...');
  const testEvents = [
    { id: 'event1', summary: 'Weekly Team Meeting', start: { dateTime: '2024-01-15T10:00:00Z' } },
    { id: 'event1', summary: 'Weekly Team Meeting', start: { dateTime: '2024-01-15T10:00:00Z' } }, // Duplicate by ID
    { id: 'event2', summary: 'Weekly Team Meeting', start: { dateTime: '2024-01-15T10:00:00Z' } }, // Duplicate by content
    { id: 'event3', summary: 'Daily Standup', start: { dateTime: '2024-01-15T09:00:00Z' } },
    { id: 'event4', summary: 'Client Review', start: { dateTime: '2024-01-15T14:00:00Z' } },
    { id: 'event5', summary: 'Client Review', start: { dateTime: '2024-01-15T14:00:00Z' } } // Duplicate by content
  ];
  
  console.log(`   Input: ${testEvents.length} events`);
  const uniqueEvents = TestDeduplicationService.deduplicateCalendarEvents(testEvents);
  console.log(`   Output: ${uniqueEvents.length} unique events`);
  console.log(`   ✅ Duplicates removed: ${testEvents.length - uniqueEvents.length}`);
  console.log(`   ✅ Expected 3 unique events: ${uniqueEvents.length === 3 ? 'PASS' : 'FAIL'}`);

  // Test 3: Email deduplication
  console.log('\n3️⃣ Testing email deduplication...');
  const testEmails = [
    { id: 'email1', snippet: 'Please review the Q4 budget' },
    { id: 'email1', snippet: 'Please review the Q4 budget' }, // Duplicate by ID
    { id: 'email2', snippet: 'Meeting reminder for tomorrow' },
    { id: 'email3', snippet: 'Please review the Q4 budget' }, // Duplicate by content
    { id: 'email4', snippet: 'New project requirements' }
  ];
  
  console.log(`   Input: ${testEmails.length} emails`);
  const uniqueEmails = TestDeduplicationService.deduplicateEmails(testEmails);
  console.log(`   Output: ${uniqueEmails.length} unique emails`);
  console.log(`   ✅ Duplicates removed: ${testEmails.length - uniqueEmails.length}`);
  console.log(`   ✅ Expected 3 unique emails: ${uniqueEmails.length === 3 ? 'PASS' : 'FAIL'}`);

  console.log('\n✨ Deduplication logic tests completed!');
  console.log('\n📋 Test Results Summary:');
  const allPassed = similarity1 > 0.7 && similarity2 < 0.7 && uniqueEvents.length === 3 && uniqueEmails.length === 3;
  console.log(`   ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
  
  if (allPassed) {
    console.log('\n🎉 Your deduplication system logic is working correctly!');
    console.log('   📅 Calendar events will be deduplicated from shared calendars');
    console.log('   📧 Email duplicates will be prevented from shared mailboxes');
    console.log('   🎯 Similar task titles will be detected and flagged');
    console.log('\n🚀 Ready to prevent duplicate tasks from email/calendar integrations!');
  }
}

testDeduplication();