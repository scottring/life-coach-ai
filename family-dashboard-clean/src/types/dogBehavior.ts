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
}

// Example of how you might structure overall dog data if needed
export interface DogProfile {
  id: string;
  name: string;
  breed?: string;
  // ... other dog-specific info
}
