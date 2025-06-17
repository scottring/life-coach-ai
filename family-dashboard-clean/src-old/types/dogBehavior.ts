// src/types/dogBehavior.ts

export interface SOPStep {
  id: string;
  description: string;
  isCompleted?: boolean; // Used during logging an SOP instance
}

export interface DepartureParameter {
  id: string;
  name: string;
  icon: string; // emoji or icon name
  category: 'comfort' | 'activity' | 'medication' | 'environment' | 'custom';
  isQuantifiable: boolean; // true if it has a quantity (like pills, treats)
  maxQuantity?: number;
  unit?: string; // 'pills', 'treats', 'minutes', etc.
  color: string; // for button styling
  isActive: boolean; // can be toggled on/off
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

export interface WyzeBarkEvent {
  timestamp: Date;
  duration: number; // seconds
  loudness: number; // 1-10 scale
  confidence: number; // detection confidence 0-1
}

export interface WyzeMotionEvent {
  timestamp: Date;
  duration: number; // seconds
  intensity: number; // 1-10 movement intensity scale
  location?: string; // room/area if available
}

export interface DepartureParameterLog {
  parameterId: string;
  parameterName: string;
  isSelected: boolean;
  quantity?: number;
  notes?: string;
}

export interface LeaveSessionLog {
  id: string;
  familyId: string;
  departureTime: Date;
  returnTime?: Date;
  isActive: boolean; // true if still away, false if returned
  
  // Pre-departure parameters and SOP
  departureParameters: DepartureParameterLog[];
  departureSopLogId?: string; // Links to SOPLogEntry for leaving routine
  
  // Wyze camera monitoring data
  wyzeMonitoring?: {
    barkEvents: WyzeBarkEvent[];
    motionEvents: WyzeMotionEvent[];
    totalBarkingMinutes: number;
    averageLoudness: number;
    totalMotionMinutes: number;
    anxietyScore: number; // 1-10 calculated from frequency and intensity
    calmPeriods: { start: Date; end: Date }[]; // periods with no activity
  };
  
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
