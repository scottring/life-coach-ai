import OpenAI from 'openai';
import { 
  MealSuggestionRequest, 
  MealSuggestionResponse, 
  WeeklyMealPlan, 
  DailyMealPlan, 
  PlannedMeal,
  Meal,
  FamilyMember,
  HealthIndicator,
  FunFactor,
  WeeklyNutritionAnalysis
} from '../types/mealPlanning';
import { MealPlanningService } from './mealPlanningService';

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.REACT_APP_OPENAI_API_KEY,
  dangerouslyAllowBrowser: true // Note: In production, this should be done server-side
});

export class AIMealEngine {
  
  /**
   * Generate intelligent meal suggestions for a week
   */
  static async generateWeeklyMealPlan(request: MealSuggestionRequest): Promise<MealSuggestionResponse | null> {
    try {
      console.log('🤖 Generating AI meal plan for family:', request.familyId);
      
      // Get existing meals database for reference
      const availableMeals = await MealPlanningService.getMeals();
      
      // Get family meal preferences and history
      const familyPreferences = await MealPlanningService.getFamilyMealPreferences(request.familyId);
      
      // Create the AI prompt
      const prompt = this.buildMealPlanningPrompt(request, availableMeals, familyPreferences);
      
      // Call OpenAI
      const completion = await openai.chat.completions.create({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content: "You are an expert nutritionist and meal planning assistant. You understand family dynamics, nutrition, and cooking. Always provide practical, healthy, and enjoyable meal suggestions."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 2000
      });
      
      const aiResponse = completion.choices[0]?.message?.content;
      
      if (!aiResponse) {
        console.error('No response from OpenAI');
        return null;
      }
      
      // Parse and structure the AI response
      return this.parseAIResponse(aiResponse, request);
      
    } catch (error) {
      console.error('Error generating AI meal plan:', error);
      return null;
    }
  }
  
  /**
   * Build the comprehensive prompt for meal planning
   */
  private static buildMealPlanningPrompt(
    request: MealSuggestionRequest, 
    availableMeals: Meal[], 
    familyPreferences: any
  ): string {
    const { familyMembers, dailyRequirements, preferences, constraints } = request;
    
    let prompt = `
Plan a weekly meal schedule for a family from ${request.weekStartDate}. Here's the family information:

FAMILY MEMBERS:
${familyMembers.map(member => `
- ${member.name} (${member.ageGroup})
  - Dietary restrictions: ${member.dietaryRestrictions.join(', ') || 'None'}
  - Favorite foods: ${member.favoriteFoods.join(', ') || 'None specified'}
  - Dislikes: ${member.dislikedIngredients.join(', ') || 'None specified'}
  - Allergies: ${member.allergens.join(', ') || 'None'}
`).join('')}

WEEKLY REQUIREMENTS:
${dailyRequirements.map(day => `
- ${day.date}: ${day.peopleEating.length} people eating${day.guestsCount ? ` + ${day.guestsCount} guests` : ''}${day.eatingOut ? ` (eating out for ${day.eatingOutMeal})` : ''}${day.specialOccasion ? ` - ${day.specialOccasion}` : ''}
`).join('')}

FAMILY PREFERENCES:
- Preferred cuisines: ${preferences.preferredCuisines.join(', ')}
- Avoided cuisines: ${preferences.avoidedCuisines.join(', ')}
- Max prep time: ${preferences.maxPrepTime} minutes
- Budget level: ${preferences.budgetLevel}
- Variety importance: ${preferences.varietyImportance}
- Health importance: ${preferences.healthImportance}
- Fun factor importance: ${preferences.funImportance}

CONSTRAINTS:
- Max cooking days per week: ${constraints.maxCookingDaysPerWeek}
- Preferred leftover days: ${constraints.preferredLeftoverDays.join(', ')}
- Busy days (need quick meals): ${constraints.busyDays.join(', ')}
- Allergens to avoid: ${constraints.allergensToAvoid.join(', ')}
${constraints.budgetConstraint ? `- Budget constraint: $${constraints.budgetConstraint}` : ''}

PAST MEAL PREFERENCES:
${Object.entries(familyPreferences).map(([memberId, prefs]: [string, any]) => `
- ${prefs.name}: ${prefs.lovedMeals} loved, ${prefs.likedMeals} liked, ${prefs.dislikedMeals} disliked meals
`).join('')}

Please provide a detailed weekly meal plan that:
1. Balances nutrition across the week
2. Considers each family member's preferences and restrictions
3. Varies cuisines and cooking methods
4. Accounts for busy days with quick meals
5. Includes fun, kid-friendly options when appropriate
6. Stays within budget and prep time constraints
7. Minimizes food waste through smart ingredient usage

Format your response as a JSON object with this structure:
{
  "weeklyPlan": {
    "weekStartDate": "YYYY-MM-DD",
    "dailyPlans": [
      {
        "date": "YYYY-MM-DD",
        "peopleEating": ["member1", "member2"],
        "meals": [
          {
            "mealType": "breakfast",
            "mealName": "Meal Name",
            "servings": 4,
            "prepTime": 15,
            "healthScore": "healthy|neutral|unhealthy",
            "funFactor": 3,
            "cuisineType": "American",
            "notes": "Optional notes"
          }
        ]
      }
    ]
  },
  "reasoning": "Explanation of meal choices and considerations",
  "nutritionAnalysis": {
    "averageDailyCalories": 2000,
    "macroBalance": { "protein": 25, "carbs": 45, "fat": 30 },
    "healthScore": 8,
    "varietyScore": 9,
    "recommendations": ["Suggestion 1", "Suggestion 2"]
  },
  "estimatedCost": 150,
  "keyIngredients": ["ingredient1", "ingredient2"]
}`;

    return prompt;
  }
  
  /**
   * Parse AI response and convert to structured format
   */
  private static parseAIResponse(aiResponse: string, request: MealSuggestionRequest): MealSuggestionResponse | null {
    try {
      // Extract JSON from the response
      const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        console.error('No JSON found in AI response');
        return null;
      }
      
      const parsedResponse = JSON.parse(jsonMatch[0]);
      
      // Convert to our data structure
      const weeklyPlan: WeeklyMealPlan = {
        id: '', // Will be set when saved
        familyId: request.familyId,
        weekStartDate: request.weekStartDate,
        weekEndDate: this.getWeekEndDate(request.weekStartDate),
        dailyPlans: parsedResponse.weeklyPlan.dailyPlans.map((day: any) => ({
          date: day.date,
          peopleEating: day.peopleEating,
          guestsCount: day.guestsCount || 0,
          eatingOut: day.eatingOut || false,
          eatingOutMeal: day.eatingOutMeal,
          specialOccasion: day.specialOccasion,
          meals: day.meals.map((meal: any) => ({
            mealType: meal.mealType,
            mealId: this.generateMealId(meal.mealName), // Generate or find existing meal ID
            servings: meal.servings,
            notes: meal.notes,
            prepAssignedTo: meal.prepAssignedTo
          }))
        })),
        totalBudget: parsedResponse.estimatedCost,
        estimatedCost: parsedResponse.estimatedCost,
        nutritionGoals: this.generateNutritionGoals(request.familyMembers),
        generatedBy: 'ai',
        createdAt: new Date(),
        updatedAt: new Date()
      };
      
      // Create shopping list from key ingredients
      const shoppingList = this.generateShoppingList(parsedResponse.keyIngredients || []);
      
      return {
        weeklyPlan,
        reasoning: parsedResponse.reasoning,
        nutritionAnalysis: parsedResponse.nutritionAnalysis,
        estimatedCost: parsedResponse.estimatedCost,
        shoppingList
      };
      
    } catch (error) {
      console.error('Error parsing AI response:', error);
      return null;
    }
  }
  
  /**
   * Analyze health and nutrition factors of a meal
   */
  static async analyzeMealHealth(mealName: string, ingredients: string[]): Promise<{
    healthIndicator: HealthIndicator;
    funFactor: FunFactor;
    calories: number;
    reasoning: string;
  } | null> {
    try {
      const prompt = `
Analyze this meal for health and fun factors:

Meal: ${mealName}
Ingredients: ${ingredients.join(', ')}

Please provide:
1. Health indicator (healthy/neutral/unhealthy) based on nutritional value
2. Fun factor (1-5 scale) where 5 is most appealing to kids/families
3. Estimated calories per serving
4. Brief reasoning for your assessment

Format as JSON:
{
  "healthIndicator": "healthy",
  "funFactor": 4,
  "calories": 350,
  "reasoning": "High in protein and vegetables, moderate calories, kid-friendly presentation"
}`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system", 
            content: "You are a nutrition expert. Analyze meals objectively for health and appeal factors."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.3,
        max_tokens: 200
      });
      
      const response = completion.choices[0]?.message?.content;
      if (!response) return null;
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) return null;
      
      return JSON.parse(jsonMatch[0]);
      
    } catch (error) {
      console.error('Error analyzing meal health:', error);
      return null;
    }
  }
  
  /**
   * Get meal suggestions based on current family preferences
   */
  static async getSimilarMealSuggestions(familyId: string, likedMeals: string[]): Promise<string[]> {
    try {
      const prompt = `
Based on these meals that a family has enjoyed:
${likedMeals.join(', ')}

Suggest 5 similar meals that they might also enjoy. Consider:
- Similar flavor profiles
- Comparable cooking methods
- Same cuisine families
- Similar comfort levels

Return as a simple JSON array of meal names:
["Meal 1", "Meal 2", "Meal 3", "Meal 4", "Meal 5"]`;

      const completion = await openai.chat.completions.create({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "user",
            content: prompt
          }
        ],
        temperature: 0.7,
        max_tokens: 150
      });
      
      const response = completion.choices[0]?.message?.content;
      if (!response) return [];
      
      const jsonMatch = response.match(/\[[\s\S]*\]/);
      if (!jsonMatch) return [];
      
      return JSON.parse(jsonMatch[0]);
      
    } catch (error) {
      console.error('Error getting meal suggestions:', error);
      return [];
    }
  }
  
  // Helper functions
  private static getWeekEndDate(weekStartDate: string): string {
    const start = new Date(weekStartDate);
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return end.toISOString().split('T')[0];
  }
  
  private static generateMealId(mealName: string): string {
    // In a real implementation, this would search for existing meals
    // or create new meal entries in the database
    return `meal-${mealName.toLowerCase().replace(/\s+/g, '-')}-${Date.now()}`;
  }
  
  private static generateNutritionGoals(familyMembers: FamilyMember[]) {
    // Calculate basic nutrition goals based on family size and age groups
    const totalCalories = familyMembers.reduce((total, member) => {
      switch (member.ageGroup) {
        case 'toddler': return total + 1000;
        case 'child': return total + 1500;
        case 'teen': return total + 2200;
        case 'adult': return total + 2000;
        default: return total + 2000;
      }
    }, 0);
    
    return {
      totalCalories,
      proteinPercent: 25,
      carbsPercent: 45,
      fatPercent: 30,
      maxSodium: 2300,
      minFiber: 25
    };
  }
  
  private static generateShoppingList(keyIngredients: string[]) {
    return keyIngredients.map(ingredient => ({
      ingredient,
      amount: 1, // Would be calculated based on recipes
      unit: 'item',
      category: 'misc',
      purchased: false
    }));
  }
}