import React, { useState, useEffect } from 'react';
import { familyService, FamilyMeal, ShoppingItem } from '../services/familyService';

interface MealPlannerProps {
  familyId: string;
  userId: string;
}

interface MealPeople {
  adults: number;
  children: number;
  totalCount: number;
  source?: string;
}

interface AISuggestion {
  name: string;
  ingredients_have: string[];
  ingredients_need: string[];
  prep_time: string;
  difficulty: string;
  servings: number;
  uses_expiring?: string[];
  nutrition_note?: string;
}

const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
const mealTypes = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export default function MealPlanner({ familyId, userId }: MealPlannerProps) {
  const [meals, setMeals] = useState<FamilyMeal[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [planningStep, setPlanningStep] = useState<'select' | 'plan'>('select');
  const [selectedMeals, setSelectedMeals] = useState<Record<string, boolean>>({});
  const [mealPlans, setMealPlans] = useState<Record<string, string>>({});
  const [mealPeople, setMealPeople] = useState<Record<string, MealPeople>>({});
  const [aiSuggestions, setAiSuggestions] = useState<Record<string, AISuggestion[]>>({});
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);

  // Default family size preferences
  const [defaultFamily] = useState({ adults: 2, children: 2 });

  useEffect(() => {
    loadData();
  }, [familyId]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [mealsData, shoppingData] = await Promise.all([
        familyService.getMeals(familyId),
        familyService.getShoppingItems(familyId)
      ]);
      setMeals(mealsData);
      setShoppingItems(shoppingData);
    } catch (error) {
      console.error('Error loading meal planner data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeekStart = (date: Date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day;
    return new Date(d.setDate(diff));
  };

  const getDateForDay = (weekStart: Date, dayName: string) => {
    const dayIndex = days.indexOf(dayName);
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + dayIndex);
    return date;
  };

  const getMealKey = (day: string, mealType: string) => `${day}-${mealType}`;

  const getSmartDefaults = (day: string, mealType: string): MealPeople => {
    const isWeekend = day === 'saturday' || day === 'sunday';
    
    // Smart defaults based on meal type and day
    if (mealType === 'lunch' && !isWeekend) {
      // Lunch on weekdays - children might be at school
      return {
        adults: defaultFamily.adults,
        children: 0,
        totalCount: defaultFamily.adults,
        source: 'weekday lunch default'
      };
    }
    
    // Default to full family
    return {
      adults: defaultFamily.adults,
      children: defaultFamily.children,
      totalCount: defaultFamily.adults + defaultFamily.children,
      source: 'family default'
    };
  };

  const handleMealSelection = (day: string, mealType: string, selected: boolean) => {
    const key = getMealKey(day, mealType);
    setSelectedMeals(prev => ({
      ...prev,
      [key]: selected
    }));
    
    // Initialize with smart defaults if selecting for first time
    if (selected && !mealPeople[key]) {
      const defaults = getSmartDefaults(day, mealType);
      setMealPeople(prev => ({
        ...prev,
        [key]: defaults
      }));
    }
  };

  const handlePeopleSelection = (day: string, mealType: string, adults: number, children: number) => {
    const key = getMealKey(day, mealType);
    setMealPeople(prev => ({
      ...prev,
      [key]: {
        adults: adults || 0,
        children: children || 0,
        totalCount: (adults || 0) + (children || 0)
      }
    }));
  };

  const getSelectedMealsCount = () => {
    return Object.values(selectedMeals).filter(Boolean).length;
  };

  const handleProceedToPlanning = () => {
    // Initialize meal plans for selected meals
    const initialPlans: Record<string, string> = {};
    Object.entries(selectedMeals).forEach(([key, selected]) => {
      if (selected) {
        initialPlans[key] = '';
      }
    });
    setMealPlans(initialPlans);
    setPlanningStep('plan');
  };

  const generateAISuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      const selectedMealKeys = Object.keys(selectedMeals).filter(key => selectedMeals[key]);
      const suggestions: Record<string, AISuggestion[]> = {};
      
      for (const mealKey of selectedMealKeys) {
        const [day, mealType] = mealKey.split('-');
        const peopleInfo = mealPeople[mealKey];
        const peopleCount = peopleInfo?.totalCount || 2;
        
        // Create fallback suggestions for now
        suggestions[mealKey] = getFallbackSuggestions(mealType as any);
      }
      
      setAiSuggestions(suggestions);
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const getFallbackSuggestions = (mealType: typeof mealTypes[number]): AISuggestion[] => {
    const fallbacks = {
      breakfast: [
        {
          name: "Overnight Oats",
          ingredients_have: [],
          ingredients_need: ["oats", "milk", "berries"],
          prep_time: "5 mins",
          difficulty: "easy",
          servings: 2,
          nutrition_note: "High fiber, protein"
        },
        {
          name: "Scrambled Eggs & Toast",
          ingredients_have: [],
          ingredients_need: ["eggs", "bread", "butter"],
          prep_time: "10 mins",
          difficulty: "easy",
          servings: 2,
          nutrition_note: "High protein"
        }
      ],
      lunch: [
        {
          name: "Turkey Sandwich",
          ingredients_have: [],
          ingredients_need: ["bread", "turkey", "lettuce"],
          prep_time: "5 mins",
          difficulty: "easy",
          servings: 2,
          nutrition_note: "Lean protein"
        },
        {
          name: "Caesar Salad",
          ingredients_have: [],
          ingredients_need: ["lettuce", "croutons", "parmesan"],
          prep_time: "10 mins",
          difficulty: "easy",
          servings: 2,
          nutrition_note: "Fresh greens"
        }
      ],
      dinner: [
        {
          name: "Spaghetti & Meatballs",
          ingredients_have: [],
          ingredients_need: ["pasta", "ground beef", "marinara"],
          prep_time: "45 mins",
          difficulty: "medium",
          servings: 4,
          nutrition_note: "Protein, carbs"
        },
        {
          name: "Grilled Chicken & Vegetables",
          ingredients_have: [],
          ingredients_need: ["chicken", "mixed vegetables"],
          prep_time: "30 mins",
          difficulty: "medium",
          servings: 4,
          nutrition_note: "Lean protein, vitamins"
        }
      ],
      snack: [
        {
          name: "Apple Slices & Peanut Butter",
          ingredients_have: [],
          ingredients_need: ["apple", "peanut butter"],
          prep_time: "2 mins",
          difficulty: "easy",
          servings: 2,
          nutrition_note: "Healthy fats, fiber"
        }
      ]
    };
    
    return fallbacks[mealType] || fallbacks.dinner;
  };

  const applyAISuggestion = async (mealKey: string, suggestion: AISuggestion) => {
    setMealPlans(prev => ({
      ...prev,
      [mealKey]: suggestion.name
    }));
    
    // Auto-add ingredients to shopping list
    for (const ingredient of suggestion.ingredients_need) {
      try {
        await familyService.createShoppingItem({
          familyId,
          name: ingredient,
          category: 'AI Generated',
          purchased: false,
          addedBy: userId
        });
      } catch (error) {
        console.error('Error adding shopping item:', error);
      }
    }
    
    // Reload shopping items
    const updatedShoppingItems = await familyService.getShoppingItems(familyId);
    setShoppingItems(updatedShoppingItems);
  };

  const handleMealPlanChange = (day: string, mealType: string, dishName: string) => {
    const key = getMealKey(day, mealType);
    setMealPlans(prev => ({
      ...prev,
      [key]: dishName
    }));
  };

  const handleSaveMealPlan = async () => {
    const weekStart = getWeekStart(selectedWeek);
    
    try {
      // Save all planned meals to database
      for (const [key, dishName] of Object.entries(mealPlans)) {
        if (dishName.trim()) {
          const [day, mealType] = key.split('-');
          const date = getDateForDay(weekStart, day);
          const dateStr = date.toISOString().split('T')[0];
          
          const peopleInfo = mealPeople[key];

          await familyService.createMeal({
            familyId,
            date: dateStr,
            mealType: mealType as any,
            dishName: dishName.trim(),
            peopleCount: peopleInfo?.totalCount || 2,
            adultsCount: peopleInfo?.adults || 2,
            childrenCount: peopleInfo?.children || 0
          });
        }
      }
      
      // Reset to selection step for next week
      setPlanningStep('select');
      setSelectedMeals({});
      setMealPlans({});
      setMealPeople({});
      
      // Reload meals
      await loadData();
    } catch (error) {
      console.error('Error saving meal plan:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Family Meal Planner</h2>
          <p className="mt-1 text-gray-600">
            {planningStep === 'select' 
              ? 'Select which meals you need to plan for this week' 
              : 'Choose your meals for the selected time slots'
            }
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <span className="text-sm text-gray-500">
            Week of {getWeekStart(selectedWeek).toLocaleDateString()}
          </span>
          {planningStep === 'select' && getSelectedMealsCount() > 0 && (
            <button
              onClick={handleProceedToPlanning}
              className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
            >
              Plan {getSelectedMealsCount()} Meals →
            </button>
          )}
          {planningStep === 'plan' && (
            <div className="flex space-x-2">
              <button
                onClick={generateAISuggestions}
                disabled={loadingSuggestions}
                className="bg-purple-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-purple-700 disabled:opacity-50 flex items-center"
              >
                {loadingSuggestions ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Generating...
                  </>
                ) : (
                  <>🤖 Get AI Suggestions</>
                )}
              </button>
              <button
                onClick={() => setPlanningStep('select')}
                className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50"
              >
                ← Back to Selection
              </button>
              <button
                onClick={handleSaveMealPlan}
                className="bg-green-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-green-700"
              >
                Save Meal Plan
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Meal Planning Grid */}
      <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                  Meal
                </th>
                {days.map((day) => (
                  <th key={day} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {day.substring(0, 3)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {mealTypes.map((mealType) => (
                <tr key={mealType} className="hover:bg-gray-50">
                  <td className="px-4 py-4 text-sm font-medium text-gray-900 capitalize bg-gray-50">
                    {mealType}
                  </td>
                  {days.map((day) => {
                    const key = getMealKey(day, mealType);
                    const isSelected = selectedMeals[key];
                    const mealPlan = mealPlans[key];
                    
                    return (
                      <td key={day} className="px-4 py-4 text-center border-l border-gray-100">
                        {planningStep === 'select' ? (
                          // Step 1: Meal Selection with People
                          <div className="space-y-2 p-2">
                            <div className="flex justify-center">
                              <input
                                type="checkbox"
                                checked={isSelected || false}
                                onChange={(e) => handleMealSelection(day, mealType, e.target.checked)}
                                className="h-5 w-5 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                              />
                            </div>
                            
                            {isSelected && (
                              <div className="space-y-2">
                                {/* Adults Count */}
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Adults</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={mealPeople[key]?.adults || 2}
                                    onChange={(e) => handlePeopleSelection(
                                      day, 
                                      mealType, 
                                      parseInt(e.target.value) || 0,
                                      mealPeople[key]?.children || 0
                                    )}
                                    className="w-full text-xs border border-gray-300 rounded px-2 py-1 text-center"
                                  />
                                </div>
                                
                                {/* Children Count */}
                                <div>
                                  <label className="block text-xs text-gray-600 mb-1">Children</label>
                                  <input
                                    type="number"
                                    min="0"
                                    max="10"
                                    value={mealPeople[key]?.children || 0}
                                    onChange={(e) => handlePeopleSelection(
                                      day, 
                                      mealType, 
                                      mealPeople[key]?.adults || 2,
                                      parseInt(e.target.value) || 0
                                    )}
                                    className="w-full text-xs border border-gray-300 rounded px-2 py-1 text-center"
                                  />
                                </div>
                                
                                {/* Total Summary */}
                                <div className="text-xs text-gray-500 text-center bg-gray-50 rounded px-2 py-1">
                                  Total: {(mealPeople[key]?.adults || 2) + (mealPeople[key]?.children || 0)} people
                                  {mealPeople[key]?.source && (
                                    <div className="text-xs text-green-600 mt-1">
                                      ✨ {mealPeople[key].source}
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ) : (
                          // Step 2: Meal Planning Input with AI Suggestions
                          isSelected ? (
                            <div className="space-y-2">
                              {/* People Info */}
                              <div className="bg-gray-50 rounded px-2 py-1 text-xs text-gray-600">
                                👥 {mealPeople[key]?.totalCount || 2} people
                              </div>
                              
                              <input
                                type="text"
                                value={mealPlan || ''}
                                onChange={(e) => handleMealPlanChange(day, mealType, e.target.value)}
                                placeholder="Enter dish..."
                                className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                              />
                              
                              {/* AI Suggestions */}
                              {aiSuggestions[key] && aiSuggestions[key].length > 0 && (
                                <div className="space-y-1">
                                  <div className="text-xs text-gray-500 flex items-center">
                                    🤖 AI Suggestions
                                  </div>
                                  {aiSuggestions[key].slice(0, 2).map((suggestion, idx) => (
                                    <button
                                      key={idx}
                                      onClick={() => applyAISuggestion(key, suggestion)}
                                      className="w-full text-left p-2 text-xs bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded transition-colors"
                                    >
                                      <div className="font-medium text-blue-900">{suggestion.name}</div>
                                      <div className="text-blue-700 text-xs mb-1">
                                        {suggestion.prep_time} • {suggestion.difficulty}
                                      </div>
                                      
                                      {suggestion.ingredients_need && suggestion.ingredients_need.length > 0 && (
                                        <div className="flex items-start space-x-1">
                                          <span className="text-orange-600 text-xs">🛒</span>
                                          <div className="text-orange-700 text-xs">
                                            <span className="font-medium">Buy:</span> {suggestion.ingredients_need.join(', ')}
                                          </div>
                                        </div>
                                      )}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400 text-sm">Not planned</span>
                          )
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Progress Indicator */}
      {planningStep === 'select' && (
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="flex items-center justify-between text-sm">
            <div>
              <span className="text-gray-600">
                {getSelectedMealsCount()} of {days.length * mealTypes.length} possible meals selected
              </span>
              {getSelectedMealsCount() > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  Total meals planned: {Object.values(mealPeople).reduce((sum, meal) => sum + (meal?.totalCount || 0), 0)} servings
                </div>
              )}
            </div>
            <div className="w-48 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${(getSelectedMealsCount() / (days.length * mealTypes.length)) * 100}%` }}
              ></div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}