export interface RecipeIngredient {
  item: string;
  quantity: string;
  category: string;
}

export interface RecipeInstruction {
  step: number;
  instruction: string;
}

export interface RecipeNutrition {
  calories: number;
  protein: string;
  carbs: string;
  fat: string;
  fiber: string;
}

export interface Recipe {
  name: string;
  description: string;
  prepTime: number;
  cookTime: number;
  totalTime: number;
  difficulty: string;
  cuisine: string;
  ingredients: RecipeIngredient[];
  instructions: RecipeInstruction[];
  nutrition: RecipeNutrition;
  tags: string[];
}

export interface EnhancedMeal {
  mealType: string;
  mealId: string;
  servings: number;
  notes: string;
  recipe?: Recipe;
}

export interface MealRating {
  mealId: string;
  rating: number;
  review?: string;
  dateRated: string;
}