// n8n Integration Service
// This service handles webhooks and automation triggers

const N8N_WEBHOOK_URL = process.env.REACT_APP_N8N_WEBHOOK_URL;
const N8N_WEBHOOK_SECRET = process.env.REACT_APP_N8N_WEBHOOK_SECRET;

export interface N8NWebhookPayload {
  event: string;
  familyId: string;
  userId: string;
  data: any;
  timestamp: string;
}

export const n8nService = {
  // Send meal plan created event to n8n
  async sendMealPlanCreated(familyId: string, userId: string, meals: any[]) {
    if (!N8N_WEBHOOK_URL) {
      console.log('n8n webhook not configured, skipping meal plan notification');
      return;
    }

    const payload: N8NWebhookPayload = {
      event: 'meal_plan_created',
      familyId,
      userId,
      data: {
        meals,
        weekStart: new Date().toISOString().split('T')[0],
        mealCount: meals.length
      },
      timestamp: new Date().toISOString()
    };

    try {
      await fetch(`${N8N_WEBHOOK_URL}/webhook/meal-plan-created`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': N8N_WEBHOOK_SECRET || ''
        },
        body: JSON.stringify(payload)
      });
      console.log('n8n meal plan created event sent successfully');
    } catch (error) {
      console.error('Failed to send n8n meal plan created event:', error);
    }
  },

  // Send shopping list updated event
  async sendShoppingListUpdated(familyId: string, userId: string, items: any[]) {
    if (!N8N_WEBHOOK_URL) {
      console.log('n8n webhook not configured, skipping shopping list notification');
      return;
    }

    const payload: N8NWebhookPayload = {
      event: 'shopping_list_updated',
      familyId,
      userId,
      data: {
        items,
        unpurchasedCount: items.filter(item => !item.purchased).length,
        totalCount: items.length
      },
      timestamp: new Date().toISOString()
    };

    try {
      await fetch(`${N8N_WEBHOOK_URL}/webhook/shopping-list-updated`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': N8N_WEBHOOK_SECRET || ''
        },
        body: JSON.stringify(payload)
      });
      console.log('n8n shopping list updated event sent successfully');
    } catch (error) {
      console.error('Failed to send n8n shopping list updated event:', error);
    }
  },

  // Send family task created event
  async sendTaskCreated(familyId: string, userId: string, task: any) {
    if (!N8N_WEBHOOK_URL) {
      console.log('n8n webhook not configured, skipping task notification');
      return;
    }

    const payload: N8NWebhookPayload = {
      event: 'task_created',
      familyId,
      userId,
      data: {
        task,
        priority: task.priority,
        dueDate: task.dueDate
      },
      timestamp: new Date().toISOString()
    };

    try {
      await fetch(`${N8N_WEBHOOK_URL}/webhook/task-created`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': N8N_WEBHOOK_SECRET || ''
        },
        body: JSON.stringify(payload)
      });
      console.log('n8n task created event sent successfully');
    } catch (error) {
      console.error('Failed to send n8n task created event:', error);
    }
  },

  // Generic webhook sender for custom events
  async sendCustomEvent(event: string, familyId: string, userId: string, data: any) {
    if (!N8N_WEBHOOK_URL) {
      console.log('n8n webhook not configured, skipping custom event');
      return;
    }

    const payload: N8NWebhookPayload = {
      event,
      familyId,
      userId,
      data,
      timestamp: new Date().toISOString()
    };

    try {
      await fetch(`${N8N_WEBHOOK_URL}/webhook/${event}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Secret': N8N_WEBHOOK_SECRET || ''
        },
        body: JSON.stringify(payload)
      });
      console.log(`n8n custom event ${event} sent successfully`);
    } catch (error) {
      console.error(`Failed to send n8n custom event ${event}:`, error);
    }
  }
};