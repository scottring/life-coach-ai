import React, { useState, useEffect } from 'react';
import { 
  CalendarIcon, 
  SparklesIcon, 
  ClockIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon
} from '@heroicons/react/24/outline';
import { MealPlanningService } from '../services/mealPlanningService';
import { WeeklyMealPlan, FamilyMember } from '../types/mealPlanning';

interface MealPlannerWidgetProps {
  familyId: string;
  userId: string;
  onExpandToFullView?: () => void;
}

export default function MealPlannerWidget({ familyId, userId, onExpandToFullView }: MealPlannerWidgetProps) {
  const [viewMode, setViewMode] = useState<'week' | 'day'>('week');
  const [currentWeekPlan, setCurrentWeekPlan] = useState<WeeklyMealPlan | null>(null);
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadWidgetData();
  }, [familyId]);

  const loadWidgetData = async () => {
    setLoading(true);
    try {
      // For demo mode, create sample data
      if (familyId === 'demo-family-123') {
        setFamilyMembers([
          {
            id: 'member-1',
            familyId: 'demo-family-123',
            name: 'Sarah',
            ageGroup: 'adult',
            dietaryRestrictions: ['vegetarian'],
            favoriteFoods: ['pasta', 'salads'],
            dislikedIngredients: ['mushrooms'],
            allergens: [],
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'member-2',
            familyId: 'demo-family-123',
            name: 'Mike',
            ageGroup: 'adult',
            dietaryRestrictions: [],
            favoriteFoods: ['grilled chicken', 'tacos'],
            dislikedIngredients: ['olives'],
            allergens: [],
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'member-3',
            familyId: 'demo-family-123',
            name: 'Emma',
            ageGroup: 'child',
            dietaryRestrictions: [],
            favoriteFoods: ['mac and cheese', 'chicken nuggets'],
            dislikedIngredients: ['broccoli'],
            allergens: [],
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]);

        // Create sample week plan
        const weekStart = getWeekStart(selectedDate);
        setCurrentWeekPlan({
          id: 'demo-widget-plan',
          familyId: 'demo-family-123',
          weekStartDate: weekStart,
          weekEndDate: getWeekEnd(weekStart),
          dailyPlans: generateSampleWeekPlan(weekStart),
          estimatedCost: 125,
          generatedBy: 'ai',
          createdAt: new Date(),
          updatedAt: new Date()
        });
      } else {
        // Load real data
        const members = await MealPlanningService.getFamilyMembers(familyId);
        setFamilyMembers(members);

        const weekStart = getWeekStart(selectedDate);
        const weekPlan = await MealPlanningService.getWeeklyMealPlan(familyId, weekStart);
        setCurrentWeekPlan(weekPlan);
      }
    } catch (error) {
      console.error('Error loading widget data:', error);
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

  const generateSampleWeekPlan = (weekStart: string) => {
    const sampleMeals = {
      breakfast: ['Overnight Oats', 'Scrambled Eggs', 'Greek Yogurt', 'Pancakes', 'Avocado Toast', 'Smoothie Bowl', 'French Toast'],
      lunch: ['Turkey Sandwich', 'Caesar Salad', 'Soup & Sandwich', 'Leftover Dinner', 'Quinoa Bowl', 'Wrap & Fruit', 'Pasta Salad'],
      dinner: ['Pasta Primavera', 'Chicken Tacos', 'Pizza Night', 'Stir-Fry', 'Turkey Burgers', 'Salmon & Veggies', 'Beef Stew']
    };

    const dailyPlans = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      
      dailyPlans.push({
        date: date.toISOString().split('T')[0],
        peopleEating: ['member-1', 'member-2', 'member-3'],
        meals: [
          {
            mealType: 'breakfast' as const,
            mealId: `meal-${i}-breakfast`,
            servings: 3,
            notes: undefined
          },
          {
            mealType: 'lunch' as const,
            mealId: `meal-${i}-lunch`,
            servings: 3,
            notes: undefined
          },
          {
            mealType: 'dinner' as const,
            mealId: `meal-${i}-dinner`,
            servings: 3,
            notes: i === 2 ? 'Family pizza night!' : undefined
          }
        ]
      });
    }
    return dailyPlans;
  };

  const getMealName = (mealId: string, mealType: string, dayIndex: number): string => {
    const sampleMeals = {
      breakfast: ['Overnight Oats', 'Scrambled Eggs', 'Greek Yogurt', 'Pancakes', 'Avocado Toast', 'Smoothie Bowl', 'French Toast'],
      lunch: ['Turkey Sandwich', 'Caesar Salad', 'Soup & Sandwich', 'Leftover Dinner', 'Quinoa Bowl', 'Wrap & Fruit', 'Pasta Salad'],
      dinner: ['Pasta Primavera', 'Chicken Tacos', 'Pizza Night', 'Stir-Fry', 'Turkey Burgers', 'Salmon & Veggies', 'Beef Stew']
    };
    
    const meals = sampleMeals[mealType as keyof typeof sampleMeals];
    return meals?.[dayIndex] || mealType.charAt(0).toUpperCase() + mealType.slice(1);
  };

  const navigateDate = (direction: 'prev' | 'next') => {
    if (viewMode === 'day') {
      const newDate = new Date(selectedDate);
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 1 : -1));
      setSelectedDate(newDate);
    } else {
      const newDate = new Date(selectedDate);
      newDate.setDate(newDate.getDate() + (direction === 'next' ? 7 : -7));
      setSelectedDate(newDate);
    }
  };

  const getTodaysMeals = () => {
    if (!currentWeekPlan) return [];
    const today = selectedDate.toISOString().split('T')[0];
    const todayPlan = currentWeekPlan.dailyPlans.find(day => day.date === today);
    return todayPlan?.meals || [];
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-3 bg-gray-200 rounded"></div>
            <div className="h-3 bg-gray-200 rounded w-5/6"></div>
            <div className="h-3 bg-gray-200 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow">
      {/* Widget Header */}
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-r from-purple-600 to-blue-600 rounded-lg flex items-center justify-center">
              <SparklesIcon className="h-5 w-5 text-white" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900">Smart Meal Planner</h3>
              <p className="text-sm text-gray-500">
                {viewMode === 'week' ? 'Weekly meal overview' : `Today's meals`}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('day')}
                className={`px-3 py-1 text-xs font-medium rounded ${
                  viewMode === 'day' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Day
              </button>
              <button
                onClick={() => setViewMode('week')}
                className={`px-3 py-1 text-xs font-medium rounded ${
                  viewMode === 'week' 
                    ? 'bg-white text-gray-900 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Week
              </button>
            </div>
            
            {/* Navigation */}
            <button
              onClick={() => navigateDate('prev')}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <ChevronLeftIcon className="h-4 w-4" />
            </button>
            <button
              onClick={() => navigateDate('next')}
              className="p-1 text-gray-400 hover:text-gray-600"
            >
              <ChevronRightIcon className="h-4 w-4" />
            </button>
            
            {/* Expand Button */}
            <button
              onClick={onExpandToFullView}
              className="p-1 text-gray-400 hover:text-gray-600"
              title="Open full meal planner"
            >
              <EyeIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
        
        {/* Date Display */}
        <div className="mt-2">
          <p className="text-sm font-medium text-gray-600">
            {viewMode === 'day' 
              ? selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })
              : `Week of ${getWeekStart(selectedDate)} - ${getWeekEnd(getWeekStart(selectedDate))}`
            }
          </p>
        </div>
      </div>

      {/* Widget Content */}
      <div className="p-6">
        {viewMode === 'day' ? (
          // Day View
          <div className="space-y-4">
            {getTodaysMeals().length > 0 ? (
              getTodaysMeals().map((meal, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">
                        {getMealName(meal.mealId, meal.mealType, new Date(selectedDate).getDay())}
                      </p>
                      <p className="text-xs text-gray-500 capitalize">{meal.mealType}</p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-gray-400">{meal.servings} servings</span>
                    <ClockIcon className="h-4 w-4 text-gray-400" />
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <CalendarIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">No meals planned for today</p>
                <button
                  onClick={onExpandToFullView}
                  className="mt-2 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  Plan today's meals
                </button>
              </div>
            )}
          </div>
        ) : (
          // Week View
          <div>
            {currentWeekPlan ? (
              <div className="grid grid-cols-7 gap-1">
                {currentWeekPlan.dailyPlans.map((day, index) => (
                  <div key={day.date} className="text-center">
                    <div className="text-xs font-medium text-gray-500 mb-2">
                      {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                    </div>
                    <div className="space-y-1">
                      {day.meals.slice(0, 2).map((meal, mealIndex) => (
                        <div 
                          key={mealIndex} 
                          className="w-full h-8 bg-gradient-to-r from-blue-100 to-purple-100 rounded text-xs flex items-center justify-center hover:from-blue-200 hover:to-purple-200 transition-colors cursor-pointer"
                          title={`${meal.mealType}: ${getMealName(meal.mealId, meal.mealType, index)}`}
                        >
                          <span className="truncate px-1">
                            {getMealName(meal.mealId, meal.mealType, index).split(' ')[0]}
                          </span>
                        </div>
                      ))}
                      {day.meals.length > 2 && (
                        <div className="w-full h-6 bg-gray-100 rounded text-xs flex items-center justify-center text-gray-500">
                          +{day.meals.length - 2}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-6">
                <SparklesIcon className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500 text-sm mb-3">No meal plan for this week</p>
                <button
                  onClick={onExpandToFullView}
                  className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  <SparklesIcon className="h-4 w-4 mr-1" />
                  Generate Meal Plan
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Widget Footer */}
      {currentWeekPlan && (
        <div className="px-6 py-3 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">
              Weekly cost: <span className="font-medium">${currentWeekPlan.estimatedCost}</span>
            </span>
            <button
              onClick={onExpandToFullView}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              View full planner →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}