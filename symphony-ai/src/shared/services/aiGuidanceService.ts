import { openaiClient } from './openaiClient';
import { PlanningSession, PlanningSessionType } from '../types/goals';

export interface GuidancePrompt {
  type: 'intro' | 'section' | 'transition' | 'completion' | 'reminder';
  title: string;
  content: string;
  suggestedActions?: string[];
  timeEstimate?: string;
  nextStep?: string;
}

export interface PlanningContext {
  sessionType: PlanningSessionType;
  currentStep: string;
  timeAllocated: number; // minutes
  timeUsed: number; // minutes
  previousSessions?: PlanningSession[];
  familyContext?: any;
  urgentItems?: string[];
}

class AIGuidanceService {
  
  // Get guidance for starting a planning session
  async getSessionIntro(context: PlanningContext): Promise<GuidancePrompt> {
    const sessionSpecs = this.getSessionSpecifications(context.sessionType);
    
    const systemPrompt = `You are an AI family planning assistant helping guide a structured planning session. 
    Be warm, encouraging, and time-conscious. Keep responses concise but helpful.
    
    Session Type: ${context.sessionType}
    Time Allocated: ${context.timeAllocated} minutes
    
    Provide a welcoming introduction that:
    1. Acknowledges the time commitment and purpose
    2. Sets expectations for what will be accomplished
    3. Gives a brief overview of the session structure
    4. Motivates them to stay focused and productive`;

    const userPrompt = `Start a ${context.sessionType} planning session. 
    Time available: ${context.timeAllocated} minutes.
    Session agenda: ${sessionSpecs.agenda.join(', ')}`;

    try {
      const response = await openaiClient.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 300,
        temperature: 0.7
      });

      return {
        type: 'intro',
        title: `Welcome to ${this.getSessionTitle(context.sessionType)}`,
        content: response.choices[0].message.content || '',
        timeEstimate: `${context.timeAllocated} minutes`,
        nextStep: sessionSpecs.agenda[0]
      };
    } catch (error) {
      console.error('Error getting session intro:', error);
      return this.getFallbackIntro(context);
    }
  }

  // Get guidance for specific section within a session
  async getSectionGuidance(context: PlanningContext, sectionData?: any): Promise<GuidancePrompt> {
    const sessionSpecs = this.getSessionSpecifications(context.sessionType);
    const currentSection = (sessionSpecs.sections as any)[context.currentStep];
    
    if (!currentSection) {
      // Return fallback guidance for unknown sections
      return this.getFallbackSectionGuidance(context);
    }

    const timeRemaining = context.timeAllocated - context.timeUsed;
    const systemPrompt = `You are guiding someone through the "${currentSection.title}" section of their ${context.sessionType} planning session.

    Section Purpose: ${currentSection.purpose}
    Key Activities: ${currentSection.activities.join(', ')}
    Time Remaining: ${timeRemaining} minutes
    
    Provide guidance that:
    1. Explains what they should focus on in this section
    2. Gives specific questions or prompts to consider
    3. Suggests concrete actions to take
    4. Keeps them on track with time
    5. Connects to their previous planning data if relevant`;

    const userPrompt = `Guide me through the "${currentSection.title}" section. 
    ${sectionData ? `Current data: ${JSON.stringify(sectionData)}` : ''}
    ${context.urgentItems?.length ? `Urgent items to consider: ${context.urgentItems.join(', ')}` : ''}`;

    try {
      const response = await openaiClient.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 400,
        temperature: 0.7
      });

      return {
        type: 'section',
        title: currentSection.title,
        content: response.choices[0].message.content || '',
        suggestedActions: currentSection.activities,
        timeEstimate: `${currentSection.estimatedMinutes} minutes`,
        nextStep: this.getNextSection(context.sessionType, context.currentStep)
      };
    } catch (error) {
      console.error('Error getting section guidance:', error);
      return this.getFallbackSectionGuidance(context);
    }
  }

  // Get transition guidance between sections
  async getTransitionGuidance(context: PlanningContext, completedSection: string, nextSection: string): Promise<GuidancePrompt> {
    const timeUsed = context.timeUsed;
    const timeRemaining = context.timeAllocated - timeUsed;
    
    const systemPrompt = `You are helping someone transition between sections in their planning session.
    
    Just completed: ${completedSection}
    Moving to: ${nextSection}
    Time used so far: ${timeUsed} minutes
    Time remaining: ${timeRemaining} minutes
    
    Provide a brief transition that:
    1. Acknowledges what they just accomplished
    2. Previews what's coming next
    3. Adjusts expectations if running behind/ahead of schedule
    4. Keeps momentum and energy positive`;

    const userPrompt = `Transitioning from "${completedSection}" to "${nextSection}". 
    How are we doing on time and what should I expect next?`;

    try {
      const response = await openaiClient.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 200,
        temperature: 0.7
      });

      return {
        type: 'transition',
        title: `Moving to ${nextSection}`,
        content: response.choices[0].message.content || '',
        timeEstimate: `${timeRemaining} minutes remaining`
      };
    } catch (error) {
      console.error('Error getting transition guidance:', error);
      return {
        type: 'transition',
        title: `Moving to ${nextSection}`,
        content: `Great work completing ${completedSection}! Let's move on to ${nextSection}. You have ${timeRemaining} minutes remaining.`,
        timeEstimate: `${timeRemaining} minutes remaining`
      };
    }
  }

  // Get completion guidance and next steps
  async getCompletionGuidance(context: PlanningContext, sessionResults: any): Promise<GuidancePrompt> {
    const systemPrompt = `You are helping someone wrap up their ${context.sessionType} planning session.
    
    Time allocated: ${context.timeAllocated} minutes
    Time used: ${context.timeUsed} minutes
    
    Provide completion guidance that:
    1. Celebrates what they accomplished
    2. Summarizes key decisions/outcomes
    3. Reminds them of next steps or follow-up actions
    4. Sets expectations for the next planning session
    5. Encourages them about the system working`;

    const userPrompt = `Session complete! Results: ${JSON.stringify(sessionResults)}
    What did we accomplish and what are the next steps?`;

    try {
      const response = await openaiClient.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt }
        ],
        max_tokens: 300,
        temperature: 0.7
      });

      const nextSessionType = this.getNextSessionType(context.sessionType);
      const nextSessionTime = this.getNextSessionTime(context.sessionType);

      return {
        type: 'completion',
        title: `${this.getSessionTitle(context.sessionType)} Complete!`,
        content: response.choices[0].message.content || '',
        nextStep: `Next ${nextSessionType} session: ${nextSessionTime}`
      };
    } catch (error) {
      console.error('Error getting completion guidance:', error);
      return this.getFallbackCompletion(context);
    }
  }

  // Get reminder/coaching during the session
  async getReminderGuidance(context: PlanningContext, reminderType: 'time' | 'focus' | 'energy'): Promise<GuidancePrompt> {
    const timeRemaining = context.timeAllocated - context.timeUsed;
    
    let reminderContext = '';
    switch (reminderType) {
      case 'time':
        reminderContext = `Time check: ${timeRemaining} minutes remaining. Help them stay on track.`;
        break;
      case 'focus':
        reminderContext = `They seem to be getting off track or overwhelmed. Help refocus.`;
        break;
      case 'energy':
        reminderContext = `Energy seems low. Provide encouragement and momentum.`;
        break;
    }

    const systemPrompt = `You are providing a quick reminder/coaching moment during a planning session.
    
    Context: ${reminderContext}
    Current section: ${context.currentStep}
    Session type: ${context.sessionType}
    
    Provide a brief, encouraging reminder that gets them back on track.`;

    try {
      const response = await openaiClient.chat.completions.create({
        model: 'gpt-4',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Need a ${reminderType} reminder right now.` }
        ],
        max_tokens: 150,
        temperature: 0.8
      });

      return {
        type: 'reminder',
        title: `${reminderType.charAt(0).toUpperCase() + reminderType.slice(1)} Check`,
        content: response.choices[0].message.content || ''
      };
    } catch (error) {
      console.error('Error getting reminder guidance:', error);
      return {
        type: 'reminder',
        title: 'Keep Going!',
        content: 'You\'re doing great. Stay focused on the current section and keep moving forward.'
      };
    }
  }

  // Session specifications based on your document
  private getSessionSpecifications(sessionType: PlanningSessionType) {
    const specs = {
      daily: {
        agenda: ['Review plan', 'Daily concerns', 'Quick updates'],
        sections: {
          review: {
            title: 'Daily Plan Review',
            purpose: 'Review today\'s plan and make any needed updates',
            activities: ['Check today\'s tasks', 'Adjust priorities', 'Note any blockers'],
            estimatedMinutes: 2
          },
          concerns: {
            title: 'Daily Concerns',
            purpose: 'Address urgent matters and quick conversations',
            activities: ['Urgent items', 'Quick decisions', 'Communication needs'],
            estimatedMinutes: 3
          }
        }
      },
      weekly: {
        agenda: ['Task review', 'Schedule review', 'Weekly planning', 'Meal planning', 'Financial check'],
        sections: {
          taskReview: {
            title: 'Task and Routine Delegation Review',
            purpose: 'Review last week\'s tasks and delegation effectiveness',
            activities: ['Mark completed tasks', 'Reschedule missed items', 'Review delegation'],
            estimatedMinutes: 15
          },
          scheduleReview: {
            title: 'Schedule Review (Big Rocks)',
            purpose: 'Review all events and social context for the coming week',
            activities: ['Review calendar events', 'Identify conflicts', 'Plan around big rocks'],
            estimatedMinutes: 10
          },
          weeklyPlanning: {
            title: 'Weekly To-Do List Creation',
            purpose: 'Build prioritized weekly task list from monthly/seasonal planning',
            activities: ['Pull from monthly tasks', 'Prioritize by importance', 'Schedule into calendar'],
            estimatedMinutes: 20
          },
          mealPlanning: {
            title: 'Meal Planning',
            purpose: 'Plan meals for the week',
            activities: ['Review schedule', 'Plan meals', 'Create shopping list'],
            estimatedMinutes: 10
          },
          financialCheck: {
            title: 'Weekly Cashflow Check',
            purpose: 'Quick review of weekly finances',
            activities: ['Check account balances', 'Review weekly spending', 'Note any concerns'],
            estimatedMinutes: 5
          }
        }
      },
      monthly: {
        agenda: ['Financial review', 'Project planning', 'Relationships', 'Routine review', 'Bigger picture'],
        sections: {
          financial: {
            title: 'Financial Review and Planning',
            purpose: 'Comprehensive monthly financial planning',
            activities: ['Update budget', 'Review expenditures', 'Plan big budget items'],
            estimatedMinutes: 30
          },
          projects: {
            title: 'Monthly Prioritization/Project Planning',
            purpose: 'Review and plan monthly projects and priorities',
            activities: ['Review project progress', 'Set monthly priorities', 'Update tools'],
            estimatedMinutes: 25
          },
          relationships: {
            title: 'Relationships and Parenting',
            purpose: 'Focus on relationship and parenting goals',
            activities: ['Review relationship goals', 'Plan parenting focus', 'Schedule couple time'],
            estimatedMinutes: 20
          },
          routines: {
            title: 'Routines and Delegation Review',
            purpose: 'Optimize routines and delegation systems',
            activities: ['Review current routines', 'Optimize delegation', 'Plan improvements'],
            estimatedMinutes: 15
          },
          biggerPicture: {
            title: 'Bigger Picture Concerns',
            purpose: 'Address less urgent but important topics',
            activities: ['Long-term planning', 'Strategic thinking', 'Future preparation'],
            estimatedMinutes: 10
          }
        }
      },
      seasonal: {
        agenda: ['Season review', 'Seasonal planning', 'Goals adjustment', 'Trip planning'],
        sections: {
          review: {
            title: 'Season in Review',
            purpose: 'Reflect on the past season',
            activities: ['Review accomplishments', 'Identify patterns', 'Celebrate wins'],
            estimatedMinutes: 45
          },
          planning: {
            title: 'Seasonal Planning',
            purpose: 'Plan for the upcoming season',
            activities: ['Set seasonal goals', 'Plan major activities', 'Schedule important events'],
            estimatedMinutes: 60
          }
        }
      },
      annual: {
        agenda: ['Year review', 'Annual planning', 'Long-term vision', 'Financial planning'],
        sections: {
          review: {
            title: 'Year in Review',
            purpose: 'Comprehensive review of the past year',
            activities: ['Review major accomplishments', 'Analyze patterns', 'Identify lessons learned'],
            estimatedMinutes: 90
          },
          planning: {
            title: 'Annual Planning',
            purpose: 'Plan for the upcoming year',
            activities: ['Set annual goals', 'Plan major milestones', 'Create yearly calendar'],
            estimatedMinutes: 120
          }
        }
      }
    };

    return specs[sessionType] || specs.daily;
  }

  private getSessionTitle(sessionType: PlanningSessionType): string {
    const titles = {
      daily: 'Daily Check-in (5 minutes)',
      weekly: 'Weekly Planning (60 minutes)',
      monthly: 'Monthly Planning (120 minutes)',
      seasonal: 'Seasonal Planning (Half day)',
      annual: 'Annual Planning (Full day)'
    };
    return titles[sessionType] || 'Planning Session';
  }

  private getNextSection(sessionType: PlanningSessionType, currentStep: string): string | undefined {
    const specs = this.getSessionSpecifications(sessionType);
    const sections = Object.keys(specs.sections);
    const currentIndex = sections.indexOf(currentStep);
    return currentIndex >= 0 && currentIndex < sections.length - 1 ? sections[currentIndex + 1] : undefined;
  }

  private getNextSessionType(sessionType: PlanningSessionType): string {
    const hierarchy = {
      daily: 'weekly',
      weekly: 'monthly', 
      monthly: 'seasonal',
      seasonal: 'annual',
      annual: 'annual'
    };
    return hierarchy[sessionType] || 'weekly';
  }

  private getNextSessionTime(sessionType: PlanningSessionType): string {
    const times = {
      daily: 'Tomorrow at 5-minute check-in',
      weekly: 'Next Sunday 7:15-8:15pm',
      monthly: 'First Sunday next month 7:15-9:15pm',
      seasonal: 'Next season (blocked time without kids)',
      annual: 'Next year (full day planning)'
    };
    return times[sessionType] || 'Next scheduled session';
  }

  private getFallbackIntro(context: PlanningContext): GuidancePrompt {
    return {
      type: 'intro',
      title: `${this.getSessionTitle(context.sessionType)}`,
      content: `Welcome to your ${context.sessionType} planning session! You have ${context.timeAllocated} minutes to work through your agenda. Let's make this time productive and focused.`,
      timeEstimate: `${context.timeAllocated} minutes`
    };
  }

  private getFallbackSectionGuidance(context: PlanningContext): GuidancePrompt {
    return {
      type: 'section',
      title: context.currentStep,
      content: `Focus on ${context.currentStep} for this section. Take your time to think through the key decisions and actions needed.`,
      timeEstimate: '10-15 minutes'
    };
  }

  private getFallbackCompletion(context: PlanningContext): GuidancePrompt {
    return {
      type: 'completion',
      title: 'Session Complete!',
      content: `Great work completing your ${context.sessionType} planning session! You've set yourself up for success. Remember to review your plans regularly and adjust as needed.`,
      nextStep: `Next ${this.getNextSessionType(context.sessionType)} session scheduled`
    };
  }
}

export const aiGuidanceService = new AIGuidanceService();