import React, { useState, useEffect } from 'react';
import { format, differenceInDays, addDays } from 'date-fns';
import { supabase } from '../lib/supabaseClient';
import { useTasks } from '../providers/TaskProvider';
import { useNavigate } from 'react-router-dom';

function TravelDashboard() {
  const navigate = useNavigate();
  const { createTask } = useTasks();
  const [upcomingTrips, setUpcomingTrips] = useState([]);
  const [selectedTrip, setSelectedTrip] = useState(null);
  const [showNewTripForm, setShowNewTripForm] = useState(false);
  const [newTripData, setNewTripData] = useState({
    destination: '',
    startDate: '',
    endDate: '',
    notes: ''
  });
  const [loading, setLoading] = useState(true);

  // Fetch trips from calendar events with travel keywords
  useEffect(() => {
    fetchUpcomingTrips();
  }, []);

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
    const tasks = [];
    const daysUntilTrip = differenceInDays(trip.startDate, new Date());

    // Document preparation
    tasks.push({
      title: 'Check passport expiration dates',
      description: 'Ensure all family members have valid passports',
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
      title: 'Confirm all reservations',
      description: 'Hotels, car rentals, restaurants, activities',
      priority: 4,
      deadline: addDays(new Date(), Math.max(1, daysUntilTrip - 5)),
      context: 'Travel'
    });

    // Family coordination
    tasks.push({
      title: 'Family travel meeting',
      description: 'Review itinerary and assign responsibilities',
      priority: 3,
      deadline: addDays(new Date(), Math.max(1, daysUntilTrip - 4)),
      context: 'Family'
    });

    // Create tasks
    for (const taskData of tasks) {
      await createTask(taskData);
    }
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
    const [items, setItems] = useState([
      { id: 1, category: 'Documents', items: ['Passports', 'Travel insurance', 'Boarding passes', 'Hotel confirmations'], checked: {} },
      { id: 2, category: 'Clothing', items: ['Outfits for ' + differenceInDays(trip.endDate, trip.startDate) + ' days', 'Comfortable shoes', 'Jacket', 'Swimwear'], checked: {} },
      { id: 3, category: 'Electronics', items: ['Phone chargers', 'Adapters', 'Camera', 'Headphones'], checked: {} },
      { id: 4, category: 'Health', items: ['Medications', 'First aid kit', 'Sunscreen', 'Hand sanitizer'], checked: {} }
    ]);

    const toggleItem = (categoryId, item) => {
      setItems(prev => prev.map(cat => 
        cat.id === categoryId 
          ? { ...cat, checked: { ...cat.checked, [item]: !cat.checked[item] } }
          : cat
      ));
    };

    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold">Packing Checklist</h3>
        <div className="space-y-4">
          {items.map(category => (
            <div key={category.id}>
              <h4 className="mb-2 font-medium text-gray-700">{category.category}</h4>
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
        </div>
      </div>
    );
  };

  const TripItinerary = ({ trip }) => {
    return (
      <div className="rounded-lg bg-white p-6 shadow">
        <h3 className="mb-4 text-lg font-semibold">Itinerary</h3>
        <div className="space-y-3">
          {trip.events.map(event => (
            <div key={event.id} className="flex gap-4 border-l-2 border-blue-300 pl-4">
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
        </div>
        <button
          onClick={() => navigate('/calendar')}
          className="mt-4 text-sm text-blue-600 hover:text-blue-700"
        >
          View full calendar →
        </button>
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
          <button
            onClick={() => generateTravelTasks(selectedTrip)}
            className="rounded-md border border-blue-600 px-4 py-2 text-blue-600 hover:bg-blue-50"
          >
            Generate Travel Tasks
          </button>
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
        <div className="grid gap-6 lg:grid-cols-2">
          <TripItinerary trip={selectedTrip} />
          <PackingList trip={selectedTrip} />
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
    </div>
  );
}

export default TravelDashboard;