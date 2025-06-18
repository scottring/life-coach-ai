







import React, { useState, useEffect } from 'react';
import { 
  CalendarIcon, 
  SparklesIcon, 
  UserGroupIcon, 
  XMarkIcon,
  PlusIcon,
  ClockIcon,
  FireIcon,
  CakeIcon,
  ChartBarIcon,
  CheckCircleIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid, HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
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

export default function MealPlanningModal({ isOpen, onClose, familyId }: MealPlanningModalProps) {
  const [currentStep, setCurrentStep] = useState<WizardStep>('who-eating');
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [currentWeekPlan, setCurrentWeekPlan] = useState<WeeklyMealPlan | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<{meal: any, mealName: string, date: string} | null>(null);
  const [availabilityGrid, setAvailabilityGrid] = useState<{[memberId: string]: {[dateKey: string]: {breakfast: boolean, lunch: boolean, dinner: boolean}}}>({});
  const [dietParameters, setDietParameters] = useState({
    generalPreferences: '',
    memberGoals: {} as {[memberId: string]: string}
  });
  const [mealLogs, setMealLogs] = useState<{[date: string]: {[mealType: string]: {logged: boolean, rating?: number, notes?: string, actualMeal?: string}}}>({}); 
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);
  const [loadingAiSuggestions, setLoadingAiSuggestions] = useState(false);
  const [showMealLogger, setShowMealLogger] = useState<{date: string, mealType: string, plannedMeal: string} | null>(null);
  const [showMealOverride, setShowMealOverride] = useState<{date: string, mealType: string, plannedMeal: string, dayIndex: number} | null>(null);
  const [plannedMealOverrides, setPlannedMealOverrides] = useState<{[date: string]: {[mealType: string]: string}}>({});
  const [memberToEdit, setMemberToEdit] = useState<FamilyMember | null>(null);
  const [tempLog, setTempLog] = useState({
    actualMeal: '',
    rating: 0,
    notes: ''
  });
  const [newMealName, setNewMealName] = useState('');
  
  // Wizard-specific state
  const [selectedFamilyMembers, setSelectedFamilyMembers] = useState<string[]>([]);
  const [weeklyGuests, setWeeklyGuests] = useState<{id: string, name: string, count: number}[]>([]);
  const [generatedMealPlan, setGeneratedMealPlan] = useState<WeeklyMealPlan | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, familyId]);

  useEffect(() => {
    if (showMealLogger) {
      const currentLog = mealLogs[showMealLogger.date]?.[showMealLogger.mealType] || {
        logged: false,
        rating: undefined,
        notes: '',
        actualMeal: ''
      };
      
      setTempLog({
        actualMeal: currentLog.actualMeal || showMealLogger.plannedMeal,
        rating: currentLog.rating || 0,
        notes: currentLog.notes || ''
      });
    }
  }, [showMealLogger, mealLogs]);

  useEffect(() => {
    if (showMealOverride) {
      setNewMealName(showMealOverride.plannedMeal);
    }
  }, [showMealOverride]);

  const saveMealLog = () => {
    if (!showMealLogger) return;
    
    setMealLogs(prev => ({
      ...prev,
      [showMealLogger.date]: {
        ...prev[showMealLogger.date],
        [showMealLogger.mealType]: {
          logged: true,
          actualMeal: tempLog.actualMeal,
          rating: tempLog.rating > 0 ? tempLog.rating : undefined,
          notes: tempLog.notes.trim() || undefined
        }
      }
    }));
    setShowMealLogger(null);
  };

  const savePlannedMealOverride = (newMealName: string) => {
    if (!showMealOverride) return;
    
    setPlannedMealOverrides(prev => ({
      ...prev,
      [showMealOverride.date]: {
        ...prev[showMealOverride.date],
        [showMealOverride.mealType]: newMealName
      }
    }));
    setShowMealOverride(null);
  };

  const deleteMealLog = (date: string, mealType: string) => {
    setMealLogs(prev => {
      const newLogs = { ...prev };
      if (newLogs[date]) {
        delete newLogs[date][mealType];
        if (Object.keys(newLogs[date]).length === 0) {
          delete newLogs[date];
        }
      }
      return newLogs;
    });
  };

  const getEffectiveMealName = (mealType: string, dayIndex: number, date: string): string => {
    // Check for manual override first
    const override = plannedMealOverrides[date]?.[mealType];
    if (override) return override;
    
    // Fall back to generated meal name
    return getMealName(mealType, dayIndex);
  };

  const loadData = async () => {
    setLoading(true);
    try {
      const members = await MealPlanningService.getFamilyMembers(familyId);
      setFamilyMembers(members);

      const weekStart = getWeekStart(selectedWeek);
      const weekPlan = await MealPlanningService.getWeeklyMealPlan(familyId, weekStart);
      setCurrentWeekPlan(weekPlan);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeekStart = (date: Date): string => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  };

  const getWeekEnd = (weekStart: string): string => {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return end.toISOString().split('T')[0];
  };

  const getMealName = (mealType: string, dayIndex: number): string => {
    const meals = {
      breakfast: ['Oatmeal', 'Eggs & Toast', 'Yogurt Parfait', 'Pancakes', 'Avocado Toast', 'Smoothie', 'French Toast'],
      lunch: ['Sandwich', 'Salad', 'Soup', 'Leftovers', 'Quinoa Bowl', 'Wrap', 'Pasta'],
      dinner: ['Pasta Primavera', 'Chicken Tacos', 'Pizza Night', 'Stir-Fry', 'Burgers', 'Salmon', 'Stew']
    };
    
    const mealList = meals[mealType as keyof typeof meals];
    return mealList?.[dayIndex] || mealType.charAt(0).toUpperCase() + mealType.slice(1);
  };

  const getMealDetails = (mealName: string, mealType: string) => {
    // Generate detailed meal information based on the meal name
    const baseDetails = {
      name: mealName,
      description: `Delicious ${mealName.toLowerCase()} perfect for ${mealType}`,
      prepTime: Math.floor(Math.random() * 20) + 10, // 10-30 minutes
      cookTime: Math.floor(Math.random() * 30) + 15, // 15-45 minutes
      servings: familyMembers.length || 4,
      difficulty: ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)] as 'easy' | 'medium' | 'hard',
      cuisine: ['American', 'Italian', 'Mexican', 'Asian', 'Mediterranean'][Math.floor(Math.random() * 5)],
      tags: ['Family Friendly', 'Quick & Easy', 'Healthy', 'Comfort Food'].slice(0, Math.floor(Math.random() * 3) + 1),
      nutrition: {
        calories: Math.floor(Math.random() * 300) + 200,
        protein: Math.floor(Math.random() * 20) + 10,
        carbs: Math.floor(Math.random() * 40) + 20,
        fat: Math.floor(Math.random() * 15) + 5
      }
    };

    // Sample ingredients based on meal type and name
    const ingredients = mealName.toLowerCase().includes('pasta') ? [
      { name: 'Pasta', amount: '1', unit: 'lb' },
      { name: 'Olive Oil', amount: '2', unit: 'tbsp' },
      { name: 'Garlic', amount: '3', unit: 'cloves' },
      { name: 'Bell Peppers', amount: '2', unit: 'pieces' },
      { name: 'Zucchini', amount: '1', unit: 'medium' },
      { name: 'Cherry Tomatoes', amount: '1', unit: 'cup' },
      { name: 'Parmesan Cheese', amount: '1/2', unit: 'cup' }
    ] : mealName.toLowerCase().includes('taco') ? [
      { name: 'Ground Chicken', amount: '1', unit: 'lb' },
      { name: 'Taco Seasoning', amount: '1', unit: 'packet' },
      { name: 'Corn Tortillas', amount: '8', unit: 'pieces' },
      { name: 'Lettuce', amount: '1', unit: 'head' },
      { name: 'Tomatoes', amount: '2', unit: 'medium' },
      { name: 'Cheese', amount: '1', unit: 'cup' },
      { name: 'Avocado', amount: '2', unit: 'pieces' }
    ] : [
      { name: 'Main Ingredient', amount: '1', unit: 'lb' },
      { name: 'Vegetables', amount: '2', unit: 'cups' },
      { name: 'Seasonings', amount: '1', unit: 'tsp' },
      { name: 'Oil', amount: '2', unit: 'tbsp' }
    ];

    const instructions = mealName.toLowerCase().includes('pasta') ? [
      'Bring a large pot of salted water to boil and cook pasta according to package directions',
      'Heat olive oil in a large skillet over medium heat',
      'Add minced garlic and sauté for 1 minute until fragrant',
      'Add bell peppers and zucchini, cook for 5-7 minutes until tender',
      'Add cherry tomatoes and cook for 2-3 minutes until they start to soften',
      'Drain pasta and add to the skillet with vegetables',
      'Toss everything together and season with salt and pepper',
      'Serve hot topped with grated Parmesan cheese'
    ] : mealName.toLowerCase().includes('taco') ? [
      'Heat a large skillet over medium-high heat',
      'Add ground chicken and cook, breaking it up, until browned (6-8 minutes)',
      'Add taco seasoning and 1/4 cup water, simmer for 2 minutes',
      'Warm tortillas in a dry skillet or microwave',
      'Chop lettuce, dice tomatoes, and slice avocados',
      'Shred cheese if using block cheese',
      'Assemble tacos with chicken, lettuce, tomatoes, cheese, and avocado',
      'Serve immediately with lime wedges and hot sauce if desired'
    ] : [
      'Prepare all ingredients by washing, chopping, and measuring',
      'Heat oil in a large pan over medium heat',
      'Add main ingredients and cook according to recipe',
      'Season with salt, pepper, and other spices',
      'Cook until ingredients are tender and flavors are well combined',
      'Taste and adjust seasoning as needed',
      'Serve hot and enjoy!'
    ];

    // Generate sample family reactions
    const familyReactions = familyMembers.map(member => ({
      memberId: member.id,
      memberName: member.name,
      rating: Math.floor(Math.random() * 5) + 1, // 1-5 stars
      loved: Math.random() > 0.7, // 30% chance of being loved
      comment: [
        'Really enjoyed this!',
        'Pretty good, would have again',
        'Not my favorite but okay',
        'Love this recipe!',
        'Could use more seasoning',
        'Perfect for a weeknight dinner',
        'Kids loved it!'
      ][Math.floor(Math.random() * 7)]
    }));

    return {
      ...baseDetails,
      ingredients,
      instructions,
      familyReactions,
      lastMade: new Date(Date.now() - Math.floor(Math.random() * 30) * 24 * 60 * 60 * 1000), // Random date in last 30 days
      timesCooked: Math.floor(Math.random() * 10) + 1
    };
  };

  const generateAIMealPlan = async () => {
    if (familyMembers.length === 0) {
      alert('Please add family members first');
      return;
    }

    setGeneratingPlan(true);
    try {
      const weekStart = getWeekStart(selectedWeek);
      
      // Get recent meal plans to avoid repetition
      const recentPlans = await MealPlanningService.getRecentMealPlans(familyId, 4);
      const previousMeals = recentPlans.flatMap(plan => 
        plan.dailyPlans.flatMap(day => 
          day.meals.map(meal => ({ name: meal.notes || 'Meal', id: meal.mealId }))
        )
      );

      // Build preferences from diet parameters and availability
      const preferences = {
        cuisinePreferences: dietParameters.generalPreferences ? [dietParameters.generalPreferences] : [],
        avoidIngredients: familyMembers.flatMap(m => m.dislikedIngredients),
        dietaryRestrictions: familyMembers.flatMap(m => m.dietaryRestrictions),
        budgetConstraints: 'moderate',
        cookingTime: 'medium' as const,
        healthFocus: 'balanced' as const
      };

      // Generate AI meal plan
      const aiResponse = await AIMealService.generateWeeklyMealPlan({
        familyMembers,
        weekStartDate: weekStart,
        preferences,
        previousMeals
      });

      if (!aiResponse.success || !aiResponse.weeklyPlan) {
        throw new Error(aiResponse.error || 'Failed to generate meal plan');
      }

      // Save the AI-generated plan to database
      const planId = await MealPlanningService.saveWeeklyMealPlan(aiResponse.weeklyPlan);
      if (planId) {
        await loadData();
        alert('AI meal plan generated successfully! 🎉');
        setActiveTab('planner');
      }
    } catch (error) {
      console.error('Error generating AI meal plan:', error);
      alert(`Error generating meal plan: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setGeneratingPlan(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedWeek);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedWeek(newDate);
  };

  const getAIMealSuggestions = async (mealType: string) => {
    if (familyMembers.length === 0) return;

    setLoadingAiSuggestions(true);
    try {
      // Get family dietary restrictions and preferences
      const allRestrictions = familyMembers.flatMap(m => m.dietaryRestrictions);
      const allFavorites = familyMembers.flatMap(m => m.favoriteFoods);
      
      // Create basic ingredients prompt based on meal type and preferences
      const ingredients = [
        ...allFavorites.slice(0, 3), // Include some favorites
        ...(mealType === 'breakfast' ? ['eggs', 'oats', 'fruits'] : 
            mealType === 'lunch' ? ['vegetables', 'protein', 'grains'] :
            ['protein', 'vegetables', 'starches'])
      ];

      const meals = await AIMealService.getMealSuggestions(ingredients, allRestrictions);
      const suggestions = meals.map(meal => meal.name);
      
      setAiSuggestions(suggestions);
    } catch (error) {
      console.error('Error getting AI meal suggestions:', error);
      setAiSuggestions([]);
    } finally {
      setLoadingAiSuggestions(false);
    }
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
        setCurrentStep('review');
        break;
      case 'review':
        setCurrentStep('tracking');
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
        return true; // Always can proceed from diet parameters
      case 'availability':
        return true; // Always can proceed from availability
      case 'review':
        return generatedMealPlan !== null;
      default:
        return false;
    }
  };

  const togglePersonWeek = (memberId: string) => {
    const weekStart = getWeekStart(selectedWeek);
    const newGrid = { ...availabilityGrid };
    
    // Check if all meals for this person this week are selected
    const allSelected = familyMembers.length > 0 && Array.from({length: 7}, (_, i) => {
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
    const allSelected = familyMembers.length > 0 && familyMembers.every(member => 
      availabilityGrid[member.id]?.[dateKey]?.[mealType] === true
    );

    const newGrid = { ...availabilityGrid };
    
    // Toggle all people for this day/meal
    familyMembers.forEach(member => {
      if (!newGrid[member.id]) newGrid[member.id] = {};
      if (!newGrid[member.id][dateKey]) {
        newGrid[member.id][dateKey] = { breakfast: false, lunch: false, dinner: false };
      }
      newGrid[member.id][dateKey][mealType] = !allSelected;
    });
    
    setAvailabilityGrid(newGrid);
  };

  const deleteFamilyMember = async (memberId: string, memberName: string) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm(`Are you sure you want to delete ${memberName}? This will also remove their availability and meal tracking data. This action cannot be undone.`)) {
      return;
    }

    try {
      const success = await MealPlanningService.deleteFamilyMember(memberId);
      
      if (success) {
        // Remove from availability grid
        setAvailabilityGrid(prev => {
          const newGrid = { ...prev };
          delete newGrid[memberId];
          return newGrid;
        });
        
        // Remove from diet parameters
        setDietParameters(prev => ({
          ...prev,
          memberGoals: Object.fromEntries(
            Object.entries(prev.memberGoals).filter(([id]) => id !== memberId)
          )
        }));
        
        // Reload family members
        await loadData();
      } else {
        alert('Error deleting family member. Please try again.');
      }
    } catch (error) {
      console.error('Error deleting family member:', error);
      alert(`Error deleting family member: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
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

        {/* Fixed Tabs */}
        <div className="flex border-b border-gray-200 px-6 flex-shrink-0">
          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-4 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'preferences'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <UserGroupIcon className="h-4 w-4 inline mr-2" />
            Family Members
          </button>
          <button
            onClick={() => setActiveTab('diet')}
            className={`px-4 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'diet'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <SparklesIcon className="h-4 w-4 inline mr-2" />
            Diet Parameters
          </button>
          <button
            onClick={() => setActiveTab('availability')}
            className={`px-4 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'availability'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ClockIcon className="h-4 w-4 inline mr-2" />
            Availability
          </button>
          <button
            onClick={() => setActiveTab('planner')}
            className={`px-4 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'planner'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <CalendarIcon className="h-4 w-4 inline mr-2" />
            Meal Planner
          </button>
          <button
            onClick={() => setActiveTab('tracking')}
            className={`px-4 py-3 text-sm font-medium border-b-2 ${
              activeTab === 'tracking'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <ChartBarIcon className="h-4 w-4 inline mr-2" />
            Meal Tracking
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : activeTab === 'preferences' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Family Members</h3>
                <button
                  onClick={() => {
                    setMemberToEdit(null);
                    setShowPreferences(true);
                  }}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  <PlusIcon className="h-4 w-4 inline mr-2" />
                  Add Member
                </button>
              </div>

              {familyMembers.length > 0 ? (
                <div className="space-y-4">
                  {familyMembers.map(member => (
                    <div key={member.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <h4 className="font-medium text-gray-900">{member.name}</h4>
                          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded capitalize">
                            {member.ageGroup}
                          </span>
                        </div>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => {
                              setMemberToEdit(member);
                              setShowPreferences(true);
                            }}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                            title="Edit member"
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteFamilyMember(member.id, member.name)}
                            className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                            title="Delete member"
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div>
                          <span className="text-gray-500 font-medium">Dietary Restrictions:</span>
                          <div className="mt-1">
                            {member.dietaryRestrictions.length > 0 ? (
                              member.dietaryRestrictions.map(restriction => (
                                <span key={restriction} className="inline-block bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs mr-1 mb-1">
                                  {restriction}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400 text-xs">None</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500 font-medium">Allergens:</span>
                          <div className="mt-1">
                            {member.allergens.length > 0 ? (
                              member.allergens.map(allergen => (
                                <span key={allergen} className="inline-block bg-red-100 text-red-800 px-2 py-1 rounded text-xs mr-1 mb-1">
                                  {allergen}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400 text-xs">None</span>
                            )}
                          </div>
                        </div>
                        <div>
                          <span className="text-gray-500 font-medium">Favorite Foods:</span>
                          <div className="mt-1">
                            {member.favoriteFoods.length > 0 ? (
                              member.favoriteFoods.map(food => (
                                <span key={food} className="inline-block bg-green-100 text-green-800 px-2 py-1 rounded text-xs mr-1 mb-1">
                                  {food}
                                </span>
                              ))
                            ) : (
                              <span className="text-gray-400 text-xs">None added yet</span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <UserGroupIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">No family members added yet</p>
                  <button
                    onClick={() => setShowPreferences(true)}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Add your first family member
                  </button>
                </div>
              )}

            </div>
          ) : activeTab === 'diet' ? (
            <div className="space-y-6">
              <div>
                <h3 className="text-lg font-medium text-gray-900 mb-4">Dietary Parameters</h3>
                <p className="text-sm text-gray-500 mb-6">Set general dietary preferences and individual goals for AI meal planning</p>
              </div>

              {/* General Dietary Preferences */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900">General Family Preferences</h4>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Dietary Guidelines
                    <span className="text-gray-500 font-normal ml-1">(e.g., "eat more vegetables and whole foods, limit sugar intake, prepare meals that don't need to be cooked as much")</span>
                  </label>
                  <textarea
                    value={dietParameters.generalPreferences}
                    onChange={(e) => setDietParameters(prev => ({ ...prev, generalPreferences: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    rows={4}
                    placeholder="Describe your family's dietary preferences, cooking style, and any general guidelines you'd like the AI to follow when planning meals..."
                  />
                </div>
              </div>

              {/* Individual Member Goals */}
              <div className="space-y-4">
                <h4 className="text-md font-medium text-gray-900">Individual Member Goals</h4>
                {familyMembers.length > 0 ? (
                  <div className="space-y-4">
                    {familyMembers.map(member => (
                      <div key={member.id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center mb-3">
                          <h5 className="font-medium text-gray-900">{member.name}</h5>
                          <span className="ml-2 text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded capitalize">
                            {member.ageGroup}
                          </span>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Personal Goals
                            <span className="text-gray-500 font-normal ml-1">(e.g., "lose 1-2 lbs per week", "gain muscle mass", "manage diabetes")</span>
                          </label>
                          <textarea
                            value={dietParameters.memberGoals[member.id] || ''}
                            onChange={(e) => setDietParameters(prev => ({
                              ...prev,
                              memberGoals: {
                                ...prev.memberGoals,
                                [member.id]: e.target.value
                              }
                            }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            rows={3}
                            placeholder={`Describe ${member.name}'s specific dietary goals, health objectives, or special considerations...`}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <UserGroupIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">Add family members first to set individual goals</p>
                    <button
                      onClick={() => setActiveTab('preferences')}
                      className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                    >
                      Add family members
                    </button>
                  </div>
                )}
              </div>

              {/* Info Box */}
              <div className="p-4 bg-blue-50 rounded-lg">
                <h5 className="font-medium text-blue-900 mb-2">How AI uses this information:</h5>
                <ul className="text-sm text-blue-800 space-y-1">
                  <li>• General preferences guide overall meal planning strategy</li>
                  <li>• Individual goals help tailor portion sizes and ingredients</li>
                  <li>• AI considers health objectives when suggesting recipes</li>
                  <li>• Cooking preferences influence meal complexity and prep time</li>
                </ul>
              </div>
            </div>
          ) : activeTab === 'availability' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Family Availability</h3>
                  <p className="text-sm text-gray-500">Mark when each family member is available for meals</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => navigateWeek('prev')}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    ←
                  </button>
                  <span className="text-sm text-gray-600">
                    Week of {getWeekStart(selectedWeek)}
                  </span>
                  <button
                    onClick={() => navigateWeek('next')}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    →
                  </button>
                </div>
              </div>

              {familyMembers.length > 0 ? (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  {/* Header Row */}
                  <div className="grid grid-cols-8 border-b border-gray-200">
                    <div className="px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200">
                      <div className="flex items-center justify-between">
                        <span>Member</span>
                        <button
                          onClick={() => {
                            // Toggle all members for the entire week
                            const weekStart = getWeekStart(selectedWeek);
                            const newGrid = { ...availabilityGrid };
                            
                            // Check if all members have all meals selected for the week
                            const allSelected = familyMembers.length > 0 && familyMembers.every(member => 
                              Array.from({length: 7}, (_, i) => {
                                const date = new Date(weekStart);
                                date.setDate(date.getDate() + i);
                                const dateKey = date.toISOString().split('T')[0];
                                const availability = newGrid[member.id]?.[dateKey] || { breakfast: false, lunch: false, dinner: false };
                                return availability.breakfast && availability.lunch && availability.dinner;
                              }).every(Boolean)
                            );

                            familyMembers.forEach(member => {
                              for (let i = 0; i < 7; i++) {
                                const date = new Date(weekStart);
                                date.setDate(date.getDate() + i);
                                const dateKey = date.toISOString().split('T')[0];
                                
                                if (!newGrid[member.id]) newGrid[member.id] = {};
                                newGrid[member.id][dateKey] = { 
                                  breakfast: !allSelected, 
                                  lunch: !allSelected, 
                                  dinner: !allSelected 
                                };
                              }
                            });
                            
                            setAvailabilityGrid(newGrid);
                          }}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                          title="Toggle all members for entire week"
                        >
                          All
                        </button>
                      </div>
                    </div>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, dayIndex) => (
                      <div key={day} className="px-2 py-3 text-sm font-medium text-gray-900 bg-gray-50 text-center border-r border-gray-200 last:border-r-0">
                        <div className="flex flex-col items-center space-y-1">
                          <span>{day}</span>
                          <div className="flex items-center space-x-1">
                            {/* Column selectors for each meal */}
                            <button
                              onClick={() => toggleDayMeal(dayIndex, 'breakfast')}
                              className="w-4 h-4 rounded-full border border-orange-300 bg-orange-100 hover:bg-orange-200 text-xs"
                              title={`Toggle all members for ${day} breakfast`}
                            >
                              B
                            </button>
                            <button
                              onClick={() => toggleDayMeal(dayIndex, 'lunch')}
                              className="w-4 h-4 rounded-full border border-blue-300 bg-blue-100 hover:bg-blue-200 text-xs"
                              title={`Toggle all members for ${day} lunch`}
                            >
                              L
                            </button>
                            <button
                              onClick={() => toggleDayMeal(dayIndex, 'dinner')}
                              className="w-4 h-4 rounded-full border border-purple-300 bg-purple-100 hover:bg-purple-200 text-xs"
                              title={`Toggle all members for ${day} dinner`}
                            >
                              D
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  
                  {/* Member Rows */}
                  {familyMembers.map(member => (
                    <div key={member.id} className="grid grid-cols-8 border-b border-gray-200 last:border-b-0">
                      <div className="px-4 py-4 text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200">
                        <div className="flex items-center justify-between">
                          <span>{member.name}</span>
                          <button
                            onClick={() => togglePersonWeek(member.id)}
                            className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                            title={`Toggle all meals for ${member.name} this week`}
                          >
                            All
                          </button>
                        </div>
                      </div>
                      {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => {
                        const weekStart = getWeekStart(selectedWeek);
                        const date = new Date(weekStart);
                        date.setDate(date.getDate() + dayIndex);
                        const dateKey = date.toISOString().split('T')[0];
                        const memberAvailability = availabilityGrid[member.id]?.[dateKey] || { breakfast: false, lunch: false, dinner: false };
                        
                        return (
                          <div key={dayIndex} className="p-2 border-r border-gray-200 last:border-r-0">
                            <div className="flex items-center justify-center space-x-2">
                              {/* Breakfast */}
                              <button
                                onClick={() => {
                                  setAvailabilityGrid(prev => ({
                                    ...prev,
                                    [member.id]: {
                                      ...prev[member.id],
                                      [dateKey]: {
                                        ...memberAvailability,
                                        breakfast: !memberAvailability.breakfast
                                      }
                                    }
                                  }));
                                }}
                                className={`w-6 h-6 rounded-full border-2 transition-colors flex items-center justify-center text-xs font-bold ${
                                  memberAvailability.breakfast
                                    ? 'bg-orange-500 border-orange-500 text-white'
                                    : 'bg-white border-gray-300 hover:border-orange-400'
                                }`}
                                title="Breakfast availability"
                              >
                                B
                              </button>
                              
                              {/* Lunch */}
                              <button
                                onClick={() => {
                                  setAvailabilityGrid(prev => ({
                                    ...prev,
                                    [member.id]: {
                                      ...prev[member.id],
                                      [dateKey]: {
                                        ...memberAvailability,
                                        lunch: !memberAvailability.lunch
                                      }
                                    }
                                  }));
                                }}
                                className={`w-6 h-6 rounded-full border-2 transition-colors flex items-center justify-center text-xs font-bold ${
                                  memberAvailability.lunch
                                    ? 'bg-blue-500 border-blue-500 text-white'
                                    : 'bg-white border-gray-300 hover:border-blue-400'
                                }`}
                                title="Lunch availability"
                              >
                                L
                              </button>
                              
                              {/* Dinner */}
                              <button
                                onClick={() => {
                                  setAvailabilityGrid(prev => ({
                                    ...prev,
                                    [member.id]: {
                                      ...prev[member.id],
                                      [dateKey]: {
                                        ...memberAvailability,
                                        dinner: !memberAvailability.dinner
                                      }
                                    }
                                  }));
                                }}
                                className={`w-6 h-6 rounded-full border-2 transition-colors flex items-center justify-center text-xs font-bold ${
                                  memberAvailability.dinner
                                    ? 'bg-purple-500 border-purple-500 text-white'
                                    : 'bg-white border-gray-300 hover:border-purple-400'
                                }`}
                                title="Dinner availability"
                              >
                                D
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <ClockIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500">Add family members first to set availability</p>
                  <button
                    onClick={() => setActiveTab('preferences')}
                    className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                  >
                    Add family members
                  </button>
                </div>
              )}

              {/* Quick Actions */}
              {familyMembers.length > 0 && (
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-900">Quick Actions</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <button
                      onClick={() => {
                        const weekStart = getWeekStart(selectedWeek);
                        const newGrid = { ...availabilityGrid };
                        
                        familyMembers.forEach(member => {
                          for (let i = 0; i < 7; i++) {
                            const date = new Date(weekStart);
                            date.setDate(date.getDate() + i);
                            const dateKey = date.toISOString().split('T')[0];
                            
                            if (!newGrid[member.id]) newGrid[member.id] = {};
                            newGrid[member.id][dateKey] = { breakfast: true, lunch: true, dinner: true };
                          }
                        });
                        
                        setAvailabilityGrid(newGrid);
                      }}
                      className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                    >
                      Mark All Available
                    </button>
                    <button
                      onClick={() => {
                        const weekStart = getWeekStart(selectedWeek);
                        const newGrid = { ...availabilityGrid };
                        
                        familyMembers.forEach(member => {
                          for (let i = 0; i < 7; i++) {
                            const date = new Date(weekStart);
                            date.setDate(date.getDate() + i);
                            const dateKey = date.toISOString().split('T')[0];
                            
                            if (!newGrid[member.id]) newGrid[member.id] = {};
                            newGrid[member.id][dateKey] = { breakfast: false, lunch: false, dinner: false };
                          }
                        });
                        
                        setAvailabilityGrid(newGrid);
                      }}
                      className="px-4 py-2 bg-red-600 text-white rounded-md text-sm font-medium hover:bg-red-700"
                    >
                      Clear All
                    </button>
                  </div>
                  
                  <div className="p-4 bg-blue-50 rounded-lg">
                    <h5 className="font-medium text-blue-900 mb-2">How to use availability:</h5>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• <strong>Individual meals:</strong> Click B, L, D circles to mark specific meal availability</li>
                      <li>• <strong>Entire person:</strong> Click "All" next to member name to toggle all meals for that person</li>
                      <li>• <strong>Entire day/meal:</strong> Click B, L, D buttons in day headers to toggle all people for that meal</li>
                      <li>• <strong>Everything:</strong> Click "All" in top-left to toggle entire week for everyone</li>
                      <li>• Colors: Breakfast (orange), Lunch (blue), Dinner (purple)</li>
                      <li>• AI generates meal plans based on who's available for each meal</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === 'planner' ? (
            <div className="space-y-6">
              {/* Week Navigation */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Weekly Meal Plan</h3>
                  <p className="text-sm text-gray-500">
                    Week of {getWeekStart(selectedWeek)} - {getWeekEnd(getWeekStart(selectedWeek))}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => navigateWeek('prev')}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => navigateWeek('next')}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    →
                  </button>
                  <button
                    onClick={generateAIMealPlan}
                    disabled={generatingPlan}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-blue-300"
                  >
                    {generatingPlan ? (
                      <>
                        <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="h-4 w-4 inline mr-2" />
                        Generate AI Plan
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Meal Plan Grid */}
              {currentWeekPlan ? (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-7 border-b border-gray-200">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50 text-center border-r border-gray-200 last:border-r-0">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7">
                    {currentWeekPlan.dailyPlans.map((day, index) => (
                      <div key={day.date} className="p-4 border-r border-gray-200 last:border-r-0 min-h-[200px]">
                        <div className="text-sm font-medium text-gray-900 mb-3">
                          {new Date(day.date).getDate()}
                        </div>
                        <div className="space-y-2">
                          {day.meals.map((meal, mealIndex) => {
                            const effectiveMealName = getEffectiveMealName(meal.mealType, index, day.date);
                            const isOverridden = plannedMealOverrides[day.date]?.[meal.mealType];
                            
                            return (
                              <div key={mealIndex} className="relative group">
                                <div 
                                  onClick={() => setSelectedMeal({
                                    meal,
                                    mealName: effectiveMealName,
                                    date: day.date
                                  })}
                                  className={`p-2 rounded text-xs hover:bg-blue-100 cursor-pointer transition-colors ${
                                    isOverridden ? 'bg-yellow-50 border border-yellow-200' : 'bg-blue-50'
                                  }`}
                                >
                                  <div className="font-medium text-gray-900 mb-1 capitalize flex items-center justify-between">
                                    <span>{meal.mealType}</span>
                                    {isOverridden && (
                                      <PencilIcon className="h-3 w-3 text-yellow-600" title="Manually modified" />
                                    )}
                                  </div>
                                  <div className="text-gray-600 text-xs">
                                    {effectiveMealName}
                                  </div>
                                  {meal.notes && (
                                    <div className="text-blue-600 text-xs mt-1">
                                      {meal.notes}
                                    </div>
                                  )}
                                </div>
                                
                                {/* Override Button */}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setShowMealOverride({
                                      date: day.date,
                                      mealType: meal.mealType,
                                      plannedMeal: effectiveMealName,
                                      dayIndex: index
                                    });
                                  }}
                                  className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-white border border-gray-300 rounded p-1 hover:bg-gray-50"
                                  title="Edit planned meal"
                                >
                                  <PencilIcon className="h-3 w-3 text-gray-600" />
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <CalendarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg mb-4">No meal plan for this week</p>
                  {familyMembers.length === 0 ? (
                    <div className="space-y-4">
                      <p className="text-gray-400 text-sm">Add family members first</p>
                      <button
                        onClick={() => setActiveTab('preferences')}
                        className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                      >
                        <UserGroupIcon className="h-4 w-4 inline mr-2" />
                        Add Family Members
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={generateAIMealPlan}
                      disabled={generatingPlan}
                      className="px-6 py-3 bg-blue-600 text-white rounded-md text-lg font-medium hover:bg-blue-700 disabled:bg-blue-300"
                    >
                      {generatingPlan ? (
                        <>
                          <div className="animate-spin -ml-1 mr-3 h-5 w-5 border-2 border-white border-t-transparent rounded-full inline-block"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <SparklesIcon className="h-5 w-5 inline mr-2" />
                          Generate AI Meal Plan
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Summary Stats */}
              {currentWeekPlan && (
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <span className="text-sm font-medium text-green-900">Estimated Cost</span>
                    <p className="text-2xl font-bold text-green-900 mt-1">${currentWeekPlan.estimatedCost}</p>
                  </div>
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <span className="text-sm font-medium text-blue-900">Family Members</span>
                    <p className="text-2xl font-bold text-blue-900 mt-1">{familyMembers.length}</p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <span className="text-sm font-medium text-purple-900">Meals Planned</span>
                    <p className="text-2xl font-bold text-purple-900 mt-1">
                      {currentWeekPlan.dailyPlans.reduce((total, day) => total + day.meals.length, 0)}
                    </p>
                  </div>
                </div>
              )}

            </div>
          ) : activeTab === 'tracking' ? (
            <div className="space-y-6">
              {/* Week Navigation */}
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Meal Tracking & Logging</h3>
                  <p className="text-sm text-gray-500">Log what you actually ate and rate your meals</p>
                </div>
                <div className="flex items-center space-x-3">
                  <button
                    onClick={() => navigateWeek('prev')}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    ←
                  </button>
                  <span className="text-sm text-gray-600">
                    Week of {getWeekStart(selectedWeek)} - {getWeekEnd(getWeekStart(selectedWeek))}
                  </span>
                  <button
                    onClick={() => navigateWeek('next')}
                    className="p-2 text-gray-400 hover:text-gray-600"
                  >
                    →
                  </button>
                </div>
              </div>

              {/* Meal Tracking Grid */}
              {currentWeekPlan ? (
                <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                  <div className="grid grid-cols-7 border-b border-gray-200">
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50 text-center border-r border-gray-200 last:border-r-0">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7">
                    {currentWeekPlan.dailyPlans.map((day, index) => (
                      <div key={day.date} className="p-4 border-r border-gray-200 last:border-r-0 min-h-[300px]">
                        <div className="text-sm font-medium text-gray-900 mb-3">
                          {new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </div>
                        <div className="space-y-3">
                          {day.meals.map((meal, mealIndex) => {
                            const mealLog = mealLogs[day.date]?.[meal.mealType];
                            const effectiveMealName = getEffectiveMealName(meal.mealType, index, day.date);
                            const isOverridden = plannedMealOverrides[day.date]?.[meal.mealType];
                            
                            return (
                              <div 
                                key={mealIndex}
                                className={`p-3 rounded-lg border-2 transition-all ${
                                  mealLog?.logged 
                                    ? 'border-green-200 bg-green-50' 
                                    : 'border-gray-200 bg-gray-50'
                                }`}
                              >
                                {/* Planned Meal */}
                                <div className="mb-2">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">
                                      {meal.mealType}
                                    </span>
                                    <div className="flex items-center space-x-1">
                                      {isOverridden && (
                                        <PencilIcon className="h-3 w-3 text-yellow-600" title="Manually modified plan" />
                                      )}
                                      {mealLog?.logged && (
                                        <CheckCircleIcon className="h-4 w-4 text-green-500" />
                                      )}
                                    </div>
                                  </div>
                                  <div className="text-sm font-medium text-gray-900 mt-1">
                                    Planned: {effectiveMealName}
                                  </div>
                                </div>

                                {/* Logged Meal (if exists) */}
                                {mealLog?.logged && (
                                  <div className="mb-2 p-2 bg-white rounded border relative group">
                                    <div className="text-xs text-gray-500 mb-1">Actually ate:</div>
                                    <div className="text-sm font-medium text-gray-900">
                                      {mealLog.actualMeal || effectiveMealName}
                                    </div>
                                    {mealLog.rating && (
                                      <div className="flex items-center mt-1">
                                        <span className="text-xs text-gray-500 mr-2">Rating:</span>
                                        <div className="flex">
                                          {[1, 2, 3, 4, 5].map((star) => (
                                            <span
                                              key={star}
                                              className={`text-sm ${
                                                star <= mealLog.rating! ? 'text-yellow-400' : 'text-gray-300'
                                              }`}
                                            >
                                              ★
                                            </span>
                                          ))}
                                        </div>
                                      </div>
                                    )}
                                    {mealLog.notes && (
                                      <div className="mt-1">
                                        <div className="text-xs text-gray-500">Notes:</div>
                                        <div className="text-xs text-gray-700 italic">"{mealLog.notes}"</div>
                                      </div>
                                    )}
                                    
                                    {/* Delete Log Button */}
                                    <button
                                      onClick={() => deleteMealLog(day.date, meal.mealType)}
                                      className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity bg-red-100 hover:bg-red-200 text-red-600 rounded p-1"
                                      title="Delete meal log"
                                    >
                                      <TrashIcon className="h-3 w-3" />
                                    </button>
                                  </div>
                                )}

                                {/* Action Buttons */}
                                <div className="space-y-2">
                                  <button
                                    onClick={() => setShowMealLogger({
                                      date: day.date,
                                      mealType: meal.mealType,
                                      plannedMeal: effectiveMealName
                                    })}
                                    className={`w-full px-3 py-2 text-xs font-medium rounded transition-colors ${
                                      mealLog?.logged
                                        ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
                                        : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                                    }`}
                                  >
                                    {mealLog?.logged ? 'Edit Log' : 'Log Meal'}
                                  </button>
                                  
                                  <button
                                    onClick={() => setShowMealOverride({
                                      date: day.date,
                                      mealType: meal.mealType,
                                      plannedMeal: effectiveMealName,
                                      dayIndex: index
                                    })}
                                    className="w-full px-3 py-2 text-xs font-medium rounded transition-colors bg-gray-100 text-gray-800 hover:bg-gray-200"
                                  >
                                    {isOverridden ? 'Edit Plan' : 'Change Plan'}
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <ChartBarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-500 text-lg mb-4">No meal plan to track</p>
                  <p className="text-gray-400 text-sm mb-4">Create a meal plan first to start tracking</p>
                  <button
                    onClick={() => setActiveTab('planner')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                  >
                    <CalendarIcon className="h-4 w-4 inline mr-2" />
                    Go to Meal Planner
                  </button>
                </div>
              )}

              {/* Weekly Stats */}
              {currentWeekPlan && (
                <div className="grid grid-cols-3 gap-6">
                  <div className="bg-green-50 p-4 rounded-lg">
                    <span className="text-sm font-medium text-green-900">Meals Logged</span>
                    <p className="text-2xl font-bold text-green-900 mt-1">
                      {Object.values(mealLogs).reduce((total, dayLogs) => 
                        total + Object.values(dayLogs).filter(log => log.logged).length, 0
                      )} / {currentWeekPlan.dailyPlans.reduce((total, day) => total + day.meals.length, 0)}
                    </p>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <span className="text-sm font-medium text-yellow-900">Avg Rating</span>
                    <p className="text-2xl font-bold text-yellow-900 mt-1">
                      {(() => {
                        const ratings = Object.values(mealLogs).flatMap(dayLogs => 
                          Object.values(dayLogs).filter(log => log.rating).map(log => log.rating!)
                        );
                        return ratings.length > 0 ? (ratings.reduce((a, b) => a + b, 0) / ratings.length).toFixed(1) : '--';
                      })()}
                    </p>
                  </div>
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <span className="text-sm font-medium text-purple-900">Plan Adherence</span>
                    <p className="text-2xl font-bold text-purple-900 mt-1">
                      {(() => {
                        const totalMeals = currentWeekPlan.dailyPlans.reduce((total, day) => total + day.meals.length, 0);
                        const loggedMeals = Object.values(mealLogs).reduce((total, dayLogs) => 
                          total + Object.values(dayLogs).filter(log => log.logged).length, 0
                        );
                        return totalMeals > 0 ? Math.round((loggedMeals / totalMeals) * 100) : 0;
                      })()}%
                    </p>
                  </div>
                </div>
              )}
            </div>
          ) : null
          }
        </div>
      </div>

      {/* Separate Family Preferences Modal */}
      {showPreferences && (
        <FamilyPreferencesModal
          isOpen={showPreferences}
          onClose={() => {
            setShowPreferences(false);
            setMemberToEdit(null);
            loadData();
          }}
          familyId={familyId}
          memberToEdit={memberToEdit}
        />
      )}

      {/* Detailed Meal View Modal */}
      {selectedMeal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSelectedMeal(null)}></div>
          
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[80vh] flex flex-col">
            {(() => {
              const mealDetails = getMealDetails(selectedMeal.mealName, selectedMeal.meal.mealType);
              return (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
                    <div className="flex items-center">
                      <CakeIcon className="h-6 w-6 text-orange-600 mr-2" />
                      <div>
                        <h2 className="text-xl font-bold text-gray-900">{mealDetails.name}</h2>
                        <p className="text-sm text-gray-500">
                          {new Date(selectedMeal.date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'long', 
                            day: 'numeric' 
                          })} • {selectedMeal.meal.mealType}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => setSelectedMeal(null)} className="text-gray-400 hover:text-gray-600">
                      <XMarkIcon className="w-6 h-6" />
                    </button>
                  </div>

                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Left Column - Recipe Details */}
                      <div className="lg:col-span-2 space-y-6">
                        {/* Description & Quick Info */}
                        <div>
                          <p className="text-gray-700 text-lg mb-4">{mealDetails.description}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg">
                            <div className="text-center">
                              <ClockIcon className="h-5 w-5 text-gray-600 mx-auto mb-1" />
                              <p className="text-sm font-medium text-gray-900">{mealDetails.prepTime} min</p>
                              <p className="text-xs text-gray-500">Prep Time</p>
                            </div>
                            <div className="text-center">
                              <FireIcon className="h-5 w-5 text-gray-600 mx-auto mb-1" />
                              <p className="text-sm font-medium text-gray-900">{mealDetails.cookTime} min</p>
                              <p className="text-xs text-gray-500">Cook Time</p>
                            </div>
                            <div className="text-center">
                              <UserGroupIcon className="h-5 w-5 text-gray-600 mx-auto mb-1" />
                              <p className="text-sm font-medium text-gray-900">{mealDetails.servings}</p>
                              <p className="text-xs text-gray-500">Servings</p>
                            </div>
                            <div className="text-center">
                              <span className={`inline-block w-5 h-5 rounded-full mx-auto mb-1 ${
                                mealDetails.difficulty === 'easy' ? 'bg-green-500' :
                                mealDetails.difficulty === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                              }`}></span>
                              <p className="text-sm font-medium text-gray-900 capitalize">{mealDetails.difficulty}</p>
                              <p className="text-xs text-gray-500">Difficulty</p>
                            </div>
                          </div>
                        </div>

                        {/* Tags */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">Tags</h3>
                          <div className="flex flex-wrap gap-2">
                            {mealDetails.tags.map(tag => (
                              <span key={tag} className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                                {tag}
                              </span>
                            ))}
                            <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm">
                              {mealDetails.cuisine}
                            </span>
                          </div>
                        </div>

                        {/* Ingredients */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">Ingredients</h3>
                          <div className="space-y-2">
                            {mealDetails.ingredients.map((ingredient, index) => (
                              <div key={index} className="flex justify-between items-center p-2 hover:bg-gray-50 rounded">
                                <span className="text-gray-900">{ingredient.name}</span>
                                <span className="text-gray-600 text-sm">
                                  {ingredient.amount} {ingredient.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Instructions */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">Instructions</h3>
                          <div className="space-y-3">
                            {mealDetails.instructions.map((step, index) => (
                              <div key={index} className="flex">
                                <div className="flex-shrink-0 w-8 h-8 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-bold mr-3">
                                  {index + 1}
                                </div>
                                <p className="text-gray-700 pt-1">{step}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Nutrition */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">Nutrition (per serving)</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 bg-green-50 rounded-lg">
                            <div className="text-center">
                              <p className="text-lg font-bold text-green-900">{mealDetails.nutrition.calories}</p>
                              <p className="text-xs text-green-700">Calories</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-green-900">{mealDetails.nutrition.protein}g</p>
                              <p className="text-xs text-green-700">Protein</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-green-900">{mealDetails.nutrition.carbs}g</p>
                              <p className="text-xs text-green-700">Carbs</p>
                            </div>
                            <div className="text-center">
                              <p className="text-lg font-bold text-green-900">{mealDetails.nutrition.fat}g</p>
                              <p className="text-xs text-green-700">Fat</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Column - Family Reactions & History */}
                      <div className="space-y-6">
                        {/* Quick Stats */}
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">Recipe Stats</h3>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Times Cooked:</span>
                              <span className="font-medium text-gray-900">{mealDetails.timesCooked}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Last Made:</span>
                              <span className="font-medium text-gray-900">
                                {mealDetails.lastMade.toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Family Reactions */}
                        <div>
                          <h3 className="text-lg font-semibold text-gray-900 mb-3">Family Reactions</h3>
                          <div className="space-y-3">
                            {mealDetails.familyReactions.map((reaction) => (
                              <div key={reaction.memberId} className="p-3 bg-white border border-gray-200 rounded-lg">
                                <div className="flex items-center justify-between mb-2">
                                  <span className="font-medium text-gray-900">{reaction.memberName}</span>
                                  <div className="flex items-center space-x-1">
                                    {reaction.loved && (
                                      <HeartSolid className="h-4 w-4 text-red-500" />
                                    )}
                                    <div className="flex">
                                      {[1, 2, 3, 4, 5].map((star) => (
                                        <StarSolid
                                          key={star}
                                          className={`h-4 w-4 ${
                                            star <= reaction.rating ? 'text-yellow-400' : 'text-gray-300'
                                          }`}
                                        />
                                      ))}
                                    </div>
                                  </div>
                                </div>
                                <p className="text-sm text-gray-600 italic">"{reaction.comment}"</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-3">
                          <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700">
                            Start Cooking Mode
                          </button>
                          <button className="w-full px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700">
                            Add to Shopping List
                          </button>
                          <button className="w-full px-4 py-2 bg-orange-600 text-white rounded-md text-sm font-medium hover:bg-orange-700">
                            Rate This Meal
                          </button>
                          <button className="w-full px-4 py-2 border border-gray-300 text-gray-700 rounded-md text-sm font-medium hover:bg-gray-50">
                            Edit Recipe
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Meal Logger Modal */}
      {showMealLogger && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowMealLogger(null)}></div>
          
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Log Meal</h2>
                <p className="text-sm text-gray-500">
                  {new Date(showMealLogger.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })} • {showMealLogger.mealType.charAt(0).toUpperCase() + showMealLogger.mealType.slice(1)}
                </p>
              </div>
              <button onClick={() => setShowMealLogger(null)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Planned vs Actual */}
              <div className="bg-blue-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Planned Meal</h3>
                <p className="text-blue-800">{showMealLogger.plannedMeal}</p>
              </div>

              {/* What did you actually eat? */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What did you actually eat?
                </label>
                <input
                  type="text"
                  value={tempLog.actualMeal}
                  onChange={(e) => setTempLog(prev => ({ ...prev, actualMeal: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter what you actually ate..."
                />
              </div>

              {/* Rating */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  How would you rate this meal?
                </label>
                <div className="flex items-center space-x-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setTempLog(prev => ({ ...prev, rating: star }))}
                      className={`text-2xl transition-colors ${
                        star <= tempLog.rating ? 'text-yellow-400 hover:text-yellow-500' : 'text-gray-300 hover:text-gray-400'
                      }`}
                    >
                      ★
                    </button>
                  ))}
                  {tempLog.rating > 0 && (
                    <button
                      onClick={() => setTempLog(prev => ({ ...prev, rating: 0 }))}
                      className="ml-3 text-xs text-gray-500 hover:text-gray-700"
                    >
                      Clear rating
                    </button>
                  )}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (optional)
                </label>
                <textarea
                  value={tempLog.notes}
                  onChange={(e) => setTempLog(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  rows={3}
                  placeholder="How was the taste? Any changes you'd make? Family reactions?"
                />
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <button
                onClick={() => setShowMealLogger(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Cancel
              </button>
              <button
                onClick={saveMealLog}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Save Meal Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meal Override Modal */}
      {showMealOverride && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setShowMealOverride(null)}></div>
          
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-md">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Change Planned Meal</h2>
                <p className="text-sm text-gray-500">
                  {new Date(showMealOverride.date).toLocaleDateString('en-US', { 
                    weekday: 'long', 
                    month: 'long', 
                    day: 'numeric' 
                  })} • {showMealOverride.mealType.charAt(0).toUpperCase() + showMealOverride.mealType.slice(1)}
                </p>
              </div>
              <button onClick={() => setShowMealOverride(null)} className="text-gray-400 hover:text-gray-600">
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Current vs New */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="text-sm font-medium text-gray-900 mb-2">Currently Planned</h3>
                <p className="text-gray-700">{showMealOverride.plannedMeal}</p>
              </div>

              {/* New meal input */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Change to:
                </label>
                <input
                  type="text"
                  value={newMealName}
                  onChange={(e) => setNewMealName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Enter new meal name..."
                  autoFocus
                />
              </div>

              {/* Quick suggestions */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-sm font-medium text-gray-700">Quick suggestions:</h4>
                  <button
                    onClick={() => getAIMealSuggestions(showMealOverride.mealType)}
                    disabled={loadingAiSuggestions}
                    className="text-xs bg-purple-100 text-purple-800 hover:bg-purple-200 px-2 py-1 rounded-full transition-colors disabled:opacity-50 flex items-center gap-1"
                  >
                    <SparklesIcon className="h-3 w-3" />
                    {loadingAiSuggestions ? 'Loading...' : 'AI Suggestions'}
                  </button>
                </div>
                
                <div className="space-y-3">
                  {/* Basic suggestions */}
                  <div className="flex flex-wrap gap-2">
                    {(() => {
                      const suggestions = showMealOverride.mealType === 'breakfast' 
                        ? ['Oatmeal', 'Eggs & Toast', 'Smoothie', 'Cereal', 'Pancakes']
                        : showMealOverride.mealType === 'lunch'
                        ? ['Sandwich', 'Salad', 'Soup', 'Leftovers', 'Wrap']
                        : ['Pasta', 'Pizza', 'Stir-fry', 'Burgers', 'Tacos', 'Salad'];
                      
                      return suggestions.map(suggestion => (
                        <button
                          key={suggestion}
                          onClick={() => setNewMealName(suggestion)}
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-800 hover:bg-blue-200 rounded-full transition-colors"
                        >
                          {suggestion}
                        </button>
                      ));
                    })()}
                  </div>

                  {/* AI suggestions */}
                  {aiSuggestions.length > 0 && (
                    <div>
                      <h5 className="text-xs font-medium text-purple-700 mb-1">AI Personalized Suggestions:</h5>
                      <div className="flex flex-wrap gap-2">
                        {aiSuggestions.map((suggestion, index) => (
                          <button
                            key={`ai-${index}`}
                            onClick={() => setNewMealName(suggestion)}
                            className="px-3 py-1 text-xs bg-purple-100 text-purple-800 hover:bg-purple-200 rounded-full transition-colors flex items-center gap-1"
                          >
                            <SparklesIcon className="h-3 w-3" />
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex space-x-2">
                <button
                  onClick={() => setShowMealOverride(null)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
                >
                  Cancel
                </button>
                {plannedMealOverrides[showMealOverride.date]?.[showMealOverride.mealType] && (
                  <button
                    onClick={() => {
                      // Remove the override to restore original
                      setPlannedMealOverrides(prev => {
                        const newOverrides = { ...prev };
                        if (newOverrides[showMealOverride.date]) {
                          delete newOverrides[showMealOverride.date][showMealOverride.mealType];
                          if (Object.keys(newOverrides[showMealOverride.date]).length === 0) {
                            delete newOverrides[showMealOverride.date];
                          }
                        }
                        return newOverrides;
                      });
                      setShowMealOverride(null);
                    }}
                    className="px-4 py-2 text-orange-700 border border-orange-300 rounded-md hover:bg-orange-50"
                  >
                    Reset to Original
                  </button>
                )}
              </div>
              <button
                onClick={() => savePlannedMealOverride(newMealName)}
                disabled={!newMealName.trim()}
                className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}