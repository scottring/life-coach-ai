import { FamilyMember, Meal, WeeklyMealPlan } from '../types/mealPlanning';

interface MealGenerationRequest {
  familyMembers: FamilyMember[];
  weekStartDate: string;
  preferences?: {
    cuisinePreferences?: string[];
    avoidIngredients?: string[];
    dietaryRestrictions?: string[];
    budgetConstraints?: string;
    cookingTime?: 'quick' | 'medium' | 'long';
    healthFocus?: 'balanced' | 'high-protein' | 'low-carb' | 'mediterranean';
  };
  previousMeals?: Array<{name: string, id: string}>;
  availabilityGrid?: {[memberId: string]: {[dateKey: string]: {breakfast: boolean, lunch: boolean, dinner: boolean}}};
}

interface AIResponse {
  success: boolean;
  weeklyPlan?: WeeklyMealPlan;
  error?: string;
}

export class AIMealService {
  private static apiKey = (import.meta as any).env?.VITE_OPENAI_API_KEY;
  private static apiUrl = 'https://api.openai.com/v1/chat/completions';

  static async generateWeeklyMealPlan(request: MealGenerationRequest): Promise<AIResponse> {
    if (!this.apiKey) {
      return { success: false, error: 'OpenAI API key not configured' };
    }

    try {
      const prompt = this.buildMealPlanPrompt(request);
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a professional meal planning assistant. Generate practical, family-friendly meal plans that consider dietary restrictions, preferences, and nutrition balance.'
            },
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 2000
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const mealPlanText = data.choices[0]?.message?.content;
      
      if (!mealPlanText) {
        throw new Error('No meal plan generated by AI');
      }

      // Parse the AI response into a structured meal plan
      const weeklyPlan = this.parseMealPlanResponse(mealPlanText, request);
      
      return { success: true, weeklyPlan };
      
    } catch (error) {
      console.error('AI meal generation error:', error);
      return { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred' 
      };
    }
  }

  private static buildMealPlanPrompt(request: MealGenerationRequest): string {
    const { familyMembers, preferences, previousMeals, availabilityGrid } = request;
    
    let prompt = `Create a weekly meal plan for a family with the following members:\n\n`;
    
    // Family member details
    familyMembers.forEach(member => {
      prompt += `- ${member.name} (${member.ageGroup})\n`;
      if (member.dietaryRestrictions.length > 0) {
        prompt += `  Dietary restrictions: ${member.dietaryRestrictions.join(', ')}\n`;
      }
      if (member.allergens.length > 0) {
        prompt += `  Allergens: ${member.allergens.join(', ')}\n`;
      }
      if (member.favoriteFoods.length > 0) {
        prompt += `  Favorite foods: ${member.favoriteFoods.join(', ')}\n`;
      }
      if (member.dislikedIngredients.length > 0) {
        prompt += `  Dislikes: ${member.dislikedIngredients.join(', ')}\n`;
      }
      prompt += `\n`;
    });

    // Preferences
    if (preferences) {
      prompt += `\nAdditional preferences:\n`;
      if (preferences.cuisinePreferences?.length) {
        prompt += `- Cuisine preferences: ${preferences.cuisinePreferences.join(', ')}\n`;
      }
      if (preferences.avoidIngredients?.length) {
        prompt += `- Avoid ingredients: ${preferences.avoidIngredients.join(', ')}\n`;
      }
      if (preferences.budgetConstraints) {
        prompt += `- Budget: ${preferences.budgetConstraints}\n`;
      }
      if (preferences.cookingTime) {
        prompt += `- Cooking time preference: ${preferences.cookingTime}\n`;
      }
      if (preferences.healthFocus) {
        prompt += `- Health focus: ${preferences.healthFocus}\n`;
      }
    }

    // Previous meals to avoid repetition
    if (previousMeals?.length) {
      prompt += `\nRecently eaten meals to avoid repeating:\n`;
      previousMeals.slice(0, 10).forEach(meal => {
        prompt += `- ${meal.name}\n`;
      });
    }

    // Availability information
    if (availabilityGrid) {
      prompt += `\nMeal availability (only generate meals for these specific times):\n`;
      const weekStart = new Date(request.weekStartDate);
      
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        const dateKey = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        
        const dayMeals: string[] = [];
        
        // Check which meals are needed for this day
        if (familyMembers.some(member => request.availabilityGrid?.[member.id]?.[dateKey]?.breakfast)) {
          dayMeals.push('breakfast');
        }
        if (familyMembers.some(member => request.availabilityGrid?.[member.id]?.[dateKey]?.lunch)) {
          dayMeals.push('lunch');
        }
        if (familyMembers.some(member => request.availabilityGrid?.[member.id]?.[dateKey]?.dinner)) {
          dayMeals.push('dinner');
        }
        
        if (dayMeals.length > 0) {
          prompt += `- ${dayName} (${date.toLocaleDateString()}): ${dayMeals.join(', ')}\n`;
        }
      }
      
      prompt += `\nIMPORTANT: Only generate meals for the days and meal types listed above. Do not create meals for days or times not specified.\n`;
    }

    prompt += `\nPlease create a meal plan ONLY for the specific days and meal types listed in the availability section above. 
    
Format your response as a JSON object with this structure:
{
  "meals": {
    "monday": {
      "breakfast": {"name": "Meal Name", "description": "Brief description", "prepTime": 15, "servings": 4},
      "lunch": {"name": "Meal Name", "description": "Brief description", "prepTime": 30, "servings": 4},
      "dinner": {"name": "Meal Name", "description": "Brief description", "prepTime": 45, "servings": 4}
    },
    ... (repeat for all days)
  },
  "shoppingList": [
    {"item": "ingredient name", "quantity": "amount", "category": "produce/dairy/meat/etc"},
    ...
  ],
  "nutritionSummary": {
    "totalCaloriesPerDay": 2000,
    "proteinBalance": "high/medium/low",
    "notes": "Any important nutrition notes"
  }
}

CRITICAL REQUIREMENTS:
1. ONLY generate meals for the days and meal types specified in the availability section
2. DO NOT create meals for days or meal types not listed
3. Respect all dietary restrictions and allergens
4. Include variety in the meals you do create
5. Be practical to prepare
6. Consider the family's preferences
7. If no meals are requested for a day, do not include that day in the response`;

    return prompt;
  }

  private static parseMealPlanResponse(response: string, request: MealGenerationRequest): WeeklyMealPlan {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in AI response');
      }

      const parsedPlan = JSON.parse(jsonMatch[0]);
      
      // Convert to our WeeklyMealPlan format
      const weekStart = new Date(request.weekStartDate);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);
      
      const weeklyPlan: WeeklyMealPlan = {
        id: '', // Will be set when saved to database
        familyId: request.familyMembers[0]?.familyId || '',
        weekStartDate: request.weekStartDate,
        weekEndDate: weekEnd.toISOString().split('T')[0],
        dailyPlans: [],
        estimatedCost: parsedPlan.nutritionSummary?.estimatedCost || Math.floor(Math.random() * 50) + 100,
        generatedBy: 'ai',
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Convert meals format to dailyPlans
      const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
      days.forEach((day, index) => {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + index);
        const dateKey = date.toISOString().split('T')[0];
        
        // Check if we have availability data for this specific day
        let hasAnyMealsForDay = false;
        let mealsToGenerate: string[] = [];
        
        if (request.availabilityGrid && request.familyMembers.length > 0) {
          // Check which meals are requested for this day
          const hasBreakfast = request.familyMembers.some(member => 
            request.availabilityGrid![member.id]?.[dateKey]?.breakfast
          );
          const hasLunch = request.familyMembers.some(member => 
            request.availabilityGrid![member.id]?.[dateKey]?.lunch
          );
          const hasDinner = request.familyMembers.some(member => 
            request.availabilityGrid![member.id]?.[dateKey]?.dinner
          );
          
          if (hasBreakfast) mealsToGenerate.push('breakfast');
          if (hasLunch) mealsToGenerate.push('lunch');
          if (hasDinner) mealsToGenerate.push('dinner');
          
          hasAnyMealsForDay = mealsToGenerate.length > 0;
        } else {
          // Fallback: only generate meals that exist in the AI response
          if (parsedPlan.meals && parsedPlan.meals[day]) {
            hasAnyMealsForDay = true;
            // Only include meal types that actually exist in the response
            mealsToGenerate = [];
            if (parsedPlan.meals[day].breakfast) mealsToGenerate.push('breakfast');
            if (parsedPlan.meals[day].lunch) mealsToGenerate.push('lunch');
            if (parsedPlan.meals[day].dinner) mealsToGenerate.push('dinner');
          } else {
            hasAnyMealsForDay = false;
            mealsToGenerate = [];
          }
        }
        
        if (hasAnyMealsForDay && parsedPlan.meals[day]) {
          const meals: any[] = [];
          
          mealsToGenerate.forEach(mealType => {
            if (parsedPlan.meals[day][mealType]) {
              meals.push({
                mealType: mealType as 'breakfast' | 'lunch' | 'dinner',
                mealId: `ai_${mealType}_${index}`,
                servings: request.familyMembers.length,
                notes: parsedPlan.meals[day][mealType]?.name || `AI Generated ${mealType.charAt(0).toUpperCase() + mealType.slice(1)}`
              });
            }
          });
          
          if (meals.length > 0) {
            weeklyPlan.dailyPlans.push({
              date: dateKey,
              peopleEating: request.familyMembers.map(m => m.id),
              meals: meals
            });
          }
        }
      });

      return weeklyPlan;
      
    } catch (error) {
      console.error('Error parsing AI meal plan response:', error);
      
      // Fallback: create a basic plan if parsing fails
      return this.createFallbackPlan(request);
    }
  }

  private static formatMeal(mealData: any): any {
    return {
      name: mealData?.name || 'Meal',
      description: mealData?.description || '',
      prepTime: mealData?.prepTime || 30,
      servings: mealData?.servings || 4,
      ingredients: mealData?.ingredients || [],
      instructions: mealData?.instructions || [],
      nutrition: mealData?.nutrition || {},
      tags: mealData?.tags || []
    };
  }

  private static createFallbackPlan(request: MealGenerationRequest): WeeklyMealPlan {
    const weekStart = new Date(request.weekStartDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);
    
    const dailyPlans = [];
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      
      dailyPlans.push({
        date: date.toISOString().split('T')[0],
        peopleEating: request.familyMembers.map(m => m.id),
        meals: [
          {
            mealType: 'breakfast' as const,
            mealId: `fallback_breakfast_${i}`,
            servings: request.familyMembers.length,
            notes: 'Oatmeal with Berries'
          },
          {
            mealType: 'lunch' as const,
            mealId: `fallback_lunch_${i}`,
            servings: request.familyMembers.length,
            notes: 'Turkey Sandwich'
          },
          {
            mealType: 'dinner' as const,
            mealId: `fallback_dinner_${i}`,
            servings: request.familyMembers.length,
            notes: 'Grilled Chicken with Vegetables'
          }
        ]
      });
    }

    return {
      id: '',
      familyId: request.familyMembers[0]?.familyId || '',
      weekStartDate: request.weekStartDate,
      weekEndDate: weekEnd.toISOString().split('T')[0],
      dailyPlans,
      estimatedCost: 120,
      generatedBy: 'ai',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  static async getMealSuggestions(ingredients: string[], dietaryRestrictions: string[] = []): Promise<Meal[]> {
    if (!this.apiKey) {
      return [];
    }

    try {
      const prompt = `Suggest 3 healthy meal ideas using these ingredients: ${ingredients.join(', ')}.
      ${dietaryRestrictions.length > 0 ? `Dietary restrictions: ${dietaryRestrictions.join(', ')}` : ''}
      
      Format as JSON array:
      [
        {
          "name": "Meal Name",
          "description": "Brief description",
          "prepTime": 30,
          "difficulty": "easy",
          "ingredients": ["ingredient1", "ingredient2"],
          "instructions": ["step1", "step2"],
          "cuisine": "cuisine type",
          "mealTypes": ["breakfast/lunch/dinner"],
          "nutrition": {"calories": 400, "protein": 25, "carbs": 30, "fat": 15}
        }
      ]`;

      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 1000
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const suggestionsText = data.choices[0]?.message?.content;
      
      if (!suggestionsText) {
        return [];
      }

      const jsonMatch = suggestionsText.match(/\[[\s\S]*\]/);
      if (!jsonMatch) {
        return [];
      }

      const suggestions = JSON.parse(jsonMatch[0]);
      return suggestions.map((meal: any) => ({
        ...meal,
        id: `ai_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date(),
        updatedAt: new Date()
      }));

    } catch (error) {
      console.error('Error getting meal suggestions:', error);
      return [];
    }
  }
}