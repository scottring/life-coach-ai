import React, { useState, useEffect } from 'react';
import { 
  CalendarIcon, 
  SparklesIcon, 
  UserGroupIcon, 
  ShoppingCartIcon,
  StarIcon,
  HeartIcon,
  XMarkIcon,
  PlusIcon,
  ClockIcon,
  FireIcon
} from '@heroicons/react/24/outline';
import { HeartIcon as HeartSolid, StarIcon as StarSolid } from '@heroicons/react/24/solid';

import { MealPlanningService } from '../services/mealPlanningService';
import { AIMealEngine } from '../services/aiMealEngine';
import { 
  FamilyMember, 
  WeeklyMealPlan, 
  DailyMealPlan, 
  MealRating, 
  RatingType,
  MealSuggestionRequest,
  HealthIndicator,
  FunFactor
} from '../types/mealPlanning';

interface EnhancedMealPlannerProps {
  familyId: string;
  userId: string;
}

export default function EnhancedMealPlanner({ familyId, userId }: EnhancedMealPlannerProps) {
  // State management
  const [familyMembers, setFamilyMembers] = useState<FamilyMember[]>([]);
  const [currentWeekPlan, setCurrentWeekPlan] = useState<WeeklyMealPlan | null>(null);
  const [selectedWeek, setSelectedWeek] = useState(new Date());
  const [loading, setLoading] = useState(true);
  const [generatingPlan, setGeneratingPlan] = useState(false);
  const [activeTab, setActiveTab] = useState<'planner' | 'preferences' | 'analytics'>('planner');
  
  // Modal states
  const [showMealRating, setShowMealRating] = useState<{ mealId: string; mealName: string } | null>(null);
  const [showAIGeneration, setShowAIGeneration] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  
  // Planning workflow states
  const [planningMode, setPlanningMode] = useState<'setup' | 'proposed' | 'approved'>('setup');
  const [mealSelections, setMealSelections] = useState<Record<string, string[]>>({});
  const [proposedPlan, setProposedPlan] = useState<WeeklyMealPlan | null>(null);
  const [editingMeal, setEditingMeal] = useState<{dayIndex: number, mealIndex: number, meal: any} | null>(null);
  const [viewingMealDetail, setViewingMealDetail] = useState<{meal: any, mealName: string} | null>(null);
  const [showRecipeImporter, setShowRecipeImporter] = useState(false);
  const [showCookingView, setShowCookingView] = useState<{meal: any, mealName: string} | null>(null);
  
  // Week navigation
  const [weekOffset, setWeekOffset] = useState(0); // 0 = current week, -1 = last week, etc.
  const [historicalPlans, setHistoricalPlans] = useState<WeeklyMealPlan[]>([]);
  
  // Recipe importer state
  const [importingRecipe, setImportingRecipe] = useState({
    url: '',
    title: '',
    ingredients: '',
    instructions: '',
    notes: ''
  });
  
  // Form states
  const [newMember, setNewMember] = useState({
    name: '',
    ageGroup: 'adult' as 'toddler' | 'child' | 'teen' | 'adult',
    dietaryRestrictions: [] as string[],
    dislikedIngredients: '',
    allergens: ''
  });

  useEffect(() => {
    loadInitialData();
  }, [familyId, selectedWeek, weekOffset]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      // For demo mode, load sample data
      if (familyId === 'demo-family-123') {
        setFamilyMembers([
          {
            id: 'member-1',
            familyId: 'demo-family-123',
            name: 'Sarah',
            ageGroup: 'adult',
            dietaryRestrictions: ['vegetarian'],
            favoriteFoods: ['pasta', 'salads', 'stir-fry'],
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
            favoriteFoods: ['grilled chicken', 'tacos', 'pizza'],
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
            favoriteFoods: ['mac and cheese', 'chicken nuggets', 'pancakes'],
            dislikedIngredients: ['broccoli', 'spinach'],
            allergens: [],
            createdAt: new Date(),
            updatedAt: new Date()
          },
          {
            id: 'member-4',
            familyId: 'demo-family-123',
            name: 'Jake',
            ageGroup: 'teen',
            dietaryRestrictions: [],
            favoriteFoods: ['burgers', 'pizza', 'spaghetti'],
            dislikedIngredients: ['fish'],
            allergens: ['nuts'],
            createdAt: new Date(),
            updatedAt: new Date()
          }
        ]);

        // Initialize meal selection grid
        const weekStart = getWeekStart(selectedWeek);
        initializeMealSelections(weekStart);
        
        // Only set meal plan if we have one generated
        setCurrentWeekPlan(null);
        setPlanningMode('setup');
      } else {
        // Load real data from Firebase
        const members = await MealPlanningService.getFamilyMembers(familyId);
        setFamilyMembers(members);

        const weekStart = getWeekStart(selectedWeek);
        const weekPlan = await MealPlanningService.getWeeklyMealPlan(familyId, weekStart);
        setCurrentWeekPlan(weekPlan);
      }

    } catch (error) {
      console.error('Error loading meal planner data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getWeekStart = (date: Date): string => {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day; // Adjust to get Monday as start
    d.setDate(diff);
    return d.toISOString().split('T')[0];
  };

  const getCurrentWeekStart = (): string => {
    const today = new Date();
    today.setDate(today.getDate() + (weekOffset * 7));
    return getWeekStart(today);
  };

  const getWeekDisplayText = (): string => {
    if (weekOffset === 0) return "This Week";
    if (weekOffset === -1) return "Last Week";
    if (weekOffset === 1) return "Next Week";
    if (weekOffset < 0) return `${Math.abs(weekOffset)} Weeks Ago`;
    return `${weekOffset} Weeks Ahead`;
  };

  const getWeekEnd = (weekStart: string): string => {
    const start = new Date(weekStart);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return end.toISOString().split('T')[0];
  };

  const generateSampleWeekPlan = (weekStart: string) => {
    const sampleMeals = [
      { name: 'Vegetarian Pasta Primavera', type: 'dinner', health: 'healthy', fun: 4 },
      { name: 'Grilled Chicken Tacos', type: 'dinner', health: 'healthy', fun: 5 },
      { name: 'Homemade Pizza Night', type: 'dinner', health: 'neutral', fun: 5 },
      { name: 'Asian Stir-Fry', type: 'dinner', health: 'healthy', fun: 3 },
      { name: 'Turkey Burgers', type: 'dinner', health: 'healthy', fun: 4 },
      { name: 'Pancakes & Fruit', type: 'breakfast', health: 'neutral', fun: 5 },
      { name: 'Avocado Toast', type: 'breakfast', health: 'healthy', fun: 3 }
    ];

    const dailyPlans = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      
      dailyPlans.push({
        date: date.toISOString().split('T')[0],
        peopleEating: ['member-1', 'member-2', 'member-3', 'member-4'],
        meals: [
          {
            mealType: 'breakfast' as const,
            mealId: `meal-${i}-breakfast`,
            servings: 4,
            notes: i === 6 ? 'Family favorite!' : undefined
          },
          {
            mealType: 'dinner' as const, 
            mealId: `meal-${i}-dinner`,
            servings: 4,
            notes: i === 2 ? 'Pizza night tradition' : undefined
          }
        ]
      });
    }
    return dailyPlans;
  };

  const addFamilyMember = async () => {
    try {
      if (familyId === 'demo-family-123') {
        // Demo mode - just add to local state
        const newMemberData: FamilyMember = {
          id: `member-${Date.now()}`,
          familyId: 'demo-family-123',
          name: newMember.name,
          ageGroup: newMember.ageGroup,
          dietaryRestrictions: newMember.dietaryRestrictions as any[],
          favoriteFoods: [],
          dislikedIngredients: newMember.dislikedIngredients.split(',').map(s => s.trim()).filter(s => s),
          allergens: newMember.allergens.split(',').map(s => s.trim()).filter(s => s),
          createdAt: new Date(),
          updatedAt: new Date()
        };
        
        setFamilyMembers(prev => [...prev, newMemberData]);
      } else {
        // Real Firebase save
        const memberId = await MealPlanningService.addFamilyMember({
          familyId,
          name: newMember.name,
          ageGroup: newMember.ageGroup,
          dietaryRestrictions: newMember.dietaryRestrictions as any[],
          favoriteFoods: [],
          dislikedIngredients: newMember.dislikedIngredients.split(',').map(s => s.trim()).filter(s => s),
          allergens: newMember.allergens.split(',').map(s => s.trim()).filter(s => s)
        });
        
        if (memberId) {
          await loadInitialData(); // Refresh data
        }
      }

      // Reset form
      setNewMember({
        name: '',
        ageGroup: 'adult',
        dietaryRestrictions: [],
        dislikedIngredients: '',
        allergens: ''
      });
      setShowAddMember(false);

    } catch (error) {
      console.error('Error adding family member:', error);
    }
  };

  const getMealName = (mealId: string, mealType: string, dayIndex: number): string => {
    const sampleMeals = {
      breakfast: ['Overnight Oats', 'Scrambled Eggs & Toast', 'Greek Yogurt Parfait', 'Pancakes', 'Avocado Toast', 'Smoothie Bowl', 'French Toast'],
      'am-snack': ['Apple Slices', 'Granola Bar', 'String Cheese', 'Crackers', 'Yogurt Cup', 'Trail Mix', 'Banana'],
      lunch: ['Turkey Sandwich', 'Caesar Salad', 'Soup & Sandwich', 'Leftover Dinner', 'Quinoa Bowl', 'Wrap & Fruit', 'Pasta Salad'],
      'pm-snack': ['Fruit Bowl', 'Cheese & Crackers', 'Hummus & Veggies', 'Smoothie', 'Nuts', 'Pretzels', 'Popcorn'],
      dinner: ['Vegetarian Pasta Primavera', 'Grilled Chicken Tacos', 'Homemade Pizza Night', 'Asian Stir-Fry', 'Turkey Burgers', 'Salmon & Vegetables', 'Beef Stew'],
      dessert: ['Fruit & Cream', 'Chocolate Chip Cookies', 'Ice Cream', 'Apple Pie', 'Brownies', 'Frozen Yogurt', 'Dark Chocolate']
    };
    
    const meals = sampleMeals[mealType as keyof typeof sampleMeals];
    return meals?.[dayIndex] || mealType.charAt(0).toUpperCase() + mealType.slice(1).replace('-', ' ');
  };

  const initializeMealSelections = (weekStart: string) => {
    const selections: Record<string, string[]> = {};
    const mealTypes = ['breakfast', 'am-snack', 'lunch', 'pm-snack', 'dinner', 'dessert'];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      mealTypes.forEach(mealType => {
        const key = `${dateStr}-${mealType}`;
        selections[key] = []; // Start with no one selected
      });
    }
    
    setMealSelections(selections);
  };

  const toggleMealSelection = (dateStr: string, mealType: string, memberId: string) => {
    const key = `${dateStr}-${mealType}`;
    setMealSelections(prev => {
      const current = prev[key] || [];
      const isSelected = current.includes(memberId);
      
      return {
        ...prev,
        [key]: isSelected 
          ? current.filter(id => id !== memberId)
          : [...current, memberId]
      };
    });
  };

  // Select all meals for a specific family member
  const toggleMemberForAllMeals = (memberId: string) => {
    const weekStart = getWeekStart(selectedWeek);
    const mealTypes = ['breakfast', 'am-snack', 'lunch', 'pm-snack', 'dinner', 'dessert'];
    
    // Check if member is selected for all meals
    let allSelected = true;
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      for (const mealType of mealTypes) {
        const key = `${dateStr}-${mealType}`;
        const current = mealSelections[key] || [];
        if (!current.includes(memberId)) {
          allSelected = false;
          break;
        }
      }
      if (!allSelected) break;
    }
    
    // Toggle all meals for this member
    setMealSelections(prev => {
      const newSelections = { ...prev };
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        for (const mealType of mealTypes) {
          const key = `${dateStr}-${mealType}`;
          const current = newSelections[key] || [];
          
          if (allSelected) {
            // Remove member from all meals
            newSelections[key] = current.filter(id => id !== memberId);
          } else {
            // Add member to all meals
            if (!current.includes(memberId)) {
              newSelections[key] = [...current, memberId];
            }
          }
        }
      }
      
      return newSelections;
    });
  };

  // Select all family members for a specific meal type across all days
  const toggleMealTypeForAllMembers = (mealType: string) => {
    const weekStart = getWeekStart(selectedWeek);
    
    // Check if all members are selected for this meal type across all days
    let allSelected = true;
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      const key = `${dateStr}-${mealType}`;
      const current = mealSelections[key] || [];
      
      if (current.length !== familyMembers.length) {
        allSelected = false;
        break;
      }
    }
    
    // Toggle all members for this meal type across all days
    setMealSelections(prev => {
      const newSelections = { ...prev };
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        const key = `${dateStr}-${mealType}`;
        
        if (allSelected) {
          // Remove all members from this meal type
          newSelections[key] = [];
        } else {
          // Add all members to this meal type
          newSelections[key] = familyMembers.map(m => m.id);
        }
      }
      
      return newSelections;
    });
  };

  // Select all family members for a specific day
  const toggleDayForAllMembers = (dateStr: string) => {
    const mealTypes = ['breakfast', 'am-snack', 'lunch', 'pm-snack', 'dinner', 'dessert'];
    
    // Check if all members are selected for all meals on this day
    let allSelected = true;
    for (const mealType of mealTypes) {
      const key = `${dateStr}-${mealType}`;
      const current = mealSelections[key] || [];
      if (current.length !== familyMembers.length) {
        allSelected = false;
        break;
      }
    }
    
    // Toggle all members for all meals on this day
    setMealSelections(prev => {
      const newSelections = { ...prev };
      
      for (const mealType of mealTypes) {
        const key = `${dateStr}-${mealType}`;
        
        if (allSelected) {
          // Remove all members from all meals on this day
          newSelections[key] = [];
        } else {
          // Add all members to all meals on this day
          newSelections[key] = familyMembers.map(m => m.id);
        }
      }
      
      return newSelections;
    });
  };

  // Select all family members for all meals
  const toggleSelectAll = () => {
    const weekStart = getWeekStart(selectedWeek);
    const mealTypes = ['breakfast', 'am-snack', 'lunch', 'pm-snack', 'dinner', 'dessert'];
    
    // Check if everything is selected
    let allSelected = true;
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      for (const mealType of mealTypes) {
        const key = `${dateStr}-${mealType}`;
        const current = mealSelections[key] || [];
        if (current.length !== familyMembers.length) {
          allSelected = false;
          break;
        }
      }
      if (!allSelected) break;
    }
    
    // Toggle everything
    setMealSelections(prev => {
      const newSelections = { ...prev };
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        for (const mealType of mealTypes) {
          const key = `${dateStr}-${mealType}`;
          
          if (allSelected) {
            newSelections[key] = [];
          } else {
            newSelections[key] = familyMembers.map(m => m.id);
          }
        }
      }
      
      return newSelections;
    });
  };

  const generateAIMealPlan = async () => {
    if (familyMembers.length === 0) {
      alert('Please add family members first');
      return;
    }

    // Check if any meals are selected
    const hasSelections = Object.values(mealSelections).some(selection => selection.length > 0);
    if (!hasSelections) {
      alert('Please select who will be eating for at least one meal');
      return;
    }

    setGeneratingPlan(true);
    try {
      const weekStart = getWeekStart(selectedWeek);
      
      // Build daily requirements from meal selections
      const dailyRequirements = generateDailyRequirementsFromSelections(weekStart);
      
      // Build the AI request
      const request: MealSuggestionRequest = {
        familyId,
        weekStartDate: weekStart,
        familyMembers,
        dailyRequirements,
        preferences: {
          preferredCuisines: ['American', 'Italian', 'Mexican'],
          avoidedCuisines: [],
          maxPrepTime: 45,
          budgetLevel: 'medium',
          varietyImportance: 'high',
          healthImportance: 'high',
          funImportance: 'medium'
        },
        constraints: {
          maxCookingDaysPerWeek: 5,
          preferredLeftoverDays: ['Sunday'],
          busyDays: ['Wednesday', 'Friday'],
          allergensToAvoid: familyMembers.flatMap(m => m.allergens)
        }
      };

      // For demo mode, generate a sample plan instead of calling AI
      if (familyId === 'demo-family-123') {
        const samplePlan = generateSampleMealPlanFromSelections(weekStart, dailyRequirements);
        setProposedPlan(samplePlan);
        setPlanningMode('proposed');
      } else {
        const aiResponse = await AIMealEngine.generateWeeklyMealPlan(request);
        
        if (aiResponse) {
          // Set as proposed plan first (don't save until approved)
          setProposedPlan(aiResponse.weeklyPlan);
          setPlanningMode('proposed');
        }
      }
    } catch (error) {
      console.error('Error generating AI meal plan:', error);
      alert('Failed to generate meal plan. Please check your OpenAI API key.');
    } finally {
      setGeneratingPlan(false);
      setShowAIGeneration(false);
    }
  };

  const generateDailyRequirementsFromSelections = (weekStart: string) => {
    const requirements = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Get all people eating on this day (union of all meals)
      const peopleEatingToday = new Set<string>();
      ['breakfast', 'am-snack', 'lunch', 'pm-snack', 'dinner', 'dessert'].forEach(mealType => {
        const key = `${dateStr}-${mealType}`;
        const selections = mealSelections[key] || [];
        selections.forEach(memberId => peopleEatingToday.add(memberId));
      });
      
      requirements.push({
        date: dateStr,
        peopleEating: Array.from(peopleEatingToday),
        guestsCount: 0,
        eatingOut: false
      });
    }
    return requirements;
  };

  const generateSampleMealPlanFromSelections = (weekStart: string, dailyRequirements: any[]): WeeklyMealPlan => {
    const sampleMeals = {
      breakfast: ['Overnight Oats', 'Scrambled Eggs & Toast', 'Greek Yogurt Parfait', 'Pancakes', 'Avocado Toast', 'Smoothie Bowl', 'French Toast'],
      'am-snack': ['Apple Slices', 'Granola Bar', 'String Cheese', 'Crackers', 'Yogurt Cup', 'Trail Mix', 'Banana'],
      lunch: ['Turkey Sandwich', 'Caesar Salad', 'Soup & Sandwich', 'Leftover Dinner', 'Quinoa Bowl', 'Wrap & Fruit', 'Pasta Salad'],
      'pm-snack': ['Fruit Bowl', 'Cheese & Crackers', 'Hummus & Veggies', 'Smoothie', 'Nuts', 'Pretzels', 'Popcorn'],
      dinner: ['Vegetarian Pasta Primavera', 'Grilled Chicken Tacos', 'Homemade Pizza Night', 'Asian Stir-Fry', 'Turkey Burgers', 'Salmon & Vegetables', 'Beef Stew'],
      dessert: ['Fruit & Cream', 'Chocolate Chip Cookies', 'Ice Cream', 'Apple Pie', 'Brownies', 'Frozen Yogurt', 'Dark Chocolate']
    };

    const dailyPlans = dailyRequirements.map((req, dayIndex) => {
      const meals: Array<{
        mealType: 'breakfast' | 'am-snack' | 'lunch' | 'pm-snack' | 'dinner' | 'dessert';
        mealId: string;
        servings: number;
        notes?: string;
      }> = [];
      
      (['breakfast', 'am-snack', 'lunch', 'pm-snack', 'dinner', 'dessert'] as const).forEach(mealType => {
        const key = `${req.date}-${mealType}`;
        const selections = mealSelections[key] || [];
        
        if (selections.length > 0) {
          meals.push({
            mealType,
            mealId: `meal-${dayIndex}-${mealType}`,
            servings: selections.length,
            notes: selections.length === familyMembers.length ? 'Whole family' : `${selections.length} people`
          });
        }
      });

      return {
        date: req.date,
        peopleEating: req.peopleEating,
        meals
      };
    });

    return {
      id: 'demo-generated-plan',
      familyId: 'demo-family-123',
      weekStartDate: weekStart,
      weekEndDate: getWeekEnd(weekStart),
      dailyPlans,
      estimatedCost: 135,
      generatedBy: 'ai',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  };

  // Approve the proposed meal plan
  const approveMealPlan = async () => {
    if (!proposedPlan) return;

    try {
      if (familyId === 'demo-family-123') {
        // Demo mode - just set as current plan
        setCurrentWeekPlan(proposedPlan);
        setHistoricalPlans(prev => [proposedPlan, ...prev]);
      } else {
        // Real mode - save to Firebase
        const planId = await MealPlanningService.saveWeeklyMealPlan(proposedPlan);
        if (planId) {
          const savedPlan = { ...proposedPlan, id: planId };
          setCurrentWeekPlan(savedPlan);
          setHistoricalPlans(prev => [savedPlan, ...prev]);
        }
      }
      
      setProposedPlan(null);
      setPlanningMode('approved');
    } catch (error) {
      console.error('Error approving meal plan:', error);
    }
  };

  // Reject the proposed meal plan and go back to setup
  const rejectMealPlan = () => {
    setProposedPlan(null);
    setPlanningMode('setup');
  };

  // Edit an individual meal
  const editMeal = (dayIndex: number, mealIndex: number, meal: any) => {
    setEditingMeal({ dayIndex, mealIndex, meal });
  };

  // Save meal edit
  const saveMealEdit = (newMealName: string) => {
    if (!editingMeal || !proposedPlan) return;

    const updatedPlan = { ...proposedPlan };
    const dayPlan = updatedPlan.dailyPlans[editingMeal.dayIndex];
    if (dayPlan && dayPlan.meals[editingMeal.mealIndex]) {
      // Update the meal name (in a real app, this would update the meal database)
      // For demo, we'll just store the custom name
      dayPlan.meals[editingMeal.mealIndex] = {
        ...dayPlan.meals[editingMeal.mealIndex],
        mealId: `custom-${Date.now()}`,
        notes: `Custom: ${newMealName}`
      };
    }

    setProposedPlan(updatedPlan);
    setEditingMeal(null);
  };

  // Navigate weeks
  const navigateWeek = (direction: 'prev' | 'next') => {
    if (direction === 'prev') {
      setWeekOffset(prev => prev - 1);
    } else {
      setWeekOffset(prev => prev + 1);
    }
    setPlanningMode('setup');
    setCurrentWeekPlan(null);
    setProposedPlan(null);
  };

  // Copy meal from history to current plan
  const copyMealFromHistory = (historicalMeal: any, targetDay: string, targetMealType: string) => {
    // This would integrate with the setup grid to pre-select this meal
    console.log('Copying meal:', historicalMeal, 'to', targetDay, targetMealType);
    // Implementation would depend on how we want to integrate with the selection grid
  };

  // Get detailed meal information
  const getMealDetails = (mealId: string, mealName: string, mealType: string) => {
    // In a real app, this would fetch from the meals database
    // For demo, return sample data based on meal name
    const baseDetails = {
      id: mealId,
      name: mealName,
      mealType,
      description: `Delicious ${mealName.toLowerCase()} perfect for the family`,
      prepTime: Math.floor(Math.random() * 20) + 15, // 15-35 minutes
      cookTime: Math.floor(Math.random() * 30) + 20, // 20-50 minutes
      servings: 4,
      difficulty: ['easy', 'medium', 'hard'][Math.floor(Math.random() * 3)] as 'easy' | 'medium' | 'hard',
      healthIndicator: ['healthy', 'neutral', 'unhealthy'][Math.floor(Math.random() * 3)] as 'healthy' | 'neutral' | 'unhealthy',
      funFactor: (Math.floor(Math.random() * 5) + 1) as 1 | 2 | 3 | 4 | 5,
      lastServed: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000), // Random date within last 90 days
      timesServed: Math.floor(Math.random() * 10) + 1,
      nutrition: {
        calories: Math.floor(Math.random() * 300) + 350,
        protein: Math.floor(Math.random() * 20) + 15,
        carbs: Math.floor(Math.random() * 40) + 30,
        fat: Math.floor(Math.random() * 15) + 10,
        fiber: Math.floor(Math.random() * 8) + 3,
        sodium: Math.floor(Math.random() * 500) + 300
      }
    };

    // Generate ingredients based on meal type and name
    const ingredientsByType: Record<string, string[]> = {
      breakfast: ['eggs', 'milk', 'flour', 'butter', 'vanilla extract', 'berries', 'maple syrup'],
      'am-snack': ['apples', 'peanut butter', 'granola', 'honey', 'cheese', 'crackers'],
      lunch: ['bread', 'turkey', 'lettuce', 'tomatoes', 'mayo', 'cheese', 'mustard'],
      'pm-snack': ['carrots', 'hummus', 'nuts', 'dried fruit', 'yogurt', 'pretzels'],
      dinner: ['chicken breast', 'pasta', 'olive oil', 'garlic', 'onions', 'tomatoes', 'herbs', 'parmesan'],
      dessert: ['chocolate', 'cream', 'sugar', 'vanilla', 'flour', 'eggs', 'butter']
    };

    const baseIngredients = ingredientsByType[mealType] || ingredientsByType.dinner;
    const ingredients = baseIngredients
      .sort(() => 0.5 - Math.random())
      .slice(0, Math.floor(Math.random() * 4) + 4)
      .map(ingredient => ({
        name: ingredient,
        amount: Math.floor(Math.random() * 3) + 1,
        unit: ['cups', 'tbsp', 'tsp', 'lbs', 'oz', 'pieces'][Math.floor(Math.random() * 6)],
        category: 'ingredient'
      }));

    // Generate family reactions
    const familyReactions = familyMembers.map(member => ({
      memberId: member.id,
      memberName: member.name,
      rating: (['loved', 'liked', 'neutral', 'disliked', 'hated'] as const)[Math.floor(Math.random() * 5)],
      lastRated: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000), // Within last 60 days
      notes: Math.random() > 0.7 ? [
        'Really enjoyed this!',
        'Could use more seasoning',
        'Too spicy for me',
        'Perfect comfort food',
        'Would eat again'
      ][Math.floor(Math.random() * 5)] : undefined
    }));

    const instructions = [
      'Prep all ingredients and preheat oven to 375°F',
      'In a large bowl, combine dry ingredients',
      'Mix wet ingredients in a separate bowl',
      'Gradually combine wet and dry ingredients',
      'Cook according to recipe specifications',
      'Season to taste and serve hot'
    ];

    return {
      ...baseDetails,
      ingredients,
      instructions,
      familyReactions,
      tags: ['family-friendly', 'quick', 'healthy'].slice(0, Math.floor(Math.random() * 3) + 1),
      cost: '$' + (Math.floor(Math.random() * 20) + 8), // $8-$28
      source: 'Family Recipe Collection'
    };
  };

  // View meal details
  const viewMealDetail = (meal: any, dayIndex?: number) => {
    const mealName = meal.notes && meal.notes.startsWith('Custom:') 
      ? meal.notes.replace('Custom: ', '') 
      : getMealName(meal.mealId, meal.mealType, dayIndex || 0);
    
    setViewingMealDetail({ meal, mealName });
  };

  // Start cooking view
  const startCookingView = (meal: any, mealName: string) => {
    setShowCookingView({ meal, mealName });
    setViewingMealDetail(null);
  };

  // Import recipe from URL or manual entry
  const importRecipe = async () => {
    try {
      // In production, this would parse the URL and extract recipe data
      // For demo, we'll create a sample recipe
      const newRecipe = {
        id: `imported-${Date.now()}`,
        name: importingRecipe.title || 'Imported Recipe',
        source: importingRecipe.url || 'Manual Entry',
        ingredients: importingRecipe.ingredients.split('\n').filter(line => line.trim()),
        instructions: importingRecipe.instructions.split('\n').filter(line => line.trim()),
        notes: importingRecipe.notes,
        imported: true,
        importedAt: new Date()
      };

      console.log('Imported recipe:', newRecipe);
      alert(`Recipe "${newRecipe.name}" imported successfully!`);

      // Reset form
      setImportingRecipe({
        url: '',
        title: '',
        ingredients: '',
        instructions: '',
        notes: ''
      });
      setShowRecipeImporter(false);

    } catch (error) {
      console.error('Error importing recipe:', error);
      alert('Failed to import recipe. Please check the URL or try manual entry.');
    }
  };

  const rateMeal = async (mealId: string, rating: RatingType, memberId: string) => {
    try {
      await MealPlanningService.addMealRating({
        familyId,
        mealId,
        memberId,
        rating,
        dateEaten: new Date()
      });
      
      // Refresh family members to update favorite foods
      const updatedMembers = await MealPlanningService.getFamilyMembers(familyId);
      setFamilyMembers(updatedMembers);
      
    } catch (error) {
      console.error('Error rating meal:', error);
    }
  };

  const getHealthIndicatorColor = (indicator: HealthIndicator) => {
    switch (indicator) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'neutral': return 'text-yellow-600 bg-yellow-100';
      case 'unhealthy': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getFunFactorStars = (factor: FunFactor) => {
    return Array.from({ length: 5 }, (_, i) => (
      <StarIcon 
        key={i} 
        className={`h-4 w-4 ${i < factor ? 'text-yellow-400 fill-current' : 'text-gray-300'}`} 
      />
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading meal planner...</span>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Smart Meal Planner</h1>
            <p className="mt-1 text-sm text-gray-500">
              AI-powered weekly meal planning for your family
            </p>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* Week Navigation */}
            <div className="flex items-center space-x-2">
              <button
                onClick={() => navigateWeek('prev')}
                className="p-1 text-gray-400 hover:text-gray-600"
                title="Previous Week"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
              </button>
              
              <div className="text-center min-w-[120px]">
                <div className="text-sm font-medium text-gray-900">{getWeekDisplayText()}</div>
                <div className="text-xs text-gray-500">
                  {getCurrentWeekStart()} - {getWeekEnd(getCurrentWeekStart())}
                </div>
              </div>
              
              <button
                onClick={() => navigateWeek('next')}
                className="p-1 text-gray-400 hover:text-gray-600"
                title="Next Week"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowRecipeImporter(true)}
                className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                <PlusIcon className="h-4 w-4 mr-2" />
                Import Recipe
              </button>
              
              {weekOffset === 0 && (
                <button
                  onClick={() => setShowAIGeneration(true)}
                  disabled={generatingPlan}
                  className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-md text-sm font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50"
                >
                  <SparklesIcon className="h-4 w-4 mr-2" />
                  {generatingPlan ? 'Generating...' : 'AI Generate Plan'}
                </button>
              )}
            </div>
          </div>
        </div>
        
        {/* Tab Navigation */}
        <div className="mt-6">
          <nav className="flex space-x-8">
            {['planner', 'preferences', 'analytics'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab as any)}
                className={`py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                {tab.charAt(0).toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      {activeTab === 'planner' && (
        <div className="space-y-6">
          {/* Family Members Overview */}
          <div className="bg-white rounded-lg shadow p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium text-gray-900">Family Members</h2>
              <UserGroupIcon className="h-5 w-5 text-gray-400" />
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {familyMembers.map((member) => (
                <div key={member.id} className="border rounded-lg p-4">
                  <h3 className="font-medium text-gray-900">{member.name}</h3>
                  <p className="text-sm text-gray-500 capitalize">{member.ageGroup}</p>
                  
                  {member.favoriteFoods.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-400">Favorites:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {member.favoriteFoods.slice(0, 3).map((food, idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-1 rounded text-xs bg-green-100 text-green-800">
                            <HeartSolid className="h-3 w-3 mr-1" />
                            {food}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {member.dietaryRestrictions.length > 0 && (
                    <div className="mt-2">
                      <p className="text-xs text-gray-400">Restrictions:</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {member.dietaryRestrictions.map((restriction, idx) => (
                          <span key={idx} className="inline-flex items-center px-2 py-1 rounded text-xs bg-yellow-100 text-yellow-800">
                            {restriction}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
              
              <div className="col-span-full">
                <button
                  onClick={() => setShowAddMember(true)}
                  className="w-full border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-gray-400 transition-colors"
                >
                  <PlusIcon className="h-8 w-8 text-gray-400 mx-auto mb-2" />
                  <span className="text-gray-600 font-medium">Add Family Member</span>
                </button>
              </div>
            </div>
          </div>

          {/* Meal Planning Section */}
          {planningMode === 'setup' ? (
            // Setup Grid - Select who's eating each meal
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-medium text-gray-900">
                      Plan Your Week - Select Who's Eating
                    </h2>
                    <p className="text-sm text-gray-500 mt-1">
                      Check the boxes for each family member who will be eating each meal
                    </p>
                  </div>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={toggleSelectAll}
                      className="flex items-center px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <UserGroupIcon className="h-4 w-4 mr-2" />
                      Select All Everything
                    </button>
                    <button
                      onClick={() => setShowAIGeneration(true)}
                      disabled={generatingPlan || Object.values(mealSelections).every(sel => sel.length === 0)}
                      className="flex items-center px-4 py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-md text-sm font-medium hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <SparklesIcon className="h-4 w-4 mr-2" />
                      {generatingPlan ? 'Generating...' : 'Generate AI Meal Plan'}
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                        Day
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                        Meal
                      </th>
                      {familyMembers.map((member) => (
                        <th key={member.id} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-20">
                          <div className="flex flex-col items-center space-y-1">
                            <span className="truncate">{member.name}</span>
                            <button
                              onClick={() => toggleMemberForAllMeals(member.id)}
                              className="text-xs text-blue-600 hover:text-blue-800 font-normal normal-case"
                              title={`Select all meals for ${member.name}`}
                            >
                              Select All
                            </button>
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Array.from({ length: 7 }, (_, dayIndex) => {
                      const date = new Date(getWeekStart(selectedWeek));
                      date.setDate(date.getDate() + dayIndex);
                      const dateStr = date.toISOString().split('T')[0];
                      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
                      
                      return ['breakfast', 'am-snack', 'lunch', 'pm-snack', 'dinner', 'dessert'].map((mealType, mealIndex) => {
                        const key = `${dateStr}-${mealType}`;
                        const isFirstMeal = mealIndex === 0;
                        
                        return (
                          <tr key={key} className="hover:bg-gray-50">
                            {isFirstMeal && (
                              <td rowSpan={6} className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 border-r border-gray-200 bg-gray-50">
                                <div className="flex flex-col items-center space-y-2">
                                  <div className="text-center">
                                    <div className="font-medium">{dayName}</div>
                                    <div className="text-xs text-gray-500">{date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</div>
                                  </div>
                                  <button
                                    onClick={() => toggleDayForAllMembers(dateStr)}
                                    className="text-xs text-blue-600 hover:text-blue-800 font-normal"
                                    title={`Select all family members for ${dayName}`}
                                  >
                                    Select Day
                                  </button>
                                </div>
                              </td>
                            )}
                            <td className={`px-6 py-4 whitespace-nowrap text-sm font-medium ${
                              mealType.includes('snack') ? 'bg-blue-50 text-blue-700' :
                              mealType === 'dessert' ? 'bg-purple-50 text-purple-700' :
                              'text-gray-500'
                            }`}>
                              <div className="flex items-center justify-between">
                                <span className="capitalize">{mealType.replace('-', ' ')}</span>
                                <button
                                  onClick={() => toggleMealTypeForAllMembers(mealType)}
                                  className="text-xs text-blue-600 hover:text-blue-800 font-normal ml-2"
                                  title={`Select all family members for ${mealType.replace('-', ' ')} across all days`}
                                >
                                  All
                                </button>
                              </div>
                            </td>
                            {familyMembers.map((member) => {
                              const isSelected = mealSelections[key]?.includes(member.id) || false;
                              return (
                                <td key={member.id} className="px-3 py-4 whitespace-nowrap text-center">
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleMealSelection(dateStr, mealType, member.id)}
                                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        );
                      });
                    }).flat()}
                  </tbody>
                </table>
              </div>
            </div>
          ) : planningMode === 'proposed' && proposedPlan ? (
            // Proposed Meal Plan - Review and Edit
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">
                    🤖 AI Proposed Meal Plan - Week of {proposedPlan.weekStartDate}
                  </h2>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={rejectMealPlan}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      ← Back to Setup
                    </button>
                    <button
                      onClick={approveMealPlan}
                      className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                    >
                      ✓ Approve Plan
                    </button>
                  </div>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Review and edit individual meals, then approve to make this your official meal plan
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <div className="min-w-full grid grid-cols-7 divide-x divide-gray-200" style={{ minWidth: '1200px' }}>
                  {proposedPlan.dailyPlans.map((day, dayIndex) => (
                    <div key={day.date} className="p-3 min-w-0">
                      <div className="text-center mb-3">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                        </h3>
                        <p className="text-xs text-gray-500">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                      </div>
                      
                      <div className="space-y-2">
                        {day.meals.map((meal, mealIndex) => (
                          <div 
                            key={`${meal.mealType}-${mealIndex}`} 
                            className="border rounded-lg p-2 min-h-0 hover:border-blue-300 cursor-pointer transition-colors"
                            onClick={() => viewMealDetail(meal, dayIndex)}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-500 uppercase truncate">
                                {meal.mealType.replace('-', ' ')}
                              </span>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  editMeal(dayIndex, mealIndex, meal);
                                }}
                                className="text-xs text-blue-600 hover:text-blue-800"
                                title="Edit meal"
                              >
                                Edit
                              </button>
                            </div>
                            
                            <h4 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">
                              {meal.notes && meal.notes.startsWith('Custom:') 
                                ? meal.notes.replace('Custom: ', '') 
                                : getMealName(meal.mealId, meal.mealType, dayIndex)
                              }
                            </h4>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-1 min-w-0">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-800 truncate">
                                  Healthy
                                </span>
                                <div className="flex flex-shrink-0">
                                  {getFunFactorStars(4).slice(0, 3)}
                                </div>
                              </div>
                              
                              {meal.notes && (
                                <p className="text-xs text-gray-500 truncate">{meal.notes}</p>
                              )}
                            </div>
                            
                            <div className="mt-2 text-center">
                              <span className="text-xs text-blue-600">Click for details</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : currentWeekPlan ? (
            // Generated Meal Plan Display
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-medium text-gray-900">
                    Generated Meal Plan - Week of {currentWeekPlan.weekStartDate}
                  </h2>
                  <div className="flex items-center space-x-4">
                    <button
                      onClick={() => setPlanningMode('setup')}
                      className="text-sm text-gray-600 hover:text-gray-800"
                    >
                      ← Back to Setup
                    </button>
                    <span className="text-sm text-gray-500">
                      Estimated Cost: ${currentWeekPlan.estimatedCost}
                    </span>
                    <button className="flex items-center text-sm text-blue-600 hover:text-blue-700">
                      <ShoppingCartIcon className="h-4 w-4 mr-1" />
                      Shopping List
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="overflow-x-auto">
                <div className="min-w-full grid grid-cols-7 divide-x divide-gray-200" style={{ minWidth: '1200px' }}>
                  {currentWeekPlan.dailyPlans.map((day, dayIndex) => (
                    <div key={day.date} className="p-3 min-w-0">
                      <div className="text-center mb-3">
                        <h3 className="text-sm font-medium text-gray-900 truncate">
                          {new Date(day.date).toLocaleDateString('en-US', { weekday: 'short' })}
                        </h3>
                        <p className="text-xs text-gray-500">{new Date(day.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</p>
                      </div>
                      
                      <div className="space-y-2">
                        {day.meals.map((meal, mealIndex) => (
                          <div 
                            key={`${meal.mealType}-${mealIndex}`} 
                            className="border rounded-lg p-2 min-h-0 hover:border-blue-300 cursor-pointer transition-colors"
                            onClick={() => viewMealDetail(meal, dayIndex)}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="text-xs font-medium text-gray-500 uppercase truncate">
                                {meal.mealType.replace('-', ' ')}
                              </span>
                              <div className="flex items-center space-x-1 flex-shrink-0">
                                <ClockIcon className="h-3 w-3 text-gray-400" />
                                <span className="text-xs text-gray-400">30m</span>
                              </div>
                            </div>
                            
                            <h4 className="text-sm font-medium text-gray-900 mb-2 line-clamp-2">
                              {getMealName(meal.mealId, meal.mealType, dayIndex)}
                            </h4>
                            
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-1 min-w-0">
                                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs bg-green-100 text-green-800 truncate">
                                  Healthy
                                </span>
                                <div className="flex flex-shrink-0">
                                  {getFunFactorStars(4).slice(0, 3)}
                                </div>
                              </div>
                              
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setShowMealRating({ mealId: meal.mealId, mealName: getMealName(meal.mealId, meal.mealType, dayIndex) });
                                }}
                                className="text-gray-400 hover:text-red-500 flex-shrink-0"
                                title="Rate meal"
                              >
                                <HeartIcon className="h-4 w-4" />
                              </button>
                            </div>
                            
                            {meal.notes && (
                              <p className="text-xs text-gray-500 mt-1 truncate">{meal.notes}</p>
                            )}
                            
                            <div className="mt-2 text-center">
                              <span className="text-xs text-blue-600">Click for details</span>
                            </div>
                          </div>
                        ))}
                      </div>
                      
                      {day.eatingOut && (
                        <div className="mt-2 p-2 bg-blue-50 rounded text-center">
                          <p className="text-xs text-blue-600 truncate">Eating out for {day.eatingOutMeal}</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow p-8 text-center">
              <CalendarIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No meal plan for this week</h3>
              <p className="text-gray-500 mb-6">
                Generate an AI-powered meal plan or create one manually
              </p>
              <button
                onClick={() => setShowAIGeneration(true)}
                className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
              >
                <SparklesIcon className="h-4 w-4 mr-2" />
                Generate AI Meal Plan
              </button>
            </div>
          )}
        </div>
      )}

      {/* AI Generation Modal */}
      {showAIGeneration && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Generate AI Meal Plan</h3>
              <button
                onClick={() => setShowAIGeneration(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="mb-6">
              <p className="text-sm text-gray-600 mb-4">
                Our AI will create a personalized weekly meal plan based on your family's preferences, 
                dietary restrictions, and nutrition goals.
              </p>
              
              <div className="space-y-3">
                <div className="flex items-center">
                  <SparklesIcon className="h-5 w-5 text-blue-500 mr-2" />
                  <span className="text-sm text-gray-700">Considers family preferences</span>
                </div>
                <div className="flex items-center">
                  <HeartIcon className="h-5 w-5 text-red-500 mr-2" />
                  <span className="text-sm text-gray-700">Balances nutrition and fun</span>
                </div>
                <div className="flex items-center">
                  <ShoppingCartIcon className="h-5 w-5 text-green-500 mr-2" />
                  <span className="text-sm text-gray-700">Generates shopping list</span>
                </div>
              </div>
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setShowAIGeneration(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={generateAIMealPlan}
                disabled={generatingPlan}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                {generatingPlan ? 'Generating...' : 'Generate Plan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meal Rating Modal */}
      {showMealRating && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Rate: {showMealRating.mealName}</h3>
              <button
                onClick={() => setShowMealRating(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              {familyMembers.map((member) => (
                <div key={member.id} className="border rounded-lg p-3">
                  <p className="text-sm font-medium text-gray-900 mb-2">{member.name}</p>
                  <div className="grid grid-cols-5 gap-2">
                    {(['hated', 'disliked', 'neutral', 'liked', 'loved'] as RatingType[]).map((rating) => (
                      <button
                        key={rating}
                        onClick={() => {
                          rateMeal(showMealRating.mealId, rating, member.id);
                          setShowMealRating(null);
                        }}
                        className={`p-2 rounded text-xs font-medium ${
                          rating === 'loved' ? 'bg-red-100 text-red-800 hover:bg-red-200' :
                          rating === 'liked' ? 'bg-green-100 text-green-800 hover:bg-green-200' :
                          rating === 'neutral' ? 'bg-gray-100 text-gray-800 hover:bg-gray-200' :
                          rating === 'disliked' ? 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200' :
                          'bg-red-100 text-red-800 hover:bg-red-200'
                        }`}
                      >
                        {rating}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Family Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Add Family Member</h3>
              <button
                onClick={() => setShowAddMember(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Name
                </label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={(e) => setNewMember(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter name"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Age Group
                </label>
                <select
                  value={newMember.ageGroup}
                  onChange={(e) => setNewMember(prev => ({ ...prev, ageGroup: e.target.value as any }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="toddler">Toddler (1-3 years)</option>
                  <option value="child">Child (4-12 years)</option>
                  <option value="teen">Teen (13-17 years)</option>
                  <option value="adult">Adult (18+ years)</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Dietary Restrictions
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {['vegetarian', 'vegan', 'gluten-free', 'dairy-free', 'nut-free', 'low-carb'].map((restriction) => (
                    <label key={restriction} className="flex items-center">
                      <input
                        type="checkbox"
                        checked={newMember.dietaryRestrictions.includes(restriction)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setNewMember(prev => ({
                              ...prev,
                              dietaryRestrictions: [...prev.dietaryRestrictions, restriction]
                            }));
                          } else {
                            setNewMember(prev => ({
                              ...prev,
                              dietaryRestrictions: prev.dietaryRestrictions.filter(r => r !== restriction)
                            }));
                          }
                        }}
                        className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                      />
                      <span className="ml-2 text-sm text-gray-700 capitalize">{restriction.replace('-', ' ')}</span>
                    </label>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Disliked Ingredients
                </label>
                <input
                  type="text"
                  value={newMember.dislikedIngredients}
                  onChange={(e) => setNewMember(prev => ({ ...prev, dislikedIngredients: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="mushrooms, olives, etc. (comma separated)"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Allergens
                </label>
                <input
                  type="text"
                  value={newMember.allergens}
                  onChange={(e) => setNewMember(prev => ({ ...prev, allergens: e.target.value }))}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="nuts, shellfish, etc. (comma separated)"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowAddMember(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={addFamilyMember}
                disabled={!newMember.name.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add Member
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Meal Modal */}
      {editingMeal && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Edit Meal</h3>
              <button
                onClick={() => setEditingMeal(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Meal Type: <span className="capitalize">{editingMeal.meal.mealType.replace('-', ' ')}</span>
                </label>
                
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Meal Name
                </label>
                <input
                  type="text"
                  defaultValue={
                    editingMeal.meal.notes && editingMeal.meal.notes.startsWith('Custom:') 
                      ? editingMeal.meal.notes.replace('Custom: ', '') 
                      : getMealName(editingMeal.meal.mealId, editingMeal.meal.mealType, editingMeal.dayIndex)
                  }
                  className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter custom meal name"
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      saveMealEdit((e.target as HTMLInputElement).value);
                    }
                  }}
                  autoFocus
                />
              </div>
              
              <p className="text-xs text-gray-500">
                Tip: You can also choose from previous weeks' meals or suggest new recipes
              </p>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setEditingMeal(null)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const input = document.querySelector('input[type="text"]') as HTMLInputElement;
                  if (input) saveMealEdit(input.value);
                }}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Meal Detail Modal */}
      {viewingMealDetail && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
            {(() => {
              const mealDetails = getMealDetails(viewingMealDetail.meal.mealId, viewingMealDetail.mealName, viewingMealDetail.meal.mealType);
              return (
                <>
                  {/* Header */}
                  <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h2 className="text-2xl font-bold text-gray-900">{mealDetails.name}</h2>
                        <div className="flex items-center space-x-4 mt-2">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            mealDetails.healthIndicator === 'healthy' ? 'bg-green-100 text-green-800' :
                            mealDetails.healthIndicator === 'neutral' ? 'bg-yellow-100 text-yellow-800' :
                            'bg-red-100 text-red-800'
                          }`}>
                            {mealDetails.healthIndicator}
                          </span>
                          <div className="flex items-center">
                            <span className="text-sm text-gray-500 mr-1">Fun Factor:</span>
                            <div className="flex">
                              {getFunFactorStars(mealDetails.funFactor)}
                            </div>
                          </div>
                          <span className="text-sm text-gray-500 capitalize">{mealDetails.difficulty}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setViewingMealDetail(null)}
                        className="text-gray-400 hover:text-gray-500"
                      >
                        <XMarkIcon className="h-6 w-6" />
                      </button>
                    </div>
                  </div>

                  {/* Content */}
                  <div className="overflow-y-auto max-h-[calc(90vh-120px)]">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
                      
                      {/* Left Column */}
                      <div className="space-y-6">
                        {/* Basic Info */}
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-3">Meal Information</h3>
                          <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Prep Time:</span>
                              <span className="text-sm font-medium">{mealDetails.prepTime} minutes</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Cook Time:</span>
                              <span className="text-sm font-medium">{mealDetails.cookTime} minutes</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Servings:</span>
                              <span className="text-sm font-medium">{mealDetails.servings}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Cost:</span>
                              <span className="text-sm font-medium">{mealDetails.cost}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Times Served:</span>
                              <span className="text-sm font-medium">{mealDetails.timesServed} times</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-sm text-gray-600">Last Served:</span>
                              <span className="text-sm font-medium">{mealDetails.lastServed.toLocaleDateString()}</span>
                            </div>
                          </div>
                        </div>

                        {/* Ingredients */}
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-3">Ingredients</h3>
                          <div className="space-y-2">
                            {mealDetails.ingredients.map((ingredient, index) => (
                              <div key={index} className="flex justify-between items-center py-2 border-b border-gray-100">
                                <span className="text-sm text-gray-900 capitalize">{ingredient.name}</span>
                                <span className="text-sm text-gray-600">{ingredient.amount} {ingredient.unit}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Instructions */}
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-3">Instructions</h3>
                          <div className="space-y-3">
                            {mealDetails.instructions.map((instruction, index) => (
                              <div key={index} className="flex">
                                <span className="flex-shrink-0 w-6 h-6 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-sm font-medium mr-3">
                                  {index + 1}
                                </span>
                                <span className="text-sm text-gray-700">{instruction}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Right Column */}
                      <div className="space-y-6">
                        {/* Nutrition */}
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-3">Nutrition (per serving)</h3>
                          <div className="bg-gray-50 rounded-lg p-4">
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900">{mealDetails.nutrition.calories}</div>
                                <div className="text-sm text-gray-600">Calories</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900">{mealDetails.nutrition.protein}g</div>
                                <div className="text-sm text-gray-600">Protein</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900">{mealDetails.nutrition.carbs}g</div>
                                <div className="text-sm text-gray-600">Carbs</div>
                              </div>
                              <div className="text-center">
                                <div className="text-2xl font-bold text-gray-900">{mealDetails.nutrition.fat}g</div>
                                <div className="text-sm text-gray-600">Fat</div>
                              </div>
                            </div>
                            <div className="mt-4 pt-4 border-t border-gray-200 grid grid-cols-2 gap-4 text-sm">
                              <div className="flex justify-between">
                                <span className="text-gray-600">Fiber:</span>
                                <span className="font-medium">{mealDetails.nutrition.fiber}g</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-gray-600">Sodium:</span>
                                <span className="font-medium">{mealDetails.nutrition.sodium}mg</span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Family Reactions */}
                        <div>
                          <h3 className="text-lg font-medium text-gray-900 mb-3">Family Reactions</h3>
                          <div className="space-y-3">
                            {mealDetails.familyReactions.map((reaction, index) => (
                              <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                                <div className="flex items-center space-x-3">
                                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                                    <span className="text-sm font-medium text-blue-800">
                                      {reaction.memberName.charAt(0)}
                                    </span>
                                  </div>
                                  <div>
                                    <div className="text-sm font-medium text-gray-900">{reaction.memberName}</div>
                                    {reaction.notes && (
                                      <div className="text-xs text-gray-500">{reaction.notes}</div>
                                    )}
                                  </div>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
                                    reaction.rating === 'loved' ? 'bg-red-100 text-red-800' :
                                    reaction.rating === 'liked' ? 'bg-green-100 text-green-800' :
                                    reaction.rating === 'neutral' ? 'bg-gray-100 text-gray-800' :
                                    reaction.rating === 'disliked' ? 'bg-yellow-100 text-yellow-800' :
                                    'bg-red-100 text-red-800'
                                  }`}>
                                    {reaction.rating}
                                  </span>
                                  <span className="text-xs text-gray-400">
                                    {reaction.lastRated.toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Tags */}
                        {mealDetails.tags.length > 0 && (
                          <div>
                            <h3 className="text-lg font-medium text-gray-900 mb-3">Tags</h3>
                            <div className="flex flex-wrap gap-2">
                              {mealDetails.tags.map((tag, index) => (
                                <span key={index} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Footer */}
                  <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div className="text-sm text-gray-500">
                        Source: {mealDetails.source}
                      </div>
                      <div className="flex space-x-3">
                        <button
                          onClick={() => setViewingMealDetail(null)}
                          className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                        >
                          Close
                        </button>
                        <button
                          onClick={() => startCookingView(viewingMealDetail.meal, viewingMealDetail.mealName)}
                          className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                        >
                          👨‍🍳 Start Cooking
                        </button>
                        <button
                          onClick={() => {
                            setViewingMealDetail(null);
                            setShowMealRating({ mealId: viewingMealDetail.meal.mealId, mealName: viewingMealDetail.mealName });
                          }}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                        >
                          Rate This Meal
                        </button>
                      </div>
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
        </div>
      )}

      {/* Recipe Importer Modal */}
      {showRecipeImporter && (
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-gray-900">Import Recipe</h2>
                <button
                  onClick={() => setShowRecipeImporter(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <XMarkIcon className="h-6 w-6" />
                </button>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Import a recipe from a URL or enter it manually
              </p>
            </div>

            <div className="overflow-y-auto max-h-[calc(90vh-180px)] p-6">
              <div className="space-y-6">
                {/* URL Import */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Recipe URL (optional)
                  </label>
                  <input
                    type="url"
                    value={importingRecipe.url}
                    onChange={(e) => setImportingRecipe(prev => ({ ...prev, url: e.target.value }))}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="https://allrecipes.com/recipe/..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Paste a URL from AllRecipes, Food Network, etc. (Production version will auto-extract)
                  </p>
                </div>

                {/* Manual Entry */}
                <div className="grid grid-cols-1 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Recipe Title *
                    </label>
                    <input
                      type="text"
                      value={importingRecipe.title}
                      onChange={(e) => setImportingRecipe(prev => ({ ...prev, title: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="e.g., Grandma's Chocolate Chip Cookies"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Ingredients *
                    </label>
                    <textarea
                      value={importingRecipe.ingredients}
                      onChange={(e) => setImportingRecipe(prev => ({ ...prev, ingredients: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={8}
                      placeholder="Enter each ingredient on a new line:
2 cups all-purpose flour
1 cup brown sugar
1/2 cup butter, softened
2 large eggs
1 tsp vanilla extract
1 cup chocolate chips"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Instructions *
                    </label>
                    <textarea
                      value={importingRecipe.instructions}
                      onChange={(e) => setImportingRecipe(prev => ({ ...prev, instructions: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={10}
                      placeholder="Enter each step on a new line:
Preheat oven to 375°F (190°C)
In a large bowl, cream together butter and brown sugar
Beat in eggs one at a time, then vanilla
Gradually blend in flour
Stir in chocolate chips
Drop by rounded tablespoons onto ungreased cookie sheets
Bake 9-11 minutes until golden brown"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Notes (optional)
                    </label>
                    <textarea
                      value={importingRecipe.notes}
                      onChange={(e) => setImportingRecipe(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      rows={3}
                      placeholder="Any additional notes, tips, or modifications..."
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex space-x-3">
                <button
                  onClick={() => setShowRecipeImporter(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  onClick={importRecipe}
                  disabled={!importingRecipe.title || !importingRecipe.ingredients || !importingRecipe.instructions}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Import Recipe
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Cooking View Modal */}
      {showCookingView && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-95 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full h-full max-w-none overflow-hidden">
            {(() => {
              const mealDetails = getMealDetails(showCookingView.meal.mealId, showCookingView.mealName, showCookingView.meal.mealType);
              return (
                <>
                  {/* Cooking Header */}
                  <div className="px-6 py-4 border-b border-gray-200 bg-green-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h1 className="text-2xl font-bold text-gray-900">👨‍🍳 {mealDetails.name}</h1>
                        <div className="flex items-center space-x-4 mt-1">
                          <span className="text-sm text-gray-600">Prep: {mealDetails.prepTime}m</span>
                          <span className="text-sm text-gray-600">Cook: {mealDetails.cookTime}m</span>
                          <span className="text-sm text-gray-600">Serves: {mealDetails.servings}</span>
                        </div>
                      </div>
                      <button
                        onClick={() => setShowCookingView(null)}
                        className="px-4 py-2 bg-gray-600 text-white rounded-md text-sm font-medium hover:bg-gray-700"
                      >
                        ✕ Exit Cooking Mode
                      </button>
                    </div>
                  </div>

                  {/* Two-Column Cooking Layout */}
                  <div className="flex h-[calc(100vh-120px)]">
                    {/* Left Column: Ingredients (25% width) */}
                    <div className="w-1/4 bg-gray-50 border-r border-gray-200 overflow-y-auto">
                      <div className="p-6">
                        <h2 className="text-lg font-semibold text-gray-900 mb-4 sticky top-0 bg-gray-50 pb-2">
                          🥕 Ingredients
                        </h2>
                        <div className="space-y-3">
                          {mealDetails.ingredients.map((ingredient, index) => (
                            <div 
                              key={index} 
                              className="p-3 bg-white rounded-lg border hover:bg-blue-50 cursor-pointer transition-colors"
                            >
                              <div className="flex justify-between items-start">
                                <span className="text-sm font-medium text-gray-900 capitalize leading-tight">
                                  {ingredient.name}
                                </span>
                                <span className="text-sm text-gray-600 ml-2 flex-shrink-0">
                                  {ingredient.amount} {ingredient.unit}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Quick Info Panel */}
                        <div className="mt-6 p-4 bg-white rounded-lg border">
                          <h3 className="text-sm font-semibold text-gray-900 mb-3">Quick Info</h3>
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span className="text-gray-600">Difficulty:</span>
                              <span className="font-medium capitalize">{mealDetails.difficulty}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Calories:</span>
                              <span className="font-medium">{mealDetails.nutrition.calories}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-gray-600">Cost:</span>
                              <span className="font-medium">{mealDetails.cost}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right Column: Instructions (75% width) */}
                    <div className="w-3/4 overflow-y-auto">
                      <div className="p-8">
                        <h2 className="text-xl font-semibold text-gray-900 mb-6 sticky top-0 bg-white pb-4">
                          📋 Instructions
                        </h2>
                        <div className="space-y-6">
                          {mealDetails.instructions.map((instruction, index) => (
                            <div 
                              key={index} 
                              className="flex group hover:bg-blue-50 p-4 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-blue-200"
                            >
                              <div className="flex-shrink-0 w-12 h-12 bg-blue-100 text-blue-800 rounded-full flex items-center justify-center text-lg font-bold mr-6">
                                {index + 1}
                              </div>
                              <div className="flex-1">
                                <p className="text-lg text-gray-800 leading-relaxed">
                                  {instruction}
                                </p>
                                {index === 0 && (
                                  <p className="text-sm text-gray-500 mt-2">
                                    💡 Tip: Click each step as you complete it to track your progress
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>

                        {/* Cooking Complete */}
                        <div className="mt-8 p-6 bg-green-50 border border-green-200 rounded-lg text-center">
                          <h3 className="text-lg font-semibold text-green-900 mb-2">🎉 Cooking Complete!</h3>
                          <p className="text-green-700 mb-4">
                            Great job! Your {mealDetails.name} is ready to serve.
                          </p>
                          <div className="flex justify-center space-x-3">
                            <button
                              onClick={() => setShowCookingView(null)}
                              className="px-4 py-2 bg-green-600 text-white rounded-md text-sm font-medium hover:bg-green-700"
                            >
                              Done Cooking
                            </button>
                            <button
                              onClick={() => {
                                setShowCookingView(null);
                                setShowMealRating({ mealId: showCookingView.meal.mealId, mealName: showCookingView.mealName });
                              }}
                              className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700"
                            >
                              Rate This Meal
                            </button>
                          </div>
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