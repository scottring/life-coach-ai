// Standard Operating Procedures (SOP) types

export type SOPCategory = 'morning' | 'evening' | 'leaving' | 'cleanup' | 'meal-prep' | 'work' | 'custom';
export type SOPDifficulty = 'easy' | 'medium' | 'hard';
export type SOPStatus = 'draft' | 'active' | 'archived';

export type SOPStepType = 'standard' | 'embedded_sop' | 'list';

export interface SOPStep {
  id: string;
  stepNumber: number;
  title: string;
  description?: string;
  estimatedDuration: number; // minutes
  isOptional: boolean;
  dependencies?: string[]; // stepIds that must be completed first
  notes?: string;
  
  // For embedded SOPs
  type: SOPStepType;
  embeddedSOPId?: string; // Reference to another SOP
  embeddedSOPOverrides?: {
    assignedTo?: string; // Override the embedded SOP's default assignee
    skipSteps?: string[]; // Skip specific steps in the embedded SOP
    estimatedDuration?: number; // Override duration if different in this context
  };
  
  // For list-type steps
  listItems?: {
    id: string;
    text: string;
    isCompleted: boolean;
    isOptional: boolean;
  }[];
  
  // For expanded view (runtime properties)
  parentStepId?: string; // ID of the parent step when this is from an embedded SOP
  isEmbedded?: boolean; // True if this step comes from an embedded SOP
}

export interface SOP {
  id: string;
  contextId: string;
  name: string;
  description: string;
  category: SOPCategory;
  tags: string[];
  estimatedDuration: number; // total minutes (sum of steps)
  difficulty: SOPDifficulty;
  status: SOPStatus;
  
  // Assignment and permissions
  assignableMembers: string[]; // member IDs who can be assigned this SOP
  defaultAssignee?: string; // default member ID
  requiresConfirmation: boolean; // does completion need confirmation?
  
  // Embedding properties
  canBeEmbedded: boolean; // can this SOP be embedded in other SOPs?
  isStandalone: boolean; // can this SOP be executed independently?
  embeddedSOPs?: string[]; // IDs of SOPs that are embedded in this one
  
  // Steps and execution
  steps: SOPStep[];
  executionOrder: 'sequential' | 'parallel' | 'flexible';
  
  // Scheduling and recurrence
  isRecurring: boolean;
  recurrence?: {
    frequency: 'daily' | 'weekly' | 'monthly';
    daysOfWeek?: number[]; // 0-6, Sunday = 0
    timeOfDay?: string; // "08:30"
    skipHolidays?: boolean;
  };
  
  // Analytics and optimization
  averageCompletionTime?: number; // actual average from completions
  completionRate?: number; // percentage of on-time completions
  lastOptimized?: Date;
  
  // Metadata
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
  version: number;
}

export interface SOPCompletion {
  id: string;
  sopId: string;
  contextId: string;
  assignedTo: string;
  completedBy?: string; // might be different from assignedTo
  
  // Timing
  scheduledDate: string; // YYYY-MM-DD
  scheduledTime?: string; // "08:30"
  startedAt?: Date;
  completedAt?: Date;
  actualDuration?: number; // minutes
  
  // Step tracking
  completedSteps: string[]; // stepIds
  skippedSteps: string[]; // stepIds
  stepNotes?: {[stepId: string]: string};
  
  // Status and feedback
  status: 'scheduled' | 'in-progress' | 'completed' | 'skipped' | 'failed';
  completionNotes?: string;
  rating?: 1 | 2 | 3 | 4 | 5; // difficulty/satisfaction rating
  issues?: string; // what went wrong
  suggestions?: string; // improvements
  
  createdAt: Date;
  updatedAt: Date;
}

export interface SOPTemplate {
  id: string;
  name: string;
  description: string;
  category: SOPCategory;
  tags: string[];
  steps: Omit<SOPStep, 'id'>[];
  estimatedDuration: number;
  difficulty: SOPDifficulty;
  isPublic: boolean; // can other users see/copy this template?
  usageCount: number; // how many times it's been used
  rating: number; // average user rating
  createdBy: string;
  createdAt: Date;
}

// For the weekly calendar integration
export interface SOPCalendarItem {
  id: string;
  sopId: string;
  sopName: string;
  category: SOPCategory;
  estimatedDuration: number;
  assignedTo?: string;
  date: string; // YYYY-MM-DD
  startTime: string; // "08:30"
  endTime: string; // "09:15"
  status: 'scheduled' | 'in-progress' | 'completed' | 'skipped';
  color: string; // hex color based on category
  isDraggable: boolean;
  completionId?: string; // links to SOPCompletion
}