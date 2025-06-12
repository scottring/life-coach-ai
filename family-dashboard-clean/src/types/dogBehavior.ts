// src/types/dogBehavior.ts

export interface SOPStep {
  id: string;
  description: string;
  isCompleted?: boolean; // Used during logging an SOP instance
}

export interface DogSOP {
  id: string;
  name: string; // e.g., "Leaving the House", "Morning Routine"
  description?: string;
  steps: SOPStep[];
  createdAt: Date;
  updatedAt: Date;
}

export interface SOPLogEntry {
  id: string;
  sopId: string; // Links to the DogSOP
  sopName: string; // Denormalized for easier display
  executedAt: Date;
  userId: string; // Who performed the SOP
  userName: string; // Denormalized
  notes?: string; // e.g., "Performed all steps except white noise, gave 2 kongs..."
  completedSteps: SOPStep[]; // Actual steps taken with their completion status
  observations?: {
    accidents?: string; // e.g., "Pee in the kitchen"
    barkingNotifications?: number; // Count or link to camera data
    other?: string;
  };
  sessionId?: string; // Links to the LeaveSessionLog if this is a leaving SOP
}

export interface LeaveSessionLog {
  id: string;
  familyId: string;
  departureTime: Date;
  returnTime?: Date;
  isActive: boolean; // true if still away, false if returned
  
  // Pre-departure SOP execution
  departureSopLogId?: string; // Links to SOPLogEntry for leaving routine
  
  // Return observations
  returnObservations?: {
    barkingOccurred: boolean;
    barkingIntensity?: 'none' | 'light' | 'moderate' | 'heavy'; // 1-4 scale
    barkingDuration?: number; // minutes
    barkingTimes?: string[]; // times when barking occurred
    wasInCrate: boolean;
    crateCondition?: 'clean' | 'minor_mess' | 'major_mess';
    accidents?: {
      occurred: boolean;
      location?: string;
      type?: 'urine' | 'feces' | 'both';
    };
    destructiveBehavior?: {
      occurred: boolean;
      description?: string;
      severity?: 'minor' | 'moderate' | 'severe';
    };
    foodWaterStatus?: {
      foodFinished: boolean;
      waterFinished: boolean;
    };
    overallMood?: 'calm' | 'excited' | 'anxious' | 'destructive';
    notes?: string;
  };
  
  // Session metadata
  userId: string; // Who logged the return
  userName: string;
  updatedAt: Date;
}

// Example of how you might structure overall dog data if needed
export interface DogProfile {
  id: string;
  name: string;
  breed?: string;
  // ... other dog-specific info
}
