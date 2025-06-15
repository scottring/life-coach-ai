import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { SOP, SOPCompletion, SOPTemplate, SOPStep, SOPCategory } from '../types/sop';

// Helper function to convert Firestore timestamp to Date
const timestampToDate = (timestamp: any): Date => {
  if (timestamp instanceof Timestamp) {
    return timestamp.toDate();
  }
  if (timestamp?.seconds) {
    return new Date(timestamp.seconds * 1000);
  }
  return new Date();
};

// Generate unique step IDs
const generateStepId = () => `step_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

// Calculate total duration from steps
const calculateTotalDuration = (steps: SOPStep[]): number => {
  return steps.reduce((total, step) => total + step.estimatedDuration, 0);
};

// Get category color for UI
export const getCategoryColor = (category: SOPCategory): string => {
  const colors = {
    morning: '#F59E0B',     // amber
    evening: '#6366F1',     // indigo
    leaving: '#EF4444',     // red
    cleanup: '#10B981',     // emerald
    'meal-prep': '#F97316', // orange
    work: '#059669',        // green
    custom: '#8B5CF6'       // violet
  };
  return colors[category] || '#6B7280'; // gray fallback
};

export const sopService = {
  // Create a new SOP
  async createSOP(
    contextId: string,
    sopData: Omit<SOP, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'estimatedDuration'>
  ): Promise<SOP> {
    // Generate IDs for steps
    const stepsWithIds = sopData.steps.map(step => ({
      ...step,
      id: generateStepId()
    }));
    
    const totalDuration = calculateTotalDuration(stepsWithIds);
    
    const docData = {
      ...sopData,
      contextId,
      steps: stepsWithIds,
      estimatedDuration: totalDuration,
      version: 1,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const sopRef = await addDoc(collection(db, 'sops'), docData);
    
    return {
      id: sopRef.id,
      ...sopData,
      contextId,
      steps: stepsWithIds,
      estimatedDuration: totalDuration,
      version: 1,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  },

  // Get all SOPs for a context
  async getSOPsForContext(contextId: string): Promise<SOP[]> {
    const sopsQuery = query(
      collection(db, 'sops'),
      where('contextId', '==', contextId),
      where('status', '!=', 'archived'),
      orderBy('status', 'asc'),
      orderBy('category', 'asc'),
      orderBy('name', 'asc')
    );
    
    const snapshot = await getDocs(sopsQuery);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        contextId: data.contextId,
        name: data.name,
        description: data.description,
        category: data.category,
        tags: data.tags || [],
        estimatedDuration: data.estimatedDuration,
        difficulty: data.difficulty,
        status: data.status,
        assignableMembers: data.assignableMembers || [],
        defaultAssignee: data.defaultAssignee,
        requiresConfirmation: data.requiresConfirmation || false,
        steps: data.steps || [],
        executionOrder: data.executionOrder || 'sequential',
        isRecurring: data.isRecurring || false,
        recurrence: data.recurrence,
        averageCompletionTime: data.averageCompletionTime,
        completionRate: data.completionRate,
        lastOptimized: data.lastOptimized ? timestampToDate(data.lastOptimized) : undefined,
        createdBy: data.createdBy,
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt),
        version: data.version || 1
      };
    });
  },

  // Get SOPs by category
  async getSOPsByCategory(contextId: string, category: SOPCategory): Promise<SOP[]> {
    const sopsQuery = query(
      collection(db, 'sops'),
      where('contextId', '==', contextId),
      where('category', '==', category),
      where('status', '==', 'active'),
      orderBy('name', 'asc')
    );
    
    const snapshot = await getDocs(sopsQuery);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        contextId: data.contextId,
        name: data.name,
        description: data.description,
        category: data.category,
        tags: data.tags || [],
        estimatedDuration: data.estimatedDuration,
        difficulty: data.difficulty,
        status: data.status,
        assignableMembers: data.assignableMembers || [],
        defaultAssignee: data.defaultAssignee,
        requiresConfirmation: data.requiresConfirmation || false,
        steps: data.steps || [],
        executionOrder: data.executionOrder || 'sequential',
        isRecurring: data.isRecurring || false,
        recurrence: data.recurrence,
        averageCompletionTime: data.averageCompletionTime,
        completionRate: data.completionRate,
        lastOptimized: data.lastOptimized ? timestampToDate(data.lastOptimized) : undefined,
        createdBy: data.createdBy,
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt),
        version: data.version || 1
      };
    });
  },

  // Update an SOP
  async updateSOP(sopId: string, updates: Partial<SOP>): Promise<void> {
    const updateData: any = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    // Recalculate duration if steps were updated
    if (updates.steps) {
      updateData.estimatedDuration = calculateTotalDuration(updates.steps);
      updateData.version = (updates.version || 1) + 1;
    }
    
    const sopRef = doc(db, 'sops', sopId);
    await updateDoc(sopRef, updateData);
  },

  // Delete an SOP (soft delete by archiving)
  async deleteSOP(sopId: string): Promise<void> {
    const sopRef = doc(db, 'sops', sopId);
    await updateDoc(sopRef, {
      status: 'archived',
      updatedAt: serverTimestamp()
    });
  },

  // Create SOP completion (scheduled or immediate)
  async createSOPCompletion(completionData: Omit<SOPCompletion, 'id' | 'createdAt' | 'updatedAt'>): Promise<SOPCompletion> {
    const docData = {
      ...completionData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    const completionRef = await addDoc(collection(db, 'sop_completions'), docData);
    
    return {
      id: completionRef.id,
      ...completionData,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  },

  // Get completions for a date range
  async getCompletionsForDateRange(
    contextId: string, 
    startDate: string, 
    endDate: string
  ): Promise<SOPCompletion[]> {
    const completionsQuery = query(
      collection(db, 'sop_completions'),
      where('contextId', '==', contextId),
      where('scheduledDate', '>=', startDate),
      where('scheduledDate', '<=', endDate),
      orderBy('scheduledDate', 'asc'),
      orderBy('scheduledTime', 'asc')
    );
    
    const snapshot = await getDocs(completionsQuery);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        sopId: data.sopId,
        contextId: data.contextId,
        assignedTo: data.assignedTo,
        completedBy: data.completedBy,
        scheduledDate: data.scheduledDate,
        scheduledTime: data.scheduledTime,
        startedAt: data.startedAt ? timestampToDate(data.startedAt) : undefined,
        completedAt: data.completedAt ? timestampToDate(data.completedAt) : undefined,
        actualDuration: data.actualDuration,
        completedSteps: data.completedSteps || [],
        skippedSteps: data.skippedSteps || [],
        stepNotes: data.stepNotes || {},
        status: data.status,
        completionNotes: data.completionNotes,
        rating: data.rating,
        issues: data.issues,
        suggestions: data.suggestions,
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt)
      };
    });
  },

  // Update completion status
  async updateCompletion(completionId: string, updates: Partial<SOPCompletion>): Promise<void> {
    const updateData = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    const completionRef = doc(db, 'sop_completions', completionId);
    await updateDoc(completionRef, updateData);
  },

  // Get popular SOP templates
  async getSOPTemplates(limit: number = 20): Promise<SOPTemplate[]> {
    const templatesQuery = query(
      collection(db, 'sop_templates'),
      where('isPublic', '==', true),
      orderBy('usageCount', 'desc'),
      orderBy('rating', 'desc')
    );
    
    const snapshot = await getDocs(templatesQuery);
    
    return snapshot.docs.slice(0, limit).map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        name: data.name,
        description: data.description,
        category: data.category,
        tags: data.tags || [],
        steps: data.steps || [],
        estimatedDuration: data.estimatedDuration,
        difficulty: data.difficulty,
        isPublic: data.isPublic,
        usageCount: data.usageCount || 0,
        rating: data.rating || 0,
        createdBy: data.createdBy,
        createdAt: timestampToDate(data.createdAt)
      };
    });
  },

  // Create SOP from template
  async createSOPFromTemplate(
    contextId: string,
    templateId: string,
    createdBy: string,
    customizations?: {
      name?: string;
      assignableMembers?: string[];
      defaultAssignee?: string;
    }
  ): Promise<SOP> {
    const templateDoc = await getDoc(doc(db, 'sop_templates', templateId));
    if (!templateDoc.exists()) {
      throw new Error('Template not found');
    }
    
    const template = templateDoc.data() as SOPTemplate;
    
    // Convert template steps to SOP steps with IDs
    const steps: SOPStep[] = template.steps.map((step, index) => ({
      ...step,
      id: generateStepId(),
      stepNumber: index + 1
    }));
    
    const sopData: Omit<SOP, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'estimatedDuration'> = {
      contextId,
      name: customizations?.name || template.name,
      description: template.description,
      category: template.category,
      tags: template.tags,
      difficulty: template.difficulty,
      status: 'active',
      assignableMembers: customizations?.assignableMembers || [],
      defaultAssignee: customizations?.defaultAssignee,
      requiresConfirmation: false,
      steps,
      executionOrder: 'sequential',
      isRecurring: false,
      createdBy
    };
    
    // Increment usage count for template
    const templateRef = doc(db, 'sop_templates', templateId);
    await updateDoc(templateRef, {
      usageCount: (template.usageCount || 0) + 1
    });
    
    return this.createSOP(contextId, sopData);
  }
};