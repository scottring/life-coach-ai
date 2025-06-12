import React, { useState, useEffect } from 'react';
import { 
  CalendarIcon, 
  SparklesIcon, 
  UserGroupIcon, 
  XMarkIcon,
  PlusIcon,
  ClockIcon,
  FireIcon,
  CakeIcon
} from '@heroicons/react/24/outline';
import { StarIcon as StarSolid, HeartIcon as HeartSolid } from '@heroicons/react/24/solid';
import { MealPlanningService } from '../services/mealPlanningService';
import { FamilyMember, WeeklyMealPlan } from '../types/mealPlanning';
import FamilyPreferencesModal from './FamilyPreferencesModal';

interface MealPlanningModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  userId: string;
}

export default function MealPlanningModal({ isOpen, onClose, familyId }: MealPlanningModalProps) {
  const [activeTab, setActiveTab] = useState<'preferences' | 'availability' | 'planner'>('preferences');
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [currentWeekPlan, setCurrentWeekPlan] = useState<WeeklyMealPlan | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<{meal: any, mealName: string, date: string} | null>(null);
  const [availabilityGrid, setAvailabilityGrid] = useState<{[memberId: string]: {[dateKey: string]: boolean}}>({});
  const [cookingMode, setCookingMode] = useState<{isActive: boolean, currentStep: number, meal: any} | null>(null);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, familyId]);

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
      setActiveTab('preferences');
      return;
    }

    setGeneratingPlan(true);
    try {
      const weekStart = getWeekStart(selectedWeek);
      const weekEnd = getWeekEnd(weekStart);
      
      const dailyPlans = [];
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        
        dailyPlans.push({
          date: date.toISOString().split('T')[0],
          peopleEating: familyMembers.map(m => m.id),
          meals: [
            {
              mealType: 'breakfast' as const,
              mealId: `breakfast-${i}`,
              servings: familyMembers.length
            },
            {
              mealType: 'lunch' as const,
              mealId: `lunch-${i}`,
              servings: familyMembers.length
            },
            {
              mealType: 'dinner' as const,
              mealId: `dinner-${i}`,
              servings: familyMembers.length,
              ...(i === 5 && { notes: 'Weekend special!' })
            }
          ]
        });
      }

      const newMealPlan = {
        familyId,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        dailyPlans,
        estimatedCost: Math.floor(Math.random() * 50) + 100,
        generatedBy: 'ai' as const
      };

      const planId = await MealPlanningService.saveWeeklyMealPlan(newMealPlan);
      if (planId) {
        await loadData();
      }
    } catch (error) {
      console.error('Error generating meal plan:', error);
      alert('Error generating meal plan');
    } finally {
      setGeneratingPlan(false);
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedWeek);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedWeek(newDate);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
      
      <div className="relative apple-card w-full max-w-6xl h-[85vh] flex flex-col" style={{ background: '#f5f5f7' }}>
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200/50 flex-shrink-0" 
             style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
          <div className="flex items-center">
            <CalendarIcon className="h-6 w-6 mr-3 sf-icon" style={{ color: 'var(--apple-blue)' }} />
            <h2 className="apple-title text-xl text-gray-800">Meal Planner</h2>
          </div>
          <button onClick={onClose} className="text-gray-600 hover:text-gray-800 apple-transition p-2 rounded-lg hover:bg-gray-100/50">
            <XMarkIcon className="w-6 h-6 sf-icon" />
          </button>
        </div>

        {/* Fixed Tabs */}
        <div className="flex border-b border-gray-200/50 px-6 flex-shrink-0" style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`px-4 py-3 apple-caption font-medium border-b-2 apple-transition ${
              activeTab === 'preferences'
                ? 'text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
            style={{ borderBottomColor: activeTab === 'preferences' ? 'var(--apple-blue)' : 'transparent' }}
          >
            <UserGroupIcon className="h-4 w-4 inline mr-2 sf-icon" />
            Family Members
          </button>
          <button
            onClick={() => setActiveTab('availability')}
            className={`px-4 py-3 apple-caption font-medium border-b-2 apple-transition ${
              activeTab === 'availability'
                ? 'text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
            style={{ borderBottomColor: activeTab === 'availability' ? 'var(--apple-blue)' : 'transparent' }}
          >
            <ClockIcon className="h-4 w-4 inline mr-2 sf-icon" />
            Availability
          </button>
          <button
            onClick={() => setActiveTab('planner')}
            className={`px-4 py-3 apple-caption font-medium border-b-2 apple-transition ${
              activeTab === 'planner'
                ? 'text-blue-600'
                : 'border-transparent text-gray-600 hover:text-gray-800'
            }`}
            style={{ borderBottomColor: activeTab === 'planner' ? 'var(--apple-blue)' : 'transparent' }}
          >
            <CalendarIcon className="h-4 w-4 inline mr-2 sf-icon" />
            Meal Planner
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-6" style={{ background: 'white' }}>
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : activeTab === 'preferences' ? (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-medium text-gray-900">Family Members</h3>
                <button
                  onClick={() => setShowPreferences(true)}
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
                        <h4 className="font-medium text-gray-900">{member.name}</h4>
                        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded capitalize">
                          {member.ageGroup}
                        </span>
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
                  <div className="grid grid-cols-8 border-b border-gray-200">
                    <div className="px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200">
                      Member
                    </div>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="px-2 py-3 text-sm font-medium text-gray-900 bg-gray-50 text-center border-r border-gray-200 last:border-r-0">
                        {day}
                      </div>
                    ))}
                  </div>
                  {familyMembers.map(member => (
                    <div key={member.id} className="grid grid-cols-8 border-b border-gray-200 last:border-b-0">
                      <div className="px-4 py-4 text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200">
                        {member.name}
                      </div>
                      {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => {
                        const weekStart = getWeekStart(selectedWeek);
                        const date = new Date(weekStart);
                        date.setDate(date.getDate() + dayIndex);
                        const dateKey = date.toISOString().split('T')[0];
                        const isAvailable = availabilityGrid[member.id]?.[dateKey] || false;
                        
                        return (
                          <div key={dayIndex} className="p-2 border-r border-gray-200 last:border-r-0 text-center">
                            <button
                              onClick={() => {
                                setAvailabilityGrid((prev: {[memberId: string]: {[dateKey: string]: boolean}}) => ({
                                  ...prev,
                                  [member.id]: {
                                    ...prev[member.id],
                                    [dateKey]: !isAvailable
                                  }
                                }));
                              }}
                              className={`w-8 h-8 rounded-full border-2 transition-colors ${
                                isAvailable
                                  ? 'bg-green-500 border-green-500 text-white'
                                  : 'bg-white border-gray-300 hover:border-green-400'
                              }`}
                            >
                              {isAvailable ? '✓' : ''}
                            </button>
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
                            newGrid[member.id][dateKey] = true;
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
                            newGrid[member.id][dateKey] = false;
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
                      <li>• Click the circles to mark when family members are available</li>
                      <li>• Green checkmarks = available for meals that day</li>
                      <li>• This helps AI generate meal plans based on who's home</li>
                      <li>• Navigate between weeks to set future availability</li>
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
                    className="apple-button p-3 text-white hover:text-gray-200"
                  >
                    ←
                  </button>
                  <button
                    onClick={() => navigateWeek('next')}
                    className="apple-button p-3 text-white hover:text-gray-200"
                  >
                    →
                  </button>
                  <button
                    onClick={generateAIMealPlan}
                    disabled={generatingPlan}
                    className="apple-button px-4 py-2 text-white apple-caption font-medium"
                    style={{ background: generatingPlan ? 'rgba(0, 122, 255, 0.5)' : 'var(--apple-blue)' }}
                  >
                    {generatingPlan ? (
                      <>
                        <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full inline-block"></div>
                        Generating...
                      </>
                    ) : (
                      <>
                        <SparklesIcon className="h-4 w-4 inline mr-2 sf-icon" />
                        Generate AI Plan
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Meal Plan Grid */}
              {currentWeekPlan ? (
                <div className="apple-card overflow-hidden" style={{ background: '#f5f5f7' }}>
                  <div className="grid grid-cols-7 border-b border-gray-200/50" style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="px-4 py-3 apple-caption font-medium text-gray-800 text-center border-r border-gray-200/50 last:border-r-0">
                        {day}
                      </div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7" style={{ background: 'white' }}>
                    {currentWeekPlan.dailyPlans.map((day, index) => (
                      <div key={day.date} className="p-4 border-r border-gray-200/30 last:border-r-0 min-h-[200px]">
                        <div className="apple-caption font-medium text-gray-800 mb-3">
                          {new Date(day.date).getDate()}
                        </div>
                        <div className="space-y-2">
                          {day.meals.map((meal, mealIndex) => (
                            <div 
                              key={mealIndex}
                              onClick={() => setSelectedMeal({
                                meal,
                                mealName: getMealName(meal.mealType, index),
                                date: day.date
                              })}
                              className="apple-card p-3 cursor-pointer apple-transition hover:transform hover:scale-[1.02]"
                              style={{ 
                                background: 'rgba(0, 122, 255, 0.08)',
                                border: '1px solid rgba(0, 122, 255, 0.15)'
                              }}
                            >
                              <div className="apple-caption font-medium text-gray-800 mb-1 capitalize">
                                {meal.mealType}
                              </div>
                              <div className="text-gray-600 apple-caption">
                                {getMealName(meal.mealType, index)}
                              </div>
                              {meal.notes && (
                                <div className="apple-caption mt-1" style={{ color: 'var(--apple-blue)' }}>
                                  {meal.notes}
                                </div>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <CalendarIcon className="h-16 w-16 text-gray-400/40 mx-auto mb-4 sf-icon" />
                  <p className="apple-body text-gray-700 text-lg mb-4">No meal plan for this week</p>
                  {familyMembers.length === 0 ? (
                    <div className="space-y-4">
                      <p className="apple-caption text-gray-600">Add family members first</p>
                      <button
                        onClick={() => setActiveTab('preferences')}
                        className="apple-button px-4 py-2 text-white apple-caption font-medium"
                        style={{ background: 'var(--apple-green)' }}
                      >
                        <UserGroupIcon className="h-4 w-4 inline mr-2 sf-icon" />
                        Add Family Members
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={generateAIMealPlan}
                      disabled={generatingPlan}
                      className="apple-button px-6 py-3 text-white apple-subtitle font-medium"
                      style={{ background: generatingPlan ? 'rgba(0, 122, 255, 0.5)' : 'var(--apple-blue)' }}
                    >
                      {generatingPlan ? (
                        <>
                          <div className="animate-spin -ml-1 mr-3 h-5 w-5 border-2 border-white border-t-transparent rounded-full inline-block"></div>
                          Generating...
                        </>
                      ) : (
                        <>
                          <SparklesIcon className="h-5 w-5 inline mr-2 sf-icon" />
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
                  <div className="apple-card p-4" style={{ background: 'rgba(52, 199, 89, 0.1)', border: '1px solid rgba(52, 199, 89, 0.2)' }}>
                    <span className="apple-caption font-medium" style={{ color: 'var(--apple-green)' }}>Estimated Cost</span>
                    <p className="apple-title text-2xl mt-1" style={{ color: 'var(--apple-green)' }}>${currentWeekPlan.estimatedCost}</p>
                  </div>
                  <div className="apple-card p-4" style={{ background: 'rgba(0, 122, 255, 0.1)', border: '1px solid rgba(0, 122, 255, 0.2)' }}>
                    <span className="apple-caption font-medium" style={{ color: 'var(--apple-blue)' }}>Family Members</span>
                    <p className="apple-title text-2xl mt-1" style={{ color: 'var(--apple-blue)' }}>{familyMembers.length}</p>
                  </div>
                  <div className="apple-card p-4" style={{ background: 'rgba(175, 82, 222, 0.1)', border: '1px solid rgba(175, 82, 222, 0.2)' }}>
                    <span className="apple-caption font-medium" style={{ color: 'var(--apple-purple)' }}>Meals Planned</span>
                    <p className="apple-title text-2xl mt-1" style={{ color: 'var(--apple-purple)' }}>
                      {currentWeekPlan.dailyPlans.reduce((total, day) => total + day.meals.length, 0)}
                    </p>
                  </div>
                </div>
              )}

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
                  <div className="grid grid-cols-8 border-b border-gray-200">
                    <div className="px-4 py-3 text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200">
                      Member
                    </div>
                    {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
                      <div key={day} className="px-2 py-3 text-sm font-medium text-gray-900 bg-gray-50 text-center border-r border-gray-200 last:border-r-0">
                        {day}
                      </div>
                    ))}
                  </div>
                  {familyMembers.map(member => (
                    <div key={member.id} className="grid grid-cols-8 border-b border-gray-200 last:border-b-0">
                      <div className="px-4 py-4 text-sm font-medium text-gray-900 bg-gray-50 border-r border-gray-200">
                        {member.name}
                      </div>
                      {[0, 1, 2, 3, 4, 5, 6].map(dayIndex => {
                        const weekStart = getWeekStart(selectedWeek);
                        const date = new Date(weekStart);
                        date.setDate(date.getDate() + dayIndex);
                        const dateKey = date.toISOString().split('T')[0];
                        const isAvailable = availabilityGrid[member.id]?.[dateKey] || false;
                        
                        return (
                          <div key={dayIndex} className="p-2 border-r border-gray-200 last:border-r-0 text-center">
                            <button
                              onClick={() => {
                                setAvailabilityGrid((prev: {[memberId: string]: {[dateKey: string]: boolean}}) => ({
                                  ...prev,
                                  [member.id]: {
                                    ...prev[member.id],
                                    [dateKey]: !isAvailable
                                  }
                                }));
                              }}
                              className={`w-8 h-8 rounded-full border-2 transition-colors ${
                                isAvailable
                                  ? 'bg-green-500 border-green-500 text-white'
                                  : 'bg-white border-gray-300 hover:border-green-400'
                              }`}
                            >
                              {isAvailable ? '✓' : ''}
                            </button>
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
                            newGrid[member.id][dateKey] = true;
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
                            newGrid[member.id][dateKey] = false;
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
                      <li>• Click the circles to mark when family members are available</li>
                      <li>• Green checkmarks = available for meals that day</li>
                      <li>• This helps AI generate meal plans based on who's home</li>
                      <li>• Navigate between weeks to set future availability</li>
                    </ul>
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
            loadData();
          }}
          familyId={familyId}
        />
      )}

      {/* Detailed Meal View Modal */}
      {selectedMeal && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelectedMeal(null)}></div>
          
          <div className="relative apple-card w-full max-w-4xl h-[90vh] flex flex-col" style={{ background: '#f5f5f7' }}>
            {(() => {
              const mealDetails = getMealDetails(selectedMeal.mealName, selectedMeal.meal.mealType);
              return (
                <>
                  {/* Header */}
                  <div className="flex items-center justify-between p-6 border-b border-gray-200/50 flex-shrink-0" 
                       style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
                    <div className="flex items-center">
                      <CakeIcon className="h-6 w-6 mr-3 sf-icon" style={{ color: 'var(--apple-orange)' }} />
                      <div>
                        <h2 className="apple-title text-xl text-gray-800">{mealDetails.name}</h2>
                        <p className="apple-caption text-gray-600">
                          {new Date(selectedMeal.date).toLocaleDateString('en-US', { 
                            weekday: 'long', 
                            month: 'long', 
                            day: 'numeric' 
                          })} • {selectedMeal.meal.mealType}
                        </p>
                      </div>
                    </div>
                    <button onClick={() => setSelectedMeal(null)} className="text-gray-600 hover:text-gray-800 apple-transition p-2 rounded-lg hover:bg-gray-100/50">
                      <XMarkIcon className="w-6 h-6 sf-icon" />
                    </button>
                  </div>

                  {/* Scrollable Content */}
                  <div className="flex-1 overflow-y-auto p-6" style={{ background: 'white' }}>
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                      {/* Left Column - Recipe Details */}
                      <div className="lg:col-span-2 space-y-6">
                        {/* Description & Quick Info */}
                        <div>
                          <p className="apple-body text-gray-800 text-lg mb-4">{mealDetails.description}</p>
                          
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 apple-card" style={{ background: 'rgba(0, 0, 0, 0.03)' }}>
                            <div className="text-center">
                              <ClockIcon className="h-5 w-5 text-gray-600 mx-auto mb-1 sf-icon" />
                              <p className="apple-caption font-medium text-gray-800">{mealDetails.prepTime} min</p>
                              <p className="apple-caption text-gray-600">Prep Time</p>
                            </div>
                            <div className="text-center">
                              <FireIcon className="h-5 w-5 text-gray-600 mx-auto mb-1 sf-icon" />
                              <p className="apple-caption font-medium text-gray-800">{mealDetails.cookTime} min</p>
                              <p className="apple-caption text-gray-600">Cook Time</p>
                            </div>
                            <div className="text-center">
                              <UserGroupIcon className="h-5 w-5 text-gray-600 mx-auto mb-1 sf-icon" />
                              <p className="apple-caption font-medium text-gray-800">{mealDetails.servings}</p>
                              <p className="apple-caption text-gray-600">Servings</p>
                            </div>
                            <div className="text-center">
                              <span className={`inline-block w-5 h-5 rounded-full mx-auto mb-1 ${
                                mealDetails.difficulty === 'easy' ? 'bg-green-500' :
                                mealDetails.difficulty === 'medium' ? 'bg-yellow-500' : 'bg-red-500'
                              }`}></span>
                              <p className="apple-caption font-medium text-gray-800 capitalize">{mealDetails.difficulty}</p>
                              <p className="apple-caption text-gray-600">Difficulty</p>
                            </div>
                          </div>
                        </div>

                        {/* Tags */}
                        <div>
                          <h3 className="apple-subtitle text-gray-800 mb-3">Tags</h3>
                          <div className="flex flex-wrap gap-2">
                            {mealDetails.tags.map(tag => (
                              <span key={tag} className="px-3 py-1 rounded-full apple-caption" 
                                    style={{ background: 'rgba(0, 122, 255, 0.1)', color: 'var(--apple-blue)' }}>
                                {tag}
                              </span>
                            ))}
                            <span className="px-3 py-1 rounded-full apple-caption"
                                  style={{ background: 'rgba(175, 82, 222, 0.1)', color: 'var(--apple-purple)' }}>
                              {mealDetails.cuisine}
                            </span>
                          </div>
                        </div>

                        {/* Ingredients */}
                        <div>
                          <h3 className="apple-subtitle text-gray-800 mb-3">Ingredients</h3>
                          <div className="space-y-2">
                            {mealDetails.ingredients.map((ingredient, index) => (
                              <div key={index} className="flex justify-between items-center p-3 hover:bg-gray-50 rounded-xl apple-transition">
                                <span className="apple-body text-gray-800">{ingredient.name}</span>
                                <span className="apple-caption text-gray-600">
                                  {ingredient.amount} {ingredient.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Instructions */}
                        <div>
                          <h3 className="apple-subtitle text-gray-800 mb-3">Instructions</h3>
                          <div className="space-y-3">
                            {mealDetails.instructions.map((step, index) => (
                              <div key={index} className="flex">
                                <div className="flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center apple-caption font-bold mr-3"
                                     style={{ background: 'rgba(0, 122, 255, 0.1)', color: 'var(--apple-blue)' }}>
                                  {index + 1}
                                </div>
                                <p className="apple-body text-gray-800 pt-1">{step}</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Nutrition */}
                        <div>
                          <h3 className="apple-subtitle text-gray-800 mb-3">Nutrition (per serving)</h3>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 apple-card" 
                               style={{ background: 'rgba(52, 199, 89, 0.1)', border: '1px solid rgba(52, 199, 89, 0.2)' }}>
                            <div className="text-center">
                              <p className="apple-subtitle font-bold" style={{ color: 'var(--apple-green)' }}>{mealDetails.nutrition.calories}</p>
                              <p className="apple-caption" style={{ color: 'var(--apple-green)' }}>Calories</p>
                            </div>
                            <div className="text-center">
                              <p className="apple-subtitle font-bold" style={{ color: 'var(--apple-green)' }}>{mealDetails.nutrition.protein}g</p>
                              <p className="apple-caption" style={{ color: 'var(--apple-green)' }}>Protein</p>
                            </div>
                            <div className="text-center">
                              <p className="apple-subtitle font-bold" style={{ color: 'var(--apple-green)' }}>{mealDetails.nutrition.carbs}g</p>
                              <p className="apple-caption" style={{ color: 'var(--apple-green)' }}>Carbs</p>
                            </div>
                            <div className="text-center">
                              <p className="apple-subtitle font-bold" style={{ color: 'var(--apple-green)' }}>{mealDetails.nutrition.fat}g</p>
                              <p className="apple-caption" style={{ color: 'var(--apple-green)' }}>Fat</p>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Right Column - Family Reactions & History */}
                      <div className="space-y-6">
                        {/* Quick Stats */}
                        <div className="apple-card p-4" style={{ background: 'rgba(0, 0, 0, 0.03)' }}>
                          <h3 className="apple-subtitle text-gray-800 mb-3">Recipe Stats</h3>
                          <div className="space-y-2">
                            <div className="flex justify-between">
                              <span className="apple-caption text-gray-600">Times Cooked:</span>
                              <span className="apple-caption font-medium text-gray-800">{mealDetails.timesCooked}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="apple-caption text-gray-600">Last Made:</span>
                              <span className="apple-caption font-medium text-gray-800">
                                {mealDetails.lastMade.toLocaleDateString()}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Family Reactions */}
                        <div>
                          <h3 className="apple-subtitle text-gray-800 mb-3">Family Reactions</h3>
                          <div className="space-y-3">
                            {mealDetails.familyReactions.map((reaction) => (
                              <div key={reaction.memberId} className="apple-card p-3" style={{ background: 'rgba(255, 255, 255, 0.8)' }}>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="apple-caption font-medium text-gray-800">{reaction.memberName}</span>
                                  <div className="flex items-center space-x-1">
                                    {reaction.loved && (
                                      <HeartSolid className="h-4 w-4" style={{ color: 'var(--apple-red)' }} />
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
                                <p className="apple-caption text-gray-600 italic">"{reaction.comment}"</p>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="space-y-3">
                          <button 
                            onClick={() => {
                              setCookingMode({
                                isActive: true,
                                currentStep: 0,
                                meal: mealDetails
                              });
                            }}
                            className="apple-button w-full px-4 py-2 text-white apple-caption font-medium"
                            style={{ background: 'var(--apple-blue)' }}>
                            Start Cooking Mode
                          </button>
                          <button 
                            onClick={() => {
                              const ingredients = mealDetails.ingredients.map(ing => `${ing.amount} ${ing.unit} ${ing.name}`).join('\n');
                              alert(`🛒 Added to shopping list:\n\n${ingredients}`);
                            }}
                            className="apple-button w-full px-4 py-2 text-white apple-caption font-medium"
                            style={{ background: 'var(--apple-green)' }}>
                            Add to Shopping List
                          </button>
                          <button 
                            onClick={() => {
                              const rating = prompt('⭐ Rate this meal (1-5 stars):');
                              if (rating && parseInt(rating) >= 1 && parseInt(rating) <= 5) {
                                alert(`Thanks for rating ${mealDetails.name} ${rating} stars!`);
                              }
                            }}
                            className="apple-button w-full px-4 py-2 text-white apple-caption font-medium"
                            style={{ background: 'var(--apple-orange)' }}>
                            Rate This Meal
                          </button>
                          <button className="apple-button w-full px-4 py-2 text-gray-500 apple-caption font-medium hover:text-gray-700 apple-transition">
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

      {/* Cooking Mode Modal */}
      {cookingMode?.isActive && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4">
          <div className="fixed inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setCookingMode(null)}></div>
          
          <div className="relative apple-card w-full max-w-2xl h-[85vh] flex flex-col" style={{ background: '#f5f5f7' }}>
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200/50 flex-shrink-0" 
                 style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
              <div className="flex items-center">
                <FireIcon className="h-6 w-6 mr-3 sf-icon" style={{ color: 'var(--apple-orange)' }} />
                <div>
                  <h2 className="apple-title text-xl text-gray-800">Cooking Mode</h2>
                  <p className="apple-caption text-gray-600">{cookingMode.meal.name}</p>
                </div>
              </div>
              <button onClick={() => setCookingMode(null)} className="text-gray-600 hover:text-gray-800 apple-transition p-2 rounded-lg hover:bg-gray-100/50">
                <XMarkIcon className="w-6 h-6 sf-icon" />
              </button>
            </div>

            {/* Progress Bar */}
            <div className="p-4 border-b border-gray-200/50" style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
              <div className="flex items-center justify-between mb-2">
                <span className="apple-caption text-gray-600">Step {cookingMode.currentStep + 1} of {cookingMode.meal.instructions.length}</span>
                <span className="apple-caption text-gray-600">
                  {Math.round(((cookingMode.currentStep + 1) / cookingMode.meal.instructions.length) * 100)}% Complete
                </span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div 
                  className="h-2 rounded-full apple-transition"
                  style={{ 
                    background: 'var(--apple-blue)',
                    width: `${((cookingMode.currentStep + 1) / cookingMode.meal.instructions.length) * 100}%`
                  }}
                ></div>
              </div>
            </div>

            {/* Current Step Content */}
            <div className="flex-1 overflow-y-auto p-6" style={{ background: 'white' }}>
              <div className="space-y-6">
                {/* Current Step */}
                <div className="text-center">
                  <div className="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4"
                       style={{ background: 'rgba(0, 122, 255, 0.1)' }}>
                    <span className="apple-title font-bold" style={{ color: 'var(--apple-blue)' }}>
                      {cookingMode.currentStep + 1}
                    </span>
                  </div>
                  <p className="apple-body text-gray-800 text-lg leading-relaxed">
                    {cookingMode.meal.instructions[cookingMode.currentStep]}
                  </p>
                </div>

                {/* Timer Section (if first step) */}
                {cookingMode.currentStep === 0 && (
                  <div className="apple-card p-4 text-center" style={{ background: 'rgba(255, 149, 0, 0.1)' }}>
                    <ClockIcon className="h-6 w-6 mx-auto mb-2 sf-icon" style={{ color: 'var(--apple-orange)' }} />
                    <p className="apple-subtitle" style={{ color: 'var(--apple-orange)' }}>
                      Prep Time: {cookingMode.meal.prepTime} minutes
                    </p>
                    <p className="apple-caption text-gray-600">
                      Make sure you have all ingredients ready!
                    </p>
                  </div>
                )}

                {/* Ingredients Quick Reference */}
                <div className="apple-card p-4" style={{ background: 'rgba(0, 0, 0, 0.03)' }}>
                  <h4 className="apple-subtitle text-gray-800 mb-3">Ingredients Quick Reference</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {cookingMode.meal.ingredients.slice(0, 6).map((ingredient: any, index: number) => (
                      <div key={index} className="flex justify-between items-center">
                        <span className="apple-caption text-gray-800">{ingredient.name}</span>
                        <span className="apple-caption text-gray-600">
                          {ingredient.amount} {ingredient.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Navigation Controls */}
            <div className="p-6 border-t border-gray-200/50 flex-shrink-0" style={{ background: 'rgba(255, 255, 255, 0.95)' }}>
              <div className="flex space-x-3">
                <button
                  onClick={() => setCookingMode(prev => prev ? {...prev, currentStep: Math.max(0, prev.currentStep - 1)} : null)}
                  disabled={cookingMode.currentStep === 0}
                  className={`flex-1 px-4 py-3 rounded-xl apple-caption font-medium apple-transition ${
                    cookingMode.currentStep === 0 
                      ? 'bg-gray-200 text-gray-400 cursor-not-allowed' 
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  Previous Step
                </button>
                
                {cookingMode.currentStep < cookingMode.meal.instructions.length - 1 ? (
                  <button
                    onClick={() => setCookingMode(prev => prev ? {...prev, currentStep: prev.currentStep + 1} : null)}
                    className="flex-1 px-4 py-3 text-white apple-caption font-medium rounded-xl apple-transition"
                    style={{ background: 'var(--apple-blue)' }}
                  >
                    Next Step
                  </button>
                ) : (
                  <button
                    onClick={() => {
                      setCookingMode(null);
                      alert('🎉 Cooking complete! Enjoy your meal!');
                    }}
                    className="flex-1 px-4 py-3 text-white apple-caption font-medium rounded-xl apple-transition"
                    style={{ background: 'var(--apple-green)' }}
                  >
                    Finish Cooking
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}