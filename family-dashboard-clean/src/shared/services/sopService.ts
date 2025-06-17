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
} from 'firebase/firestore';
import { db } from './firebase';
import { SOP, SOPCompletion, SOPTemplate, SOPStep, SOPCategory, SOPStepType } from '../types/sop';

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

// Calculate total duration from steps (including embedded SOPs)
const calculateTotalDuration = async (steps: SOPStep[]): Promise<number> => {
  let total = 0;
  
  for (const step of steps) {
    if (step.type === 'embedded_sop' && step.embeddedSOPId) {
      // Get embedded SOP duration
      const embeddedSOP = await getSOPByIdInternal(step.embeddedSOPId);
      if (embeddedSOP) {
        total += step.embeddedSOPOverrides?.estimatedDuration ?? embeddedSOP.estimatedDuration;
      } else {
        // Fallback to step's own duration if embedded SOP not found
        total += step.estimatedDuration;
      }
    } else {
      total += step.estimatedDuration;
    }
  }
  
  return total;
};

// Helper function to get SOP by ID (for internal use)
const getSOPByIdInternal = async (sopId: string): Promise<SOP | null> => {
  try {
    const sopDoc = await getDoc(doc(db, 'sops', sopId));
    if (!sopDoc.exists()) return null;
    
    const data = sopDoc.data();
    return {
      id: sopDoc.id,
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
      canBeEmbedded: data.canBeEmbedded || false,
      isStandalone: data.isStandalone !== false, // Default to true
      embeddedSOPs: data.embeddedSOPs || [],
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
  } catch (error) {
    console.error('Error fetching SOP:', error);
    return null;
  }
};

// Get category color for UI
const getCategoryColor = (category: SOPCategory): string => {
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
  getCategoryColor,
  // Create a new SOP
  async createSOP(
    contextId: string,
    sopData: Omit<SOP, 'id' | 'createdAt' | 'updatedAt' | 'version' | 'estimatedDuration'>
  ): Promise<SOP> {
    // Generate IDs for steps and ensure they have the type property
    const stepsWithIds = sopData.steps.map(step => ({
      ...step,
      id: generateStepId(),
      type: step.type || 'standard' as SOPStepType
    }));
    
    const totalDuration = await calculateTotalDuration(stepsWithIds);
    
    // Collect embedded SOP IDs
    const embeddedSOPIds = stepsWithIds
      .filter(step => step.type === 'embedded_sop' && step.embeddedSOPId)
      .map(step => step.embeddedSOPId!);
    
    // Set defaults for new embedding properties
    const enhancedSopData = {
      ...sopData,
      canBeEmbedded: sopData.canBeEmbedded ?? true,
      isStandalone: sopData.isStandalone ?? true,
      embeddedSOPs: embeddedSOPIds
    };
    
    // Filter out undefined values for Firestore
    const cleanedSopData = Object.fromEntries(
      Object.entries(enhancedSopData).filter(([_, value]) => value !== undefined)
    );

    const docData = {
      ...cleanedSopData,
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
      ...enhancedSopData,
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
      where('contextId', '==', contextId)
    );
    
    const snapshot = await getDocs(sopsQuery);
    
    const sops = snapshot.docs.map(doc => {
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
        canBeEmbedded: data.canBeEmbedded || false,
        isStandalone: data.isStandalone !== false, // Default to true
        embeddedSOPs: data.embeddedSOPs || [],
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

    // Filter and sort in JavaScript instead of database
    return sops
      .filter(sop => sop.status !== 'archived')
      .sort((a, b) => {
        // Sort by status, then category, then name
        if (a.status !== b.status) {
          return a.status.localeCompare(b.status);
        }
        if (a.category !== b.category) {
          return a.category.localeCompare(b.category);
        }
        return a.name.localeCompare(b.name);
      });
  },

  // Get SOPs by category
  async getSOPsByCategory(contextId: string, category: SOPCategory): Promise<SOP[]> {
    const sopsQuery = query(
      collection(db, 'sops'),
      where('contextId', '==', contextId),
      where('category', '==', category)
    );
    
    const snapshot = await getDocs(sopsQuery);
    
    const sops = snapshot.docs.map(doc => {
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
        canBeEmbedded: data.canBeEmbedded || false,
        isStandalone: data.isStandalone !== false, // Default to true
        embeddedSOPs: data.embeddedSOPs || [],
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

    // Filter and sort in JavaScript
    return sops
      .filter(sop => sop.status === 'active')
      .sort((a, b) => a.name.localeCompare(b.name));
  },

  // Get SOPs that can be embedded
  async getEmbeddableSOPs(contextId: string): Promise<SOP[]> {
    const sops = await this.getSOPsForContext(contextId);
    return sops.filter(sop => sop.canBeEmbedded && sop.status === 'active');
  },

  // Get detailed steps for a SOP (expanding embedded SOPs)
  async getExpandedSteps(sopId: string): Promise<SOPStep[]> {
    const sop = await this.getSOPById(sopId);
    if (!sop) return [];

    const expandedSteps: SOPStep[] = [];
    
    for (const step of sop.steps) {
      if (step.type === 'embedded_sop' && step.embeddedSOPId) {
        const embeddedSOP = await getSOPByIdInternal(step.embeddedSOPId);
        if (embeddedSOP) {
          // Add the embedded SOP's steps with prefixed titles
          const embeddedSteps = embeddedSOP.steps.map((embeddedStep, index) => ({
            ...embeddedStep,
            id: `${step.id}_embedded_${embeddedStep.id}`,
            stepNumber: index + 1,
            title: `${step.title}: ${embeddedStep.title}`,
            parentStepId: step.id,
            isEmbedded: true
          }));
          expandedSteps.push(...embeddedSteps);
        } else {
          // If embedded SOP not found, keep the original step
          expandedSteps.push(step);
        }
      } else {
        expandedSteps.push(step);
      }
    }

    return expandedSteps;
  },

  // Update an SOP
  async updateSOP(sopId: string, updates: Partial<SOP>): Promise<void> {
    const updateData: any = {
      ...updates,
      updatedAt: serverTimestamp()
    };
    
    // Recalculate duration if steps were updated
    if (updates.steps) {
      updateData.estimatedDuration = await calculateTotalDuration(updates.steps);
      updateData.version = (updates.version || 1) + 1;
      
      // Update embedded SOPs list
      const embeddedSOPIds = updates.steps
        .filter(step => step.type === 'embedded_sop' && step.embeddedSOPId)
        .map(step => step.embeddedSOPId!);
      updateData.embeddedSOPs = embeddedSOPIds;
    }
    
    const sopRef = doc(db, 'sops', sopId);
    await updateDoc(sopRef, updateData);
  },

  // Get a single SOP by ID
  async getSOPById(sopId: string): Promise<SOP | null> {
    const sopDoc = await getDoc(doc(db, 'sops', sopId));
    
    if (!sopDoc.exists()) return null;
    
    const data = sopDoc.data();
    return {
      id: sopDoc.id,
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
      canBeEmbedded: data.canBeEmbedded || false,
      isStandalone: data.isStandalone !== false, // Default to true
      embeddedSOPs: data.embeddedSOPs || [],
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
  },

  // Delete an SOP (soft delete by archiving)
  async deleteSOP(sopId: string): Promise<void> {
    const sopRef = doc(db, 'sops', sopId);
    await updateDoc(sopRef, {
      status: 'archived',
      updatedAt: serverTimestamp()
    });
  },

  // Permanently delete an SOP (hard delete)
  async permanentlyDeleteSOP(sopId: string): Promise<void> {
    await deleteDoc(doc(db, 'sops', sopId));
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
      stepNumber: index + 1,
      type: 'standard' as SOPStepType
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
      canBeEmbedded: true,
      isStandalone: true,
      embeddedSOPs: [],
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