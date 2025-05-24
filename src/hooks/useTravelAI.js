import { useState } from 'react';
import { useAIAssistant } from './useAIAssistant';
import { supabase } from '../lib/supabaseClient';

export function useTravelAI() {
  const [isProcessing, setIsProcessing] = useState(false);
  const { generateWithAI } = useAIAssistant();

  // Generate packing list based on trip details and family members
  const generatePackingList = async (tripDetails, familyMembers) => {
    setIsProcessing(true);
    try {
      const prompt = `Generate a comprehensive packing list for a ${tripDetails.duration}-day trip to ${tripDetails.destination} from ${tripDetails.departureCity || 'home'}.

Trip details:
- Dates: ${tripDetails.startDate} to ${tripDetails.endDate}
- Season/Weather: ${tripDetails.weather || 'Check weather forecast'}
- Trip type: ${tripDetails.tripType || 'leisure'}
- Transportation: ${tripDetails.transportationMode || 'flight'}
- Accommodation: ${tripDetails.accommodationType || 'hotel'}

Travelers:
${familyMembers.map(member => `- ${member.name} (${member.age} years old, ${member.gender})`).join('\n')}

Special events during trip:
${tripDetails.events?.map(event => `- ${event.type}: ${event.name} (Dress code: ${event.dressCode || 'not specified'})`).join('\n') || 'None specified'}

Please generate a categorized packing list that includes:
1. Documents & essentials
2. Clothing (considering weather and events)
3. Toiletries & medications
4. Electronics & entertainment
5. For children (if applicable)
6. Event-specific items (if applicable)

For each item, specify quantity and which family member it's for (if specific).
Return as a structured JSON object.`;

      const result = await generateWithAI(prompt);
      return JSON.parse(result);
    } catch (error) {
      console.error('Error generating packing list:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  // Generate event-specific preparation tasks
  const generateEventPreparation = async (eventDetails, attendees) => {
    setIsProcessing(true);
    try {
      const prompt = `Generate preparation tasks for attending a ${eventDetails.type} event.

Event details:
- Name: ${eventDetails.name}
- Type: ${eventDetails.type}
- Date: ${eventDetails.date}
- Venue: ${eventDetails.venue || 'TBD'}
- Dress code: ${eventDetails.dressCode || 'not specified'}
- Special requirements: ${eventDetails.specialRequirements || 'none'}

Attendees:
${attendees.map(a => `- ${a.name} (${a.role || 'guest'})`).join('\n')}

Generate comprehensive preparation tasks including:
1. Attire & grooming
2. Gifts or contributions (if applicable)
3. Transportation & logistics
4. Documentation needed
5. Cultural or etiquette considerations
6. Timeline for each task (days before event)

For a ${eventDetails.type}, consider specific requirements like:
${eventDetails.type === 'wedding' ? '- Formal attire, wedding gift, RSVP, accommodation near venue, grooming appointments' : ''}
${eventDetails.type === 'conference' ? '- Business attire, business cards, presentation materials, registration' : ''}
${eventDetails.type === 'cultural_event' ? '- Appropriate cultural attire, understanding customs, language phrases' : ''}

Return as structured JSON with categories and timeline.`;

      const result = await generateWithAI(prompt);
      return JSON.parse(result);
    } catch (error) {
      console.error('Error generating event preparation:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  // Learn from completed trips
  const learnFromTrip = async (tripId, userId) => {
    try {
      // Fetch trip data, packing lists, and feedback
      const { data: tripData } = await supabase
        .from('trips')
        .select(`
          *,
          packing_lists(*),
          trip_events(*),
          travel_prep_tasks(*)
        `)
        .eq('id', tripId)
        .single();

      if (!tripData) return;

      // Store learned preferences
      const preferences = {
        frequently_packed_items: extractFrequentItems(tripData.packing_lists),
        preparation_timeline: analyzePreparationTimeline(tripData.travel_prep_tasks),
        event_preferences: extractEventPreferences(tripData.trip_events)
      };

      await supabase
        .from('travel_preferences')
        .upsert({
          user_id: userId,
          preference_type: 'learned_patterns',
          preferences,
          learned_from_trips: [tripId]
        });

    } catch (error) {
      console.error('Error learning from trip:', error);
    }
  };

  // Generate smart travel checklist
  const generateTravelChecklist = async (tripDetails, pastTrips = []) => {
    setIsProcessing(true);
    try {
      const prompt = `Generate a comprehensive pre-travel checklist for a trip to ${tripDetails.destination}.

Trip context:
- Duration: ${tripDetails.duration} days
- Purpose: ${tripDetails.purpose}
- International: ${tripDetails.isInternational ? 'Yes' : 'No'}
- With children: ${tripDetails.withChildren ? 'Yes' : 'No'}

Based on common travel preparation needs, generate a timeline-based checklist including:

2-3 months before:
- Passport/visa requirements
- Major bookings

1 month before:
- Travel insurance
- Medical preparations
- Activity bookings

2 weeks before:
- Check-in for flights
- Confirm accommodations
- Currency exchange

1 week before:
- Final packing
- House preparations
- Document copies

Day before:
- Final checks
- Charge devices
- Set out-of-office

Customize based on the specific destination and trip type.
Return as structured JSON with categories and timelines.`;

      const result = await generateWithAI(prompt);
      return JSON.parse(result);
    } catch (error) {
      console.error('Error generating checklist:', error);
      throw error;
    } finally {
      setIsProcessing(false);
    }
  };

  // Helper functions
  const extractFrequentItems = (packingLists) => {
    const itemFrequency = {};
    packingLists?.forEach(list => {
      list.items?.forEach(item => {
        itemFrequency[item.name] = (itemFrequency[item.name] || 0) + 1;
      });
    });
    return Object.entries(itemFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20)
      .map(([item]) => item);
  };

  const analyzePreparationTimeline = (tasks) => {
    const timeline = {};
    tasks?.forEach(task => {
      const daysBefore = task.due_days_before || 7;
      if (!timeline[daysBefore]) timeline[daysBefore] = [];
      timeline[daysBefore].push(task.task_category);
    });
    return timeline;
  };

  const extractEventPreferences = (events) => {
    const preferences = {};
    events?.forEach(event => {
      if (!preferences[event.event_type]) {
        preferences[event.event_type] = {
          commonPreparations: [],
          typicalTimeline: {}
        };
      }
      // Aggregate event preparation patterns
    });
    return preferences;
  };

  return {
    generatePackingList,
    generateEventPreparation,
    generateTravelChecklist,
    learnFromTrip,
    isProcessing
  };
}