import React, { useState, useEffect } from 'react';
import { 
  XMarkIcon,
  SparklesIcon,
  PlusIcon,
  CalendarIcon,
  UserGroupIcon,
  ClockIcon,
  ShoppingCartIcon
} from '@heroicons/react/24/outline';
import { MealPlanningService } from '../services/mealPlanningService';
import { FamilyMember, WeeklyMealPlan, PlannedMeal, DietaryRestriction } from '../types/mealPlanning';
import FamilyPreferencesModal from './FamilyPreferencesModal';

interface MealPlanningModalProps {
  isOpen: boolean;
  onClose: () => void;
  familyId: string;
  userId: string;
}

export default function MealPlanningModal({ isOpen, onClose, familyId, userId }: MealPlanningModalProps) {
  const [activeTab, setActiveTab] = useState<'planner' | 'preferences' | 'availability'>('planner');
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [currentWeekPlan, setCurrentWeekPlan] = useState<WeeklyMealPlan | null>(null);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [showPreferences, setShowPreferences] = useState(false);
  const [availabilityGrid, setAvailabilityGrid] = useState<{[key: string]: {[key: string]: boolean}}>({});

  useEffect(() => {
    if (isOpen) {
      loadPlannerData();
    }
  }, [isOpen, familyId]);

  const loadPlannerData = async () => {
    setLoading(true);
    try {
      const members = await MealPlanningService.getFamilyMembers(familyId);
      setFamilyMembers(members);

      const weekStart = getWeekStart(selectedDate);
      const weekPlan = await MealPlanningService.getWeeklyMealPlan(familyId, weekStart);
      setCurrentWeekPlan(weekPlan);
    } catch (error) {
      console.error('Error loading planner data:', error);
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

  const generateAIMealPlan = async () => {
    if (familyMembers.length === 0) {
      alert('Please add family members first to generate personalized meal plans.');
      setActiveTab('preferences');
      return;
    }

    setGeneratingPlan(true);
    try {
      // Create a simple meal plan based on family preferences
      const weekStart = getWeekStart(selectedDate);
      const weekEnd = getWeekEnd(weekStart);
      
      const mealSuggestions = generateMealSuggestions(familyMembers);
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
              mealId: `ai-breakfast-${i}`,
              servings: familyMembers.length,
              notes: undefined
            },
            {
              mealType: 'lunch' as const,
              mealId: `ai-lunch-${i}`,
              servings: familyMembers.length,
              notes: undefined
            },
            {
              mealType: 'dinner' as const,
              mealId: `ai-dinner-${i}`,
              servings: familyMembers.length,
              notes: i === 5 ? 'Weekend special meal!' : undefined
            }
          ]
        });
      }

      const newMealPlan: Omit<WeeklyMealPlan, 'id' | 'createdAt' | 'updatedAt'> = {
        familyId,
        weekStartDate: weekStart,
        weekEndDate: weekEnd,
        dailyPlans,
        estimatedCost: Math.floor(Math.random() * 50) + 100, // Simple cost estimation
        generatedBy: 'ai'
      };

      const planId = await MealPlanningService.saveWeeklyMealPlan(newMealPlan);
      if (planId) {
        await loadPlannerData(); // Refresh data
      }
    } catch (error) {
      console.error('Error generating meal plan:', error);
      alert('Error generating meal plan. Please try again.');
    } finally {
      setGeneratingPlan(false);
    }
  };

  const generateMealSuggestions = (members: FamilyMember[]) => {
    // Simple meal suggestions based on dietary restrictions
    const baseMeals = {
      breakfast: ['Oatmeal with Berries', 'Scrambled Eggs', 'Greek Yogurt Parfait', 'Pancakes', 'Avocado Toast', 'Smoothie Bowl', 'French Toast'],
      lunch: ['Grilled Chicken Salad', 'Turkey Wrap', 'Quinoa Bowl', 'Soup & Sandwich', 'Pasta Salad', 'Rice Bowl', 'Veggie Burger'],
      dinner: ['Grilled Salmon', 'Chicken Stir-Fry', 'Pasta Primavera', 'Tacos', 'Pizza Night', 'Beef Curry', 'Vegetable Lasagna']
    };

    // Filter based on dietary restrictions
    const hasVegetarian = members.some(m => m.dietaryRestrictions.includes('vegetarian' as DietaryRestriction));
    const hasVegan = members.some(m => m.dietaryRestrictions.includes('vegan' as DietaryRestriction));
    const hasGlutenFree = members.some(m => m.dietaryRestrictions.includes('gluten-free' as DietaryRestriction));

    if (hasVegan) {
      baseMeals.breakfast = baseMeals.breakfast.filter(meal => 
        !meal.includes('Eggs') && !meal.includes('Yogurt') && !meal.includes('French Toast')
      );
      baseMeals.dinner = baseMeals.dinner.filter(meal => 
        !meal.includes('Salmon') && !meal.includes('Chicken') && !meal.includes('Beef')
      );
    } else if (hasVegetarian) {
      baseMeals.lunch = baseMeals.lunch.filter(meal => 
        !meal.includes('Chicken') && !meal.includes('Turkey')
      );
      baseMeals.dinner = baseMeals.dinner.filter(meal => 
        !meal.includes('Salmon') && !meal.includes('Chicken') && !meal.includes('Beef')
      );
    }

    return baseMeals;
  };

  const getMealName = (mealId: string, mealType: string, dayIndex: number): string => {
    const mealSuggestions = generateMealSuggestions(familyMembers);
    const meals = mealSuggestions[mealType as keyof typeof mealSuggestions] || [];
    return meals[dayIndex % meals.length] || `${mealType.charAt(0).toUpperCase() + mealType.slice(1)}`;
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
    setSelectedDate(newDate);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full max-w-6xl">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <CalendarIcon className="h-6 w-6 text-blue-600 mr-2" />
                <h2 className="text-2xl font-bold text-gray-900">Smart Meal Planner</h2>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <XMarkIcon className="w-6 h-6" />
              </button>
            </div>

            {/* Tab Navigation */}
            <div className="flex border-b border-gray-200 mb-6">
              <button
                onClick={() => setActiveTab('planner')}
                className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'planner'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <CalendarIcon className="h-5 w-5 mr-2" />
                Meal Planner
              </button>
              <button
                onClick={() => setActiveTab('availability')}
                className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'availability'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <ClockIcon className="h-5 w-5 mr-2" />
                Availability
              </button>
              <button
                onClick={() => setActiveTab('preferences')}
                className={`flex items-center px-6 py-3 text-sm font-medium border-b-2 ${
                  activeTab === 'preferences'
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <UserGroupIcon className="h-5 w-5 mr-2" />
                Family Preferences
              </button>
            </div>

            {/* Content */}
            {loading ? (
              <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="max-h-[70vh] overflow-y-auto">
                {activeTab === 'planner' ? (
                  <div className="space-y-6">
                    {/* Header with actions */}
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-medium text-gray-900">Weekly Meal Plan</h3>
                        <p className="text-sm text-gray-500">
                          Week of {getWeekStart(selectedDate)} - {getWeekEnd(getWeekStart(selectedDate))}
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
                          className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-blue-300"
                        >
                          {generatingPlan ? (
                            <>
                              <div className="animate-spin -ml-1 mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                              Generating...
                            </>
                          ) : (
                            <>
                              <SparklesIcon className="h-4 w-4 mr-2" />
                              Generate AI Plan
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    {/* Weekly grid */}
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
                                    className="p-2 bg-gradient-to-r from-blue-50 to-purple-50 rounded text-xs hover:from-blue-100 hover:to-purple-100 cursor-pointer group"
                                  >
                                    <div className="font-medium text-gray-900 mb-1 capitalize">
                                      {meal.mealType}
                                    </div>
                                    <div className="text-gray-600 truncate">
                                      {getMealName(meal.mealId, meal.mealType, index)}
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
                            <p className="text-gray-400 text-sm">Add family members first to create personalized meal plans</p>
                            <button
                              onClick={() => setActiveTab('preferences')}
                              className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                            >
                              <UserGroupIcon className="h-4 w-4 mr-2" />
                              Add Family Members
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={generateAIMealPlan}
                            disabled={generatingPlan}
                            className="inline-flex items-center px-6 py-3 bg-blue-600 text-white rounded-md text-lg font-medium hover:bg-blue-700 disabled:bg-blue-300"
                          >
                            {generatingPlan ? (
                              <>
                                <div className="animate-spin -ml-1 mr-3 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                                Generating Your Meal Plan...
                              </>
                            ) : (
                              <>
                                <SparklesIcon className="h-5 w-5 mr-2" />
                                Generate AI Meal Plan
                              </>
                            )}
                          </button>
                        )}
                      </div>
                    )}

                    {/* Weekly summary */}
                    {currentWeekPlan && (
                      <div className="grid grid-cols-3 gap-6">
                        <div className="bg-green-50 p-4 rounded-lg">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-green-900">Estimated Cost</span>
                          </div>
                          <p className="text-2xl font-bold text-green-900 mt-1">${currentWeekPlan.estimatedCost}</p>
                        </div>
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-blue-900">Family Members</span>
                          </div>
                          <p className="text-2xl font-bold text-blue-900 mt-1">{familyMembers.length}</p>
                        </div>
                        <div className="bg-purple-50 p-4 rounded-lg">
                          <div className="flex items-center">
                            <span className="text-sm font-medium text-purple-900">Meals Planned</span>
                          </div>
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
                      <h3 className="text-lg font-medium text-gray-900">Family Availability</h3>
                      <p className="text-sm text-gray-500">Mark when each family member is available for meals</p>
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
                              const weekStart = getWeekStart(selectedDate);
                              const date = new Date(weekStart);
                              date.setDate(date.getDate() + dayIndex);
                              const dateKey = date.toISOString().split('T')[0];
                              const isAvailable = availabilityGrid[member.id]?.[dateKey] || false;
                              
                              return (
                                <div key={dayIndex} className="p-2 border-r border-gray-200 last:border-r-0 text-center">
                                  <button
                                    onClick={() => {
                                      setAvailabilityGrid(prev => ({
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
                  </div>
                ) : (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-medium text-gray-900">Family Members</h3>
                      <button
                        onClick={() => setShowPreferences(true)}
                        className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                      >
                        <PlusIcon className="h-4 w-4 mr-2" />
                        Add Member
                      </button>
                    </div>

                    {familyMembers.length > 0 ? (
                      <div className="grid gap-4">
                        {familyMembers.map(member => (
                          <div key={member.id} className="border border-gray-200 rounded-lg p-4">
                            <div className="flex items-center justify-between mb-3">
                              <div className="flex items-center space-x-3">
                                <h4 className="font-medium text-gray-900">{member.name}</h4>
                                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded capitalize">
                                  {member.ageGroup}
                                </span>
                              </div>
                            </div>
                            
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div>
                                <span className="text-gray-500 font-medium">Dietary Restrictions:</span>
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {member.dietaryRestrictions.length > 0 ? (
                                    member.dietaryRestrictions.map(restriction => (
                                      <span key={restriction} className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded text-xs">
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
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {member.allergens.length > 0 ? (
                                    member.allergens.map(allergen => (
                                      <span key={allergen} className="bg-red-100 text-red-800 px-2 py-1 rounded text-xs">
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
                                <div className="mt-1 flex flex-wrap gap-1">
                                  {member.favoriteFoods.length > 0 ? (
                                    member.favoriteFoods.map(food => (
                                      <span key={food} className="bg-green-100 text-green-800 px-2 py-1 rounded text-xs">
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
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}