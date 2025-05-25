import React, { useState, useEffect } from 'react';
import { format, differenceInDays, addDays } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import { useTasks } from '../providers/TaskProvider';
import { useNavigate } from 'react-router-dom';
import { useTravelAI } from '../hooks/useTravelAI';
import { useAuthState } from '../hooks/useAuthState';
import { useAIAssistant } from '../hooks/useAIAssistant';
import { DocumentArrowUpIcon, LinkIcon, CalendarIcon, UserGroupIcon, SparklesIcon, ChatBubbleLeftRightIcon } from '@heroicons/react/24/outline';
import TravelEvent from '../components/TravelEvent';
import TravelPlanningAssistant from '../components/TravelPlanningAssistant';

function TravelDashboard() {
  const navigate = useNavigate();
  const { user } = useAuthState();
  const { createTask } = useTasks();
  const { generateWithAI } = useAIAssistant();
  const { generatePackingList, generateEventPreparation, generateTravelChecklist, isProcessing } = useTravelAI();
  const [upcomingTrips, setUpcomingTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showNewTripForm, setShowNewTripForm] = useState(false);
  const [showEventForm, setShowEventForm] = useState(false);
  const [activeTab, setActiveTab] = useState('overview');
  const [tripEvents, setTripEvents] = useState([]);
  const [packingList, setPackingList] = useState(null);
  const [travelDocuments, setTravelDocuments] = useState([]);
  const [smartPackingList, setSmartPackingList] = useState(null);
  const [familyMembers, setFamilyMembers] = useState([]);
  const [showAIPlanningAssistant, setShowAIPlanningAssistant] = useState(false);
  const [tripTasks, setTripTasks] = useState([]);
  const [lastAIGeneration, setLastAIGeneration] = useState(null);
  const [newTripData, setNewTripData] = useState({
    destination: '',
    startDate: '',
    endDate: '',
    notes: ''
  });
  const [newEventData, setNewEventData] = useState({
    eventName: '',
    eventType: 'wedding',
    eventDate: '',
    venue: '',
    dressCode: '',
    website: ''
  });
  const [loading, setLoading] = useState(true);

  // Fetch trips from calendar events with travel keywords
  useEffect(() => {
    fetchUpcomingTrips();
    loadFamilyMembers();
  }, []);
  
  useEffect(() => {
    if (selectedTrip) {
      loadTripEvents();
      loadTripTasks();
    }
  }, [selectedTrip]);

  const loadTripTasks = async () => {
    if (!selectedTrip || !user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('user_id', user.id)
        .or(`context.eq.Travel,description.ilike.%${selectedTrip.destination}%`)
        .order('deadline', { ascending: true });
      
      if (error) throw error;
      console.log('Loaded trip tasks:', data);
      setTripTasks(data || []);
    } catch (error) {
      console.error('Error loading trip tasks:', error);
      setTripTasks([]);
    }
  };

  const loadFamilyMembers = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('user_id', user.id);
      
      if (error) throw error;
      setFamilyMembers(data || []);
    } catch (error) {
      console.error('Error loading family members:', error);
    }
  };
  
  const loadTripEvents = async () => {
    if (!selectedTrip?.id) return;
    
    try {
      // Check if trip_events table exists, if not fall back to empty array
      const { data, error } = await supabase
        .from('trip_events')
        .select('*')
        .eq('trip_id', selectedTrip.id)
        .order('event_date', { ascending: true });
      
      if (error) {
        if (error.code === '42P01') {
          // Table doesn't exist yet, just use empty array
          console.log('Trip events table not yet created');
          setTripEvents([]);
          return;
        }
        throw error;
      }
      setTripEvents(data || []);
    } catch (error) {
      console.error('Error loading trip events:', error);
      setTripEvents([]);
    }
  };
  
  const generateSmartPackingList = async (trip) => {
    if (!trip || !familyMembers.length) return;
    
    try {
      const tripDetails = {
        destination: trip.destination,
        startDate: format(trip.startDate, 'yyyy-MM-dd'),
        endDate: format(trip.endDate, 'yyyy-MM-dd'),
        duration: differenceInDays(trip.endDate, trip.startDate),
        departureCity: 'Home',
        tripType: 'leisure',
        transportationMode: 'flight',
        accommodationType: 'hotel',
        events: tripEvents.map(event => ({
          type: event.event_type,
          name: event.event_name,
          dressCode: event.dress_code
        }))
      };
      
      const packingData = await generatePackingList(tripDetails, familyMembers);
      setSmartPackingList(packingData);
    } catch (error) {
      console.error('Error generating smart packing list:', error);
    }
  };

  const fetchUpcomingTrips = async () => {
    try {
      const { data, error } = await supabase
        .from('calendar_events')
        .select('*')
        .or('title.ilike.%flight%,title.ilike.%trip%,title.ilike.%travel%,title.ilike.%vacation%,event_type.eq.flight')
        .gte('start_time', new Date().toISOString())
        .order('start_time', { ascending: true });

      if (error) throw error;

      // Group events into trips
      const trips = groupEventsIntoTrips(data || []);
      setUpcomingTrips(trips);
      
      // Auto-select France trip if found
      const franceTrip = trips.find(trip => 
        trip.destination?.toLowerCase().includes('france') ||
        trip.events.some(e => e.title.toLowerCase().includes('france'))
      );
      if (franceTrip) setSelectedTrip(franceTrip);

    } catch (error) {
      console.error('Error fetching trips:', error);
    } finally {
      setLoading(false);
    }
  };

  const groupEventsIntoTrips = (events) => {
    // Group events that are close in time as part of the same trip
    const trips = [];
    let currentTrip = null;

    events.forEach(event => {
      if (!currentTrip || differenceInDays(new Date(event.start_time), currentTrip.endDate) > 2) {
        currentTrip = {
          id: event.id,
          destination: extractDestination(event),
          startDate: new Date(event.start_time),
          endDate: new Date(event.end_time),
          events: [event],
          familyMembers: []
        };
        trips.push(currentTrip);
      } else {
        currentTrip.events.push(event);
        currentTrip.endDate = new Date(event.end_time);
      }
    });

    return trips;
  };

  const extractDestination = (event) => {
    // Extract destination from event title or location
    const text = `${event.title} ${event.location || ''}`;
    const cityMatch = text.match(/to\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/);
    return cityMatch ? cityMatch[1] : 'Unknown Destination';
  };

  const generateTravelTasks = async (trip) => {
    console.log('Generating travel tasks for trip:', trip);
    
    const tasks = [];
    const daysUntilTrip = differenceInDays(trip.startDate, new Date());

    // Document preparation
    tasks.push({
      title: 'Check passport expiration dates',
      description: `Ensure all family members have valid passports for ${trip.destination} trip`,
      priority: 5,
      deadline: addDays(new Date(), Math.max(1, daysUntilTrip - 7)),
      context: 'Travel'
    });

    // Packing
    tasks.push({
      title: `Create packing list for ${trip.destination}`,
      description: 'Plan outfits and essentials based on weather and activities',
      priority: 3,
      deadline: addDays(new Date(), Math.max(1, daysUntilTrip - 3)),
      context: 'Travel'
    });

    // Bookings
    tasks.push({
      title: `Confirm all reservations for ${trip.destination}`,
      description: 'Hotels, car rentals, restaurants, activities',
      priority: 4,
      deadline: addDays(new Date(), Math.max(1, daysUntilTrip - 5)),
      context: 'Travel'
    });

    // Family coordination
    tasks.push({
      title: `Family travel meeting for ${trip.destination}`,
      description: 'Review itinerary and assign responsibilities',
      priority: 3,
      deadline: addDays(new Date(), Math.max(1, daysUntilTrip - 4)),
      context: 'Travel'
    });

    // Create tasks and track count
    let createdCount = 0;
    for (const taskData of tasks) {
      console.log('Creating task:', taskData);
      const newTask = await createTask(taskData);
      if (newTask) {
        createdCount++;
        console.log('Created task:', newTask);
      }
    }
    
    console.log(`Created ${createdCount} travel tasks`);
    
    // Reload trip tasks after creation
    await loadTripTasks();
    
    // Show success message
    setLastAIGeneration({
      taskCount: createdCount,
      tripName: trip.destination,
      timestamp: new Date()
    });
  };

  const TripCard = ({ trip, isSelected, onClick }) => {
    const daysUntil = differenceInDays(trip.startDate, new Date());
    
    return (
      <div
        onClick={onClick}
        className={`cursor-pointer rounded-lg border p-4 transition-all ${
          isSelected 
            ? 'border-blue-500 bg-blue-50' 
            : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
      >
        <div className="flex items-start justify-between">
          <div>
            <h3 className="font-semibold text-gray-900">{trip.destination}</h3>
            <p className="text-sm text-gray-600">
              {format(trip.startDate, 'MMM d')} - {format(trip.endDate, 'MMM d, yyyy')}
            </p>
          </div>
          <div className="text-right">
            <p className="text-2xl font-bold text-blue-600">{daysUntil}</p>
            <p className="text-xs text-gray-600">days</p>
          </div>
        </div>
      </div>
    );
  };

  const PackingList = ({ trip }) => {
    const [items, setItems] = useState([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [newItem, setNewItem] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('Clothing');
    
    const categories = ['Documents', 'Clothing', 'Electronics', 'Health', 'Activities', 'Food/Snacks'];

    useEffect(() => {
      generateSmartPackingList();
    }, [trip.destination]);

    const generateSmartPackingList = async () => {
      setIsGenerating(true);
      try {
        const familyMembers = await supabase
          .from('family_members')
          .select('*')
          .eq('user_id', user.id);

        const tripDuration = differenceInDays(trip.endDate, trip.startDate);
        const season = format(trip.startDate, 'MMMM');
        
        const prompt = `Generate a smart packing list for a ${tripDuration}-day trip to ${trip.destination} in ${season}. 
        Family members: ${familyMembers.data?.map(m => `${m.name} (age ${m.age})`).join(', ')}
        
        Consider:
        - Weather in ${trip.destination} during ${season}
        - Family members' ages and needs
        - Trip duration
        - Common activities in ${trip.destination}
        
        IMPORTANT: Return ONLY a valid JSON array with this exact format:
        [
          {"category": "Documents", "items": ["Passports", "Travel insurance"]},
          {"category": "Clothing", "items": ["Weather-appropriate clothes", "Comfortable shoes"]},
          {"category": "Electronics", "items": ["Phone chargers", "Camera"]},
          {"category": "Health", "items": ["Medications", "First aid kit"]},
          {"category": "Activities", "items": ["Travel games", "Books"]},
          {"category": "Food/Snacks", "items": ["Snacks for travel", "Water bottles"]}
        ]
        
        Do not include any explanatory text, markdown formatting, or additional commentary. Just return the JSON array.`;

        const response = await generateWithAI(prompt);
        console.log('AI response for packing list:', response);
        
        let packingData;
        try {
          // Clean the response by removing markdown code blocks and extra text
          let cleanedResponse = response.trim();
          
          // Remove markdown code blocks
          if (cleanedResponse.startsWith('```json')) {
            cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```.*$/, '');
          } else if (cleanedResponse.startsWith('```')) {
            cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```.*$/, '');
          }
          
          // Try to extract JSON array if there's extra text
          const jsonMatch = cleanedResponse.match(/\[[\s\S]*\]/);
          if (jsonMatch) {
            cleanedResponse = jsonMatch[0];
          }
          
          // Additional cleanup - remove any text after the closing bracket
          const lastBracketIndex = cleanedResponse.lastIndexOf(']');
          if (lastBracketIndex !== -1) {
            cleanedResponse = cleanedResponse.substring(0, lastBracketIndex + 1);
          }
          
          console.log('Cleaned response for parsing:', cleanedResponse);
          packingData = JSON.parse(cleanedResponse);
          console.log('Parsed packing data:', packingData);
          
          // Validate that packingData is an array
          if (!Array.isArray(packingData)) {
            console.warn('AI response is not an array, using fallback');
            throw new Error('Response is not an array');
          }
          
          // Validate array items have expected structure
          packingData = packingData.filter(item => 
            item && typeof item === 'object' && 
            item.category && 
            (Array.isArray(item.items) || typeof item.items === 'string')
          );
          
          if (packingData.length === 0) {
            throw new Error('No valid packing categories found');
          }
        } catch (parseError) {
          console.error('Failed to parse AI response:', parseError);
          // Fallback to basic packing list
          packingData = [
            { category: 'Documents', items: ['Passports', 'Travel insurance', 'Boarding passes', 'Hotel confirmations'] },
            { category: 'Clothing', items: [`Outfits for ${tripDuration} days`, 'Comfortable shoes', 'Jacket', 'Swimwear'] },
            { category: 'Electronics', items: ['Phone chargers', 'Adapters', 'Camera', 'Headphones'] },
            { category: 'Health', items: ['Medications', 'First aid kit', 'Sunscreen', 'Hand sanitizer'] }
          ];
        }

        const itemsWithState = packingData.map((cat, index) => ({
          id: index + 1,
          category: cat.category,
          items: cat.items || [],
          checked: {}
        }));

        setItems(itemsWithState);
      } catch (error) {
        console.error('Error generating packing list:', error);
        // Fallback basic list
        setItems([
          { id: 1, category: 'Documents', items: ['Passports', 'Travel insurance', 'Boarding passes'], checked: {} },
          { id: 2, category: 'Clothing', items: ['Outfits', 'Comfortable shoes', 'Jacket'], checked: {} },
          { id: 3, category: 'Electronics', items: ['Phone chargers', 'Adapters', 'Camera'], checked: {} },
          { id: 4, category: 'Health', items: ['Medications', 'First aid kit', 'Sunscreen'], checked: {} }
        ]);
      }
      setIsGenerating(false);
    };

    const toggleItem = (categoryId, item) => {
      setItems(prev => prev.map(cat => 
        cat.id === categoryId 
          ? { ...cat, checked: { ...cat.checked, [item]: !cat.checked[item] } }
          : cat
      ));
    };

    const addCustomItem = () => {
      if (!newItem.trim()) return;
      
      setItems(prev => prev.map(cat => 
        cat.category === selectedCategory
          ? { ...cat, items: [...cat.items, newItem.trim()] }
          : cat
      ));
      setNewItem('');
    };

    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Packing Checklist</h3>
          <button
            onClick={generateSmartPackingList}
            disabled={isGenerating}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium disabled:opacity-50"
          >
            {isGenerating ? '🤖 Generating...' : '🤖 AI Refresh'}
          </button>
        </div>

        {/* Add custom item */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex gap-2">
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="rounded border-gray-300 text-sm"
            >
              {categories.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
            <input
              type="text"
              value={newItem}
              onChange={(e) => setNewItem(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addCustomItem()}
              placeholder="Add custom item..."
              className="flex-1 rounded border-gray-300 text-sm"
            />
            <button
              onClick={addCustomItem}
              className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
            >
              Add
            </button>
          </div>
        </div>

        {isGenerating ? (
          <div className="text-center py-8 text-gray-500">
            <div className="animate-spin h-8 w-8 border-2 border-blue-600 border-t-transparent rounded-full mx-auto mb-2"></div>
            <p>AI is generating your smart packing list...</p>
          </div>
        ) : (
          <div className="space-y-4">
            {items.map(category => (
              <div key={category.id}>
                <h4 className="mb-2 font-medium text-gray-700 flex items-center gap-2">
                  {category.category}
                  <span className="text-xs text-gray-500">
                    ({category.items.filter(item => category.checked[item]).length}/{category.items.length})
                  </span>
                </h4>
                <div className="space-y-1">
                  {category.items.map(item => (
                    <label key={item} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={category.checked[item] || false}
                        onChange={() => toggleItem(category.id, item)}
                        className="rounded border-gray-300"
                      />
                      <span className={category.checked[item] ? 'line-through text-gray-400' : ''}>
                        {item}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
            
            {items.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                <p>No packing list yet. Click "AI Refresh" to generate one!</p>
              </div>
            )}
          </div>
        )}
      </div>
    );
  };

  const TripItinerary = ({ trip }) => {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">Trip Itinerary</h3>
          <button
            onClick={() => setShowEventForm(true)}
            className="text-sm text-blue-600 hover:text-blue-700 font-medium"
          >
            + Add Event
          </button>
        </div>
        
        {/* Trip Overview */}
        <div className="mb-4 p-3 bg-gray-50 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium text-gray-900">{trip.destination}</h4>
              <p className="text-sm text-gray-600">
                {format(trip.startDate, 'MMM d')} - {format(trip.endDate, 'MMM d, yyyy')}
              </p>
            </div>
            <div className="text-right">
              <div className="text-lg font-bold text-blue-600">
                {differenceInDays(trip.endDate, trip.startDate)} days
              </div>
              <div className="text-xs text-gray-500">duration</div>
            </div>
          </div>
        </div>

        {/* Events and Calendar Items */}
        <div className="space-y-3">
          {/* Trip Events (from database) */}
          {tripEvents.map(event => (
            <div key={`event-${event.id}`} className="flex gap-4 border-l-2 border-purple-300 pl-4">
              <div className="text-sm text-gray-600">
                <p className="font-medium">{format(new Date(event.event_date), 'MMM d')}</p>
                <p className="text-xs">{event.event_type}</p>
              </div>
              <div className="flex-1">
                <p className="font-medium">{event.event_name}</p>
                {event.venue_name && (
                  <p className="text-sm text-gray-600">📍 {event.venue_name}</p>
                )}
                {event.dress_code && (
                  <p className="text-xs text-gray-500">👔 {event.dress_code}</p>
                )}
              </div>
            </div>
          ))}
          
          {/* Calendar Events */}
          {trip.events && trip.events.map(event => (
            <div key={`cal-${event.id}`} className="flex gap-4 border-l-2 border-blue-300 pl-4">
              <div className="text-sm text-gray-600">
                <p className="font-medium">{format(new Date(event.start_time), 'MMM d')}</p>
                <p>{format(new Date(event.start_time), 'h:mm a')}</p>
              </div>
              <div className="flex-1">
                <p className="font-medium">{event.title}</p>
                {event.location && (
                  <p className="text-sm text-gray-600">📍 {event.location}</p>
                )}
              </div>
            </div>
          ))}
          
          {tripEvents.length === 0 && (!trip.events || trip.events.length === 0) && (
            <div className="text-center py-8 text-gray-500">
              <CalendarIcon className="mx-auto h-12 w-12 text-gray-300 mb-2" />
              <p className="text-sm">No events planned yet</p>
              <p className="text-xs mt-1">Add events to see your trip itinerary</p>
            </div>
          )}
        </div>
        
        <div className="mt-4 flex gap-2">
          <button
            onClick={() => navigate('/calendar')}
            className="text-sm text-blue-600 hover:text-blue-700"
          >
            View full calendar →
          </button>
        </div>
      </div>
    );
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="text-gray-500">Loading travel plans...</div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Travel Planning</h1>
        <p className="mt-2 text-gray-600">Manage your trips and prepare for adventures</p>
      </div>

      {/* Quick Actions */}
      <div className="mb-8 flex gap-4">
        <button
          onClick={() => setShowNewTripForm(true)}
          className="rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
        >
          Plan New Trip
        </button>
        {selectedTrip && (
          <>
            <button
              onClick={() => generateTravelTasks(selectedTrip)}
              className="rounded-md border border-blue-600 px-4 py-2 text-blue-600 hover:bg-blue-50"
            >
              Generate Travel Tasks
            </button>
            <button
              onClick={() => generateSmartPackingList(selectedTrip)}
              className="rounded-md border border-green-600 px-4 py-2 text-green-600 hover:bg-green-50"
            >
              AI Packing List
            </button>
            <button
              onClick={() => setShowEventForm(true)}
              className="rounded-md border border-purple-600 px-4 py-2 text-purple-600 hover:bg-purple-50"
            >
              Add Event
            </button>
            <button
              onClick={() => setShowAIPlanningAssistant(true)}
              className="flex items-center gap-2 rounded-md bg-gradient-to-r from-blue-600 to-purple-600 px-4 py-2 text-white hover:from-blue-700 hover:to-purple-700"
            >
              <SparklesIcon className="h-4 w-4" />
              AI Trip Planner
            </button>
          </>
        )}
      </div>

      {/* Upcoming Trips */}
      <div className="mb-8">
        <h2 className="mb-4 text-xl font-semibold">Upcoming Trips</h2>
        {upcomingTrips.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-8 text-center">
            <p className="text-gray-600">No upcoming trips found</p>
            <p className="mt-2 text-sm text-gray-500">
              Add "flight" or "trip" to calendar events to see them here
            </p>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            {upcomingTrips.map(trip => (
              <TripCard
                key={trip.id}
                trip={trip}
                isSelected={selectedTrip?.id === trip.id}
                onClick={() => setSelectedTrip(trip)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Selected Trip Details */}
      {selectedTrip && (
        <div className="space-y-8">
          {/* Trip Overview Stats */}
          <div className="grid gap-4 md:grid-cols-4">
            <div className="rounded-lg bg-blue-50 p-4">
              <div className="flex items-center gap-2">
                <CalendarIcon className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-medium text-blue-900">Days Until Trip</span>
              </div>
              <div className="mt-1 text-2xl font-bold text-blue-600">
                {differenceInDays(selectedTrip.startDate, new Date())}
              </div>
            </div>
            
            <div className="rounded-lg bg-green-50 p-4">
              <div className="flex items-center gap-2">
                <DocumentArrowUpIcon className="h-5 w-5 text-green-600" />
                <span className="text-sm font-medium text-green-900">Travel Tasks</span>
              </div>
              <div className="mt-1 text-2xl font-bold text-green-600">
                {tripTasks.length}
              </div>
            </div>
            
            <div className="rounded-lg bg-purple-50 p-4">
              <div className="flex items-center gap-2">
                <UserGroupIcon className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-medium text-purple-900">Events</span>
              </div>
              <div className="mt-1 text-2xl font-bold text-purple-600">
                {tripEvents.length}
              </div>
            </div>
            
            <div className="rounded-lg bg-orange-50 p-4">
              <div className="flex items-center gap-2">
                <SparklesIcon className="h-5 w-5 text-orange-600" />
                <span className="text-sm font-medium text-orange-900">AI Assistance</span>
              </div>
              <div className="mt-1 text-sm font-medium text-orange-600">
                {lastAIGeneration ? 'Generated' : 'Available'}
              </div>
            </div>
          </div>

          {/* AI Generation Success Banner */}
          {lastAIGeneration && (
            <div className="rounded-lg bg-green-100 border border-green-200 p-4">
              <div className="flex items-center gap-3">
                <SparklesIcon className="h-6 w-6 text-green-600" />
                <div>
                  <h4 className="font-medium text-green-900">
                    AI Travel Planning Complete!
                  </h4>
                  <p className="text-sm text-green-700">
                    Generated {lastAIGeneration.taskCount} tasks for your {lastAIGeneration.tripName} trip at {format(lastAIGeneration.timestamp, 'h:mm a')}
                  </p>
                </div>
                <button
                  onClick={() => setLastAIGeneration(null)}
                  className="ml-auto text-green-600 hover:text-green-800"
                >
                  ×
                </button>
              </div>
            </div>
          )}

          {/* Custom Task Creator for Trip */}
          <TripTaskCreator 
            selectedTrip={selectedTrip}
            onTaskCreated={loadTripTasks}
          />

          {/* Iterative Brain Dump */}
          <IterativeBrainDump 
            selectedTrip={selectedTrip}
            onTasksGenerated={loadTripTasks}
          />

          {/* Trip Tasks Hub */}
          <TripTasksHub 
            tripTasks={tripTasks} 
            selectedTrip={selectedTrip}
          />

          <div className="grid gap-6 lg:grid-cols-2">
            <TripItinerary trip={selectedTrip} />
            <div className="space-y-6">
              <PackingList trip={selectedTrip} />
              {smartPackingList && <SmartPackingList data={smartPackingList} />}
            </div>
          </div>
          
          {/* Trip Events */}
          {tripEvents.length > 0 && (
            <div>
              <h3 className="mb-4 text-lg font-semibold">Trip Events</h3>
              <div className="space-y-4">
                {tripEvents.map(event => (
                  <TravelEvent
                    key={event.id}
                    event={event}
                    onUpdate={loadTripEvents}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* France Trip Preparation */}
      {selectedTrip?.destination?.includes('France') && (
        <div className="mt-8 rounded-lg bg-blue-50 p-6">
          <h3 className="mb-4 text-lg font-semibold text-blue-900">
            🇫🇷 France Trip Preparation
          </h3>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <h4 className="mb-2 font-medium">Essential Documents</h4>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>✓ Valid passports for all family members</li>
                <li>✓ Travel insurance documentation</li>
                <li>✓ Hotel & activity confirmations</li>
                <li>✓ Emergency contact information</li>
              </ul>
            </div>
            <div>
              <h4 className="mb-2 font-medium">Family Considerations</h4>
              <ul className="space-y-1 text-sm text-gray-700">
                <li>✓ Kid-friendly activities planned</li>
                <li>✓ Snacks and entertainment for flights</li>
                <li>✓ Medication and first aid supplies</li>
                <li>✓ Stroller/carrier arrangements</li>
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* New Trip Form Modal */}
      {showNewTripForm && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowNewTripForm(false)}></div>
            </div>

            <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Plan New Trip</h3>
                
                <form className="space-y-4" onSubmit={async (e) => {
                  e.preventDefault();
                  
                  // Create a calendar event for the trip
                  try {
                    const { error } = await supabase
                      .from('calendar_events')
                      .insert({
                        title: `Trip to ${newTripData.destination}`,
                        description: newTripData.notes,
                        start_time: new Date(newTripData.startDate).toISOString(),
                        end_time: new Date(newTripData.endDate).toISOString(),
                        location: newTripData.destination,
                        event_type: 'flight',
                        google_event_id: `trip-${Date.now()}`,
                        calendar_id: 'local-calendar',
                        calendar_type: 'personal',
                        status: 'confirmed',
                        attendees: [],
                        all_day: true,
                        timezone: 'America/New_York'
                      });

                    if (error) throw error;

                    // Generate travel tasks
                    await generateTravelTasks({
                      destination: newTripData.destination,
                      startDate: new Date(newTripData.startDate),
                      endDate: new Date(newTripData.endDate)
                    });

                    // Reset form and close
                    setNewTripData({ destination: '', startDate: '', endDate: '', notes: '' });
                    setShowNewTripForm(false);
                    
                    // Refresh trips
                    fetchUpcomingTrips();
                  } catch (error) {
                    console.error('Error creating trip:', error);
                    alert('Failed to create trip. Please try again.');
                  }
                }}>
                  <div>
                    <label htmlFor="destination" className="block text-sm font-medium text-gray-700">
                      Destination
                    </label>
                    <input
                      type="text"
                      id="destination"
                      value={newTripData.destination}
                      onChange={(e) => setNewTripData({ ...newTripData, destination: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label htmlFor="startDate" className="block text-sm font-medium text-gray-700">
                        Start Date
                      </label>
                      <input
                        type="date"
                        id="startDate"
                        value={newTripData.startDate}
                        onChange={(e) => setNewTripData({ ...newTripData, startDate: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label htmlFor="endDate" className="block text-sm font-medium text-gray-700">
                        End Date
                      </label>
                      <input
                        type="date"
                        id="endDate"
                        value={newTripData.endDate}
                        onChange={(e) => setNewTripData({ ...newTripData, endDate: e.target.value })}
                        min={newTripData.startDate}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                      Notes (optional)
                    </label>
                    <textarea
                      id="notes"
                      rows={3}
                      value={newTripData.notes}
                      onChange={(e) => setNewTripData({ ...newTripData, notes: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>

                  <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Create Trip
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowNewTripForm(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Event Form Modal */}
      {showEventForm && selectedTrip && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center px-4 pt-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity" aria-hidden="true">
              <div className="absolute inset-0 bg-gray-500 opacity-75" onClick={() => setShowEventForm(false)}></div>
            </div>

            <div className="inline-block transform overflow-hidden rounded-lg bg-white text-left align-bottom shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:align-middle">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">Add Trip Event</h3>
                
                <form className="space-y-4" onSubmit={async (e) => {
                  e.preventDefault();
                  
                  try {
                    const { error } = await supabase
                      .from('trip_events')
                      .insert({
                        trip_id: selectedTrip.id,
                        user_id: user?.id,
                        event_name: newEventData.eventName,
                        event_type: newEventData.eventType,
                        event_date: newEventData.eventDate,
                        venue_name: newEventData.venue,
                        dress_code: newEventData.dressCode,
                        website_url: newEventData.website,
                        attendees: ['You', 'Your wife']
                      });

                    if (error) throw error;

                    setNewEventData({
                      eventName: '',
                      eventType: 'wedding',
                      eventDate: '',
                      venue: '',
                      dressCode: '',
                      website: ''
                    });
                    setShowEventForm(false);
                    loadTripEvents();
                  } catch (error) {
                    console.error('Error creating event:', error);
                    alert('Failed to create event. Please try again.');
                  }
                }}>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Event Name
                    </label>
                    <input
                      type="text"
                      value={newEventData.eventName}
                      onChange={(e) => setNewEventData({ ...newEventData, eventName: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Event Type
                    </label>
                    <select
                      value={newEventData.eventType}
                      onChange={(e) => setNewEventData({ ...newEventData, eventType: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    >
                      <option value="wedding">Wedding</option>
                      <option value="conference">Conference</option>
                      <option value="dinner">Dinner</option>
                      <option value="tour">Tour</option>
                      <option value="show">Show/Entertainment</option>
                      <option value="cultural_event">Cultural Event</option>
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Event Date
                      </label>
                      <input
                        type="date"
                        value={newEventData.eventDate}
                        onChange={(e) => setNewEventData({ ...newEventData, eventDate: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700">
                        Dress Code
                      </label>
                      <input
                        type="text"
                        value={newEventData.dressCode}
                        onChange={(e) => setNewEventData({ ...newEventData, dressCode: e.target.value })}
                        placeholder="e.g., Black tie, Cocktail"
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Venue
                    </label>
                    <input
                      type="text"
                      value={newEventData.venue}
                      onChange={(e) => setNewEventData({ ...newEventData, venue: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">
                      Website URL (optional)
                    </label>
                    <input
                      type="url"
                      value={newEventData.website}
                      onChange={(e) => setNewEventData({ ...newEventData, website: e.target.value })}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                    />
                  </div>

                  <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-blue-600 text-base font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Add Event
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowEventForm(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 sm:mt-0 sm:w-auto sm:text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* AI Planning Assistant */}
      {showAIPlanningAssistant && selectedTrip && (
        <TravelPlanningAssistant
          trip={selectedTrip}
          onComplete={(generatedTasksCount) => {
            // Refresh trip data after AI planning completes
            loadTripEvents();
            loadTripTasks();
            fetchUpcomingTrips();
            setLastAIGeneration({
              timestamp: new Date(),
              taskCount: generatedTasksCount,
              tripName: selectedTrip.destination
            });
          }}
          onClose={() => setShowAIPlanningAssistant(false)}
        />
      )}
    </div>
  );
}

const SmartPackingList = ({ data }) => {
  const [checkedItems, setCheckedItems] = useState({});
  
  const toggleItem = (category, item) => {
    const key = `${category}-${item}`;
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };
  
  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="mb-4 flex items-center gap-2">
        <SparklesIcon className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold">AI-Generated Packing List</h3>
      </div>
      
      {data && Object.entries(data).map(([category, items]) => (
        <div key={category} className="mb-4">
          <h4 className="mb-2 font-medium text-gray-700 capitalize">
            {category.replace('_', ' ')}
          </h4>
          <div className="space-y-1">
            {(Array.isArray(items) ? items : items.items || []).map((item, idx) => {
              const itemName = typeof item === 'string' ? item : item.name || item;
              const quantity = typeof item === 'object' ? item.quantity : '';
              const forWho = typeof item === 'object' ? item.for : '';
              const key = `${category}-${itemName}-${idx}`;
              
              return (
                <label key={key} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={checkedItems[key] || false}
                    onChange={() => toggleItem(category, `${itemName}-${idx}`)}
                    className="rounded border-gray-300"
                  />
                  <span className={checkedItems[key] ? 'line-through text-gray-400' : ''}>
                    {itemName}
                    {quantity && ` (${quantity})`}
                    {forWho && ` - ${forWho}`}
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const IterativeBrainDump = ({ selectedTrip, onTasksGenerated }) => {
  const { generateWithAI } = useAIAssistant();
  const { createTask } = useTasks();
  const { user } = useAuthState();
  const [showBrainDump, setShowBrainDump] = useState(false);
  const [brainDumpText, setBrainDumpText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [brainDumpHistory, setBrainDumpHistory] = useState([]);
  const [lastGeneration, setLastGeneration] = useState(null);

  useEffect(() => {
    if (user?.id) {
      loadBrainDumpHistory();
    }
  }, [selectedTrip.destination, user?.id]);

  const loadBrainDumpHistory = async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('travel_brain_dumps')
        .select('*')
        .eq('trip_destination', selectedTrip.destination)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error && error.code !== '42P01' && error.status !== 404) { // Table doesn't exist yet
        throw error;
      }
      setBrainDumpHistory(data || []);
    } catch (error) {
      console.error('Error loading brain dump history:', error);
      // If table doesn't exist, just use empty array
      setBrainDumpHistory([]);
    }
  };

  const saveBrainDumpToHistory = async (text, generatedTaskCount) => {
    if (!user?.id) return;
    
    try {
      const { error } = await supabase
        .from('travel_brain_dumps')
        .insert({
          trip_destination: selectedTrip.destination,
          user_id: user.id,
          brain_dump_text: text,
          generated_task_count: generatedTaskCount,
          created_at: new Date().toISOString()
        });
      
      if (error && error.code !== '42P01' && error.status !== 404) {
        throw error;
      }
    } catch (error) {
      console.error('Error saving brain dump:', error);
      // If table doesn't exist, continue without saving history
    }
  };

  const handleBrainDumpSubmit = async () => {
    if (!brainDumpText.trim()) return;
    
    setIsProcessing(true);
    try {
      const contextualPrompt = `I'm continuing to plan my ${selectedTrip.destination} trip (${format(selectedTrip.startDate, 'MMM d')} - ${format(selectedTrip.endDate, 'MMM d')}). 
      
      ${brainDumpHistory.length > 0 ? `I've already done some planning - here's my previous thoughts:
      ${brainDumpHistory.slice(0, 2).map(dump => `• ${dump.brain_dump_text.substring(0, 200)}...`).join('\n')}
      
      Now I have some additional thoughts:` : 'Here are my additional thoughts about this trip:'}
      
      "${brainDumpText}"
      
      Please analyze these new thoughts and create specific, actionable tasks. Focus on:
      1. NEW items I haven't thought of before
      2. Building on previous planning (if any)
      3. Time-sensitive items based on trip date
      4. Family logistics and coordination
      
      Return ONLY a JSON array of tasks:
      [{"title": "task title", "description": "detailed description", "priority": 1-5, "deadline": "YYYY-MM-DD", "category": "category"}]
      
      Categories: EVENTS, HOME_LOGISTICS, LIFE_ADMIN, SHOPPING_WARDROBE, FAMILY_KIDS, WORK_PROFESSIONAL, TRAVEL_LOGISTICS, HEALTH_DOCUMENTS, TECH_ADMIN`;

      const response = await generateWithAI(contextualPrompt);
      console.log('AI response for iterative brain dump:', response);
      
      // Clean response and parse
      let cleanedResponse = response.trim();
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      let tasks;
      try {
        tasks = JSON.parse(cleanedResponse);
        if (!Array.isArray(tasks)) {
          throw new Error('Response is not an array');
        }
      } catch (parseError) {
        console.error('Failed to parse AI response:', parseError);
        // Create a basic task from the brain dump
        tasks = [{
          title: `Review brain dump: ${brainDumpText.substring(0, 50)}...`,
          description: brainDumpText,
          priority: 3,
          deadline: format(addDays(new Date(), 3), 'yyyy-MM-dd'),
          category: 'TRAVEL_LOGISTICS'
        }];
      }

      // Create tasks
      let createdCount = 0;
      for (const taskData of tasks) {
        try {
          await createTask({
            title: taskData.title,
            description: `${taskData.description} (${selectedTrip.destination} trip)`,
            priority: taskData.priority || 3,
            deadline: taskData.deadline ? new Date(taskData.deadline).toISOString() : null,
            context: 'Travel'
          });
          createdCount++;
        } catch (error) {
          console.error('Error creating task:', error);
        }
      }

      // Save to history
      await saveBrainDumpToHistory(brainDumpText, createdCount);
      
      // Update state
      setLastGeneration({
        taskCount: createdCount,
        timestamp: new Date()
      });
      setBrainDumpText('');
      setShowBrainDump(false);
      
      // Refresh tasks and history
      if (onTasksGenerated) onTasksGenerated();
      await loadBrainDumpHistory();
      
    } catch (error) {
      console.error('Error processing brain dump:', error);
      alert('Failed to process brain dump. Please try again.');
    }
    setIsProcessing(false);
  };

  if (!showBrainDump) {
    return (
      <div className="rounded-lg bg-white p-6 shadow mb-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-purple-100 rounded-lg">
              <SparklesIcon className="h-6 w-6 text-purple-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">AI Brain Dump</h3>
              <p className="text-sm text-gray-600">
                Got new thoughts about your {selectedTrip.destination} trip? Let AI turn them into tasks!
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            {brainDumpHistory.length > 0 && (
              <div className="text-right text-xs text-gray-500">
                <div>{brainDumpHistory.length} previous brain dumps</div>
                <div>{brainDumpHistory.reduce((sum, dump) => sum + (dump.generated_task_count || 0), 0)} tasks generated</div>
              </div>
            )}
            
            <button
              onClick={() => setShowBrainDump(true)}
              className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700"
            >
              <ChatBubbleLeftRightIcon className="h-4 w-4" />
              Add Brain Dump
            </button>
          </div>
        </div>

        {/* Recent success message */}
        {lastGeneration && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
            <p className="text-sm text-green-800">
              ✅ Generated {lastGeneration.taskCount} tasks from your last brain dump at {format(lastGeneration.timestamp, 'h:mm a')}
            </p>
          </div>
        )}

        {/* Quick history preview */}
        {brainDumpHistory.length > 0 && (
          <div className="mt-4 border-t pt-4">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Recent Brain Dumps:</h4>
            <div className="space-y-2">
              {brainDumpHistory.slice(0, 2).map((dump) => (
                <div key={dump.id} className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                  <div className="flex justify-between items-start">
                    <p className="line-clamp-2">{dump.brain_dump_text.substring(0, 120)}...</p>
                    <span className="ml-2 text-green-600 font-medium">+{dump.generated_task_count}</span>
                  </div>
                  <p className="text-gray-400 mt-1">{format(new Date(dump.created_at), 'MMM d, h:mm a')}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow mb-6">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2 bg-purple-100 rounded-lg">
          <SparklesIcon className="h-6 w-6 text-purple-600" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">AI Brain Dump</h3>
          <p className="text-sm text-gray-600">
            What new thoughts do you have about your {selectedTrip.destination} trip?
          </p>
        </div>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Brain Dump ({brainDumpHistory.length > 0 ? 'Additional' : 'New'} Thoughts)
          </label>
          <textarea
            value={brainDumpText}
            onChange={(e) => setBrainDumpText(e.target.value)}
            rows={6}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-purple-500"
            placeholder={brainDumpHistory.length > 0 
              ? "Just had another thought... Maybe I need to arrange a dog sitter, or pick up dry cleaning, or check if the hotel has a pool for the kids..."
              : "Just dump everything on your mind about this trip... don't organize it, just brain dump! Think about events, family logistics, shopping needs, work prep, home arrangements..."
            }
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={handleBrainDumpSubmit}
            disabled={isProcessing || !brainDumpText.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:bg-purple-300"
          >
            {isProcessing ? (
              <>
                <svg className="h-4 w-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                Processing...
              </>
            ) : (
              <>
                <SparklesIcon className="h-4 w-4" />
                Generate Tasks
              </>
            )}
          </button>
          <button
            onClick={() => {
              setShowBrainDump(false);
              setBrainDumpText('');
            }}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>

        {brainDumpHistory.length > 0 && (
          <div className="text-xs text-gray-500 bg-gray-50 p-3 rounded">
            💡 <strong>Tip:</strong> I'll consider your previous brain dumps for context, so just focus on new thoughts or things you've remembered since last time!
          </div>
        )}
      </div>
    </div>
  );
};

const TripTaskCreator = ({ selectedTrip, onTaskCreated }) => {
  const { createTask } = useTasks();
  const [showForm, setShowForm] = useState(false);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    priority: 3,
    deadline: ''
  });
  const [creating, setCreating] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newTask.title.trim()) return;

    setCreating(true);
    try {
      await createTask({
        ...newTask,
        context: 'Travel',
        description: newTask.description + ` (${selectedTrip.destination} trip)`
      });

      // Reset form
      setNewTask({
        title: '',
        description: '',
        priority: 3,
        deadline: ''
      });
      setShowForm(false);
      
      // Refresh tasks
      if (onTaskCreated) onTaskCreated();
      
    } catch (error) {
      console.error('Error creating trip task:', error);
    }
    setCreating(false);
  };

  const handleCancel = () => {
    setShowForm(false);
    setNewTask({
      title: '',
      description: '',
      priority: 3,
      deadline: ''
    });
  };

  if (!showForm) {
    return (
      <div className="rounded-lg bg-white p-6 shadow mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-semibold text-gray-900">Trip Tasks</h3>
            <p className="text-sm text-gray-600">Manage tasks for your {selectedTrip.destination} trip</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Add Custom Task
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Add Trip Task</h3>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Task Title *
          </label>
          <input
            type="text"
            id="title"
            value={newTask.title}
            onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            placeholder={`Task for ${selectedTrip.destination} trip...`}
            required
          />
        </div>

        <div>
          <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
            Description
          </label>
          <textarea
            id="description"
            value={newTask.description}
            onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            rows={2}
            className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            placeholder="Task details..."
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
              Priority
            </label>
            <select
              id="priority"
              value={newTask.priority}
              onChange={(e) => setNewTask({ ...newTask, priority: parseInt(e.target.value) })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
            >
              <option value={1}>1 - Low</option>
              <option value={2}>2 - Medium-Low</option>
              <option value={3}>3 - Medium</option>
              <option value={4}>4 - High</option>
              <option value={5}>5 - Critical</option>
            </select>
          </div>

          <div>
            <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-1">
              Deadline
            </label>
            <input
              type="date"
              id="deadline"
              value={newTask.deadline}
              onChange={(e) => setNewTask({ ...newTask, deadline: e.target.value })}
              className="w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
              min={new Date().toISOString().split('T')[0]}
              max={format(selectedTrip.endDate, 'yyyy-MM-dd')}
            />
          </div>
        </div>

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={creating || !newTask.title.trim()}
            className="inline-flex items-center gap-2 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:bg-blue-300"
          >
            {creating ? 'Creating...' : 'Create Task'}
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="inline-flex items-center gap-2 rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};

const TripTasksHub = ({ tripTasks, selectedTrip }) => {
  const [filter, setFilter] = useState('all');
  
  // Group tasks by category based on context and keywords
  const groupedTasks = tripTasks.reduce((groups, task) => {
    let category = 'Other';
    
    const description = (task.description || '').toLowerCase();
    const title = (task.title || '').toLowerCase();
    
    if (task.context === 'Travel') category = 'Travel';
    else if (task.context === 'Home') category = 'Home';
    else if (task.context === 'Family') category = 'Family';
    else if (task.context === 'Work') category = 'Work';
    else if (description.includes('passport') || description.includes('document')) category = 'Health & Documents';
    else if (description.includes('pack') || title.includes('pack')) category = 'Packing';
    else if (description.includes('book') || description.includes('reservation')) category = 'Bookings';
    else if (description.includes('family') || description.includes('meeting')) category = 'Family & Kids';
    
    if (!groups[category]) groups[category] = [];
    groups[category].push(task);
    return groups;
  }, {});

  const getCategoryIcon = (category) => {
    const iconClass = "h-5 w-5";
    switch (category) {
      case 'Health & Documents': return <DocumentArrowUpIcon className={iconClass} />;
      case 'Packing': return <UserGroupIcon className={iconClass} />;
      case 'Bookings': return <DocumentArrowUpIcon className={iconClass} />;
      case 'Family & Kids': return <UserGroupIcon className={iconClass} />;
      case 'Work': return <DocumentArrowUpIcon className={iconClass} />;
      case 'Travel': return <CalendarIcon className={iconClass} />;
      case 'Home': return <DocumentArrowUpIcon className={iconClass} />;
      case 'Family': return <UserGroupIcon className={iconClass} />;
      default: return <DocumentArrowUpIcon className={iconClass} />;
    }
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'Health & Documents': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'Packing': return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'Bookings': return 'bg-green-100 text-green-800 border-green-200';
      case 'Family & Kids': return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'Work': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'Travel': return 'bg-cyan-100 text-cyan-800 border-cyan-200';
      case 'Home': return 'bg-green-100 text-green-800 border-green-200';
      case 'Family': return 'bg-pink-100 text-pink-800 border-pink-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getPriorityColor = (priority) => {
    if (priority >= 4) return 'text-red-600 bg-red-50';
    if (priority === 3) return 'text-yellow-600 bg-yellow-50';
    return 'text-gray-600 bg-gray-50';
  };

  const formatDeadline = (deadline) => {
    const date = new Date(deadline);
    const daysUntil = differenceInDays(date, new Date());
    
    if (daysUntil < 0) return { text: 'Overdue', class: 'text-red-600 bg-red-50' };
    if (daysUntil === 0) return { text: 'Today', class: 'text-orange-600 bg-orange-50' };
    if (daysUntil === 1) return { text: 'Tomorrow', class: 'text-yellow-600 bg-yellow-50' };
    if (daysUntil <= 7) return { text: `${daysUntil} days`, class: 'text-blue-600 bg-blue-50' };
    return { text: format(date, 'MMM d'), class: 'text-gray-600 bg-gray-50' };
  };

  if (tripTasks.length === 0) {
    return (
      <div className="rounded-lg bg-white p-8 shadow text-center">
        <SparklesIcon className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Travel Tasks Yet</h3>
        <p className="text-gray-600 mb-4">
          Use the AI Trip Planner to generate a comprehensive task list for your {selectedTrip.destination} trip.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-lg bg-white p-6 shadow">
      <div className="mb-6 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {selectedTrip.destination} Trip Tasks
        </h3>
        <div className="flex gap-2">
          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="rounded-md border-gray-300 text-sm"
          >
            <option value="all">All Tasks</option>
            <option value="pending">Pending</option>
            <option value="urgent">Urgent</option>
            <option value="completed">Completed</option>
          </select>
        </div>
      </div>

      <div className="space-y-6">
        {Object.entries(groupedTasks).map(([category, tasks]) => (
          <div key={category} className="border-l-4 border-gray-200 pl-4">
            <div className="mb-3 flex items-center gap-2">
              {getCategoryIcon(category)}
              <h4 className="font-medium text-gray-900">{category}</h4>
              <span className="text-xs text-gray-500">({tasks.length} tasks)</span>
            </div>
            
            <div className="space-y-2">
              {tasks.map(task => {
                const deadline = formatDeadline(task.deadline);
                return (
                  <div key={task.id} className={`rounded-lg border p-3 transition-all hover:shadow-sm ${getCategoryColor(category)}`}>
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h5 className="font-medium">{task.title}</h5>
                        <p className="text-sm opacity-80 mt-1">{task.description}</p>
                      </div>
                      <div className="ml-4 flex flex-col items-end gap-1">
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${deadline.class}`}>
                          {deadline.text}
                        </span>
                        <span className={`rounded-full px-2 py-1 text-xs font-medium ${getPriorityColor(task.priority)}`}>
                          P{task.priority}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TravelDashboard;