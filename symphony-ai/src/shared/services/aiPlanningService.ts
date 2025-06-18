import { goalService } from './goalService';
import { sopService } from './sopService';
import { taskManager } from './taskManagerService';
import { calendarService } from './calendarService';
import { familyContextService, FamilyMember, FamilyContext } from './familyContextService';

export interface PlanningContext {
  participants: string[]; // User IDs in the planning session
  scope: 'family' | 'individual' | 'work';
  timeframe: 'daily' | 'weekly' | 'monthly';
  contextId: string;
  sessionId: string;
  familyContextId?: string; // For multi-user family planning
  preferences: {
    workingHours: { start: string; end: string };
    preferredDays: string[];
    energyPatterns: { morning: 'high' | 'medium' | 'low'; afternoon: 'high' | 'medium' | 'low'; evening: 'high' | 'medium' | 'low' };
  };
}

export interface PlanningSession {
  id: string;
  context: PlanningContext;
  mode: 'manual' | 'guided';
  currentStep: string;
  conversation: ConversationMessage[];
  suggestions: AISuggestion[];
  decisions: PlanningDecision[];
  createdAt: Date;
  updatedAt: Date;
}

export interface ConversationMessage {
  id: string;
  speaker: 'ai' | 'user';
  content: string;
  type: 'text' | 'suggestion' | 'question' | 'confirmation';
  timestamp: Date;
  metadata?: {
    suggestedItems?: any[];
    actions?: string[];
    context?: string;
  };
}

export interface AISuggestion {
  id: string;
  type: 'schedule' | 'reassign' | 'skip' | 'combine' | 'split';
  confidence: number;
  reasoning: string;
  item: any; // SOP, Goal, Project, Task
  suggestedTime?: { date: string; time: string };
  suggestedAssignee?: string;
  alternatives?: AISuggestion[];
}

export interface PlanningDecision {
  id: string;
  suggestionId?: string;
  action: 'accepted' | 'rejected' | 'modified';
  originalItem: any;
  finalItem: any;
  reasoning?: string;
  timestamp: Date;
}

export interface ContextualItems {
  relevantSOPs: any[];
  activeGoals: any[];
  currentProjects: any[];
  urgentTasks: any[];
  availableTimeSlots: TimeSlot[];
  conflicts: Conflict[];
}

export interface TimeSlot {
  date: string;
  startTime: string;
  endTime: string;
  duration: number;
  availability: 'free' | 'busy' | 'tentative';
  participants: string[];
  energyLevel: 'high' | 'medium' | 'low';
}

export interface Conflict {
  type: 'schedule' | 'resource' | 'dependency' | 'workload';
  severity: 'low' | 'medium' | 'high';
  description: string;
  affectedItems: any[];
  suggestions: string[];
}

class AIPlanningService {
  private sessions: Map<string, PlanningSession> = new Map();
  private contextCache: Map<string, ContextualItems> = new Map();

  // Start a new planning session
  async startPlanningSession(context: PlanningContext): Promise<PlanningSession> {
    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
    
    const session: PlanningSession = {
      id: sessionId,
      context,
      mode: 'guided', // Start in guided mode by default
      currentStep: 'welcome',
      conversation: [],
      suggestions: [],
      decisions: [],
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.sessions.set(sessionId, session);

    // If this is a family planning session, also start a family session
    if (context.scope === 'family' && context.familyContextId && context.participants.length > 1) {
      try {
        await familyContextService.startFamilyPlanningSession(
          context.familyContextId,
          context.participants,
          context.timeframe === 'weekly' ? 'family_weekly' : 
          context.timeframe === 'monthly' ? 'family_monthly' : 'couple_planning'
        );
      } catch (error) {
        console.error('Error starting family planning session:', error);
      }
    }

    // Start the conversation
    await this.addAIMessage(sessionId, await this.generateWelcomeMessage(context));
    
    return session;
  }

  // Switch between manual and guided modes
  async switchMode(sessionId: string, mode: 'manual' | 'guided'): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    session.mode = mode;
    session.updatedAt = new Date();

    if (mode === 'guided') {
      await this.addAIMessage(sessionId, "I'm back to help guide your planning. What would you like to work on?");
    } else {
      await this.addAIMessage(sessionId, "You're now in manual mode. I'll provide suggestions as you work. Type 'help' anytime for guidance.");
    }
  }

  // Get contextually relevant items
  async getContextualItems(context: PlanningContext): Promise<ContextualItems> {
    const cacheKey = `${context.contextId}_${context.scope}_${context.timeframe}`;
    
    if (this.contextCache.has(cacheKey)) {
      return this.contextCache.get(cacheKey)!;
    }

    // Load all relevant data based on context
    const [sops, goals, projects, unscheduledTasks] = await Promise.all([
      sopService.getSOPsForContext(context.contextId),
      goalService.getGoalsByContext(context.contextId),
      goalService.getProjectsByContext(context.contextId),
      taskManager.getUnscheduledTasks(context.contextId)
    ]);

    // Apply intelligent filtering based on context
    const contextualItems: ContextualItems = {
      relevantSOPs: this.filterRelevantSOPs(sops, context),
      activeGoals: this.filterActiveGoals(goals, context),
      currentProjects: this.filterCurrentProjects(projects, context),
      urgentTasks: this.filterUrgentTasks(unscheduledTasks, context),
      availableTimeSlots: await this.generateAvailableTimeSlots(context),
      conflicts: await this.detectConflicts(context)
    };

    // Cache for 5 minutes
    this.contextCache.set(cacheKey, contextualItems);
    setTimeout(() => this.contextCache.delete(cacheKey), 5 * 60 * 1000);

    return contextualItems;
  }

  // Search across all items
  async searchItems(sessionId: string, query: string): Promise<any[]> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const [allSOPs, allGoals, allProjects, allTasks] = await Promise.all([
      sopService.getSOPsForContext(session.context.contextId),
      goalService.getGoalsByContext(session.context.contextId),
      goalService.getProjectsByContext(session.context.contextId),
      taskManager.getAllTasks(session.context.contextId)
    ]);

    const searchResults: any[] = [];
    const queryLower = query.toLowerCase();

    // Search SOPs
    allSOPs.forEach(sop => {
      if (sop.name.toLowerCase().includes(queryLower) || 
          sop.description?.toLowerCase().includes(queryLower) ||
          sop.tags?.some((tag: string) => tag.toLowerCase().includes(queryLower))) {
        searchResults.push({ ...sop, searchType: 'sop', searchSource: 'SOP' });
      }
      
      // Search SOP steps
      sop.steps?.forEach((step: any) => {
        if (step.title.toLowerCase().includes(queryLower) ||
            step.description?.toLowerCase().includes(queryLower)) {
          searchResults.push({ 
            ...step, 
            searchType: 'sopStep', 
            searchSource: `SOP: ${sop.name}`,
            parentSOP: sop
          });
        }
      });
    });

    // Search Goals
    allGoals.forEach(goal => {
      if (goal.title.toLowerCase().includes(queryLower) ||
          goal.description?.toLowerCase().includes(queryLower) ||
          goal.tags?.some((tag: string) => tag.toLowerCase().includes(queryLower))) {
        searchResults.push({ ...goal, searchType: 'goal', searchSource: 'Goal' });
      }

      // Search goal tasks
      goal.tasks?.forEach((task: any) => {
        if (task.title.toLowerCase().includes(queryLower) ||
            task.description?.toLowerCase().includes(queryLower)) {
          searchResults.push({
            ...task,
            searchType: 'goalTask',
            searchSource: `Goal: ${goal.title}`,
            parentGoal: goal
          });
        }
      });
    });

    // Search Projects
    allProjects.forEach(project => {
      if (project.title.toLowerCase().includes(queryLower) ||
          project.description?.toLowerCase().includes(queryLower) ||
          project.tags?.some((tag: string) => tag.toLowerCase().includes(queryLower))) {
        searchResults.push({ ...project, searchType: 'project', searchSource: 'Project' });
      }

      // Search project tasks
      project.tasks?.forEach((task: any) => {
        if (task.title.toLowerCase().includes(queryLower) ||
            task.description?.toLowerCase().includes(queryLower)) {
          searchResults.push({
            ...task,
            searchType: 'projectTask',
            searchSource: `Project: ${project.title}`,
            parentProject: project
          });
        }
      });
    });

    // Search standalone tasks
    allTasks.forEach(task => {
      if (task.title.toLowerCase().includes(queryLower) ||
          task.notes?.toLowerCase().includes(queryLower) ||
          task.tags?.some((tag: string) => tag.toLowerCase().includes(queryLower))) {
        searchResults.push({ ...task, searchType: 'task', searchSource: 'Task' });
      }
    });

    // Sort by relevance (exact matches first, then partial matches)
    return searchResults.sort((a, b) => {
      const aExact = a.title?.toLowerCase() === queryLower || a.name?.toLowerCase() === queryLower;
      const bExact = b.title?.toLowerCase() === queryLower || b.name?.toLowerCase() === queryLower;
      
      if (aExact && !bExact) return -1;
      if (!aExact && bExact) return 1;
      
      return (a.title || a.name || '').localeCompare(b.title || b.name || '');
    });
  }

  // Process user message and generate AI response
  async processUserMessage(sessionId: string, message: string): Promise<ConversationMessage> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    // Add user message to conversation
    await this.addUserMessage(sessionId, message);

    // Generate AI response based on current step and context
    const aiResponse = await this.generateAIResponse(session, message);
    await this.addAIMessage(sessionId, aiResponse.content, aiResponse.type, aiResponse.metadata);

    return session.conversation[session.conversation.length - 1];
  }

  // Generate AI suggestions for items
  async generateSuggestions(sessionId: string, items: any[]): Promise<AISuggestion[]> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const contextualItems = await this.getContextualItems(session.context);
    const suggestions: AISuggestion[] = [];

    for (const item of items) {
      const suggestion = await this.analyzeItem(item, contextualItems, session.context);
      if (suggestion) {
        suggestions.push(suggestion);
      }
    }

    session.suggestions.push(...suggestions);
    return suggestions;
  }

  // Apply a suggestion
  async applySuggestion(sessionId: string, suggestionId: string, decision: 'accepted' | 'rejected' | 'modified', modifications?: any): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const suggestion = session.suggestions.find(s => s.id === suggestionId);
    if (!suggestion) throw new Error('Suggestion not found');

    const planningDecision: PlanningDecision = {
      id: `decision_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      suggestionId,
      action: decision,
      originalItem: suggestion.item,
      finalItem: modifications || suggestion.item,
      reasoning: `User ${decision} AI suggestion: ${suggestion.reasoning}`,
      timestamp: new Date()
    };

    session.decisions.push(planningDecision);

    if (decision === 'accepted' || decision === 'modified') {
      await this.executeScheduling(planningDecision.finalItem, suggestion.suggestedTime, suggestion.suggestedAssignee);
    }

    // Generate follow-up message
    const followUpMessage = await this.generateFollowUpMessage(suggestion, decision, modifications);
    await this.addAIMessage(sessionId, followUpMessage);
  }

  // Private helper methods
  private filterRelevantSOPs(sops: any[], context: PlanningContext): any[] {
    return sops.filter(sop => {
      // Filter based on frequency and context
      const frequency = sop.frequency || 'as_needed';
      const today = new Date();
      const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.

      switch (context.timeframe) {
        case 'daily':
          return frequency === 'daily' || 
                 (frequency === 'weekly' && sop.preferredDays?.includes(dayOfWeek)) ||
                 (frequency === 'as_needed' && sop.lastCompleted && 
                  this.daysSince(sop.lastCompleted) > (sop.reminderDays || 7));
        
        case 'weekly':
          return frequency === 'weekly' || frequency === 'daily' || 
                 (frequency === 'monthly' && this.isFirstWeekOfMonth()) ||
                 frequency === 'as_needed';
        
        case 'monthly':
          return frequency === 'monthly' || frequency === 'weekly' || frequency === 'as_needed';
        
        default:
          return true;
      }
    });
  }

  private filterActiveGoals(goals: any[], context: PlanningContext): any[] {
    return goals.filter(goal => {
      return goal.status === 'in_progress' || goal.status === 'not_started';
    }).sort((a, b) => {
      // Sort by priority and deadline proximity
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4;
      
      if (aPriority !== bPriority) return aPriority - bPriority;
      
      // Then by target date
      if (a.targetDate && b.targetDate) {
        return new Date(a.targetDate).getTime() - new Date(b.targetDate).getTime();
      }
      
      return 0;
    });
  }

  private filterCurrentProjects(projects: any[], context: PlanningContext): any[] {
    return projects.filter(project => {
      return project.status === 'active' || project.status === 'planning';
    }).sort((a, b) => {
      // Sort by priority and deadline
      const priorityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4;
      
      if (aPriority !== bPriority) return aPriority - bPriority;
      
      if (a.targetEndDate && b.targetEndDate) {
        return new Date(a.targetEndDate).getTime() - new Date(b.targetEndDate).getTime();
      }
      
      return 0;
    });
  }

  private filterUrgentTasks(tasks: any[], context: PlanningContext): any[] {
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    return tasks.filter(task => {
      // Include tasks that are overdue, due today, or high priority
      if (task.dueDate) {
        const dueDate = new Date(task.dueDate);
        if (dueDate <= tomorrow) return true;
      }
      
      return task.priority === 'urgent' || task.priority === 'high';
    }).sort((a, b) => {
      // Sort by due date and priority
      if (a.dueDate && b.dueDate) {
        const dueDiff = new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime();
        if (dueDiff !== 0) return dueDiff;
      }
      
      const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] ?? 4;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] ?? 4;
      
      return aPriority - bPriority;
    });
  }

  private async generateAvailableTimeSlots(context: PlanningContext): Promise<TimeSlot[]> {
    // This would integrate with calendar service to find actual free time
    // For now, return mock data structure
    const slots: TimeSlot[] = [];
    const startDate = new Date();
    
    for (let day = 0; day < (context.timeframe === 'weekly' ? 7 : 1); day++) {
      const date = new Date(startDate);
      date.setDate(date.getDate() + day);
      
      // Generate typical work hours slots
      const workStart = context.preferences.workingHours.start;
      const workEnd = context.preferences.workingHours.end;
      
      // This would be replaced with actual calendar integration
      slots.push({
        date: date.toISOString().split('T')[0],
        startTime: workStart,
        endTime: workEnd,
        duration: this.calculateDuration(workStart, workEnd),
        availability: 'free',
        participants: context.participants,
        energyLevel: this.getEnergyLevel(workStart, context.preferences.energyPatterns)
      });
    }
    
    return slots;
  }

  private async detectConflicts(context: PlanningContext): Promise<Conflict[]> {
    // This would analyze scheduled items and detect conflicts
    // For now, return empty array
    return [];
  }

  private async generateWelcomeMessage(context: PlanningContext): Promise<string> {
    let participantNames = 'you';
    let familyContext: FamilyContext | null = null;
    
    // Get family context and member names if this is a family session
    if (context.scope === 'family' && context.familyContextId) {
      familyContext = await familyContextService.getFamilyContext(context.familyContextId);
      if (familyContext && context.participants.length > 1) {
        const memberNames = familyContext.members
          .filter(member => context.participants.includes(member.id))
          .map(member => member.name);
        
        if (memberNames.length === 2) {
          participantNames = memberNames.join(' and ');
        } else if (memberNames.length > 2) {
          participantNames = memberNames.slice(0, -1).join(', ') + ', and ' + memberNames.slice(-1);
        }
      }
    }
    
    const timeframeText = context.timeframe === 'weekly' ? 'week' : 
                         context.timeframe === 'monthly' ? 'month' : 'day';
    
    let welcomeMessage = `Hello! I'm your AI planning assistant. I'm here to help ${participantNames} plan your ${timeframeText} effectively.`;
    
    if (context.scope === 'family' && familyContext) {
      welcomeMessage += `\n\nI can see your family context "${familyContext.name}" and will consider:
• Family goals and projects
• Everyone's schedules and availability
• Shared SOPs and household routines
• Individual preferences and workload balance`;
      
      // Add family insights if available
      try {
        const insights = await familyContextService.generateFamilyPlanningInsights(context.familyContextId!);
        if (insights.length > 0) {
          welcomeMessage += `\n\n📊 **Family Insights:**\n${insights.slice(0, 2).join('\n')}`;
        }
      } catch (error) {
        console.log('Could not load family insights:', error);
      }
    } else {
      welcomeMessage += `\n\nI can see your ${context.scope} context and will consider your goals, projects, SOPs, and calendar commitments.`;
    }
    
    welcomeMessage += `\n\nLet's start by reviewing what you have coming up. Would you like me to:
1. Walk you through a structured planning session
2. Show you what needs attention first
3. Let you explore manually with my assistance

What sounds most helpful right now?`;

    return welcomeMessage;
  }

  private async generateAIResponse(session: PlanningSession, userMessage: string): Promise<{content: string, type: 'text' | 'suggestion' | 'question' | 'confirmation', metadata?: any}> {
    const messageLower = userMessage.toLowerCase();
    
    // Handle common commands
    if (messageLower.includes('help')) {
      return {
        content: `I can help you with:
• **Guided planning** - I'll walk you through step by step
• **Smart suggestions** - I'll recommend optimal scheduling
• **Search anything** - Just type what you're looking for
• **Manual mode** - You plan, I'll assist
• **Context switching** - Change between family/work/personal views

What would you like to do?`,
        type: 'text'
      };
    }
    
    if (messageLower.includes('search') || messageLower.includes('find')) {
      return {
        content: "I can search across all your goals, projects, SOPs, and tasks. What are you looking for?",
        type: 'question'
      };
    }
    
    if (messageLower.includes('guided') || messageLower === '1') {
      session.currentStep = 'guided_start';
      return await this.startGuidedSession(session);
    }
    
    if (messageLower.includes('manual') || messageLower === '3') {
      session.mode = 'manual';
      return {
        content: "Perfect! You're now in manual mode. I can see your contextually relevant items in the sidebar. I'll provide suggestions as you work. Try dragging items to your calendar or use the search to find anything specific.",
        type: 'text'
      };
    }
    
    if (messageLower.includes('attention') || messageLower === '2') {
      return await this.analyzeUrgentItems(session);
    }
    
    // Default response
    return {
      content: "I'm not sure I understood that. You can ask me to help with planning, search for items, or start a guided session. What would you like to do?",
      type: 'text'
    };
  }

  private async startGuidedSession(session: PlanningSession): Promise<{content: string, type: 'text' | 'suggestion' | 'question' | 'confirmation', metadata?: any}> {
    const contextualItems = await this.getContextualItems(session.context);
    
    const summary = `Great! Let's plan your ${session.context.timeframe} together. Here's what I found:

📋 **${contextualItems.relevantSOPs.length} relevant SOPs** - your standard routines for this timeframe
🎯 **${contextualItems.activeGoals.length} active goals** - things you're working toward
📁 **${contextualItems.currentProjects.length} current projects** - active work that needs scheduling
⚡ **${contextualItems.urgentTasks.length} urgent tasks** - items that need immediate attention

Should we start by scheduling your regular SOPs, or would you prefer to tackle the urgent items first?`;

    return {
      content: summary,
      type: 'question',
      metadata: {
        suggestedItems: [
          ...contextualItems.relevantSOPs.slice(0, 3),
          ...contextualItems.urgentTasks.slice(0, 3)
        ],
        actions: ['schedule_sops', 'handle_urgent', 'review_goals']
      }
    };
  }

  private async analyzeUrgentItems(session: PlanningSession): Promise<{content: string, type: 'text' | 'suggestion' | 'question' | 'confirmation', metadata?: any}> {
    const contextualItems = await this.getContextualItems(session.context);
    
    if (contextualItems.urgentTasks.length === 0) {
      return {
        content: "Good news! You don't have any urgent items that need immediate attention. Your schedule looks manageable. Would you like to work on your goals or regular SOPs?",
        type: 'text'
      };
    }
    
    const urgentList = contextualItems.urgentTasks.slice(0, 5).map((task, index) => {
      const dueText = task.dueDate ? ` (due ${new Date(task.dueDate).toLocaleDateString()})` : '';
      return `${index + 1}. **${task.title}**${dueText} - ${task.priority} priority`;
    }).join('\n');
    
    return {
      content: `Here are the items that need your attention:\n\n${urgentList}\n\nShould I help you schedule these first, or would you like to review them one by one?`,
      type: 'suggestion',
      metadata: {
        suggestedItems: contextualItems.urgentTasks.slice(0, 5),
        actions: ['schedule_all', 'review_individually', 'skip_for_now']
      }
    };
  }

  private async analyzeItem(item: any, contextualItems: ContextualItems, context: PlanningContext): Promise<AISuggestion | null> {
    // Analyze item and generate scheduling suggestion
    const suggestion: AISuggestion = {
      id: `suggestion_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type: 'schedule',
      confidence: 0.8,
      reasoning: `This ${item.type || 'item'} fits well in your ${context.timeframe} schedule`,
      item,
      suggestedTime: await this.findOptimalTimeSlot(item, contextualItems),
      suggestedAssignee: this.findOptimalAssignee(item, context),
      alternatives: []
    };
    
    return suggestion;
  }

  private async findOptimalTimeSlot(item: any, contextualItems: ContextualItems): Promise<{date: string, time: string} | undefined> {
    // Simple algorithm - find first available slot that matches duration
    const duration = item.duration || item.estimatedDuration || 30;
    
    for (const slot of contextualItems.availableTimeSlots) {
      if (slot.duration >= duration && slot.availability === 'free') {
        return {
          date: slot.date,
          time: slot.startTime
        };
      }
    }
    
    return undefined;
  }

  private findOptimalAssignee(item: any, context: PlanningContext): string | undefined {
    // Simple logic - if it's already assigned, keep it; otherwise assign to first participant
    return item.assignedTo || context.participants[0];
  }

  private async executeScheduling(item: any, suggestedTime?: {date: string, time: string}, assignee?: string): Promise<void> {
    // Create task in task manager
    if (suggestedTime) {
      const taskData = {
        id: item.id || `scheduled_${Math.random().toString(36).substr(2, 8)}`,
        title: item.title || item.name,
        description: item.description,
        type: item.type || 'task',
        status: 'pending' as const,
        priority: item.priority || 'medium',
        contextId: item.contextId,
        context: item.contextId as any,
        duration: item.duration || item.estimatedDuration || 30,
        assignedTo: assignee,
        createdBy: 'ai_assistant',
        source: 'import' as const,
        scheduledDate: new Date(suggestedTime.date),
        scheduledTime: suggestedTime.time
      };

      await taskManager.createTask(taskData);
    }
  }

  private async generateFollowUpMessage(suggestion: AISuggestion, decision: string, modifications?: any): Promise<string> {
    switch (decision) {
      case 'accepted':
        return `Great! I've scheduled "${suggestion.item.title}" for ${suggestion.suggestedTime?.date} at ${suggestion.suggestedTime?.time}. What's next?`;
      
      case 'rejected':
        return `No problem! I'll skip "${suggestion.item.title}" for now. Would you like me to suggest a different time or move on to the next item?`;
      
      case 'modified':
        return `Perfect! I've updated "${suggestion.item.title}" with your changes. The scheduling looks good. Anything else you'd like to adjust?`;
      
      default:
        return "What would you like to do next?";
    }
  }

  private async addUserMessage(sessionId: string, content: string): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const message: ConversationMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      speaker: 'user',
      content,
      type: 'text',
      timestamp: new Date()
    };

    session.conversation.push(message);
    session.updatedAt = new Date();
  }

  private async addAIMessage(sessionId: string, content: string, type: 'text' | 'suggestion' | 'question' | 'confirmation' = 'text', metadata?: any): Promise<void> {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const message: ConversationMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      speaker: 'ai',
      content,
      type,
      timestamp: new Date(),
      metadata
    };

    session.conversation.push(message);
    session.updatedAt = new Date();
  }

  private daysSince(date: string): number {
    const now = new Date();
    const past = new Date(date);
    return Math.floor((now.getTime() - past.getTime()) / (1000 * 60 * 60 * 24));
  }

  private isFirstWeekOfMonth(): boolean {
    const now = new Date();
    return now.getDate() <= 7;
  }

  private calculateDuration(startTime: string, endTime: string): number {
    const [startHour, startMin] = startTime.split(':').map(Number);
    const [endHour, endMin] = endTime.split(':').map(Number);
    return (endHour * 60 + endMin) - (startHour * 60 + startMin);
  }

  private getEnergyLevel(time: string, patterns: any): 'high' | 'medium' | 'low' {
    const hour = parseInt(time.split(':')[0]);
    
    if (hour >= 6 && hour < 12) return patterns.morning || 'medium';
    if (hour >= 12 && hour < 18) return patterns.afternoon || 'medium';
    return patterns.evening || 'low';
  }

  // Public methods for getting session data
  getSession(sessionId: string): PlanningSession | undefined {
    return this.sessions.get(sessionId);
  }

  getAllSessions(): PlanningSession[] {
    return Array.from(this.sessions.values());
  }

  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }
}

export const aiPlanningService = new AIPlanningService();