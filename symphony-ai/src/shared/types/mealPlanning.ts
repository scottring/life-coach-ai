// Comprehensive type definitions for the intelligent meal planning system

export type RatingType = 'loved' | 'liked' | 'neutral' | 'disliked' | 'hated';
export type HealthIndicator = 'healthy' | 'neutral' | 'unhealthy';
export type FunFactor = 1 | 2 | 3 | 4 | 5; // 1 = boring, 5 = super fun
export type MealType = 'breakfast' | 'am-snack' | 'lunch' | 'pm-snack' | 'dinner' | 'dessert';
export type DietaryRestriction = 'vegetarian' | 'vegan' | 'gluten-free' | 'dairy-free' | 'nut-free' | 'low-carb' | 'keto' | 'paleo';

// Enhanced Family Member with meal preferences
export interface FamilyMember {
  id: string;
  familyId: string;
  name: string;
  ageGroup: 'toddler' | 'child' | 'teen' | 'adult';
  dietaryRestrictions: DietaryRestriction[];
  favoriteFoods: string[]; // Auto-populated from loved meals
  dislikedIngredients: string[];
  allergens: string[];
  createdAt: Date;
  updatedAt: Date;
}

// Nutrition information
export interface NutritionInfo {
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fat: number; // grams
  fiber: number; // grams
  sugar: number; // grams
  sodium: number; // mg
  cholesterol: number; // mg
  vitaminC?: number; // mg
  calcium?: number; // mg
  iron?: number; // mg
}

// Complete meal/recipe database
export interface Meal {
  id: string;
  name: string;
  description: string;
  cuisine: string; // Italian, Mexican, Asian, etc.
  mealTypes: MealType[]; // Can be breakfast and lunch, etc.
  ingredients: Ingredient[];
  instructions: string[];
  prepTime: number; // minutes
  cookTime: number; // minutes
  servings: number;
  difficulty: 'easy' | 'medium' | 'hard';
  nutrition: NutritionInfo;
  healthIndicator: HealthIndicator; // AI-determined
  funFactor: FunFactor; // AI-determined based on ingredients/style
  tags: string[]; // 'quick', 'kid-friendly', 'comfort-food', etc.
  seasonality: string[]; // 'spring', 'summer', 'fall', 'winter'
  cost: 'low' | 'medium' | 'high';
  createdAt: Date;
  updatedAt: Date;
}

export interface Ingredient {
  name: string;
  amount: number;
  unit: string; // cups, tsp, lbs, etc.
  category: 'protein' | 'vegetable' | 'fruit' | 'grain' | 'dairy' | 'spice' | 'other';
  optional?: boolean;
}

// Individual meal ratings by family members
export interface MealRating {
  id: string;
  familyId: string;
  mealId: string;
  memberId: string;
  rating: RatingType;
  notes?: string;
  dateEaten: Date;
  createdAt: Date;
}

// Weekly meal planning
export interface WeeklyMealPlan {
  id: string;
  familyId: string;
  weekStartDate: string; // YYYY-MM-DD (Monday)
  weekEndDate: string; // YYYY-MM-DD (Sunday)
  dailyPlans: DailyMealPlan[];
  totalBudget?: number;
  estimatedCost?: number;
  nutritionGoals?: WeeklyNutritionGoals;
  generatedBy: 'ai' | 'manual';
  createdAt: Date;
  updatedAt: Date;
}

export interface DailyMealPlan {
  date: string; // YYYY-MM-DD
  peopleEating: string[]; // memberIds
  guestsCount?: number;
  eatingOut?: boolean;
  eatingOutMeal?: MealType;
  specialOccasion?: string;
  meals: PlannedMeal[];
}

export interface PlannedMeal {
  mealType: MealType;
  mealId: string;
  servings: number;
  notes?: string;
  prepAssignedTo?: string; // memberId
  recipe?: {
    name: string;
    description: string;
    prepTime: number;
    cookTime: number;
    totalTime: number;
    difficulty: string;
    cuisine: string;
    ingredients: Array<{item: string; quantity: string; category: string}>;
    instructions: Array<{step: number; instruction: string}>;
    nutrition: {
      calories: number;
      protein: string;
      carbs: string;
      fat: string;
      fiber: string;
    };
    tags: string[];
  };
}

export interface WeeklyNutritionGoals {
  totalCalories: number;
  proteinPercent: number; // % of calories
  carbsPercent: number; // % of calories
  fatPercent: number; // % of calories
  maxSodium: number; // mg per day average
  minFiber: number; // grams per day average
}

// Shopping list generation
export interface ShoppingList {
  id: string;
  familyId: string;
  weeklyPlanId: string;
  items: ShoppingItem[];
  estimatedCost?: number;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShoppingItem {
  ingredient: string;
  amount: number;
  unit: string;
  category: string;
  estimated_price?: number;
  purchased?: boolean;
  notes?: string;
}

// Nutrition tracking over time
export interface NutritionLog {
  id: string;
  familyId: string;
  memberId: string;
  date: string; // YYYY-MM-DD
  meals: ConsumedMeal[];
  totalNutrition: NutritionInfo;
  createdAt: Date;
}

export interface ConsumedMeal {
  mealId: string;
  mealType: MealType;
  servings: number;
  nutrition: NutritionInfo;
}

// AI meal suggestion request/response
export interface MealSuggestionRequest {
  familyId: string;
  weekStartDate: string;
  familyMembers: FamilyMember[];
  dailyRequirements: DailyRequirement[];
  preferences: FamilyPreferences;
  constraints: MealConstraints;
}

export interface DailyRequirement {
  date: string;
  peopleEating: string[]; // memberIds
  guestsCount: number;
  eatingOut: boolean;
  eatingOutMeal?: MealType;
  specialOccasion?: string;
}

export interface FamilyPreferences {
  preferredCuisines: string[];
  avoidedCuisines: string[];
  maxPrepTime: number; // minutes
  budgetLevel: 'low' | 'medium' | 'high';
  varietyImportance: 'low' | 'medium' | 'high';
  healthImportance: 'low' | 'medium' | 'high';
  funImportance: 'low' | 'medium' | 'high';
}

export interface MealConstraints {
  maxCookingDaysPerWeek: number;
  preferredLeftoverDays: string[]; // day names
  busyDays: string[]; // days that need quick meals
  allergensToAvoid: string[];
  budgetConstraint?: number;
}

export interface MealSuggestionResponse {
  weeklyPlan: WeeklyMealPlan;
  reasoning: string;
  nutritionAnalysis: WeeklyNutritionAnalysis;
  estimatedCost: number;
  shoppingList: ShoppingItem[];
}

export interface WeeklyNutritionAnalysis {
  averageDailyCalories: number;
  macroBalance: {
    protein: number;
    carbs: number;
    fat: number;
  };
  healthScore: number; // 1-10
  varietyScore: number; // 1-10
  recommendations: string[];
}