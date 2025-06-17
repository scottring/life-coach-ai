import {
  collection,
  doc,
  updateDoc,
  getDocs,
  getDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from './firebase';
import { Context, ContextMember, ContextType, ContextSettings } from '../types/context';

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

// Default context settings
const createDefaultSettings = (type: ContextType): ContextSettings => ({
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
  workingHours: {
    start: type === 'work' ? '09:00' : '05:00',
    end: type === 'work' ? '18:00' : '22:00'
  },
  weekStartsOn: 1, // Monday
  defaultCalendarView: '15min',
  colorScheme: type === 'family' ? '#3B82F6' : type === 'work' ? '#059669' : type === 'personal' ? '#7C3AED' : '#F59E0B',
  enableSOPs: true,
  enableMealPlanning: type === 'family',
  enableTaskTracking: true
});

export const contextService = {
  // Create a new context
  async createContext(
    name: string, 
    type: ContextType, 
    userId: string, 
    description?: string
  ): Promise<Context> {
    const batch = writeBatch(db);
    
    // Create context document
    const contextRef = doc(collection(db, 'contexts'));
    const contextData = {
      name,
      type,
      description: description || '',
      ownerId: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
      settings: createDefaultSettings(type)
    };
    
    batch.set(contextRef, contextData);
    
    // Add creator as admin member
    const memberRef = doc(collection(db, 'context_members'));
    const memberData = {
      contextId: contextRef.id,
      userId,
      displayName: 'Owner', // This should be updated with real user name
      role: 'admin',
      joinedAt: serverTimestamp(),
      settings: {
        notifications: true,
        canCreateSOPs: true,
        canAssignTasks: true
      }
    };
    
    batch.set(memberRef, memberData);
    
    // Add user context access record
    const accessRef = doc(collection(db, 'user_context_access'));
    const accessData = {
      userId,
      contextId: contextRef.id,
      role: 'admin',
      isActive: true, // Set as active context
      lastAccessedAt: serverTimestamp()
    };
    
    batch.set(accessRef, accessData);
    
    await batch.commit();
    
    return {
      id: contextRef.id,
      name,
      type,
      description: description || '',
      ownerId: userId,
      createdAt: new Date(),
      updatedAt: new Date(),
      settings: createDefaultSettings(type)
    };
  },

  // Get all contexts for a user
  async getContextsForUser(userId: string): Promise<Context[]> {
    const accessQuery = query(
      collection(db, 'user_context_access'),
      where('userId', '==', userId)
    );
    
    const accessSnapshot = await getDocs(accessQuery);
    const contexts: Context[] = [];
    
    for (const accessDoc of accessSnapshot.docs) {
      const accessData = accessDoc.data();
      const contextDoc = await getDoc(doc(db, 'contexts', accessData.contextId));
      
      if (contextDoc.exists()) {
        const contextData = contextDoc.data();
        contexts.push({
          id: contextDoc.id,
          name: contextData.name,
          type: contextData.type,
          description: contextData.description,
          ownerId: contextData.ownerId,
          createdAt: timestampToDate(contextData.createdAt),
          updatedAt: timestampToDate(contextData.updatedAt),
          settings: contextData.settings
        });
      }
    }
    
    // Sort contexts by name in JavaScript instead of database
    return contexts.sort((a, b) => a.name.localeCompare(b.name));
  },

  // Get active context for user
  async getActiveContext(userId: string): Promise<Context | null> {
    const accessQuery = query(
      collection(db, 'user_context_access'),
      where('userId', '==', userId),
      where('isActive', '==', true)
    );
    
    const accessSnapshot = await getDocs(accessQuery);
    if (accessSnapshot.empty) return null;
    
    const accessData = accessSnapshot.docs[0].data();
    const contextDoc = await getDoc(doc(db, 'contexts', accessData.contextId));
    
    if (!contextDoc.exists()) return null;
    
    const contextData = contextDoc.data();
    return {
      id: contextDoc.id,
      name: contextData.name,
      type: contextData.type,
      description: contextData.description,
      ownerId: contextData.ownerId,
      createdAt: timestampToDate(contextData.createdAt),
      updatedAt: timestampToDate(contextData.updatedAt),
      settings: contextData.settings
    };
  },

  // Switch active context for user
  async switchActiveContext(userId: string, contextId: string): Promise<void> {
    const batch = writeBatch(db);
    
    // Deactivate all contexts for this user
    const accessQuery = query(
      collection(db, 'user_context_access'),
      where('userId', '==', userId)
    );
    
    const accessSnapshot = await getDocs(accessQuery);
    
    accessSnapshot.docs.forEach(doc => {
      const isTargetContext = doc.data().contextId === contextId;
      batch.update(doc.ref, {
        isActive: isTargetContext,
        lastAccessedAt: isTargetContext ? serverTimestamp() : doc.data().lastAccessedAt
      });
    });
    
    await batch.commit();
  },

  // Get members of a context
  async getContextMembers(contextId: string): Promise<ContextMember[]> {
    const membersQuery = query(
      collection(db, 'context_members'),
      where('contextId', '==', contextId),
      orderBy('joinedAt', 'asc')
    );
    
    const snapshot = await getDocs(membersQuery);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        contextId: data.contextId,
        userId: data.userId,
        displayName: data.displayName,
        email: data.email,
        role: data.role,
        joinedAt: timestampToDate(data.joinedAt),
        lastActiveAt: data.lastActiveAt ? timestampToDate(data.lastActiveAt) : undefined,
        settings: data.settings
      };
    });
  },

  // Add member to context
  async addMemberToContext(
    contextId: string, 
    userId: string, 
    displayName: string, 
    role: 'member' | 'viewer' = 'member'
  ): Promise<ContextMember> {
    const batch = writeBatch(db);
    
    // Add to context_members
    const memberRef = doc(collection(db, 'context_members'));
    const memberData = {
      contextId,
      userId,
      displayName,
      role,
      joinedAt: serverTimestamp(),
      settings: {
        notifications: true,
        canCreateSOPs: role === 'member',
        canAssignTasks: role === 'member'
      }
    };
    
    batch.set(memberRef, memberData);
    
    // Add to user_context_access
    const accessRef = doc(collection(db, 'user_context_access'));
    const accessData = {
      userId,
      contextId,
      role,
      isActive: false,
      lastAccessedAt: serverTimestamp()
    };
    
    batch.set(accessRef, accessData);
    
    await batch.commit();
    
    return {
      id: memberRef.id,
      contextId,
      userId,
      displayName,
      role,
      joinedAt: new Date(),
      settings: memberData.settings
    };
  },

  // Update context settings
  async updateContextSettings(contextId: string, settings: Partial<ContextSettings>): Promise<void> {
    const contextRef = doc(db, 'contexts', contextId);
    await updateDoc(contextRef, {
      settings,
      updatedAt: serverTimestamp()
    });
  },

  // Create default family context for new users
  async createDefaultFamilyContext(userId: string, familyName?: string): Promise<Context> {
    const defaultName = familyName || 'My Family';
    return this.createContext(defaultName, 'family', userId, 'Default family context');
  }
};