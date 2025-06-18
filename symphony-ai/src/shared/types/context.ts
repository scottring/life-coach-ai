// Multi-context system types for work/personal/family contexts

export type ContextType = 'family' | 'work' | 'personal' | 'custom';
export type MemberRole = 'admin' | 'member' | 'viewer';

export interface Context {
  id: string;
  name: string;
  type: ContextType;
  description?: string;
  ownerId: string; // User who created this context
  createdAt: Date;
  updatedAt: Date;
  settings: ContextSettings;
}

export interface ContextSettings {
  timezone: string;
  workingHours: {
    start: string; // "05:00" 
    end: string;   // "22:00"
  };
  weekStartsOn: 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = Sunday, 1 = Monday
  defaultCalendarView: '15min' | '30min' | '1hour';
  colorScheme: string; // hex color for this context
  enableSOPs: boolean;
  enableMealPlanning: boolean;
  enableTaskTracking: boolean;
}

export interface ContextMember {
  id: string;
  contextId: string;
  userId: string;
  displayName: string;
  email?: string;
  role: MemberRole;
  joinedAt: Date;
  lastActiveAt?: Date;
  settings?: {
    notifications: boolean;
    canCreateSOPs: boolean;
    canAssignTasks: boolean;
  };
}

export interface UserContextAccess {
  userId: string;
  contextId: string;
  role: MemberRole;
  isActive: boolean; // Current context
  lastAccessedAt: Date;
}