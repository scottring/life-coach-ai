import { FamilyMember, WeeklyMealPlan } from '../types/mealPlanning';
import { Recipe } from '../types/recipe';

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

interface EnhancedMealResponse {
  success: boolean;
  weeklyPlan?: WeeklyMealPlan;
  error?: string;
}

export class EnhancedAIMealService {
  private static openaiApiKey = process.env.REACT_APP_OPENAI_API_KEY;

  static async generateWeeklyMealPlan(request: MealGenerationRequest): Promise<EnhancedMealResponse> {
    try {
      console.log('=== ENHANCED AI MEAL SERVICE ===');
      console.log('Generating meal plan with direct OpenAI integration');
      console.log('Request:', request);

      if (!this.openaiApiKey) {
        throw new Error('OpenAI API key not configured');
      }

      // Build the AI prompt
      const prompt = this.buildMealPlanPrompt(request);
      console.log('AI Prompt:', prompt);

      // Call OpenAI directly
      const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.openaiApiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: 'You are a professional meal planning assistant. Generate practical, family-friendly meal plans with detailed recipes. Always respond with valid JSON only.'
            },
            {
              role: 'user', 
              content: prompt
            }
          ],
          temperature: 0.7,
          max_tokens: 6000
        })
      });

      if (!openaiResponse.ok) {
        throw new Error(`OpenAI API error: ${openaiResponse.status} ${openaiResponse.statusText}`);
      }

      const aiData = await openaiResponse.json();
      console.log('OpenAI Response:', aiData);

      // Parse the AI response
      const aiContent = aiData.choices[0]?.message?.content;
      if (!aiContent) {
        throw new Error('No content in OpenAI response');
      }

      console.log('AI Generated Content:', aiContent);

      // Clean and extract JSON from response with robust parsing
      const cleanedContent = aiContent
        .replace(/\n/g, ' ')
        .replace(/\r/g, ' ')
        .replace(/\t/g, ' ')
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, '') // Remove control characters
        .trim();
      
      console.log('Cleaned AI content length:', cleanedContent.length);
      console.log('First 500 chars:', cleanedContent.substring(0, 500));
      console.log('Last 500 chars:', cleanedContent.substring(cleanedContent.length - 500));
      
      // Try multiple JSON extraction strategies
      let parsedMeal;
      let jsonStr = '';
      
      // Strategy 1: Find complete JSON object
      const jsonMatch = cleanedContent.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        jsonStr = jsonMatch[0];
        console.log('Found JSON match, length:', jsonStr.length);
        
        try {
          parsedMeal = JSON.parse(jsonStr);
          console.log('Successfully parsed complete JSON');
        } catch (parseError) {
          console.log('Complete JSON parse failed, trying repair strategies');
          
          // Strategy 2: Try to repair truncated JSON
          jsonStr = this.repairTruncatedJSON(jsonStr);
          try {
            parsedMeal = JSON.parse(jsonStr);
            console.log('Successfully parsed repaired JSON');
          } catch (repairError) {
            console.error('Repaired JSON parse failed:', repairError);
            console.log('JSON length:', jsonStr.length);
            console.log('Error position in JSON:', repairError instanceof Error ? repairError.message : 'Unknown error');
            console.log('Using fallback recipe due to parse error');
            return this.createFallbackMealPlan(request);
          }
        }
      } else {
        console.log('No JSON match found, using fallback recipe');
        return this.createFallbackMealPlan(request);
      }

      // Convert to our enhanced meal plan format
      const weeklyPlan = this.convertToWeeklyPlan(parsedMeal, request);
      
      return {
        success: true,
        weeklyPlan
      };

    } catch (error) {
      console.error('Error in enhanced AI meal service:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  private static repairTruncatedJSON(jsonStr: string): string {
    console.log('Attempting to repair truncated JSON');
    
    // Count braces and brackets to see what's missing
    let braceCount = 0;
    let bracketCount = 0;
    let inString = false;
    let lastValidPos = jsonStr.length;
    
    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr[i];
      
      if (char === '"' && (i === 0 || jsonStr[i-1] !== '\\')) {
        inString = !inString;
      }
      
      if (!inString) {
        if (char === '{') braceCount++;
        else if (char === '}') braceCount--;
        else if (char === '[') bracketCount++;
        else if (char === ']') bracketCount--;
        
        // Track last position where counts were valid
        if (braceCount >= 0 && bracketCount >= 0) {
          lastValidPos = i + 1;
        }
      }
    }
    
    // Truncate to last valid position and close structures
    let repaired = jsonStr.substring(0, lastValidPos);
    
    // Remove any trailing comma
    repaired = repaired.replace(/,\s*$/, '');
    
    // Close any open arrays
    while (bracketCount > 0) {
      repaired += ']';
      bracketCount--;
    }
    
    // Close any open objects
    while (braceCount > 0) {
      repaired += '}';
      braceCount--;
    }
    
    console.log('Repaired JSON length:', repaired.length);
    console.log('Added closures for braces/brackets');
    
    return repaired;
  }

  private static buildMealPlanPrompt(request: MealGenerationRequest): string {
    const { familyMembers, preferences, availabilityGrid, weekStartDate } = request;

    // Build family description
    let familyDesc = `Family members:\n`;
    familyMembers.forEach(member => {
      familyDesc += `- ${member.name} (${member.ageGroup})\n`;
      if (member.dietaryRestrictions?.length > 0) {
        familyDesc += `  Dietary restrictions: ${member.dietaryRestrictions.join(', ')}\n`;
      }
      if (member.allergens?.length > 0) {
        familyDesc += `  Allergens: ${member.allergens.join(', ')}\n`;
      }
    });

    // Build availability description
    let availabilityDesc = '\nMeal availability:\n';
    const weekStart = new Date(weekStartDate);
    
    // Find requested meals from availability grid
    const requestedMeals: string[] = [];
    
    if (availabilityGrid) {
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStart);
        date.setDate(date.getDate() + i);
        const dateKey = date.toISOString().split('T')[0];
        const dayName = date.toLocaleDateString('en-US', { weekday: 'long' });
        
        const hasAnyMeal = Object.values(availabilityGrid).some(memberAvail => 
          memberAvail[dateKey]?.breakfast || memberAvail[dateKey]?.lunch || memberAvail[dateKey]?.dinner
        );
        
        if (hasAnyMeal) {
          const meals = [];
          if (Object.values(availabilityGrid).some(memberAvail => memberAvail[dateKey]?.breakfast)) meals.push('breakfast');
          if (Object.values(availabilityGrid).some(memberAvail => memberAvail[dateKey]?.lunch)) meals.push('lunch');
          if (Object.values(availabilityGrid).some(memberAvail => memberAvail[dateKey]?.dinner)) meals.push('dinner');
          
          availabilityDesc += `- ${dayName}: ${meals.join(', ')}\n`;
          requestedMeals.push(...meals.map(meal => `${dayName.toLowerCase()}_${meal}`));
        }
      }
    }

    const prompt = `${familyDesc}\n${availabilityDesc}

Generate a meal plan for the specific days and meals listed above.

Preferences:
- Cuisine: ${preferences?.cuisinePreferences?.join(', ') || 'any'}
- Health focus: ${preferences?.healthFocus || 'balanced'}
- Cooking time: ${preferences?.cookingTime || 'medium'}

Return ONLY a JSON object with this structure (limit to max 3 recipes):
{
  "meals": {
    "wednesday": {"dinner": "Meal Name"}
  },
  "recipes": {
    "wednesday_dinner": {
      "name": "Recipe Name",
      "description": "Brief description",
      "prepTime": 15,
      "cookTime": 25,
      "difficulty": "Medium",
      "cuisine": "Italian",
      "ingredients": [
        {"item": "Chicken breast", "quantity": "2 pieces", "category": "protein"}
      ],
      "instructions": [
        {"step": 1, "instruction": "Season chicken with salt and pepper"}
      ],
      "nutrition": {"calories": 450, "protein": "35g"},
      "tags": ["healthy", "quick"]
    }
  }
}

IMPORTANT: Only generate meals for the days and meal types I specified above. Include detailed recipes with specific cooking instructions.`;

    return prompt;
  }

  private static convertToWeeklyPlan(parsedMeal: any, request: MealGenerationRequest): WeeklyMealPlan {
    const weekStart = new Date(request.weekStartDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    const dailyPlans: any[] = [];

    // Map day names to dates
    const dayMapping: {[key: string]: string} = {};
    for (let i = 0; i < 7; i++) {
      const date = new Date(weekStart);
      date.setDate(date.getDate() + i);
      const dayName = date.toLocaleDateString('en-US', { weekday: 'long' }).toLowerCase();
      dayMapping[dayName] = date.toISOString().split('T')[0];
    }

    // Convert parsed meals to daily plans
    if (parsedMeal.meals) {
      Object.keys(parsedMeal.meals).forEach(dayName => {
        const dayMeals = parsedMeal.meals[dayName];
        const date = dayMapping[dayName];
        
        if (date && dayMeals) {
          const meals: any[] = [];
          
          Object.keys(dayMeals).forEach(mealType => {
            if (dayMeals[mealType]) {
              const recipeKey = `${dayName}_${mealType}`;
              const recipe = parsedMeal.recipes?.[recipeKey];
              
              meals.push({
                mealType,
                mealId: `ai_${mealType}_${Date.now()}`,
                servings: request.familyMembers.length,
                notes: dayMeals[mealType],
                recipe: recipe || undefined
              });
            }
          });
          
          if (meals.length > 0) {
            dailyPlans.push({
              date,
              peopleEating: request.familyMembers.map(m => m.id),
              meals
            });
          }
        }
      });
    }

    return {
      id: `ai-plan-${Date.now()}`,
      familyId: request.familyMembers[0]?.familyId || '',
      weekStartDate: request.weekStartDate,
      weekEndDate: weekEnd.toISOString().split('T')[0],
      dailyPlans,
      estimatedCost: 100,
      generatedBy: 'ai',
      createdAt: new Date(),
      updatedAt: new Date()
    };
  }

  private static createFallbackMealPlan(request: MealGenerationRequest): {success: boolean, weeklyPlan: WeeklyMealPlan} {
    console.log('Creating fallback meal plan');
    
    const weekStart = new Date(request.weekStartDate);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekEnd.getDate() + 6);

    // Create a simple but complete recipe
    const fallbackRecipe: Recipe = {
      name: "Garlic Herb Chicken with Roasted Vegetables",
      description: "A delicious and healthy one-pan meal with tender chicken and colorful roasted vegetables",
      prepTime: 15,
      cookTime: 35,
      totalTime: 50,
      difficulty: "Medium",
      cuisine: "Mediterranean",
      ingredients: [
        { item: "Chicken breast", quantity: "4 pieces", category: "protein" },
        { item: "Bell peppers", quantity: "2 large", category: "vegetables" },
        { item: "Zucchini", quantity: "2 medium", category: "vegetables" },
        { item: "Red onion", quantity: "1 large", category: "vegetables" },
        { item: "Olive oil", quantity: "3 tbsp", category: "oils" },
        { item: "Garlic", quantity: "4 cloves", category: "aromatics" },
        { item: "Fresh herbs", quantity: "2 tbsp mixed", category: "herbs" },
        { item: "Salt", quantity: "to taste", category: "seasonings" },
        { item: "Black pepper", quantity: "to taste", category: "seasonings" },
        { item: "Lemon", quantity: "1 whole", category: "citrus" }
      ],
      instructions: [
        { step: 1, instruction: "Preheat oven to 425°F (220°C)" },
        { step: 2, instruction: "Cut vegetables into 1-inch pieces and place on a large baking sheet" },
        { step: 3, instruction: "Season chicken breasts with salt, pepper, and minced garlic" },
        { step: 4, instruction: "Drizzle olive oil over vegetables and chicken, toss to coat" },
        { step: 5, instruction: "Arrange chicken on top of vegetables" },
        { step: 6, instruction: "Roast for 25-30 minutes until chicken reaches 165°F internal temperature" },
        { step: 7, instruction: "Sprinkle with fresh herbs and squeeze lemon juice over everything" },
        { step: 8, instruction: "Let rest for 5 minutes before serving" }
      ],
      nutrition: {
        calories: 380,
        protein: "35g",
        carbs: "12g",
        fat: "22g",
        fiber: "4g"
      },
      tags: ["healthy", "one-pan", "gluten-free", "high-protein"]
    };

    // Find the first available meal from availability grid
    let mealDate = weekStart.toISOString().split('T')[0];
    let mealType = 'dinner';

    if (request.availabilityGrid) {
      const weekStartDate = new Date(request.weekStartDate);
      for (let i = 0; i < 7; i++) {
        const date = new Date(weekStartDate);
        date.setDate(date.getDate() + i);
        const dateKey = date.toISOString().split('T')[0];
        
        const hasAnyMeal = Object.values(request.availabilityGrid).some(memberAvail => 
          memberAvail[dateKey]?.breakfast || memberAvail[dateKey]?.lunch || memberAvail[dateKey]?.dinner
        );
        
        if (hasAnyMeal) {
          mealDate = dateKey;
          if (Object.values(request.availabilityGrid).some(memberAvail => memberAvail[dateKey]?.dinner)) {
            mealType = 'dinner';
          } else if (Object.values(request.availabilityGrid).some(memberAvail => memberAvail[dateKey]?.lunch)) {
            mealType = 'lunch';
          } else if (Object.values(request.availabilityGrid).some(memberAvail => memberAvail[dateKey]?.breakfast)) {
            mealType = 'breakfast';
          }
          break;
        }
      }
    }

    const weeklyPlan: WeeklyMealPlan = {
      id: `fallback-plan-${Date.now()}`,
      familyId: request.familyMembers[0]?.familyId || '',
      weekStartDate: request.weekStartDate,
      weekEndDate: weekEnd.toISOString().split('T')[0],
      dailyPlans: [
        {
          date: mealDate,
          peopleEating: request.familyMembers.map(m => m.id),
          meals: [
            {
              mealType: mealType as any,
              mealId: `fallback_${mealType}_${Date.now()}`,
              servings: request.familyMembers.length,
              notes: fallbackRecipe.name,
              recipe: fallbackRecipe
            }
          ]
        }
      ],
      estimatedCost: 85,
      generatedBy: 'ai',
      createdAt: new Date(),
      updatedAt: new Date()
    };

    return {
      success: true,
      weeklyPlan
    };
  }
}