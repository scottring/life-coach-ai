import React, { useState, useEffect } from 'react';
import { useFamily } from '../providers/FamilyProvider';

function FamilyMealPlanner({ familyId }) {
  const {
    familyMeals,
    familyMembers,
    shoppingItems,
    loading,
    error,
    loadFamilyData,
    createFamilyMeal,
    updateFamilyMeal,
    deleteFamilyMeal,
    createShoppingItem,
    updateShoppingItem,
    deleteShoppingItem
  } = useFamily();

  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [planningStep, setPlanningStep] = useState('select'); // 'select' or 'plan'
  const [selectedMeals, setSelectedMeals] = useState({}); // Which meals to plan for
  const [mealPlans, setMealPlans] = useState({}); // Actual meal choices
  const [mealPeople, setMealPeople] = useState({}); // Who's eating each meal
  const [aiSuggestions, setAiSuggestions] = useState({});
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [familyPreferences, setFamilyPreferences] = useState({
    dietaryRestrictions: [],
    favoriteIngredients: [],
    dislikedIngredients: [],
    cookingSkillLevel: 'intermediate',
    timeConstraints: 'moderate'
  });
  const [pantryItems, setPantryItems] = useState([]);
  const [showPantryManager, setShowPantryManager] = useState(false);
  const [newPantryItem, setNewPantryItem] = useState({ name: '', category: '', quantity: '', expires: '' });
  const [mealPreferences, setMealPreferences] = useState({
    defaultFamily: { adults: 2, children: 2 },
    mealDefaults: {
      // Format: [mealType][dayType] = { adults, children, defaultMeal }
      breakfast: {
        weekday: { adults: 2, children: 2, defaultMeal: '' },
        weekend: { adults: 2, children: 2, defaultMeal: '' }
      },
      lunch: {
        weekday: { adults: 2, children: 0, defaultMeal: '' }, // Kids at school
        weekend: { adults: 2, children: 2, defaultMeal: '' }
      },
      dinner: {
        weekday: { adults: 2, children: 2, defaultMeal: '' },
        weekend: { adults: 2, children: 2, defaultMeal: '' }
      },
      snacks: {
        weekday: { adults: 1, children: 2, defaultMeal: '' },
        weekend: { adults: 2, children: 2, defaultMeal: '' }
      }
    },
    personalDefaults: [
      // { name: 'Weekday Lunch Salad', mealType: 'lunch', dayPattern: 'weekday', defaultMeal: 'Bagged Salad', adults: 1, children: 0 }
    ]
  });
  const [showPreferences, setShowPreferences] = useState(false);

  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const mealTypes = ['breakfast', 'lunch', 'dinner', 'snacks'];

  // Load family data, pantry items, and preferences on component mount
  useEffect(() => {
    if (familyId) {
      loadFamilyData(familyId);
      loadPantryItems();
      loadMealPreferences();
    }
  }, [familyId, loadFamilyData]);

  const loadPantryItems = async () => {
    try {
      // In a real implementation, this would fetch from a pantry_items table
      // For now, load from localStorage as a demo
      const stored = localStorage.getItem(`pantry_${familyId}`);
      if (stored) {
        setPantryItems(JSON.parse(stored));
      }
    } catch (error) {
      console.error('Error loading pantry items:', error);
    }
  };

  const savePantryItems = (items) => {
    setPantryItems(items);
    localStorage.setItem(`pantry_${familyId}`, JSON.stringify(items));
  };

  const addPantryItem = () => {
    if (!newPantryItem.name.trim()) return;
    
    const item = {
      id: Date.now().toString(),
      ...newPantryItem,
      added_date: new Date().toISOString().split('T')[0]
    };
    
    const updatedItems = [...pantryItems, item];
    savePantryItems(updatedItems);
    setNewPantryItem({ name: '', category: '', quantity: '', expires: '' });
  };

  const removePantryItem = (itemId) => {
    const updatedItems = pantryItems.filter(item => item.id !== itemId);
    savePantryItems(updatedItems);
  };

  const updatePantryItem = (itemId, updates) => {
    const updatedItems = pantryItems.map(item => 
      item.id === itemId ? { ...item, ...updates } : item
    );
    savePantryItems(updatedItems);
  };

  const loadMealPreferences = async () => {
    try {
      const stored = localStorage.getItem(`meal_preferences_${familyId}`);
      if (stored) {
        const preferences = JSON.parse(stored);
        setMealPreferences(prev => ({ ...prev, ...preferences }));
      }
    } catch (error) {
      console.error('Error loading meal preferences:', error);
    }
  };

  const saveMealPreferences = (preferences) => {
    setMealPreferences(preferences);
    localStorage.setItem(`meal_preferences_${familyId}`, JSON.stringify(preferences));
  };

  const getSmartDefaults = (day, mealType) => {
    const dayOfWeek = days[new Date().getDay()]; // For determining weekday vs weekend
    const isWeekend = day === 'saturday' || day === 'sunday';
    const dayType = isWeekend ? 'weekend' : 'weekday';

    // Check for personal defaults first (most specific)
    const personalDefault = mealPreferences.personalDefaults.find(pd => 
      pd.mealType === mealType && 
      (pd.dayPattern === dayType || pd.dayPattern === 'all' || pd.dayPattern === day)
    );

    if (personalDefault) {
      return {
        adults: personalDefault.adults,
        children: personalDefault.children,
        totalCount: personalDefault.adults + personalDefault.children,
        defaultMeal: personalDefault.defaultMeal,
        source: `Personal: ${personalDefault.name}`
      };
    }

    // Fall back to meal defaults
    const mealDefault = mealPreferences.mealDefaults[mealType]?.[dayType];
    if (mealDefault) {
      return {
        adults: mealDefault.adults,
        children: mealDefault.children,
        totalCount: mealDefault.adults + mealDefault.children,
        defaultMeal: mealDefault.defaultMeal,
        source: `${mealType} ${dayType} default`
      };
    }

    // Final fallback to family default
    const familyDefault = mealPreferences.defaultFamily;
    return {
      adults: familyDefault.adults,
      children: familyDefault.children,
      totalCount: familyDefault.adults + familyDefault.children,
      defaultMeal: '',
      source: 'family default'
    };
  };

  const getAvailableIngredients = () => {
    return pantryItems
      .filter(item => !isExpiringSoon(item))
      .map(item => `${item.name} (${item.quantity || 'some'})`)
      .join(', ');
  };

  const isExpiringSoon = (item) => {
    if (!item.expires) return false;
    const expiryDate = new Date(item.expires);
    const today = new Date();
    const daysDiff = (expiryDate - today) / (1000 * 60 * 60 * 24);
    return daysDiff <= 3; // Expiring within 3 days
  };

  const getExpiringItems = () => {
    return pantryItems.filter(isExpiringSoon);
  };

  const getWeekStart = (date) => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
  };

  const getDateForDay = (weekStart, dayName) => {
    const dayIndex = days.indexOf(dayName);
    const date = new Date(weekStart);
    date.setDate(weekStart.getDate() + dayIndex);
    return date;
  };

  const getMealKey = (day, mealType) => `${day}-${mealType}`;

  const handleMealSelection = (day, mealType, selected) => {
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
        [key]: {
          adults: defaults.adults,
          children: defaults.children,
          totalCount: defaults.totalCount,
          source: defaults.source
        }
      }));

      // Also set default meal if there is one
      if (defaults.defaultMeal) {
        setMealPlans(prev => ({
          ...prev,
          [key]: defaults.defaultMeal
        }));
      }
    }
  };

  const handlePeopleSelection = (day, mealType, adults, children) => {
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
    const initialPlans = {};
    Object.entries(selectedMeals).forEach(([key, selected]) => {
      if (selected) {
        initialPlans[key] = '';
      }
    });
    setMealPlans(initialPlans);
    setPlanningStep('plan');
    // Generate AI suggestions when entering planning mode
    generateAISuggestions();
  };

  const generateAISuggestions = async () => {
    setLoadingSuggestions(true);
    try {
      // Get meal history for context
      const mealHistory = familyMeals.slice(-20); // Last 20 meals for pattern analysis
      
      const selectedMealKeys = Object.keys(selectedMeals).filter(key => selectedMeals[key]);
      const suggestions = {};
      
      for (const mealKey of selectedMealKeys) {
        const [day, mealType] = mealKey.split('-');
        
        const peopleInfo = mealPeople[mealKey];
        const peopleCount = peopleInfo?.totalCount || 2;
        const adults = peopleInfo?.adults || 2;
        const children = peopleInfo?.children || 0;

        const availableIngredients = getAvailableIngredients();
        const expiringItems = getExpiringItems();

        const prompt = `As a family meal planning assistant, suggest a ${mealType} dish for ${day} based on:

Meal Context:
- Number of people: ${peopleCount} (${adults} adults${children > 0 ? `, ${children} children` : ''})
- Family composition: ${children > 0 ? 'Mixed family with children - consider kid-friendly options' : 'Adults only'}

Current Pantry/Fridge Inventory:
- Available ingredients: ${availableIngredients || 'None listed'}
- Items expiring soon (use first): ${expiringItems.map(item => `${item.name} (expires ${item.expires})`).join(', ') || 'None'}

Family Preferences:
- Dietary restrictions: ${familyPreferences.dietaryRestrictions.join(', ') || 'None'}
- Favorite ingredients: ${familyPreferences.favoriteIngredients.join(', ') || 'Various'}
- Disliked ingredients: ${familyPreferences.dislikedIngredients.join(', ') || 'None'}
- Cooking skill: ${familyPreferences.cookingSkillLevel}
- Time constraints: ${familyPreferences.timeConstraints}

Recent meal history: ${mealHistory.map(m => `${m.meal_type}: ${m.dish_name}`).join(', ')}

Please suggest 3 different ${mealType} options that:
1. PRIORITIZE using ingredients already available in pantry/fridge
2. Use expiring items first to minimize food waste
3. Serve ${peopleCount} people (adjust portion sizes accordingly)
4. Avoid repeating recent meals
5. Consider the day of the week (${day})
6. Balance nutrition across the week
7. Fit the family's preferences and constraints

For each suggestion, specify:
- Which pantry ingredients are used
- Which ingredients need to be purchased
- How to use expiring items if applicable

Format as JSON: {"suggestions": [{"name": "Dish Name", "ingredients_have": ["pantry ingredient1"], "ingredients_need": ["ingredient2"], "prep_time": "30 mins", "difficulty": "easy", "servings": ${peopleCount}, "uses_expiring": ["expiring item"], "nutrition_note": "High protein, low carb"}]}`;

        try {
          const response = await fetch('/api/openai/chat', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              messages: [{ role: 'user', content: prompt }],
              max_tokens: 500
            })
          });
          
          const data = await response.json();
          const aiResponse = JSON.parse(data.choices[0].message.content);
          suggestions[mealKey] = aiResponse.suggestions;
        } catch (err) {
          console.error('Error getting AI suggestions for', mealKey, err);
          // Fallback suggestions
          suggestions[mealKey] = getFallbackSuggestions(mealType, day);
        }
      }
      
      setAiSuggestions(suggestions);
    } catch (error) {
      console.error('Error generating AI suggestions:', error);
    } finally {
      setLoadingSuggestions(false);
    }
  };

  const getFallbackSuggestions = (mealType, day) => {
    const fallbacks = {
      breakfast: [
        { 
          name: "Overnight Oats", 
          ingredients_have: [], 
          ingredients_need: ["oats", "milk", "berries"], 
          prep_time: "5 mins", 
          difficulty: "easy",
          nutrition_note: "High fiber, protein"
        },
        { 
          name: "Scrambled Eggs & Toast", 
          ingredients_have: [], 
          ingredients_need: ["eggs", "bread", "butter"], 
          prep_time: "10 mins", 
          difficulty: "easy",
          nutrition_note: "High protein"
        },
        { 
          name: "Greek Yogurt Parfait", 
          ingredients_have: [], 
          ingredients_need: ["yogurt", "granola", "fruit"], 
          prep_time: "5 mins", 
          difficulty: "easy",
          nutrition_note: "Protein, probiotics"
        }
      ],
      lunch: [
        { 
          name: "Turkey Sandwich", 
          ingredients_have: [], 
          ingredients_need: ["bread", "turkey", "lettuce"], 
          prep_time: "5 mins", 
          difficulty: "easy",
          nutrition_note: "Lean protein"
        },
        { 
          name: "Caesar Salad", 
          ingredients_have: [], 
          ingredients_need: ["lettuce", "croutons", "parmesan"], 
          prep_time: "10 mins", 
          difficulty: "easy",
          nutrition_note: "Fresh greens"
        },
        { 
          name: "Soup & Crackers", 
          ingredients_have: [], 
          ingredients_need: ["canned soup", "crackers"], 
          prep_time: "5 mins", 
          difficulty: "easy",
          nutrition_note: "Comfort food"
        }
      ],
      dinner: [
        { 
          name: "Spaghetti & Meatballs", 
          ingredients_have: [], 
          ingredients_need: ["pasta", "ground beef", "marinara"], 
          prep_time: "45 mins", 
          difficulty: "medium",
          nutrition_note: "Protein, carbs"
        },
        { 
          name: "Grilled Chicken & Vegetables", 
          ingredients_have: [], 
          ingredients_need: ["chicken", "mixed vegetables"], 
          prep_time: "30 mins", 
          difficulty: "medium",
          nutrition_note: "Lean protein, vitamins"
        },
        { 
          name: "Taco Night", 
          ingredients_have: [], 
          ingredients_need: ["ground beef", "taco shells", "cheese"], 
          prep_time: "25 mins", 
          difficulty: "easy",
          nutrition_note: "Family favorite"
        }
      ],
      snacks: [
        { 
          name: "Apple Slices & Peanut Butter", 
          ingredients_have: [], 
          ingredients_need: ["apple", "peanut butter"], 
          prep_time: "2 mins", 
          difficulty: "easy",
          nutrition_note: "Healthy fats, fiber"
        },
        { 
          name: "Cheese & Crackers", 
          ingredients_have: [], 
          ingredients_need: ["cheese", "crackers"], 
          prep_time: "2 mins", 
          difficulty: "easy",
          nutrition_note: "Protein, calcium"
        },
        { 
          name: "Trail Mix", 
          ingredients_have: [], 
          ingredients_need: ["nuts", "dried fruit"], 
          prep_time: "1 min", 
          difficulty: "easy",
          nutrition_note: "Energy, healthy fats"
        }
      ]
    };
    
    return fallbacks[mealType] || fallbacks.dinner;
  };

  const applyAISuggestion = (mealKey, suggestion) => {
    setMealPlans(prev => ({
      ...prev,
      [mealKey]: suggestion.name
    }));
    
    // Auto-add only ingredients that need to be purchased to shopping list
    const ingredientsToAdd = suggestion.ingredients_need || suggestion.ingredients || [];
    ingredientsToAdd.forEach(ingredient => {
      createShoppingItem({
        family_id: familyId,
        name: ingredient,
        category: 'AI Generated',
        purchased: false
      });
    });
  };

  const handleMealPlanChange = (day, mealType, dishName) => {
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

          await createFamilyMeal({
            family_id: familyId,
            date: dateStr,
            meal_type: mealType,
            dish_name: dishName.trim(),
            people_count: peopleInfo?.totalCount || 2,
            adults_count: peopleInfo?.adults || 2,
            children_count: peopleInfo?.children || 0
          });
        }
      }
      
      // Reset to selection step for next week
      setPlanningStep('select');
      setSelectedMeals({});
      setMealPlans({});
      setMealPeople({});
    } catch (err) {
      console.error('Error saving meal plan:', err);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <div className="text-red-800">Error loading family meal data: {error}</div>
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
          
          <button
            onClick={() => setShowPreferences(true)}
            className="border border-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-50 flex items-center"
          >
            ⚙️ Preferences
          </button>
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
                                  {mealPeople[key]?.children > 0 && (
                                    <div className="text-xs text-blue-600">
                                      👨‍👩‍👧‍👦 {mealPeople[key]?.adults} adults, {mealPeople[key]?.children} children
                                    </div>
                                  )}
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
                                {mealPeople[key]?.children > 0 && (
                                  <span className="ml-1 text-blue-600">
                                    ({mealPeople[key]?.adults}A + {mealPeople[key]?.children}C)
                                  </span>
                                )}
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
                                    {loadingSuggestions && <span className="ml-1 animate-pulse">...</span>}
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
                                        {suggestion.servings && ` • Serves ${suggestion.servings}`}
                                      </div>
                                      
                                      {/* Pantry vs Shopping Ingredients */}
                                      <div className="space-y-1">
                                        {suggestion.ingredients_have && suggestion.ingredients_have.length > 0 && (
                                          <div className="flex items-start space-x-1">
                                            <span className="text-green-600 text-xs">✓</span>
                                            <div className="text-green-700 text-xs">
                                              <span className="font-medium">Have:</span> {suggestion.ingredients_have.join(', ')}
                                            </div>
                                          </div>
                                        )}
                                        {suggestion.ingredients_need && suggestion.ingredients_need.length > 0 && (
                                          <div className="flex items-start space-x-1">
                                            <span className="text-orange-600 text-xs">🛒</span>
                                            <div className="text-orange-700 text-xs">
                                              <span className="font-medium">Buy:</span> {suggestion.ingredients_need.join(', ')}
                                            </div>
                                          </div>
                                        )}
                                        {suggestion.uses_expiring && suggestion.uses_expiring.length > 0 && (
                                          <div className="flex items-start space-x-1">
                                            <span className="text-red-600 text-xs">⏰</span>
                                            <div className="text-red-700 text-xs">
                                              <span className="font-medium">Use soon:</span> {suggestion.uses_expiring.join(', ')}
                                            </div>
                                          </div>
                                        )}
                                        {suggestion.nutrition_note && (
                                          <div className="text-gray-600 text-xs italic">
                                            💚 {suggestion.nutrition_note}
                                          </div>
                                        )}
                                      </div>
                                    </button>
                                  ))}
                                  {aiSuggestions[key].length > 2 && (
                                    <button className="w-full text-xs text-blue-600 hover:text-blue-800 p-1">
                                      View {aiSuggestions[key].length - 2} more suggestions
                                    </button>
                                  )}
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

      {/* AI and Shopping Integration */}
      {planningStep === 'plan' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Family Preferences & AI Tips */}
          <div className="lg:col-span-2 space-y-4">
            {/* Family Preferences */}
            <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
              <h3 className="font-medium text-purple-900 mb-3">🤖 AI Meal Assistant</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <label className="block text-xs font-medium text-purple-800 mb-1">Cooking Skill Level</label>
                  <select
                    value={familyPreferences.cookingSkillLevel}
                    onChange={(e) => setFamilyPreferences(prev => ({...prev, cookingSkillLevel: e.target.value}))}
                    className="w-full text-xs border border-purple-300 rounded px-2 py-1"
                  >
                    <option value="beginner">Beginner</option>
                    <option value="intermediate">Intermediate</option>
                    <option value="advanced">Advanced</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-purple-800 mb-1">Time Available</label>
                  <select
                    value={familyPreferences.timeConstraints}
                    onChange={(e) => setFamilyPreferences(prev => ({...prev, timeConstraints: e.target.value}))}
                    className="w-full text-xs border border-purple-300 rounded px-2 py-1"
                  >
                    <option value="minimal">15-20 mins (Quick meals)</option>
                    <option value="moderate">30-45 mins (Normal cooking)</option>
                    <option value="generous">1+ hour (Complex meals)</option>
                  </select>
                </div>
              </div>
              <div className="mt-3">
                <div className="text-xs text-purple-700">
                  AI learns from your meal history and preferences to suggest better meals over time.
                  {familyMeals.length > 0 && (
                    <span className="ml-1">
                      📊 Analyzed {familyMeals.length} previous meals for patterns.
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Planning Tips */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-medium text-blue-900 mb-2">💡 Smart Planning Tips</h3>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• AI considers your cooking skill and time constraints</li>
                <li>• Suggestions avoid repeating recent meals</li>
                <li>• Ingredients are automatically added to shopping list</li>
                <li>• Balance nutrition and prep complexity across the week</li>
              </ul>
            </div>
          </div>
          
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h3 className="font-medium text-gray-900 mb-3">Quick Shopping List</h3>
            <div className="space-y-2">
              {shoppingItems.slice(0, 5).map((item) => (
                <div key={item.id} className="flex items-center space-x-2 text-sm">
                  <input
                    type="checkbox"
                    checked={item.purchased}
                    onChange={() => updateShoppingItem(item.id, { purchased: !item.purchased })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600"
                  />
                  <span className={item.purchased ? 'line-through text-gray-500' : 'text-gray-900'}>
                    {item.name}
                  </span>
                </div>
              ))}
              <button className="text-sm text-blue-600 hover:text-blue-800 mt-2">
                View full shopping list →
              </button>
            </div>
          </div>
        </div>
      )}

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
                  <span className="ml-2 text-blue-600">
                    ({Object.values(mealPeople).reduce((sum, meal) => sum + (meal?.adults || 0), 0)} adults, {Object.values(mealPeople).reduce((sum, meal) => sum + (meal?.children || 0), 0)} children)
                  </span>
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

      {/* Meal Preferences Modal */}
      {showPreferences && (
        <MealPreferencesModal
          preferences={mealPreferences}
          onSave={saveMealPreferences}
          onClose={() => setShowPreferences(false)}
        />
      )}
    </div>
  );
}

// Meal Preferences Modal Component
function MealPreferencesModal({ preferences, onSave, onClose }) {
  const [localPreferences, setLocalPreferences] = useState(preferences);
  const [activeTab, setActiveTab] = useState('family');

  const handleSave = () => {
    onSave(localPreferences);
    onClose();
  };

  const updateFamilyDefault = (field, value) => {
    setLocalPreferences(prev => ({
      ...prev,
      defaultFamily: {
        ...prev.defaultFamily,
        [field]: parseInt(value) || 0
      }
    }));
  };

  const updateMealDefault = (mealType, dayType, field, value) => {
    setLocalPreferences(prev => ({
      ...prev,
      mealDefaults: {
        ...prev.mealDefaults,
        [mealType]: {
          ...prev.mealDefaults[mealType],
          [dayType]: {
            ...prev.mealDefaults[mealType][dayType],
            [field]: field === 'defaultMeal' ? value : parseInt(value) || 0
          }
        }
      }
    }));
  };

  const addPersonalDefault = () => {
    const newDefault = {
      id: Date.now().toString(),
      name: 'New Rule',
      mealType: 'lunch',
      dayPattern: 'weekday',
      adults: 1,
      children: 0,
      defaultMeal: ''
    };

    setLocalPreferences(prev => ({
      ...prev,
      personalDefaults: [...prev.personalDefaults, newDefault]
    }));
  };

  const updatePersonalDefault = (id, field, value) => {
    setLocalPreferences(prev => ({
      ...prev,
      personalDefaults: prev.personalDefaults.map(pd =>
        pd.id === id ? { ...pd, [field]: field.includes('adults') || field.includes('children') ? parseInt(value) || 0 : value } : pd
      )
    }));
  };

  const removePersonalDefault = (id) => {
    setLocalPreferences(prev => ({
      ...prev,
      personalDefaults: prev.personalDefaults.filter(pd => pd.id !== id)
    }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">Meal Planning Preferences</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-2xl"
          >
            ×
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'family', name: 'Family Defaults', icon: '👨‍👩‍👧‍👦' },
                { id: 'meals', name: 'Meal Types', icon: '🍽️' },
                { id: 'personal', name: 'Personal Rules', icon: '⚡' }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <span>{tab.icon}</span>
                  <span>{tab.name}</span>
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === 'family' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Default Family Size</h3>
              <p className="text-sm text-gray-600 mb-4">
                Set the default number of adults and children in your family. This will be used when no other defaults apply.
              </p>
              <div className="grid grid-cols-2 gap-4 max-w-md">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Adults</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={localPreferences.defaultFamily.adults}
                    onChange={(e) => updateFamilyDefault('adults', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Children</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    value={localPreferences.defaultFamily.children}
                    onChange={(e) => updateFamilyDefault('children', e.target.value)}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'meals' && (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-4">Meal Type Defaults</h3>
              <p className="text-sm text-gray-600 mb-6">
                Set different defaults for each meal type on weekdays vs weekends. For example, lunch might have fewer children on weekdays if they eat at school.
              </p>
              
              {Object.entries(localPreferences.mealDefaults).map(([mealType, dayTypes]) => (
                <div key={mealType} className="border border-gray-200 rounded-lg p-4">
                  <h4 className="font-medium text-gray-900 mb-4 capitalize">{mealType}</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {Object.entries(dayTypes).map(([dayType, settings]) => (
                      <div key={dayType} className="space-y-3">
                        <h5 className="font-medium text-gray-700 capitalize">{dayType}</h5>
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Adults</label>
                            <input
                              type="number"
                              min="0"
                              max="10"
                              value={settings.adults}
                              onChange={(e) => updateMealDefault(mealType, dayType, 'adults', e.target.value)}
                              className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                            />
                          </div>
                          <div>
                            <label className="block text-xs text-gray-600 mb-1">Children</label>
                            <input
                              type="number"
                              min="0"
                              max="10"
                              value={settings.children}
                              onChange={(e) => updateMealDefault(mealType, dayType, 'children', e.target.value)}
                              className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs text-gray-600 mb-1">Default Meal (optional)</label>
                          <input
                            type="text"
                            value={settings.defaultMeal}
                            onChange={(e) => updateMealDefault(mealType, dayType, 'defaultMeal', e.target.value)}
                            placeholder="e.g., Cereal, Sandwich"
                            className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'personal' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Personal Rules</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Create specific rules that override meal defaults. For example, "I have a salad for lunch every weekday".
                </p>
              </div>
              <button
                onClick={addPersonalDefault}
                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Add Rule
              </button>
            </div>

            <div className="space-y-4">
              {localPreferences.personalDefaults.map((rule) => (
                <div key={rule.id} className="border border-gray-200 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rule Name</label>
                      <input
                        type="text"
                        value={rule.name}
                        onChange={(e) => updatePersonalDefault(rule.id, 'name', e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Meal Type</label>
                      <select
                        value={rule.mealType}
                        onChange={(e) => updatePersonalDefault(rule.id, 'mealType', e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        <option value="breakfast">Breakfast</option>
                        <option value="lunch">Lunch</option>
                        <option value="dinner">Dinner</option>
                        <option value="snacks">Snacks</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">When</label>
                      <select
                        value={rule.dayPattern}
                        onChange={(e) => updatePersonalDefault(rule.id, 'dayPattern', e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      >
                        <option value="weekday">Weekdays</option>
                        <option value="weekend">Weekends</option>
                        <option value="all">Every day</option>
                        <option value="monday">Monday</option>
                        <option value="tuesday">Tuesday</option>
                        <option value="wednesday">Wednesday</option>
                        <option value="thursday">Thursday</option>
                        <option value="friday">Friday</option>
                        <option value="saturday">Saturday</option>
                        <option value="sunday">Sunday</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Adults</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={rule.adults}
                        onChange={(e) => updatePersonalDefault(rule.id, 'adults', e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Children</label>
                      <input
                        type="number"
                        min="0"
                        max="10"
                        value={rule.children}
                        onChange={(e) => updatePersonalDefault(rule.id, 'children', e.target.value)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Default Meal</label>
                      <input
                        type="text"
                        value={rule.defaultMeal}
                        onChange={(e) => updatePersonalDefault(rule.id, 'defaultMeal', e.target.value)}
                        placeholder="e.g., Bagged Salad"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                      />
                    </div>
                  </div>
                  <div className="mt-3 flex justify-end">
                    <button
                      onClick={() => removePersonalDefault(rule.id)}
                      className="text-red-600 hover:text-red-800 text-sm"
                    >
                      Remove Rule
                    </button>
                  </div>
                </div>
              ))}
              
              {localPreferences.personalDefaults.length === 0 && (
                <div className="text-center py-8 text-gray-500">
                  <p>No personal rules yet. Click "Add Rule" to create one.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex justify-end space-x-3 mt-8 pt-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="border border-gray-300 text-gray-700 px-6 py-2 rounded-md font-medium hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="bg-blue-600 text-white px-6 py-2 rounded-md font-medium hover:bg-blue-700"
          >
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}

export default FamilyMealPlanner;