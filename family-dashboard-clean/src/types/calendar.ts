// Weekly calendar and scheduling types

export interface TimeSlot {
  time: string; // "08:30"
  duration: number; // minutes
}

export interface CalendarEvent {
  id: string;
  contextId: string;
  type: 'sop' | 'calendar-sync' | 'manual' | 'meal' | 'task';
  
  // Basic info
  title: string;
  description?: string;
  color: string; // hex color
  
  // Timing
  date: string; // YYYY-MM-DD
  startTime: string; // "08:30"
  endTime: string; // "09:15"
  duration: number; // minutes
  
  // Assignment and status
  assignedTo?: string; // member ID
  assignedBy?: string; // who assigned it
  status: 'scheduled' | 'in-progress' | 'completed' | 'cancelled' | 'skipped';
  
  // Type-specific data
  sopId?: string; // if type === 'sop'
  googleEventId?: string; // if type === 'calendar-sync'
  mealId?: string; // if type === 'meal'
  taskId?: string; // if type === 'task'
  
  // Drag and drop
  isDraggable: boolean;
  isResizable: boolean;
  
  // Metadata
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface WeeklySchedule {
  id: string;
  contextId: string;
  weekStartDate: string; // YYYY-MM-DD (Monday)
  weekEndDate: string; // YYYY-MM-DD (Sunday)
  
  // Events by day
  events: CalendarEvent[];
  
  // Settings
  workingHours: {
    start: string; // "05:00"
    end: string; // "22:00"
  };
  timeSlotDuration: 15 | 30 | 60; // minutes
  showWeekends: boolean;
  
  // Templates and patterns
  isTemplate: boolean;
  templateName?: string;
  recurringPatterns?: RecurringPattern[];
  
  createdAt: Date;
  updatedAt: Date;
  createdBy: string;
}

export interface RecurringPattern {
  id: string;
  name: string;
  sopId?: string;
  daysOfWeek: number[]; // 0-6, Sunday = 0
  timeOfDay: string; // "08:30"
  duration: number; // minutes
  assignedTo?: string;
  isActive: boolean;
}

export interface CalendarSettings {
  contextId: string;
  defaultView: 'week' | 'day';
  timeSlotDuration: 15 | 30 | 60;
  workingHours: {
    start: string;
    end: string;
  };
  showWeekends: boolean;
  autoScheduleSOPs: boolean;
  conflictResolution: 'ask' | 'auto-reassign' | 'overlay';
  notifications: {
    beforeStart: number; // minutes
    onCompletion: boolean;
    dailySummary: boolean;
  };
}

// For drag and drop operations
export interface DragOperation {
  eventId: string;
  sourceDate: string;
  sourceTime: string;
  targetDate: string;
  targetTime: string;
  isResize?: boolean;
  newDuration?: number;
}

export interface DropZone {
  date: string;
  time: string;
  isValid: boolean;
  conflicts: CalendarEvent[];
  suggestions?: string[];
}

// Calendar view helpers
export interface CalendarDay {
  date: string; // YYYY-MM-DD
  dayName: string; // Monday, Tuesday, etc.
  isToday: boolean;
  isWeekend: boolean;
  events: CalendarEvent[];
  timeSlots: TimeSlot[];
}

export interface CalendarWeek {
  weekStart: string; // YYYY-MM-DD
  weekEnd: string; // YYYY-MM-DD
  days: CalendarDay[];
  totalEvents: number;
  totalDuration: number; // minutes
}

// Integration with SOPs
export interface SOPSchedulingRequest {
  sopId: string;
  preferredDate?: string;
  preferredTime?: string;
  assignedTo?: string;
  isRecurring?: boolean;
  recurrencePattern?: {
    frequency: 'daily' | 'weekly';
    daysOfWeek?: number[];
    endDate?: string;
  };
}

export interface SchedulingConflict {
  targetSlot: {
    date: string;
    time: string;
  };
  conflictingEvents: CalendarEvent[];
  suggestions: {
    alternativeTime: string;
    alternativeDate: string;
    reassignTo?: string;
  }[];
}

// Calendar integration (Google Calendar, etc.)
export interface ExternalCalendarSync {
  contextId: string;
  provider: 'google' | 'outlook' | 'apple';
  accountEmail: string;
  calendarId: string;
  syncDirection: 'import' | 'export' | 'bidirectional';
  lastSyncAt?: Date;
  isActive: boolean;
  syncSettings: {
    includeSOPs: boolean;
    includePersonalEvents: boolean;
    conflictResolution: 'skip' | 'merge' | 'override';
  };
}