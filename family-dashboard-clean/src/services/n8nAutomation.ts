// n8n Automation Service for Family Meal Planning
// This service handles webhook calls to n8n workflows for meal planning automation

interface N8nWebhookPayload {
  familyId: string;
  userId: string;
  data: any;
  timestamp: string;
}

export class N8nAutomationService {
  private static readonly baseUrl = process.env.REACT_APP_N8N_WEBHOOK_URL || 'https://your-n8n-instance.com';
  private static readonly secret = process.env.REACT_APP_N8N_WEBHOOK_SECRET || 'your-secret-key';

  /**
   * Trigger weekly meal plan generation workflow
   * This workflow can:
   * - Send reminders to plan next week's meals
   * - Auto-generate meal plans based on preferences
   * - Sync with calendar for busy days
   */
  static async triggerWeeklyPlanGeneration(familyId: string, weekStartDate: string): Promise<boolean> {
    try {
      const payload: N8nWebhookPayload = {
        familyId,
        userId: 'system',
        data: {
          weekStartDate,
          action: 'generate_weekly_plan',
          preferences: await this.getFamilyPreferences(familyId)
        },
        timestamp: new Date().toISOString()
      };

      const response = await fetch(`${this.baseUrl}/webhook/weekly-meal-planning`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-Secret': this.secret
        },
        body: JSON.stringify(payload)
      });

      return response.ok;
    } catch (error) {
      console.error('Error triggering weekly plan generation:', error);
      return false;
    }
  }

  /**
   * Trigger shopping list generation and optimization
   * This workflow can:
   * - Generate shopping lists from meal plans
   * - Optimize shopping trips by store location
   * - Send shopping lists to family members
   * - Track grocery spending
   */
  static async generateShoppingList(familyId: string, weeklyPlanId: string, deliveryPreferences?: any): Promise<boolean> {
    try {
      const payload: N8nWebhookPayload = {
        familyId,
        userId: 'system',
        data: {
          weeklyPlanId,
          action: 'generate_shopping_list',
          deliveryPreferences,
          storePreferences: await this.getStorePreferences(familyId)
        },
        timestamp: new Date().toISOString()
      };

      const response = await fetch(`${this.baseUrl}/webhook/shopping-list-generation`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-Secret': this.secret
        },
        body: JSON.stringify(payload)
      });

      return response.ok;
    } catch (error) {
      console.error('Error generating shopping list:', error);
      return false;
    }
  }

  /**
   * Trigger nutrition tracking and analysis
   * This workflow can:
   * - Calculate daily/weekly nutrition summaries
   * - Send nutrition reports to family members
   * - Alert about nutrition goals (too much sodium, not enough fiber, etc.)
   * - Suggest healthier alternatives
   */
  static async trackNutrition(familyId: string, nutritionData: any): Promise<boolean> {
    try {
      const payload: N8nWebhookPayload = {
        familyId,
        userId: 'system',
        data: {
          ...nutritionData,
          action: 'track_nutrition',
          nutritionGoals: await this.getNutritionGoals(familyId)
        },
        timestamp: new Date().toISOString()
      };

      const response = await fetch(`${this.baseUrl}/webhook/nutrition-tracking`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-Secret': this.secret
        },
        body: JSON.stringify(payload)
      });

      return response.ok;
    } catch (error) {
      console.error('Error tracking nutrition:', error);
      return false;
    }
  }

  /**
   * Trigger meal preference learning workflow
   * This workflow can:
   * - Update family member favorite foods based on ratings
   * - Identify meal patterns (what gets eaten vs. thrown away)
   * - Suggest similar meals to highly rated ones
   * - Avoid suggesting meals that were consistently disliked
   */
  static async updateMealPreferences(familyId: string, mealRatingData: any): Promise<boolean> {
    try {
      const payload: N8nWebhookPayload = {
        familyId,
        userId: 'system',
        data: {
          ...mealRatingData,
          action: 'update_preferences',
          currentPreferences: await this.getFamilyPreferences(familyId)
        },
        timestamp: new Date().toISOString()
      };

      const response = await fetch(`${this.baseUrl}/webhook/preference-learning`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-Secret': this.secret
        },
        body: JSON.stringify(payload)
      });

      return response.ok;
    } catch (error) {
      console.error('Error updating meal preferences:', error);
      return false;
    }
  }

  /**
   * Trigger meal prep scheduling and reminders
   * This workflow can:
   * - Send prep reminders based on meal complexity
   * - Suggest meal prep batching for busy weeks
   * - Assign family members to cooking duties
   * - Send shopping reminders before grocery trips
   */
  static async scheduleMealPrep(familyId: string, weeklyPlan: any): Promise<boolean> {
    try {
      const payload: N8nWebhookPayload = {
        familyId,
        userId: 'system',
        data: {
          weeklyPlan,
          action: 'schedule_meal_prep',
          familySchedule: await this.getFamilySchedule(familyId)
        },
        timestamp: new Date().toISOString()
      };

      const response = await fetch(`${this.baseUrl}/webhook/meal-prep-scheduling`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-Secret': this.secret
        },
        body: JSON.stringify(payload)
      });

      return response.ok;
    } catch (error) {
      console.error('Error scheduling meal prep:', error);
      return false;
    }
  }

  /**
   * Trigger leftover management workflow
   * This workflow can:
   * - Track when meals were cooked and portions consumed
   * - Suggest leftover transformations (turn roast chicken into chicken salad)
   * - Send reminders to use leftovers before they expire
   * - Plan leftover days into weekly schedules
   */
  static async manageLeftovers(familyId: string, leftoverData: any): Promise<boolean> {
    try {
      const payload: N8nWebhookPayload = {
        familyId,
        userId: 'system',
        data: {
          ...leftoverData,
          action: 'manage_leftovers'
        },
        timestamp: new Date().toISOString()
      };

      const response = await fetch(`${this.baseUrl}/webhook/leftover-management`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-Secret': this.secret
        },
        body: JSON.stringify(payload)
      });

      return response.ok;
    } catch (error) {
      console.error('Error managing leftovers:', error);
      return false;
    }
  }

  /**
   * Trigger seasonal meal suggestions workflow
   * This workflow can:
   * - Suggest meals based on seasonal ingredients
   * - Update meal database with seasonal availability
   * - Send notifications about seasonal sales/ingredients
   * - Plan holiday and special occasion meals
   */
  static async getSeasonalSuggestions(familyId: string, season: string, specialOccasions: string[]): Promise<boolean> {
    try {
      const payload: N8nWebhookPayload = {
        familyId,
        userId: 'system',
        data: {
          season,
          specialOccasions,
          action: 'seasonal_suggestions',
          familyPreferences: await this.getFamilyPreferences(familyId)
        },
        timestamp: new Date().toISOString()
      };

      const response = await fetch(`${this.baseUrl}/webhook/seasonal-meal-suggestions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-N8N-Secret': this.secret
        },
        body: JSON.stringify(payload)
      });

      return response.ok;
    } catch (error) {
      console.error('Error getting seasonal suggestions:', error);
      return false;
    }
  }

  // Helper methods to get family data (these would integrate with your database)
  private static async getFamilyPreferences(familyId: string): Promise<any> {
    // This would fetch from your Firebase database
    return {
      preferredCuisines: ['American', 'Italian', 'Mexican'],
      avoidedIngredients: [],
      budgetLevel: 'medium',
      healthFocus: 'balanced'
    };
  }

  private static async getStorePreferences(familyId: string): Promise<any> {
    return {
      preferredStores: ['Whole Foods', 'Target'],
      deliveryServices: ['Instacart'],
      budgetConstraints: { weekly: 150 }
    };
  }

  private static async getNutritionGoals(familyId: string): Promise<any> {
    return {
      dailyCalories: 2000,
      maxSodium: 2300,
      minFiber: 25,
      proteinPercent: 25
    };
  }

  private static async getFamilySchedule(familyId: string): Promise<any> {
    return {
      busyDays: ['Wednesday', 'Friday'],
      cookingDays: ['Sunday', 'Tuesday', 'Thursday'],
      preferredCookingTimes: '18:00'
    };
  }
}

// Export workflow templates for n8n setup
export const N8N_WORKFLOW_TEMPLATES = {
  weeklyMealPlanning: {
    name: "Weekly Meal Planning Automation",
    description: "Automatically generates weekly meal plans and sends reminders",
    nodes: [
      {
        name: "Webhook Trigger",
        type: "n8n-nodes-base.webhook",
        webhookId: "weekly-meal-planning"
      },
      {
        name: "Get Family Preferences",
        type: "n8n-nodes-base.firebase"
      },
      {
        name: "AI Meal Generation",
        type: "n8n-nodes-base.openAi"
      },
      {
        name: "Save Meal Plan",
        type: "n8n-nodes-base.firebase"
      },
      {
        name: "Send Notifications",
        type: "n8n-nodes-base.gmail"
      }
    ]
  },
  
  shoppingListGeneration: {
    name: "Smart Shopping List Generation",
    description: "Creates optimized shopping lists and manages grocery orders",
    nodes: [
      {
        name: "Webhook Trigger",
        type: "n8n-nodes-base.webhook",
        webhookId: "shopping-list-generation"
      },
      {
        name: "Get Meal Plan",
        type: "n8n-nodes-base.firebase"
      },
      {
        name: "Extract Ingredients",
        type: "n8n-nodes-base.code"
      },
      {
        name: "Optimize Shopping",
        type: "n8n-nodes-base.code"
      },
      {
        name: "Send to Instacart",
        type: "n8n-nodes-base.httpRequest"
      }
    ]
  },
  
  nutritionTracking: {
    name: "Nutrition Tracking & Analysis",
    description: "Monitors family nutrition and provides health insights",
    nodes: [
      {
        name: "Webhook Trigger",
        type: "n8n-nodes-base.webhook",
        webhookId: "nutrition-tracking"
      },
      {
        name: "Calculate Nutrition",
        type: "n8n-nodes-base.code"
      },
      {
        name: "Check Goals",
        type: "n8n-nodes-base.if"
      },
      {
        name: "Generate Report",
        type: "n8n-nodes-base.code"
      },
      {
        name: "Send Health Alert",
        type: "n8n-nodes-base.gmail"
      }
    ]
  }
};