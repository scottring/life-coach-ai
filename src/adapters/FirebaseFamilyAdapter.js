import { 
  collection, 
  doc, 
  getDocs, 
  getDoc,
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy, 
  serverTimestamp,
  arrayUnion,
  arrayRemove
} from 'firebase/firestore';
import { db } from '../lib/firebaseClient';

export const FirebaseFamilyAdapter = {
  // Families
  async getFamilies(userId) {
    try {
      const q = query(
        collection(db, 'family_members'),
        where('user_id', '==', userId)
      );
      const querySnapshot = await getDocs(q);
      
      const families = [];
      for (const memberDoc of querySnapshot.docs) {
        const memberData = memberDoc.data();
        const familyDoc = await getDoc(doc(db, 'families', memberData.family_id));
        
        if (familyDoc.exists()) {
          families.push({
            ...familyDoc.data(),
            id: familyDoc.id,
            userRole: memberData.role
          });
        }
      }
      
      return families;
    } catch (error) {
      console.error('Error fetching families:', error);
      // Return demo data for development
      return [{
        id: 'demo-family-' + userId,
        name: 'Demo Family (Firebase)',
        userRole: 'admin',
        created_at: new Date().toISOString()
      }];
    }
  },

  async createFamily(familyData, userId) {
    try {
      // Create family document
      const familyRef = await addDoc(collection(db, 'families'), {
        name: familyData.name,
        created_by: userId,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      // Add creator as admin member
      await addDoc(collection(db, 'family_members'), {
        family_id: familyRef.id,
        user_id: userId,
        role: 'admin',
        joined_at: serverTimestamp(),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      return {
        id: familyRef.id,
        ...familyData,
        created_by: userId,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating family:', error);
      throw error;
    }
  },

  // Family Members
  async getFamilyMembers(familyId) {
    try {
      const q = query(
        collection(db, 'family_members'),
        where('family_id', '==', familyId)
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        joined_at: doc.data().joined_at?.toDate()?.toISOString()
      }));
    } catch (error) {
      console.error('Error fetching family members:', error);
      // Return demo data
      return [
        {
          id: 'demo-member-1',
          user_id: 'dev-user-123',
          role: 'admin',
          joined_at: new Date().toISOString()
        },
        {
          id: 'demo-member-2', 
          user_id: 'spouse-456',
          role: 'parent',
          joined_at: new Date().toISOString()
        }
      ];
    }
  },

  async addFamilyMember(familyId, userId, role = 'member') {
    try {
      const memberRef = await addDoc(collection(db, 'family_members'), {
        family_id: familyId,
        user_id: userId,
        role,
        joined_at: serverTimestamp(),
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      return {
        id: memberRef.id,
        family_id: familyId,
        user_id: userId,
        role,
        joined_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error adding family member:', error);
      throw error;
    }
  },

  async createFamilyMember(memberData) {
    return this.addFamilyMember(memberData.family_id, memberData.user_id, memberData.role);
  },

  // Family Meals
  async getFamilyMeals(familyId) {
    try {
      const q = query(
        collection(db, 'family_meals'),
        where('family_id', '==', familyId),
        orderBy('date', 'asc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate()?.toISOString(),
        updated_at: doc.data().updated_at?.toDate()?.toISOString()
      }));
    } catch (error) {
      console.error('Error fetching family meals:', error);
      // Return demo meal data
      const today = new Date();
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      
      return [
        {
          id: 'demo-meal-1',
          family_id: familyId,
          date: today.toISOString().split('T')[0],
          meal_type: 'dinner',
          dish_name: 'Spaghetti & Meatballs',
          people_count: 4,
          adults_count: 2,
          children_count: 2,
          created_at: new Date().toISOString()
        },
        {
          id: 'demo-meal-2',
          family_id: familyId,
          date: tomorrow.toISOString().split('T')[0],
          meal_type: 'breakfast', 
          dish_name: 'Pancakes',
          people_count: 4,
          adults_count: 2,
          children_count: 2,
          created_at: new Date().toISOString()
        }
      ];
    }
  },

  async createFamilyMeal(mealData) {
    try {
      const mealRef = await addDoc(collection(db, 'family_meals'), {
        ...mealData,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      return {
        id: mealRef.id,
        ...mealData,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating family meal:', error);
      // Return mock meal for demo
      return {
        id: 'demo-meal-' + Date.now(),
        ...mealData,
        created_at: new Date().toISOString()
      };
    }
  },

  async updateFamilyMeal(mealId, mealData) {
    try {
      const mealRef = doc(db, 'family_meals', mealId);
      await updateDoc(mealRef, {
        ...mealData,
        updated_at: serverTimestamp()
      });

      return {
        id: mealId,
        ...mealData,
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error updating family meal:', error);
      throw error;
    }
  },

  async deleteFamilyMeal(mealId) {
    try {
      await deleteDoc(doc(db, 'family_meals', mealId));
    } catch (error) {
      console.error('Error deleting family meal:', error);
      throw error;
    }
  },

  // Family Tasks
  async getFamilyTasks(familyId) {
    try {
      const q = query(
        collection(db, 'family_tasks'),
        where('family_id', '==', familyId),
        orderBy('created_at', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate()?.toISOString(),
        updated_at: doc.data().updated_at?.toDate()?.toISOString(),
        completed_at: doc.data().completed_at?.toDate()?.toISOString()
      }));
    } catch (error) {
      console.error('Error fetching family tasks:', error);
      // Return demo task data
      return [
        {
          id: 'demo-task-1',
          family_id: familyId,
          title: 'Take out trash',
          description: 'Weekly trash pickup',
          priority: 'medium',
          completed: false,
          due_date: new Date().toISOString().split('T')[0],
          assigned_to: 'child-789',
          created_at: new Date().toISOString()
        },
        {
          id: 'demo-task-2',
          family_id: familyId,
          title: 'Grocery shopping',
          description: 'Buy ingredients for meals',
          priority: 'high',
          completed: false,
          assigned_to: 'spouse-456',
          created_at: new Date().toISOString()
        }
      ];
    }
  },

  async createFamilyTask(taskData) {
    try {
      const taskRef = await addDoc(collection(db, 'family_tasks'), {
        ...taskData,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      return {
        id: taskRef.id,
        ...taskData,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating family task:', error);
      throw error;
    }
  },

  async updateFamilyTask(taskId, taskData) {
    try {
      const taskRef = doc(db, 'family_tasks', taskId);
      await updateDoc(taskRef, {
        ...taskData,
        updated_at: serverTimestamp()
      });

      return {
        id: taskId,
        ...taskData,
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error updating family task:', error);
      throw error;
    }
  },

  async deleteFamilyTask(taskId) {
    try {
      await deleteDoc(doc(db, 'family_tasks', taskId));
    } catch (error) {
      console.error('Error deleting family task:', error);
      throw error;
    }
  },

  // Family Goals
  async getFamilyGoals(familyId) {
    try {
      const q = query(
        collection(db, 'family_goals'),
        where('family_id', '==', familyId),
        orderBy('created_at', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate()?.toISOString(),
        updated_at: doc.data().updated_at?.toDate()?.toISOString()
      }));
    } catch (error) {
      console.error('Error fetching family goals:', error);
      // Return demo goal data
      return [
        {
          id: 'demo-goal-1',
          family_id: familyId,
          title: 'Save for Family Vacation',
          description: 'Save $5,000 for Hawaii trip',
          category: 'financial',
          progress: 65,
          target_date: '2025-06-01',
          created_at: new Date().toISOString()
        },
        {
          id: 'demo-goal-2',
          family_id: familyId,
          title: 'Eat Healthier Together',
          description: 'Cook more meals at home',
          category: 'health',
          progress: 40,
          target_date: '2025-12-31',
          created_at: new Date().toISOString()
        }
      ];
    }
  },

  async createFamilyGoal(goalData) {
    try {
      const goalRef = await addDoc(collection(db, 'family_goals'), {
        ...goalData,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      return {
        id: goalRef.id,
        ...goalData,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating family goal:', error);
      throw error;
    }
  },

  async updateFamilyGoal(goalId, goalData) {
    try {
      const goalRef = doc(db, 'family_goals', goalId);
      await updateDoc(goalRef, {
        ...goalData,
        updated_at: serverTimestamp()
      });

      return {
        id: goalId,
        ...goalData,
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error updating family goal:', error);
      throw error;
    }
  },

  async deleteFamilyGoal(goalId) {
    try {
      await deleteDoc(doc(db, 'family_goals', goalId));
    } catch (error) {
      console.error('Error deleting family goal:', error);
      throw error;
    }
  },

  // Family Milestones
  async getFamilyMilestones(familyId) {
    try {
      const q = query(
        collection(db, 'family_milestones'),
        where('family_id', '==', familyId),
        orderBy('date', 'asc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate()?.toISOString(),
        updated_at: doc.data().updated_at?.toDate()?.toISOString()
      }));
    } catch (error) {
      console.error('Error fetching family milestones:', error);
      return [];
    }
  },

  async createFamilyMilestone(milestoneData) {
    try {
      const milestoneRef = await addDoc(collection(db, 'family_milestones'), {
        ...milestoneData,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      return {
        id: milestoneRef.id,
        ...milestoneData,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating family milestone:', error);
      throw error;
    }
  },

  async updateFamilyMilestone(milestoneId, milestoneData) {
    try {
      const milestoneRef = doc(db, 'family_milestones', milestoneId);
      await updateDoc(milestoneRef, {
        ...milestoneData,
        updated_at: serverTimestamp()
      });

      return {
        id: milestoneId,
        ...milestoneData,
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error updating family milestone:', error);
      throw error;
    }
  },

  async deleteFamilyMilestone(milestoneId) {
    try {
      await deleteDoc(doc(db, 'family_milestones', milestoneId));
    } catch (error) {
      console.error('Error deleting family milestone:', error);
      throw error;
    }
  },

  // Shopping Items
  async getShoppingItems(familyId) {
    try {
      const q = query(
        collection(db, 'shopping_items'),
        where('family_id', '==', familyId),
        orderBy('created_at', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate()?.toISOString(),
        updated_at: doc.data().updated_at?.toDate()?.toISOString()
      }));
    } catch (error) {
      console.error('Error fetching shopping items:', error);
      // Return demo shopping data
      return [
        {
          id: 'demo-shop-1',
          family_id: familyId,
          name: 'Ground beef',
          category: 'Meat',
          quantity: '2 lbs',
          purchased: false,
          created_at: new Date().toISOString()
        },
        {
          id: 'demo-shop-2',
          family_id: familyId,
          name: 'Spaghetti pasta',
          category: 'Pantry',
          quantity: '2 boxes', 
          purchased: false,
          created_at: new Date().toISOString()
        },
        {
          id: 'demo-shop-3',
          family_id: familyId,
          name: 'Marinara sauce',
          category: 'Pantry',
          quantity: '1 jar',
          purchased: true,
          created_at: new Date().toISOString()
        }
      ];
    }
  },

  async createShoppingItem(itemData) {
    try {
      const itemRef = await addDoc(collection(db, 'shopping_items'), {
        ...itemData,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      return {
        id: itemRef.id,
        ...itemData,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating shopping item:', error);
      // Return mock item for demo
      return {
        id: 'demo-item-' + Date.now(),
        ...itemData,
        created_at: new Date().toISOString()
      };
    }
  },

  async updateShoppingItem(itemId, itemData) {
    try {
      const itemRef = doc(db, 'shopping_items', itemId);
      await updateDoc(itemRef, {
        ...itemData,
        updated_at: serverTimestamp()
      });

      return {
        id: itemId,
        ...itemData,
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error updating shopping item:', error);
      // Return mock updated item for demo
      return {
        id: itemId,
        ...itemData,
        updated_at: new Date().toISOString()
      };
    }
  },

  async deleteShoppingItem(itemId) {
    try {
      await deleteDoc(doc(db, 'shopping_items', itemId));
    } catch (error) {
      console.error('Error deleting shopping item:', error);
      throw error;
    }
  },

  // Additional methods for compatibility
  async getHierarchicalGoals(familyId) {
    // Placeholder for hierarchical goals
    return [];
  },

  async createFamilyReview(reviewData) {
    try {
      const reviewRef = await addDoc(collection(db, 'family_reviews'), {
        ...reviewData,
        created_at: serverTimestamp(),
        updated_at: serverTimestamp()
      });

      return {
        id: reviewRef.id,
        ...reviewData,
        created_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error creating family review:', error);
      throw error;
    }
  },

  async getFamilyReviews(familyId, limit = 10) {
    try {
      const q = query(
        collection(db, 'family_reviews'),
        where('family_id', '==', familyId),
        orderBy('week_ending', 'desc')
      );
      const querySnapshot = await getDocs(q);
      
      return querySnapshot.docs.slice(0, limit).map(doc => ({
        id: doc.id,
        ...doc.data(),
        created_at: doc.data().created_at?.toDate()?.toISOString(),
        updated_at: doc.data().updated_at?.toDate()?.toISOString()
      }));
    } catch (error) {
      console.error('Error fetching family reviews:', error);
      return [];
    }
  },

  async updateFamilyReview(reviewId, reviewData) {
    try {
      const reviewRef = doc(db, 'family_reviews', reviewId);
      await updateDoc(reviewRef, {
        ...reviewData,
        updated_at: serverTimestamp()
      });

      return {
        id: reviewId,
        ...reviewData,
        updated_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error updating family review:', error);
      throw error;
    }
  },

  async getGoalProgress(familyId) {
    // For now, return basic goals - can be enhanced later
    return this.getFamilyGoals(familyId);
  }
};