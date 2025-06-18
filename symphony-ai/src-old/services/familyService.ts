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
  Timestamp
} from 'firebase/firestore';
import { db } from '../lib/firebase';

// Types
export interface Family {
  id: string;
  name: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FamilyMember {
  id: string;
  familyId: string;
  userId: string;
  role: 'admin' | 'parent' | 'child' | 'member';
  joinedAt: Date;
}

export interface FamilyMeal {
  id: string;
  familyId: string;
  date: string; // YYYY-MM-DD format
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  dishName: string;
  peopleCount: number;
  adultsCount: number;
  childrenCount: number;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface ShoppingItem {
  id: string;
  familyId: string;
  name: string;
  category: string;
  quantity?: string;
  purchased: boolean;
  addedBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FamilyTask {
  id: string;
  familyId: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  completedAt?: Date;
  dueDate?: Date;
  assignedTo?: string;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface FamilyGoal {
  id: string;
  familyId: string;
  title: string;
  description?: string;
  category: string;
  progress: number; // 0-100
  targetDate?: Date;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
}

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

// Family CRUD operations
export const familyService = {
  // Families
  async createFamily(name: string, userId: string): Promise<Family> {
    const familyRef = await addDoc(collection(db, 'families'), {
      name,
      createdBy: userId,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    // Add creator as admin member
    await addDoc(collection(db, 'family_members'), {
      familyId: familyRef.id,
      userId,
      role: 'admin',
      joinedAt: serverTimestamp()
    });

    return {
      id: familyRef.id,
      name,
      createdBy: userId,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  },

  async getFamiliesForUser(userId: string): Promise<Family[]> {
    const membersQuery = query(
      collection(db, 'family_members'),
      where('userId', '==', userId)
    );
    const membersSnapshot = await getDocs(membersQuery);
    
    const families: Family[] = [];
    for (const memberDoc of membersSnapshot.docs) {
      const memberData = memberDoc.data();
      const familyDoc = await getDoc(doc(db, 'families', memberData.familyId));
      
      if (familyDoc.exists()) {
        const familyData = familyDoc.data();
        families.push({
          id: familyDoc.id,
          name: familyData.name,
          createdBy: familyData.createdBy,
          createdAt: timestampToDate(familyData.createdAt),
          updatedAt: timestampToDate(familyData.updatedAt)
        });
      }
    }
    
    return families;
  },

  // Family Meals
  async createMeal(meal: Omit<FamilyMeal, 'id' | 'createdAt' | 'updatedAt'>): Promise<FamilyMeal> {
    const mealRef = await addDoc(collection(db, 'family_meals'), {
      ...meal,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return {
      id: mealRef.id,
      ...meal,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  },

  async getMeals(familyId: string): Promise<FamilyMeal[]> {
    const mealsQuery = query(
      collection(db, 'family_meals'),
      where('familyId', '==', familyId),
      orderBy('date', 'asc')
    );
    const snapshot = await getDocs(mealsQuery);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        familyId: data.familyId,
        date: data.date,
        mealType: data.mealType,
        dishName: data.dishName,
        peopleCount: data.peopleCount,
        adultsCount: data.adultsCount,
        childrenCount: data.childrenCount,
        notes: data.notes,
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt)
      };
    });
  },

  async updateMeal(mealId: string, updates: Partial<FamilyMeal>): Promise<void> {
    const mealRef = doc(db, 'family_meals', mealId);
    await updateDoc(mealRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  },

  async deleteMeal(mealId: string): Promise<void> {
    await deleteDoc(doc(db, 'family_meals', mealId));
  },

  // Shopping Items
  async createShoppingItem(item: Omit<ShoppingItem, 'id' | 'createdAt' | 'updatedAt'>): Promise<ShoppingItem> {
    const itemRef = await addDoc(collection(db, 'shopping_items'), {
      ...item,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return {
      id: itemRef.id,
      ...item,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  },

  async getShoppingItems(familyId: string): Promise<ShoppingItem[]> {
    const itemsQuery = query(
      collection(db, 'shopping_items'),
      where('familyId', '==', familyId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(itemsQuery);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        familyId: data.familyId,
        name: data.name,
        category: data.category,
        quantity: data.quantity,
        purchased: data.purchased,
        addedBy: data.addedBy,
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt)
      };
    });
  },

  async updateShoppingItem(itemId: string, updates: Partial<ShoppingItem>): Promise<void> {
    const itemRef = doc(db, 'shopping_items', itemId);
    await updateDoc(itemRef, {
      ...updates,
      updatedAt: serverTimestamp()
    });
  },

  async deleteShoppingItem(itemId: string): Promise<void> {
    await deleteDoc(doc(db, 'shopping_items', itemId));
  },

  // Family Tasks
  async createTask(task: Omit<FamilyTask, 'id' | 'createdAt' | 'updatedAt'>): Promise<FamilyTask> {
    const taskRef = await addDoc(collection(db, 'family_tasks'), {
      ...task,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return {
      id: taskRef.id,
      ...task,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  },

  async getTasks(familyId: string): Promise<FamilyTask[]> {
    const tasksQuery = query(
      collection(db, 'family_tasks'),
      where('familyId', '==', familyId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(tasksQuery);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        familyId: data.familyId,
        title: data.title,
        description: data.description,
        priority: data.priority,
        completed: data.completed,
        completedAt: data.completedAt ? timestampToDate(data.completedAt) : undefined,
        dueDate: data.dueDate ? timestampToDate(data.dueDate) : undefined,
        assignedTo: data.assignedTo,
        createdBy: data.createdBy,
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt)
      };
    });
  },

  // Family Goals
  async createGoal(goal: Omit<FamilyGoal, 'id' | 'createdAt' | 'updatedAt'>): Promise<FamilyGoal> {
    const goalRef = await addDoc(collection(db, 'family_goals'), {
      ...goal,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    return {
      id: goalRef.id,
      ...goal,
      createdAt: new Date(),
      updatedAt: new Date()
    };
  },

  async getGoals(familyId: string): Promise<FamilyGoal[]> {
    const goalsQuery = query(
      collection(db, 'family_goals'),
      where('familyId', '==', familyId),
      orderBy('createdAt', 'desc')
    );
    const snapshot = await getDocs(goalsQuery);
    
    return snapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        familyId: data.familyId,
        title: data.title,
        description: data.description,
        category: data.category,
        progress: data.progress,
        targetDate: data.targetDate ? timestampToDate(data.targetDate) : undefined,
        createdBy: data.createdBy,
        createdAt: timestampToDate(data.createdAt),
        updatedAt: timestampToDate(data.updatedAt)
      };
    });
  }
};