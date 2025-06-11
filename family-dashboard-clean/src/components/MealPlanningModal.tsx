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
      <div className="fixed inset-0 bg-black bg-opacity-50" onClick={onClose}></div>
      
      <div className="relative bg-white rounded-lg shadow-xl w-full max-w-6xl h-[85vh] flex flex-col">
        {/* Fixed Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 flex-shrink-0">
          <div className="flex items-center">
            <CalendarIcon className="h-6 w-6 text-blue-600 mr-2" />
            <h2 className="text-xl font-bold text-gray-900">Meal Planner</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <XMarkIcon className="w-6 h-6" />
          </button>
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
                          {day.meals.map((meal, mealIndex) => (
                            <div 
                              key={mealIndex}
                              onClick={() => setSelectedMeal({
                                meal,
                                mealName: getMealName(meal.mealType, index),
                                date: day.date
                              })}
                              className="p-2 bg-blue-50 rounded text-xs hover:bg-blue-100 cursor-pointer transition-colors"
                            >
                              <div className="font-medium text-gray-900 mb-1 capitalize">
                                {meal.mealType}
                              </div>
                              <div className="text-gray-600 text-xs">
                                {getMealName(meal.mealType, index)}
                              </div>
                              {meal.notes && (
                                <div className="text-blue-600 text-xs mt-1">
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
          <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setSelectedMeal(null)}></div>
          
          <div className="relative bg-white rounded-lg shadow-xl w-full max-w-4xl h-[90vh] flex flex-col">
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
    </div>
  );
}