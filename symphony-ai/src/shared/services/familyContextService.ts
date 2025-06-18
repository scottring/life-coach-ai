import { calendarService } from './calendarService';
import { goalService } from './goalService';
import { sopService } from './sopService';
import { taskManager } from './taskManagerService';

export interface FamilyMember {
  id: string;
  name: string;
  email?: string;
  role: 'parent' | 'child' | 'other';
  preferences: {
    workingHours: { start: string; end: string };
    preferredDays: string[];
    energyPatterns: { morning: 'high' | 'medium' | 'low'; afternoon: 'high' | 'medium' | 'low'; evening: 'high' | 'medium' | 'low' };
    timezone?: string;
  };
  permissions: {
    canCreateTasks: boolean;
    canAssignTasks: boolean;
    canViewAll: boolean;
    canEditFamily: boolean;
  };
  calendars: {
    primary: string; // Calendar ID
    work?: string;
    personal?: string;
    shared?: string[];
  };
}

export interface FamilyContext {
  id: string;
  name: string;
  members: FamilyMember[];
  sharedCalendars: string[];
  sharedGoals: string[];
  sharedProjects: string[];
  familySOPs: string[];
  settings: {
    defaultAssignee?: string;
    planningMeetingDay: string; // Day of week for family planning
    planningMeetingTime: string;
    reminderSettings: {
      enabled: boolean;
      daysBefore: number;
      methods: ('email' | 'notification' | 'sms')[];
    };
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface MultiUserPlanningSession {
  id: string;
  familyContextId: string;
  participants: string[]; // Member IDs currently in the session
  sessionType: 'family_weekly' | 'family_monthly' | 'couple_planning' | 'individual_with_family';
  agendaItems: AgendaItem[];
  decisions: PlanningDecision[];
  conflictResolutions: ConflictResolution[];
  createdAt: Date;
  endedAt?: Date;
}

export interface AgendaItem {
  id: string;
  type: 'goal_review' | 'project_update' | 'schedule_coordination' | 'sop_assignment' | 'conflict_resolution';
  title: string;
  description?: string;
  assignedTo?: string[];
  status: 'pending' | 'in_progress' | 'completed' | 'deferred';
  timeAllocated: number; // minutes
  outcomes?: string[];
}

export interface PlanningDecision {
  id: string;
  type: 'task_assignment' | 'schedule_change' | 'goal_adjustment' | 'resource_allocation';
  description: string;
  affectedMembers: string[];
  decidedBy: string;
  implementBy?: Date;
  status: 'agreed' | 'disputed' | 'implemented' | 'cancelled';
  relatedItems: any[];
}

export interface ConflictResolution {
  id: string;
  type: 'schedule_conflict' | 'resource_conflict' | 'priority_conflict' | 'responsibility_conflict';
  description: string;
  involvedMembers: string[];
  resolution: string;
  resolvedBy: string;
  resolvedAt: Date;
  followUpRequired: boolean;
}

export interface FamilyCalendarView {
  memberId: string;
  memberName: string;
  events: CalendarEvent[];
  availability: AvailabilitySlot[];
  conflicts: ScheduleConflict[];
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  type: 'work' | 'personal' | 'family' | 'appointment' | 'task' | 'travel';
  calendar: string;
  attendees?: string[];
  privacy: 'public' | 'private' | 'family_only';
  canReschedule: boolean;
  priority: 'low' | 'medium' | 'high' | 'urgent';
}

export interface AvailabilitySlot {
  start: Date;
  end: Date;
  type: 'free' | 'busy' | 'tentative' | 'out_of_office';
  memberId: string;
}

export interface ScheduleConflict {
  id: string;
  type: 'double_booking' | 'family_commitment_clash' | 'work_overlap' | 'transportation_issue';
  description: string;
  affectedMembers: string[];
  conflictingEvents: string[];
  severity: 'low' | 'medium' | 'high' | 'critical';
  suggestedResolutions: string[];
  autoResolvable: boolean;
}

export interface FamilyPlanningMetrics {
  weeklyMeetingAttendance: number;
  goalsOnTrack: number;
  goalsAtRisk: number;
  tasksCompletedOnTime: number;
  averageWorkload: { [memberId: string]: number };
  conflictResolutionTime: number; // hours
  familySOPAdherence: number; // percentage
}

class FamilyContextService {
  private familyContexts: Map<string, FamilyContext> = new Map();
  private activeSessions: Map<string, MultiUserPlanningSession> = new Map();

  // Family Context Management
  async createFamilyContext(data: Omit<FamilyContext, 'id' | 'createdAt' | 'updatedAt'>): Promise<FamilyContext> {
    const familyContext: FamilyContext = {
      ...data,
      id: `family_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    this.familyContexts.set(familyContext.id, familyContext);
    return familyContext;
  }

  async addFamilyMember(familyContextId: string, member: Omit<FamilyMember, 'id'>): Promise<FamilyMember> {
    const familyContext = this.familyContexts.get(familyContextId);
    if (!familyContext) throw new Error('Family context not found');

    const newMember: FamilyMember = {
      ...member,
      id: `member_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`
    };

    familyContext.members.push(newMember);
    familyContext.updatedAt = new Date();

    return newMember;
  }

  async getFamilyContext(familyContextId: string): Promise<FamilyContext | null> {
    return this.familyContexts.get(familyContextId) || null;
  }

  // Multi-User Planning Sessions
  async startFamilyPlanningSession(
    familyContextId: string, 
    participants: string[], 
    sessionType: MultiUserPlanningSession['sessionType']
  ): Promise<MultiUserPlanningSession> {
    const familyContext = await this.getFamilyContext(familyContextId);
    if (!familyContext) throw new Error('Family context not found');

    // Validate participants are family members
    const validParticipants = participants.filter(pid => 
      familyContext.members.some(member => member.id === pid)
    );

    const session: MultiUserPlanningSession = {
      id: `session_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`,
      familyContextId,
      participants: validParticipants,
      sessionType,
      agendaItems: await this.generateSessionAgenda(sessionType, familyContext, validParticipants),
      decisions: [],
      conflictResolutions: [],
      createdAt: new Date()
    };

    this.activeSessions.set(session.id, session);
    return session;
  }

  private async generateSessionAgenda(
    sessionType: MultiUserPlanningSession['sessionType'],
    familyContext: FamilyContext,
    participants: string[]
  ): Promise<AgendaItem[]> {
    const agenda: AgendaItem[] = [];

    switch (sessionType) {
      case 'family_weekly':
        agenda.push(
          {
            id: 'agenda_1',
            type: 'goal_review',
            title: 'Review Family Goals Progress',
            description: 'Check progress on family goals and adjust as needed',
            timeAllocated: 10,
            status: 'pending'
          },
          {
            id: 'agenda_2',
            type: 'schedule_coordination',
            title: 'Coordinate Weekly Schedules',
            description: 'Review everyone\'s schedule and identify conflicts',
            timeAllocated: 15,
            status: 'pending'
          },
          {
            id: 'agenda_3',
            type: 'sop_assignment',
            title: 'Assign Weekly SOPs',
            description: 'Distribute family SOPs and household tasks',
            timeAllocated: 10,
            status: 'pending'
          },
          {
            id: 'agenda_4',
            type: 'project_update',
            title: 'Family Project Updates',
            description: 'Update on family projects and plan next steps',
            timeAllocated: 10,
            status: 'pending'
          }
        );
        break;

      case 'family_monthly':
        agenda.push(
          {
            id: 'agenda_1',
            type: 'goal_review',
            title: 'Monthly Goal Assessment',
            description: 'Deep dive on family goal progress and planning',
            timeAllocated: 20,
            status: 'pending'
          },
          {
            id: 'agenda_2',
            type: 'project_update',
            title: 'Project Portfolio Review',
            description: 'Review all family projects and resource allocation',
            timeAllocated: 25,
            status: 'pending'
          },
          {
            id: 'agenda_3',
            type: 'schedule_coordination',
            title: 'Month Ahead Planning',
            description: 'Plan major events and coordinate schedules',
            timeAllocated: 15,
            status: 'pending'
          }
        );
        break;

      case 'couple_planning':
        agenda.push(
          {
            id: 'agenda_1',
            type: 'schedule_coordination',
            title: 'Couple Schedule Sync',
            description: 'Coordinate couple schedules and plan date nights',
            timeAllocated: 15,
            status: 'pending'
          },
          {
            id: 'agenda_2',
            type: 'goal_review',
            title: 'Relationship Goals Check-in',
            description: 'Review couple goals and relationship priorities',
            timeAllocated: 20,
            status: 'pending'
          }
        );
        break;
    }

    return agenda;
  }

  // Calendar Integration
  async getFamilyCalendarView(familyContextId: string, startDate: Date, endDate: Date): Promise<FamilyCalendarView[]> {
    const familyContext = await this.getFamilyContext(familyContextId);
    if (!familyContext) throw new Error('Family context not found');

    const familyViews: FamilyCalendarView[] = [];

    for (const member of familyContext.members) {
      const events = await this.getMemberEvents(member, startDate, endDate);
      const availability = await this.getMemberAvailability(member, startDate, endDate);
      const conflicts = await this.detectMemberConflicts(member, events);

      familyViews.push({
        memberId: member.id,
        memberName: member.name,
        events,
        availability,
        conflicts
      });
    }

    return familyViews;
  }

  private async getMemberEvents(member: FamilyMember, startDate: Date, endDate: Date): Promise<CalendarEvent[]> {
    // This would integrate with actual calendar services
    // For now, return mock data
    return [];
  }

  private async getMemberAvailability(member: FamilyMember, startDate: Date, endDate: Date): Promise<AvailabilitySlot[]> {
    // Generate availability based on member preferences and existing events
    const slots: AvailabilitySlot[] = [];
    
    // This would analyze the member's calendar and generate free/busy slots
    // For now, return basic working hours
    const workStart = member.preferences.workingHours.start;
    const workEnd = member.preferences.workingHours.end;
    
    for (let date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + 1)) {
      const [startHour, startMin] = workStart.split(':').map(Number);
      const [endHour, endMin] = workEnd.split(':').map(Number);
      
      const slotStart = new Date(date);
      slotStart.setHours(startHour, startMin, 0, 0);
      
      const slotEnd = new Date(date);
      slotEnd.setHours(endHour, endMin, 0, 0);
      
      slots.push({
        start: slotStart,
        end: slotEnd,
        type: 'free',
        memberId: member.id
      });
    }
    
    return slots;
  }

  private async detectMemberConflicts(member: FamilyMember, events: CalendarEvent[]): Promise<ScheduleConflict[]> {
    const conflicts: ScheduleConflict[] = [];
    
    // Detect overlapping events
    for (let i = 0; i < events.length; i++) {
      for (let j = i + 1; j < events.length; j++) {
        const event1 = events[i];
        const event2 = events[j];
        
        if (this.eventsOverlap(event1, event2)) {
          conflicts.push({
            id: `conflict_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
            type: 'double_booking',
            description: `Double booking: ${event1.title} and ${event2.title}`,
            affectedMembers: [member.id],
            conflictingEvents: [event1.id, event2.id],
            severity: 'high',
            suggestedResolutions: [
              'Reschedule one of the events',
              'Delegate one of the commitments',
              'Combine events if possible'
            ],
            autoResolvable: false
          });
        }
      }
    }
    
    return conflicts;
  }

  private eventsOverlap(event1: CalendarEvent, event2: CalendarEvent): boolean {
    return event1.start < event2.end && event2.start < event1.end;
  }

  // Conflict Resolution
  async proposeConflictResolution(
    sessionId: string,
    conflictId: string,
    proposedResolution: string,
    proposedBy: string
  ): Promise<ConflictResolution> {
    const session = this.activeSessions.get(sessionId);
    if (!session) throw new Error('Session not found');

    const resolution: ConflictResolution = {
      id: `resolution_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
      type: 'schedule_conflict',
      description: `Conflict resolution proposed`,
      involvedMembers: session.participants,
      resolution: proposedResolution,
      resolvedBy: proposedBy,
      resolvedAt: new Date(),
      followUpRequired: true
    };

    session.conflictResolutions.push(resolution);
    return resolution;
  }

  // Task Assignment and Coordination
  async assignTaskToMember(
    familyContextId: string,
    taskId: string,
    assigneeId: string,
    assignedBy: string,
    dueDate?: Date
  ): Promise<void> {
    const familyContext = await this.getFamilyContext(familyContextId);
    if (!familyContext) throw new Error('Family context not found');

    const assignee = familyContext.members.find(m => m.id === assigneeId);
    if (!assignee) throw new Error('Assignee not found');

    // Update task in task manager
    await taskManager.updateTask(taskId, {
      assignedTo: assignee.name,
      scheduledDate: dueDate
    });

    // Could add notification logic here
    console.log(`Task ${taskId} assigned to ${assignee.name} by ${assignedBy}`);
  }

  async balanceWorkload(familyContextId: string, timeframe: 'week' | 'month'): Promise<{ [memberId: string]: number }> {
    const familyContext = await this.getFamilyContext(familyContextId);
    if (!familyContext) throw new Error('Family context not found');

    const workloadDistribution: { [memberId: string]: number } = {};

    for (const member of familyContext.members) {
      // Calculate member's current workload
      const tasks = taskManager.getAllTasks(familyContextId)
        .filter(task => task.assignedTo === member.name && task.status !== 'completed');
      
      const totalHours = tasks.reduce((sum, task) => sum + (task.duration || 30), 0) / 60;
      workloadDistribution[member.id] = totalHours;
    }

    return workloadDistribution;
  }

  // Family Metrics and Insights
  async getFamilyPlanningMetrics(familyContextId: string): Promise<FamilyPlanningMetrics> {
    const familyContext = await this.getFamilyContext(familyContextId);
    if (!familyContext) throw new Error('Family context not found');

    const workloadDistribution = await this.balanceWorkload(familyContextId, 'week');
    
    // Calculate metrics (would be more sophisticated in real implementation)
    const metrics: FamilyPlanningMetrics = {
      weeklyMeetingAttendance: 85, // percentage
      goalsOnTrack: 3,
      goalsAtRisk: 1,
      tasksCompletedOnTime: 78, // percentage
      averageWorkload: workloadDistribution,
      conflictResolutionTime: 2.5, // hours
      familySOPAdherence: 92 // percentage
    };

    return metrics;
  }

  // AI Integration helpers
  async generateFamilyPlanningInsights(familyContextId: string): Promise<string[]> {
    const metrics = await this.getFamilyPlanningMetrics(familyContextId);
    const insights: string[] = [];

    if (metrics.goalsAtRisk > 0) {
      insights.push(`⚠️ ${metrics.goalsAtRisk} family goal(s) are at risk. Consider reassigning resources.`);
    }

    if (metrics.tasksCompletedOnTime < 80) {
      insights.push(`📈 Task completion rate is ${metrics.tasksCompletedOnTime}%. Consider reducing weekly commitments.`);
    }

    if (Object.values(metrics.averageWorkload).some(workload => workload > 20)) {
      insights.push(`⚖️ Workload appears unbalanced. Consider redistributing tasks among family members.`);
    }

    if (metrics.familySOPAdherence > 95) {
      insights.push(`🎉 Excellent SOP adherence! Your family routines are working well.`);
    }

    return insights;
  }

  // Utility methods
  getSession(sessionId: string): MultiUserPlanningSession | undefined {
    return this.activeSessions.get(sessionId);
  }

  async endSession(sessionId: string): Promise<void> {
    const session = this.activeSessions.get(sessionId);
    if (session) {
      session.endedAt = new Date();
      // Could save session history here
    }
    this.activeSessions.delete(sessionId);
  }

  getFamilyMembers(familyContextId: string): FamilyMember[] {
    const familyContext = this.familyContexts.get(familyContextId);
    return familyContext?.members || [];
  }
}

export const familyContextService = new FamilyContextService();