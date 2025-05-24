import React, { useState, useEffect } from 'react';
import { format, differenceInDays, addDays } from 'date-fns';
import { 
  SparklesIcon, 
  ChatBubbleLeftRightIcon, 
  CheckCircleIcon,
  ClockIcon,
  HomeIcon,
  HeartIcon,
  ShoppingBagIcon,
  DocumentTextIcon,
  UserGroupIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { useAIAssistant } from '../hooks/useAIAssistant';
import { useTasks } from '../providers/TaskProvider';
import { supabase } from '../lib/supabaseClient';
import { useAuthState } from '../hooks/useAuthState';

function TravelPlanningAssistant({ trip, onComplete, onClose }) {
  const [currentStep, setCurrentStep] = useState('brain-dump');
  const [brainDumpText, setBrainDumpText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [analyzedPlan, setAnalyzedPlan] = useState(null);
  const [followUpQuestions, setFollowUpQuestions] = useState([]);
  const [responses, setResponses] = useState({});
  const [generatedTasks, setGeneratedTasks] = useState([]);
  const { generateWithAI } = useAIAssistant();
  const { createTask } = useTasks();
  const { user } = useAuthState();

  const brainDumpPrompt = `Tell me EVERYTHING about your ${trip.destination} trip! Think beyond just "travel stuff" - I need to know about your entire life ecosystem around this trip. Don't organize, just brain dump:

🗓️ **Events & Activities**: Weddings, conferences, dinners, tours - what's the schedule?

👥 **Who's Going**: Family members, ages, special needs, roles (who's doing what?)

🏠 **Home Logistics**: 
   • Pet care (taking dog to parents on Tuesday?)
   • House prep (cleaning, security, mail hold, plant watering)
   • Home maintenance issues to handle before leaving

🧺 **Life Admin Before Departure**:
   • Laundry (yours, kids', family's)
   • Dry cleaning, alterations
   • Grocery shopping, meal prep
   • Bill payments, banking
   • Car maintenance, gas
   • Prescription refills

👕 **Shopping & Wardrobe**:
   • Formal wear (tuxedo rental/purchase, dress shopping)
   • Kids' clothes, shoes
   • Gifts for events
   • Toiletries, travel-size items
   • Luggage, travel gear

👶 **Kids & Family Logistics**:
   • School notifications, homework arrangements
   • Babysitter coordination
   • Kids' activities/sports schedule
   • Extended family coordination

💼 **Work Preparation**:
   • Project deadlines to hit before leaving
   • Handoffs, coverage arrangements
   • Client communications
   • Out-of-office setup

🚗 **Transportation & Logistics**:
   • Airport transportation
   • Parking reservations
   • Flight check-ins
   • Car rentals, international licenses

🏨 **Accommodations & Bookings**:
   • Hotel confirmations
   • Restaurant reservations
   • Activity bookings
   • Special requests

💊 **Health & Documents**:
   • Medical appointments before travel
   • Prescription refills
   • Travel insurance
   • Document copies, passport checks

📱 **Technology & Admin**:
   • Phone/data plans
   • Currency exchange
   • Travel apps
   • Contact lists, emergency info

🎯 **Random Life Stuff**:
   • Anything else floating in your head that needs to happen before or during the trip
   • Weird logistics, family drama, special considerations
   • Things that would stress you out if forgotten

Don't worry about being organized - just dump EVERYTHING! I'll sort it all out and make sure nothing important gets missed.`;

  const handleBrainDumpSubmit = async () => {
    if (!brainDumpText.trim()) return;
    
    setIsProcessing(true);
    setCurrentStep('analyzing');

    try {
      // AI analysis of the brain dump
      const analysisPrompt = `Analyze this comprehensive travel brain dump and create a detailed life logistics plan. The user is traveling to ${trip.destination} from ${format(trip.startDate, 'MMM d')} to ${format(trip.endDate, 'MMM d')} (${differenceInDays(trip.endDate, trip.startDate)} days).

User's brain dump:
"${brainDumpText}"

Extract and categorize EVERYTHING into these comprehensive categories:

1. **EVENTS** - Weddings, conferences, dinners, with specific dates/dress codes
2. **HOME_LOGISTICS** - Pet care arrangements, house cleaning, security, mail hold, plants
3. **LIFE_ADMIN** - All the mundane but critical stuff:
   • Laundry (personal, kids', family)
   • Dry cleaning, alterations
   • Grocery shopping, meal prep for before/after
   • Bill payments, banking tasks
   • Car maintenance, gas tank fill-up
4. **SHOPPING_WARDROBE** - Everything that needs to be purchased:
   • Formal wear (tuxedo, dresses, shoes)
   • Kids' clothes and gear
   • Gifts for events
   • Travel-size toiletries
   • Missing luggage/travel gear
5. **FAMILY_KIDS** - All family coordination:
   • School notifications, homework plans
   • Babysitter/childcare arrangements
   • Kids' activity schedules (sports, lessons)
   • Extended family logistics
6. **WORK_PROFESSIONAL** - Career obligations:
   • Project deadlines before departure
   • Handoff meetings and documentation
   • Client communications
   • Out-of-office setup
7. **TRAVEL_LOGISTICS** - Transportation and bookings:
   • Airport transportation, parking
   • Flight check-ins, seat selections
   • Hotel confirmations, special requests
   • Restaurant/activity reservations
8. **HEALTH_DOCUMENTS** - Medical and administrative:
   • Doctor appointments before travel
   • Prescription refills
   • Travel insurance verification
   • Document copies, passport validity
9. **TECH_ADMIN** - Digital preparation:
   • International phone/data plans
   • Currency exchange
   • Travel apps download
   • Emergency contact lists

For each task, specify:
- Exact action item (be specific!)
- Realistic deadline (X days before departure)
- Priority (1-5, where 5 is "will ruin trip if forgotten")
- Who should handle it
- Estimated time needed

CRITICAL: Also identify common things people forget:
- **GAPS** - Things they probably didn't think of but should do
- **QUESTIONS** - Clarifications needed
- **STRESS_FACTORS** - Things that could cause last-minute panic

Return ONLY a valid JSON object in this exact format:
{
  "LIFE_ADMIN": [
    {"task": "specific task description", "priority": 1-5, "daysBefore": 7, "assignee": "You"}
  ],
  "SHOPPING_WARDROBE": [...],
  "HOME_LOGISTICS": [...],
  "FAMILY_KIDS": [...],
  "WORK_PROFESSIONAL": [...],
  "TRAVEL_LOGISTICS": [...],
  "HEALTH_DOCUMENTS": [...],
  "TECH_ADMIN": [...],
  "EVENTS": [...],
  "gaps": ["list of things user likely forgot"],
  "questions": ["specific questions to ask user"]
}

IMPORTANT: Return ONLY the JSON object, no other text.`;

      const analysis = await generateWithAI(analysisPrompt, {
        systemPrompt: 'You are an expert travel planning assistant. Analyze travel brain dumps and return comprehensive, organized JSON plans with realistic timelines and priorities. Always return valid JSON only.',
        maxTokens: 3000,
        temperature: 0.3
      });
      
      let parsedAnalysis;
      try {
        parsedAnalysis = JSON.parse(analysis);
      } catch (parseError) {
        console.error('Failed to parse AI analysis as JSON:', parseError);
        console.log('Raw AI response:', analysis);
        
        // Fallback: create a simple structure if JSON parsing fails
        parsedAnalysis = {
          LIFE_ADMIN: [
            { task: "Complete laundry for all family members", priority: 4, daysBefore: 3 },
            { task: "Grocery shopping and meal prep", priority: 3, daysBefore: 2 }
          ],
          SHOPPING_WARDROBE: [
            { task: "Purchase or rent formal wear", priority: 5, daysBefore: 14 },
            { task: "Buy travel-size toiletries", priority: 2, daysBefore: 7 }
          ],
          HOME_LOGISTICS: [
            { task: "Arrange pet care", priority: 5, daysBefore: 7 },
            { task: "Set up mail hold", priority: 3, daysBefore: 5 }
          ],
          TRAVEL_LOGISTICS: [
            { task: "Confirm flight and hotel reservations", priority: 5, daysBefore: 3 },
            { task: "Check passport validity", priority: 5, daysBefore: 14 }
          ],
          gaps: ["Consider travel insurance", "International phone plan"],
          questions: ["Do you need any vaccinations for this destination?", "Who will watch the house while you're away?"]
        };
      }
      
      setAnalyzedPlan(parsedAnalysis);

      // Generate follow-up questions for gaps
      if (parsedAnalysis.gaps || parsedAnalysis.questions) {
        const questionPrompt = `Based on this travel analysis, create 3-5 specific follow-up questions to fill important gaps. Make them conversational and helpful.

Analysis: ${JSON.stringify(parsedAnalysis)}

Focus on the most important missing pieces that could cause problems. 

Return ONLY a JSON array of question strings in this format:
["Question 1?", "Question 2?", "Question 3?"]

IMPORTANT: Return ONLY the JSON array, no other text.`;

        try {
          const questions = await generateWithAI(questionPrompt, {
            systemPrompt: 'You are a travel planning expert. Generate helpful follow-up questions as JSON arrays only.',
            maxTokens: 500,
            temperature: 0.5
          });
          const parsedQuestions = JSON.parse(questions);
          setFollowUpQuestions(parsedQuestions);
        } catch (questionError) {
          console.error('Failed to parse follow-up questions:', questionError);
          // Fallback questions
          setFollowUpQuestions([
            "What specific formal events will you be attending that might require special attire?",
            "Do you have arrangements for pet care and house sitting while you're away?",
            "Are there any work deadlines or projects you need to complete before departure?"
          ]);
        }
        setCurrentStep('follow-up');
      } else {
        setCurrentStep('review');
      }

    } catch (error) {
      console.error('Error analyzing brain dump:', error);
      
      // Provide a helpful fallback plan
      const fallbackPlan = {
        LIFE_ADMIN: [
          { task: "Complete laundry for all family members", priority: 4, daysBefore: 3, assignee: "You" },
          { task: "Grocery shopping and meal prep", priority: 3, daysBefore: 2, assignee: "You" }
        ],
        SHOPPING_WARDROBE: [
          { task: "Purchase or rent formal wear", priority: 5, daysBefore: 14, assignee: "You" },
          { task: "Buy travel-size toiletries", priority: 2, daysBefore: 7, assignee: "You" }
        ],
        HOME_LOGISTICS: [
          { task: "Arrange pet care", priority: 5, daysBefore: 7, assignee: "You" },
          { task: "Set up mail hold", priority: 3, daysBefore: 5, assignee: "You" }
        ],
        TRAVEL_LOGISTICS: [
          { task: "Confirm flight and hotel reservations", priority: 5, daysBefore: 3, assignee: "You" },
          { task: "Check passport validity", priority: 5, daysBefore: 14, assignee: "You" }
        ],
        gaps: ["Consider travel insurance", "International phone plan"],
        questions: ["Do you need any vaccinations for this destination?", "Who will watch the house while you're away?"]
      };
      
      setAnalyzedPlan(fallbackPlan);
      setFollowUpQuestions([
        "What specific formal events will you be attending?",
        "Do you have arrangements for pet care while you're away?",
        "Are there any work deadlines you need to meet before departure?"
      ]);
      setCurrentStep('follow-up');
      
      console.log('Using fallback travel plan due to AI analysis error');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFollowUpComplete = async () => {
    setIsProcessing(true);
    setCurrentStep('review');

    try {
      // Refine the plan based on follow-up responses
      const refinementPrompt = `Refine the travel plan based on these additional details:

Original analysis: ${JSON.stringify(analyzedPlan)}

Follow-up responses: ${JSON.stringify(responses)}

Update the plan with the new information and create the final comprehensive task list with realistic timelines.`;

      const refinedPlan = await generateWithAI(refinementPrompt, {
        systemPrompt: 'You are a travel planning expert. Refine travel plans based on additional user input. Return comprehensive JSON plans only.',
        maxTokens: 3000,
        temperature: 0.3
      });
      
      try {
        const parsedRefinedPlan = JSON.parse(refinedPlan);
        setAnalyzedPlan(parsedRefinedPlan);
      } catch (refinementError) {
        console.error('Failed to parse refined plan:', refinementError);
        console.log('Raw refinement response:', refinedPlan);
        // Keep the original analysis if refinement fails
        console.log('Using original analysis plan');
      }

    } catch (error) {
      console.error('Error refining plan:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const generateAllTasks = async () => {
    if (!analyzedPlan) return;

    setIsProcessing(true);
    const tasks = [];

    try {
      console.log('Analyzed plan structure:', analyzedPlan);
      
      // Process each category and create tasks
      for (const [category, items] of Object.entries(analyzedPlan)) {
        if (category === 'gaps' || category === 'questions' || category === 'assumptions') continue;

        console.log(`Processing category: ${category}, items:`, items);
        
        // Ensure items is an array
        const itemsArray = Array.isArray(items) ? items : [];
        
        if (itemsArray.length === 0) {
          console.log(`No items found for category: ${category}`);
          continue;
        }
        
        for (const item of itemsArray) {
          // Handle both string and object formats
          const taskItem = typeof item === 'string' ? { task: item } : item;
          
          const daysBeforeTrip = taskItem.daysBefore || 7;
          
          // Calculate deadline safely
          let deadline;
          try {
            const tripStart = new Date(trip.startDate);
            const today = new Date();
            const daysDiff = differenceInDays(tripStart, today);
            deadline = addDays(today, Math.max(1, daysDiff - daysBeforeTrip));
          } catch (dateError) {
            console.error('Date calculation error:', dateError);
            deadline = addDays(new Date(), 7); // Default to 7 days from now
          }

          const task = {
            title: taskItem.task || taskItem.title || item,
            description: taskItem.description || `${category.replace('_', ' ')} task for ${trip.destination} trip`,
            priority: taskItem.priority || 3,
            deadline: deadline,
            context: getCategoryContext(category),
            tags: ['travel', category.toLowerCase(), trip.destination.toLowerCase()],
            assignee: taskItem.assignee || 'You'
          };

          await createTask(task);
          tasks.push(task);

          // Create trip events if in EVENTS category
          if (category === 'EVENTS' && (taskItem.eventName || taskItem.event_name)) {
            try {
              await supabase.from('trip_events').insert({
                trip_id: trip.id,
                user_id: user?.id,
                event_name: taskItem.eventName || taskItem.event_name || taskItem.task,
                event_type: taskItem.eventType || taskItem.event_type || 'other',
                event_date: taskItem.eventDate || taskItem.event_date || trip.startDate,
                venue_name: taskItem.venue || taskItem.venue_name,
                dress_code: taskItem.dressCode || taskItem.dress_code,
                website_url: taskItem.website || taskItem.website_url,
                attendees: taskItem.attendees || ['You']
              });
            } catch (eventError) {
              console.log('Trip events table not available yet:', eventError);
            }
          }
        }
      }

      setGeneratedTasks(tasks);
      setCurrentStep('complete');

    } catch (error) {
      console.error('Error generating tasks:', error);
      alert('Error creating tasks. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const getCategoryContext = (category) => {
    const contextMap = {
      'EVENTS': 'Travel',
      'HOME_LOGISTICS': 'Home',
      'LIFE_ADMIN': 'Personal',
      'SHOPPING_WARDROBE': 'Personal',
      'FAMILY_KIDS': 'Family',
      'WORK_PROFESSIONAL': 'Work',
      'TRAVEL_LOGISTICS': 'Travel',
      'HEALTH_DOCUMENTS': 'Health',
      'TECH_ADMIN': 'Personal'
    };
    return contextMap[category] || 'Personal';
  };

  const getCategoryIcon = (category) => {
    const iconMap = {
      'EVENTS': <HeartIcon className="h-5 w-5" />,
      'HOME_LOGISTICS': <HomeIcon className="h-5 w-5" />,
      'LIFE_ADMIN': <DocumentTextIcon className="h-5 w-5" />,
      'SHOPPING_WARDROBE': <ShoppingBagIcon className="h-5 w-5" />,
      'FAMILY_KIDS': <UserGroupIcon className="h-5 w-5" />,
      'WORK_PROFESSIONAL': <DocumentTextIcon className="h-5 w-5" />,
      'TRAVEL_LOGISTICS': <ClockIcon className="h-5 w-5" />,
      'HEALTH_DOCUMENTS': <HeartIcon className="h-5 w-5" />,
      'TECH_ADMIN': <SparklesIcon className="h-5 w-5" />
    };
    return iconMap[category] || <DocumentTextIcon className="h-5 w-5" />;
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity" aria-hidden="true">
          <div className="absolute inset-0 bg-gray-500 opacity-75"></div>
        </div>

        <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:align-middle">
          <div className="bg-white px-6 pt-6 pb-4">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <SparklesIcon className="h-6 w-6 text-blue-600" />
                <h3 className="text-xl font-bold text-gray-900">AI Travel Planning Assistant</h3>
              </div>
              <p className="text-gray-600">Let's plan your {trip.destination} trip comprehensively - I'll help you think of everything!</p>
            </div>

            {/* Progress Steps */}
            <div className="mb-6 flex items-center justify-between">
              <div className={`flex items-center gap-2 ${currentStep === 'brain-dump' ? 'text-blue-600' : 'text-gray-400'}`}>
                <ChatBubbleLeftRightIcon className="h-4 w-4" />
                <span className="text-sm font-medium">Brain Dump</span>
              </div>
              <div className={`flex items-center gap-2 ${currentStep === 'follow-up' ? 'text-blue-600' : 'text-gray-400'}`}>
                <ExclamationTriangleIcon className="h-4 w-4" />
                <span className="text-sm font-medium">Fill Gaps</span>
              </div>
              <div className={`flex items-center gap-2 ${currentStep === 'review' ? 'text-blue-600' : 'text-gray-400'}`}>
                <DocumentTextIcon className="h-4 w-4" />
                <span className="text-sm font-medium">Review</span>
              </div>
              <div className={`flex items-center gap-2 ${currentStep === 'complete' ? 'text-green-600' : 'text-gray-400'}`}>
                <CheckCircleIcon className="h-4 w-4" />
                <span className="text-sm font-medium">Complete</span>
              </div>
            </div>

            {/* Brain Dump Step */}
            {currentStep === 'brain-dump' && (
              <div className="space-y-4">
                <div className="rounded-lg bg-blue-50 p-4">
                  <pre className="whitespace-pre-wrap text-sm text-gray-700">{brainDumpPrompt}</pre>
                </div>
                
                <textarea
                  value={brainDumpText}
                  onChange={(e) => setBrainDumpText(e.target.value)}
                  placeholder="Just start typing everything that comes to mind about your trip..."
                  className="w-full h-64 p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
                
                <div className="flex justify-between">
                  <button
                    onClick={onClose}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleBrainDumpSubmit}
                    disabled={!brainDumpText.trim() || isProcessing}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? 'Analyzing...' : 'Analyze My Plan'}
                  </button>
                </div>
              </div>
            )}

            {/* Analyzing Step */}
            {currentStep === 'analyzing' && (
              <div className="flex flex-col items-center justify-center py-12">
                <SparklesIcon className="h-12 w-12 text-blue-600 animate-spin mb-4" />
                <h4 className="text-lg font-medium text-gray-900 mb-2">Analyzing Your Travel Plans</h4>
                <p className="text-gray-600 text-center">I'm organizing everything you mentioned and thinking of what you might have missed...</p>
              </div>
            )}

            {/* Follow-up Questions Step */}
            {currentStep === 'follow-up' && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">I have a few follow-up questions</h4>
                  <p className="text-gray-600 mb-4">These will help me fill in some important gaps I noticed:</p>
                </div>

                {followUpQuestions.map((question, index) => (
                  <div key={index} className="space-y-2">
                    <label className="block text-sm font-medium text-gray-700">
                      {question}
                    </label>
                    <textarea
                      value={responses[index] || ''}
                      onChange={(e) => setResponses({ ...responses, [index]: e.target.value })}
                      className="w-full p-3 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={2}
                    />
                  </div>
                ))}

                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentStep('brain-dump')}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Back
                  </button>
                  <button
                    onClick={handleFollowUpComplete}
                    disabled={isProcessing}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {isProcessing ? 'Processing...' : 'Continue'}
                  </button>
                </div>
              </div>
            )}

            {/* Review Step */}
            {currentStep === 'review' && analyzedPlan && (
              <div className="space-y-6">
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-2">Your Comprehensive Travel Plan</h4>
                  <p className="text-gray-600 mb-4">I've organized everything and added some important items you might have missed:</p>
                </div>

                <div className="max-h-96 overflow-y-auto space-y-4">
                  {Object.entries(analyzedPlan).map(([category, items]) => {
                    if (category === 'gaps' || category === 'questions' || category === 'assumptions' || !items?.length) return null;
                    
                    return (
                      <div key={category} className="border rounded-lg p-4">
                        <div className="flex items-center gap-2 mb-3">
                          {getCategoryIcon(category)}
                          <h5 className="font-medium text-gray-900">{category.replace('_', ' ')}</h5>
                          <span className="text-xs bg-gray-100 px-2 py-1 rounded">{items.length} tasks</span>
                        </div>
                        <div className="space-y-1">
                          {items.slice(0, 3).map((item, idx) => (
                            <div key={idx} className="text-sm text-gray-600">
                              • {item.task || item.title || item}
                            </div>
                          ))}
                          {items.length > 3 && (
                            <div className="text-xs text-gray-500">+ {items.length - 3} more tasks</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex justify-between">
                  <button
                    onClick={() => setCurrentStep('follow-up')}
                    className="px-4 py-2 text-gray-600 hover:text-gray-800"
                  >
                    Back
                  </button>
                  <button
                    onClick={generateAllTasks}
                    disabled={isProcessing}
                    className="px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    {isProcessing ? 'Creating Tasks...' : 'Create All Tasks & Events'}
                  </button>
                </div>
              </div>
            )}

            {/* Complete Step */}
            {currentStep === 'complete' && (
              <div className="text-center py-8">
                <CheckCircleIcon className="h-16 w-16 text-green-600 mx-auto mb-4" />
                <h4 className="text-xl font-medium text-gray-900 mb-2">All Set!</h4>
                <p className="text-gray-600 mb-6">
                  I've created {generatedTasks.length} tasks and organized everything for your {trip.destination} trip.
                  You'll find them in your task list with proper deadlines and priorities.
                </p>
                <button
                  onClick={() => {
                    onComplete(generatedTasks.length);
                    onClose();
                  }}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  View Travel Dashboard
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default TravelPlanningAssistant;