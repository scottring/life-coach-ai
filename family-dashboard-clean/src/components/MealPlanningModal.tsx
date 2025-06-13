import React, { useState, useEffect } from 'react';
import { 
  CalendarIcon, 
  SparklesIcon, 
  UserGroupIcon, 
  XMarkIcon,
  PlusIcon,
  ClockIcon,
  FireIcon,
  CheckCircleIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import { MealPlanningService } from '../services/mealPlanningService';
import { AIMealService } from '../services/aiMealService';
import { FamilyMember, WeeklyMealPlan } from '../types/mealPlanning';
import FamilyPreferencesModal from './FamilyPreferencesModal';

interface MealPlanningModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  userId: string;
}

type WizardStep = 'who-eating' | 'diet-parameters' | 'availability' | 'review' | 'tracking';

export default function MealPlanningModalWizard({ isOpen, onClose, familyId, userId }: MealPlanningModalProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('who-eating');
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  
  // Wizard-specific state
  const [selectedFamilyMembers, setSelectedFamilyMembers] = useState<string[]>([]);
  const [weeklyGuests, setWeeklyGuests] = useState<{id: string, name: string, count: number}[]>([]);
  const [generatedMealPlan, setGeneratedMealPlan] = useState<WeeklyMealPlan | null>(null);
  const [dietParameters, setDietParameters] = useState({
    generalPreferences: '',
    memberGoals: {} as {[memberId: string]: string}
  });
  const [availabilityGrid, setAvailabilityGrid] = useState<{[memberId: string]: {[dateKey: string]: {breakfast: boolean, lunch: boolean, dinner: boolean}}}>({});

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, familyId]);

  useEffect(() => {
    // Auto-select all family members when they're loaded
    if (familyMembers.length > 0 && selectedFamilyMembers.length === 0) {
      setSelectedFamilyMembers(familyMembers.map(m => m.id));
    }
  }, [familyMembers]);

  const loadData = async () => {
    if (!familyId) return;
    
    setLoading(true);
    try {
      const members = await MealPlanningService.getFamilyMembers(familyId);
      setFamilyMembers(members);
    } catch (error) {
      console.error('Error loading family members:', error);
    } finally {
      setLoading(false);
    }
  };

  // Helper functions
  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Monday as start
    return new Date(d.setDate(diff));
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  // Wizard navigation functions
  const nextStep = () => {
    switch (currentStep) {
      case 'who-eating':
        setCurrentStep('diet-parameters');
        break;
      case 'diet-parameters':
        setCurrentStep('availability');
        break;
      case 'availability':
        generateMealPlan();
        break;
      case 'review':
        acceptMealPlan();
        break;
    }
  };

  const prevStep = () => {
    switch (currentStep) {
      case 'diet-parameters':
        setCurrentStep('who-eating');
        break;
      case 'availability':
        setCurrentStep('diet-parameters');
        break;
      case 'review':
        setCurrentStep('availability');
        break;
      case 'tracking':
        setCurrentStep('review');
        break;
    }
  };

  const canProceedToNext = () => {
    switch (currentStep) {
      case 'who-eating':
        return selectedFamilyMembers.length > 0;
      case 'diet-parameters':
        return true;
      case 'availability':
        // Check if at least one meal is selected across all days and members
        return selectedFamilyMembers.some(memberId => {
          const memberGrid = availabilityGrid[memberId];
          if (!memberGrid) return false;
          return Object.values(memberGrid).some(day => 
            day.breakfast || day.lunch || day.dinner
          );
        });
      case 'review':
        return generatedMealPlan !== null;
      default:
        return false;
    }
  };

  const generateMealPlan = async () => {
    setGeneratingPlan(true);
    try {
      const weekStart = getWeekStart(selectedWeek);
      const weekStartStr = weekStart.toISOString().split('T')[0];
      
      // Get recent meal plans to avoid repetition
      const recentPlans = await MealPlanningService.getRecentMealPlans(familyId, 4);
      const previousMeals = recentPlans.flatMap(plan => 
        plan.dailyPlans.flatMap(day => 
          day.meals.map(meal => ({ name: meal.notes || 'Meal', id: meal.mealId }))
        )
      );

      // Build preferences from diet parameters and availability
      const selectedMembers = familyMembers.filter(m => selectedFamilyMembers.includes(m.id));
      const preferences = {
        cuisinePreferences: dietParameters.generalPreferences ? [dietParameters.generalPreferences] : [],
        avoidIngredients: selectedMembers.flatMap(m => m.dislikedIngredients),
        dietaryRestrictions: selectedMembers.flatMap(m => m.dietaryRestrictions),
        budgetConstraints: 'moderate',
        cookingTime: 'medium' as const,
        healthFocus: 'balanced' as const
      };

      // Create a targeted meal plan based on availability BEFORE calling AI
      const availabilityWeekStart = getWeekStart(selectedWeek);
      const requestedMeals: Array<{date: string, mealType: 'breakfast' | 'lunch' | 'dinner', peopleEating: string[]}> = [];

      // Build list of exactly which meals are needed
      for (let i = 0; i < 7; i++) {
        const date = new Date(availabilityWeekStart);
        date.setDate(date.getDate() + i);
        const dateKey = date.toISOString().split('T')[0];
        
        // Check each meal type for this day
        (['breakfast', 'lunch', 'dinner'] as const).forEach(mealType => {
          const peopleEating = selectedMembers.filter(member => 
            availabilityGrid[member.id]?.[dateKey]?.[mealType]
          );
          
          if (peopleEating.length > 0) {
            requestedMeals.push({
              date: dateKey,
              mealType,
              peopleEating: peopleEating.map(m => m.id)
            });
          }
        });
      }

      console.log('Requested meals:', requestedMeals);

      if (requestedMeals.length === 0) {
        alert('No meals selected! Please go back and select at least one meal.');
        setCurrentStep('availability');
        return;
      }

      // Generate AI meal plan
      const aiResponse = await AIMealService.generateWeeklyMealPlan({
        familyMembers: selectedMembers,
        weekStartDate: weekStartStr,
        preferences,
        previousMeals,
        availabilityGrid
      });

      if (!aiResponse.success || !aiResponse.weeklyPlan) {
        throw new Error(aiResponse.error || 'Failed to generate meal plan');
      }

      console.log('AI Generated Daily Plans:', aiResponse.weeklyPlan.dailyPlans);
      console.log('AI Plan Dates:', aiResponse.weeklyPlan.dailyPlans.map(d => d.date));
      
      // The AI service now generates exactly what we need based on availability
      // No need for complex filtering - just use the AI response directly
      setGeneratedMealPlan(aiResponse.weeklyPlan);
      setCurrentStep('review');
    } catch (error) {
      console.error('Error generating AI meal plan:', error);
      alert(`Error generating meal plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGeneratingPlan(false);
    }
  };

  const acceptMealPlan = async () => {
    if (!generatedMealPlan) return;

    try {
      const planId = await MealPlanningService.saveWeeklyMealPlan(generatedMealPlan);
      if (planId) {
        setCurrentStep('tracking');
      }
    } catch (error) {
      console.error('Error saving meal plan:', error);
      alert('Error saving meal plan');
    }
  };

  // Availability grid functions
  const togglePersonMeal = (memberId: string, dateKey: string, mealType: 'breakfast' | 'lunch' | 'dinner') => {
    const newGrid = { ...availabilityGrid };
    if (!newGrid[memberId]) newGrid[memberId] = {};
    if (!newGrid[memberId][dateKey]) {
      newGrid[memberId][dateKey] = { breakfast: false, lunch: false, dinner: false };
    }
    newGrid[memberId][dateKey][mealType] = !newGrid[memberId][dateKey][mealType];
    setAvailabilityGrid(newGrid);
  };

  const togglePersonWeek = (memberId: string) => {
    const weekStart = getWeekStart(selectedWeek);
    const newGrid = { ...availabilityGrid };
    
    // Check if all meals for this person this week are selected
    const allSelected = Array.from({length: 7}, (_, i) => {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      const availability = newGrid[memberId]?.[dateKey] || { breakfast: false, lunch: false, dinner: false };
      return availability.breakfast && availability.lunch && availability.dinner;
    }).every(Boolean);

    // Toggle all meals for this person for the week
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      
      if (!newGrid[memberId]) newGrid[memberId] = {};
      newGrid[memberId][dateKey] = { 
        breakfast: !allSelected, 
        lunch: !allSelected, 
        dinner: !allSelected 
      };
    }
    
    setAvailabilityGrid(newGrid);
  };

  const toggleDayMeal = (dayIndex: number, mealType: 'breakfast' | 'lunch' | 'dinner') => {
    const weekStart = getWeekStart(selectedWeek);
    const date = new Date(weekStart);
    date.setDate(date.getDate() + dayIndex);
    const dateKey = date.toISOString().split('T')[0];
    
    // Check if all people are selected for this day/meal
    const allSelected = selectedFamilyMembers.every(memberId => 
      availabilityGrid[memberId]?.[dateKey]?.[mealType] === true
    );

    const newGrid = { ...availabilityGrid };
    
    // Toggle all people for this day/meal
    selectedFamilyMembers.forEach(memberId => {
      if (!newGrid[memberId]) newGrid[memberId] = {};
      if (!newGrid[memberId][dateKey]) {
        newGrid[memberId][dateKey] = { breakfast: false, lunch: false, dinner: false };
      }
      newGrid[memberId][dateKey][mealType] = !allSelected;
    });
    
    setAvailabilityGrid(newGrid);
  };

  const toggleAllMeals = () => {
    const weekStart = getWeekStart(selectedWeek);
    const newGrid = { ...availabilityGrid };
    
    // Check if everything is selected
    const allSelected = selectedFamilyMembers.every(memberId => 
      Array.from({length: 7}, (_, i) => {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        const dateKey = date.toISOString().split('T')[0];
        const availability = newGrid[memberId]?.[dateKey] || { breakfast: false, lunch: false, dinner: false };
        return availability.breakfast && availability.lunch && availability.dinner;
      }).every(Boolean)
    );

    // Toggle everything
    selectedFamilyMembers.forEach(memberId => {
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        const dateKey = date.toISOString().split('T')[0];
        
        if (!newGrid[memberId]) newGrid[memberId] = {};
        newGrid[memberId][dateKey] = { 
          breakfast: !allSelected, 
          lunch: !allSelected, 
          dinner: !allSelected 
        };
      }
    });
    
    setAvailabilityGrid(newGrid);
  };

  if (!isOpen) return null;

  const stepTitles = {
    'who-eating': 'Who\'s Eating This Week?',
    'diet-parameters': 'Diet Parameters',
    'availability': 'Who\'s Eating When',
    'review': 'Review Meal Plan',
    'tracking': 'Meal Tracking'
  };

  const stepNumbers = {
    'who-eating': 1,
    'diet-parameters': 2,
    'availability': 3,
    'review': 4,
    'tracking': 5
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Fixed Header with Step Progress */}
        <div className="p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center">
              <CalendarIcon className="h-6 w-6 text-blue-600 mr-2" />
              <h2 className="text-xl font-bold text-gray-900">Meal Planner</h2>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <XMarkIcon className="w-6 h-6" />
            </button>
          </div>
          
          {/* Step Progress */}
          <div className="flex items-center justify-center">
            {Object.entries(stepNumbers).map(([step, number]) => (
              <div key={step} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                  currentStep === step 
                    ? 'bg-blue-600 text-white' 
                    : stepNumbers[currentStep as keyof typeof stepNumbers] > number
                    ? 'bg-green-500 text-white'
                    : 'bg-gray-200 text-gray-600'
                }`}>
                  {stepNumbers[currentStep as keyof typeof stepNumbers] > number ? (
                    <CheckCircleIcon className="w-5 h-5" />
                  ) : (
                    number
                  )}
                </div>
                <span className={`ml-2 text-sm font-medium ${
                  currentStep === step ? 'text-blue-600' : 'text-gray-500'
                }`}>
                  {stepTitles[step as keyof typeof stepTitles]}
                </span>
                {number < 5 && <div className="w-8 h-px bg-gray-300 mx-4" />}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Step 1: Who's Eating */}
          {currentStep === 'who-eating' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Select who will be eating this week</h3>
                <p className="text-gray-600">Choose family members and add any guests</p>
              </div>

              {/* Week selector */}
              <div className="flex items-center justify-center space-x-4">
                <button
                  onClick={() => setSelectedWeek(new Date(selectedWeek.getTime() - 7 * 24 * 60 * 60 * 1000))}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <ChevronLeftIcon className="w-5 h-5" />
                </button>
                <div className="text-center">
                  <div className="text-lg font-medium text-gray-900">
                    Week of {formatDate(getWeekStart(selectedWeek))}
                  </div>
                </div>
                <button
                  onClick={() => setSelectedWeek(new Date(selectedWeek.getTime() + 7 * 24 * 60 * 60 * 1000))}
                  className="p-2 text-gray-400 hover:text-gray-600"
                >
                  <ChevronRightIcon className="w-5 h-5" />
                </button>
              </div>

              {/* Family Members */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Family Members</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {familyMembers.map(member => (
                    <label key={member.id} className="flex items-center p-4 border border-gray-200 rounded-lg hover:bg-gray-50 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedFamilyMembers.includes(member.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedFamilyMembers([...selectedFamilyMembers, member.id]);
                          } else {
                            setSelectedFamilyMembers(selectedFamilyMembers.filter(id => id !== member.id));
                          }
                        }}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="ml-3">
                        <div className="text-sm font-medium text-gray-900">{member.name}</div>
                        <div className="text-sm text-gray-500">{member.ageGroup}</div>
                      </div>
                    </label>
                  ))}
                </div>

                {familyMembers.length === 0 && (
                  <div className="text-center py-8">
                    <UserGroupIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No family members found</p>
                    <button
                      onClick={() => setShowPreferences(true)}
                      className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Add family members
                    </button>
                  </div>
                )}
              </div>

              {/* Guests */}
              <div>
                <h4 className="text-md font-medium text-gray-900 mb-4">Guests (Optional)</h4>
                <div className="space-y-3">
                  {weeklyGuests.map(guest => (
                    <div key={guest.id} className="flex items-center space-x-3 p-3 border border-gray-200 rounded-lg">
                      <input
                        type="text"
                        value={guest.name}
                        onChange={(e) => {
                          const updated = weeklyGuests.map(g => 
                            g.id === guest.id ? { ...g, name: e.target.value } : g
                          );
                          setWeeklyGuests(updated);
                        }}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md"
                        placeholder="Guest name"
                      />
                      <input
                        type="number"
                        value={guest.count}
                        onChange={(e) => {
                          const updated = weeklyGuests.map(g => 
                            g.id === guest.id ? { ...g, count: parseInt(e.target.value) || 1 } : g
                          );
                          setWeeklyGuests(updated);
                        }}
                        className="w-20 px-3 py-2 border border-gray-300 rounded-md"
                        min="1"
                        max="10"
                      />
                      <button
                        onClick={() => setWeeklyGuests(weeklyGuests.filter(g => g.id !== guest.id))}
                        className="text-red-500 hover:text-red-700"
                      >
                        <XMarkIcon className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
                  
                  <button
                    onClick={() => {
                      const newGuest = {
                        id: `guest_${Date.now()}`,
                        name: '',
                        count: 1
                      };
                      setWeeklyGuests([...weeklyGuests, newGuest]);
                    }}
                    className="flex items-center text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    <PlusIcon className="w-4 h-4 mr-1" />
                    Add Guest
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Diet Parameters */}
          {currentStep === 'diet-parameters' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Diet Parameters</h3>
                <p className="text-gray-600">Set preferences for this week's meal planning</p>
              </div>

              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    General Dietary Preferences
                  </label>
                  <textarea
                    value={dietParameters.generalPreferences}
                    onChange={(e) => setDietParameters(prev => ({ ...prev, generalPreferences: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    rows={3}
                    placeholder="Describe your family's dietary preferences, cooking style, and any general guidelines for this week..."
                  />
                </div>

                <div>
                  <h4 className="text-md font-medium text-gray-900 mb-4">Individual Goals (Optional)</h4>
                  {familyMembers.filter(m => selectedFamilyMembers.includes(m.id)).map(member => (
                    <div key={member.id} className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        {member.name}
                      </label>
                      <input
                        type="text"
                        value={dietParameters.memberGoals[member.id] || ''}
                        onChange={(e) => setDietParameters(prev => ({
                          ...prev,
                          memberGoals: { ...prev.memberGoals, [member.id]: e.target.value }
                        }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Special dietary goals for this week (e.g., high protein, light meals, etc.)"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Availability */}
          {currentStep === 'availability' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Who's Eating When</h3>
                <p className="text-gray-600">Select which meals each person will be eating</p>
              </div>

              {/* Select All Controls */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-blue-900">Quick Selection</h4>
                  <div className="flex space-x-2">
                    <button
                      onClick={toggleAllMeals}
                      className="px-3 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700"
                    >
                      Toggle All
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm">
                {/* Header */}
                <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b border-gray-200">
                  <div className="grid grid-cols-8 gap-0">
                    {/* Person column header */}
                    <div className="p-4 font-semibold text-gray-900 border-r border-gray-200">
                      <div className="text-sm">Person</div>
                    </div>
                    
                    {/* Day headers */}
                    {Array.from({length: 7}, (_, i) => {
                      const date = new Date(getWeekStart(selectedWeek));
                      date.setDate(date.getDate() + i);
                      return (
                        <div key={i} className="p-3 text-center border-r border-gray-200 last:border-r-0">
                          <div className="text-sm font-semibold text-gray-900">
                            {date.toLocaleDateString('en-US', { weekday: 'short' })}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            {date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </div>
                          
                          {/* Column select buttons */}
                          <div className="mt-3 space-y-1">
                            {['breakfast', 'lunch', 'dinner'].map(mealType => {
                              const allSelected = selectedFamilyMembers.every(memberId => {
                                const dateKey = date.toISOString().split('T')[0];
                                return availabilityGrid[memberId]?.[dateKey]?.[mealType as keyof typeof availabilityGrid[string][string]] === true;
                              });
                              
                              return (
                                <button
                                  key={mealType}
                                  onClick={() => toggleDayMeal(i, mealType as 'breakfast' | 'lunch' | 'dinner')}
                                  className={`w-6 h-6 rounded-full border-2 transition-all duration-200 ${
                                    allSelected
                                      ? 'bg-blue-500 border-blue-500 shadow-md'
                                      : 'bg-white border-gray-300 hover:border-blue-400'
                                  }`}
                                  title={`Toggle all ${mealType} for ${date.toLocaleDateString('en-US', { weekday: 'short' })}`}
                                >
                                  {allSelected && (
                                    <CheckCircleIcon className="w-4 h-4 text-white m-auto" />
                                  )}
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Body */}
                <div className="divide-y divide-gray-100">
                  {familyMembers.filter(m => selectedFamilyMembers.includes(m.id)).map((member, memberIndex) => {
                    // Check if all meals for this person are selected
                    const allPersonMealsSelected = Array.from({length: 7}, (_, i) => {
                      const date = new Date(getWeekStart(selectedWeek));
                      date.setDate(date.getDate() + i);
                      const dateKey = date.toISOString().split('T')[0];
                      const availability = availabilityGrid[member.id]?.[dateKey] || { breakfast: false, lunch: false, dinner: false };
                      return availability.breakfast && availability.lunch && availability.dinner;
                    }).every(Boolean);

                    return (
                      <div key={member.id} className="grid grid-cols-8 gap-0 hover:bg-gray-50 transition-colors">
                        {/* Person name with row controls */}
                        <div className="p-4 border-r border-gray-200 flex items-center justify-between">
                          <div>
                            <div className="font-medium text-gray-900">{member.name}</div>
                            <div className="text-xs text-gray-500">{member.ageGroup}</div>
                          </div>
                          <button
                            onClick={() => togglePersonWeek(member.id)}
                            className={`w-8 h-8 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
                              allPersonMealsSelected
                                ? 'bg-green-500 border-green-500 shadow-md'
                                : 'bg-white border-gray-300 hover:border-green-400'
                            }`}
                            title={`Toggle all meals for ${member.name}`}
                          >
                            {allPersonMealsSelected && (
                              <CheckCircleIcon className="w-5 h-5 text-white" />
                            )}
                          </button>
                        </div>
                        
                        {/* Day cells */}
                        {Array.from({length: 7}, (_, i) => {
                          const date = new Date(getWeekStart(selectedWeek));
                          date.setDate(date.getDate() + i);
                          const dateKey = date.toISOString().split('T')[0];
                          const availability = availabilityGrid[member.id]?.[dateKey] || { breakfast: false, lunch: false, dinner: false };
                          
                          return (
                            <div key={i} className="p-3 border-r border-gray-200 last:border-r-0">
                              <div className="flex justify-center space-x-2">
                                {(['breakfast', 'lunch', 'dinner'] as const).map((mealType, mealIndex) => {
                                  const isSelected = availability[mealType];
                                  const mealColors = {
                                    breakfast: isSelected ? 'bg-orange-500 border-orange-500' : 'bg-white border-orange-300 hover:border-orange-400',
                                    lunch: isSelected ? 'bg-yellow-500 border-yellow-500' : 'bg-white border-yellow-300 hover:border-yellow-400',
                                    dinner: isSelected ? 'bg-purple-500 border-purple-500' : 'bg-white border-purple-300 hover:border-purple-400'
                                  };
                                  
                                  return (
                                    <button
                                      key={mealType}
                                      onClick={() => togglePersonMeal(member.id, dateKey, mealType)}
                                      className={`w-10 h-10 rounded-full border-2 transition-all duration-200 flex items-center justify-center shadow-sm hover:shadow-md ${mealColors[mealType]}`}
                                      title={`${member.name} - ${mealType} on ${date.toLocaleDateString('en-US', { weekday: 'long' })}`}
                                    >
                                      {isSelected && (
                                        <CheckCircleIcon className="w-6 h-6 text-white" />
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Legend */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3">Legend</h4>
                <div className="flex items-center justify-center space-x-8">
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-orange-500 border-2 border-orange-500 shadow-sm"></div>
                    <span className="text-xs text-gray-600">Breakfast</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-yellow-500 border-2 border-yellow-500 shadow-sm"></div>
                    <span className="text-xs text-gray-600">Lunch</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-6 h-6 rounded-full bg-purple-500 border-2 border-purple-500 shadow-sm"></div>
                    <span className="text-xs text-gray-600">Dinner</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 'review' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Review Your Meal Plan</h3>
                <p className="text-gray-600">Review the AI-generated plan before accepting</p>
              </div>

              {!generatedMealPlan ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">
                    <p>No meal plan generated yet.</p>
                    <button
                      onClick={() => setCurrentStep('availability')}
                      className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Go back to generate plan
                    </button>
                  </div>
                </div>
              ) : generatedMealPlan.dailyPlans.length === 0 ? (
                <div className="text-center py-8">
                  <div className="text-gray-500">
                    <p>No meals were generated for your selected availability.</p>
                    <p className="text-sm mt-1">Please go back and select at least one meal slot.</p>
                    <button
                      onClick={() => setCurrentStep('availability')}
                      className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Go back to select meals
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Plan Summary */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">Plan Summary</h4>
                    <div className="text-sm text-blue-800">
                      <p>• {generatedMealPlan.dailyPlans.length} days with meals</p>
                      <p>• {generatedMealPlan.dailyPlans.reduce((total, day) => total + day.meals.length, 0)} total meals planned</p>
                      <p>• Generated for: {familyMembers.filter(m => selectedFamilyMembers.includes(m.id)).map(m => m.name).join(', ')}</p>
                    </div>
                  </div>

                  {/* Daily Plans */}
                  <div className="space-y-4">
                    {generatedMealPlan.dailyPlans.map(day => (
                      <div key={day.date} className="border border-gray-200 rounded-lg p-6 bg-white shadow-sm">
                        <h4 className="font-semibold text-gray-900 mb-4 text-lg">
                          {new Date(day.date).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                        </h4>
                        
                        {day.meals.length === 0 ? (
                          <div className="text-gray-500 text-sm italic">No meals planned for this day</div>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            {day.meals.map(meal => {
                              const mealColors = {
                                breakfast: 'bg-orange-50 border-orange-200 text-orange-900',
                                lunch: 'bg-yellow-50 border-yellow-200 text-yellow-900',
                                dinner: 'bg-purple-50 border-purple-200 text-purple-900'
                              };
                              
                              return (
                                <div key={`${day.date}-${meal.mealType}`} className={`p-4 border rounded-lg ${mealColors[meal.mealType as keyof typeof mealColors] || 'bg-gray-50 border-gray-200 text-gray-900'}`}>
                                  <div className="font-medium capitalize text-lg mb-2">{meal.mealType}</div>
                                  <div className="text-sm font-semibold mb-1">{meal.notes || 'Unnamed Meal'}</div>
                                  <div className="text-xs opacity-75">
                                    {meal.servings} serving{meal.servings !== 1 ? 's' : ''}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Regenerate Option */}
                  <div className="text-center">
                    <button
                      onClick={() => {
                        setGeneratedMealPlan(null);
                        setCurrentStep('availability');
                      }}
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      ← Generate a different plan
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Step 5: Tracking */}
          {currentStep === 'tracking' && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Meal Tracking</h3>
                <p className="text-gray-600">Track your meals and make adjustments as needed</p>
              </div>
              
              <div className="text-center text-gray-500">
                <p>Meal tracking interface coming soon...</p>
              </div>
            </div>
          )}
        </div>

        {/* Footer Navigation */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={prevStep}
            disabled={currentStep === 'who-eating'}
            className="flex items-center px-4 py-2 text-gray-600 disabled:text-gray-300 disabled:cursor-not-allowed"
          >
            <ChevronLeftIcon className="w-4 h-4 mr-1" />
            Previous
          </button>

          <div className="text-sm text-gray-500">
            Step {stepNumbers[currentStep]} of 5
          </div>

          <button
            onClick={nextStep}
            disabled={!canProceedToNext() || generatingPlan}
            className="flex items-center px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generatingPlan ? (
              <>
                <SparklesIcon className="w-4 h-4 mr-2 animate-spin" />
                Generating...
              </>
            ) : currentStep === 'availability' ? (
              <>
                <SparklesIcon className="w-4 h-4 mr-2" />
                Generate Plan
              </>
            ) : currentStep === 'review' ? (
              'Accept Plan'
            ) : currentStep === 'tracking' ? (
              'Done'
            ) : (
              <>
                Next
                <ChevronRightIcon className="w-4 h-4 ml-1" />
              </>
            )}
          </button>
        </div>
      </div>

      {/* Family Preferences Modal */}
      {showPreferences && (
        <FamilyPreferencesModal
          isOpen={showPreferences}
          onClose={(shouldRefresh) => {
            setShowPreferences(false);
            if (shouldRefresh) {
              loadData();
            }
          }}
          familyId={familyId}
        />
      )}
    </div>
  );
}