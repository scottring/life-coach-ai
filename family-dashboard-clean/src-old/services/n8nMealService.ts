import { FamilyMember, WeeklyMealPlan } from '../types/mealPlanning';

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

interface N8nResponse {
  success: boolean;
  weeklyPlan?: WeeklyMealPlan;
  error?: string;
  aiResponseRaw?: string;
  aiContent?: string;
  shoppingList?: any[];
  nutritionSummary?: any;
}

export class N8nMealService {
  // Update this URL with your actual n8n instance URL
  private static webhookUrl = process.env.REACT_APP_N8N_WEBHOOK_URL || 'https://n8n.srv829884.hstgr.cloud/webhook/meal-plan';

  static async generateWeeklyMealPlan(request: MealGenerationRequest): Promise<N8nResponse> {
    try {
      console.log('=== N8N SERVICE DEBUG ===');
      console.log('Webhook URL:', this.webhookUrl);
      console.log('Environment REACT_APP_N8N_WEBHOOK_URL:', process.env.REACT_APP_N8N_WEBHOOK_URL);
      console.log('Sending meal plan request to n8n:', request);
      
      const response = await fetch(this.webhookUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(request)
      });

      if (!response.ok) {
        throw new Error(`n8n webhook error: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();
      console.log('n8n meal plan response:', result);
      console.log('Response has success:', 'success' in result);
      console.log('Response has weeklyPlan:', 'weeklyPlan' in result);
      console.log('Success value:', result.success);
      console.log('WeeklyPlan value:', result.weeklyPlan);
      console.log('ItemKeys array:', result.itemKeys);
      console.log('JsonKeys array:', result.jsonKeys);
      console.log('ActualStructure:', result.actualStructure);
      
      return result;
      
    } catch (error) {
      console.error('Error calling n8n meal planning workflow:', error);
      
      // Fallback response
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred calling n8n workflow'
      };
    }
  }
}