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
  limit,
  serverTimestamp,
  Timestamp,
  writeBatch
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { 
  FamilyMember, 
  Meal, 
  MealRating, 
  WeeklyMealPlan, 
  ShoppingList, 
  NutritionLog,
  MealSuggestionRequest,
  MealSuggestionResponse,
  RatingType 
} from '../types/mealPlanning';

// Helper function to convert Firestore timestamps
const convertTimestamps = (data: any): any => {
  const converted = { ...data };
  Object.keys(converted).forEach(key => {
    if (converted[key] instanceof Timestamp) {
      converted[key] = converted[key].toDate();
    }
  });
  return converted;
};

export class MealPlanningService {
  // Family Members Management
  static async getFamilyMembers(familyId: string): Promise<FamilyMember[]> {
    if (!db) return [];
    
    try {
      const q = query(
        collection(db, 'family_members'),
        where('familyId', '==', familyId),
        orderBy('name')
      );
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching family members:', error);
      return [];
    }
  }

  static async addFamilyMember(member: Omit<FamilyMember, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> {
    if (!db) return null;
    
    try {
      const docRef = await addDoc(collection(db, 'family_members'), {
        ...member,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding family member:', error);
      return null;
    }
  }

  static async updateFamilyMember(memberId: string, updates: Partial<FamilyMember>): Promise<boolean> {
    if (!db) return false;
    
    try {
      await updateDoc(doc(db, 'family_members', memberId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating family member:', error);
      return false;
    }
  }

  static async deleteFamilyMember(memberId: string): Promise<boolean> {
    if (!db) return false;
    
    try {
      await deleteDoc(doc(db, 'family_members', memberId));
      return true;
    } catch (error) {
      console.error('Error deleting family member:', error);
      return false;
    }
  }

  // Meals Database Management
  static async getMeals(filters?: { cuisine?: string; mealType?: string; healthIndicator?: string }): Promise<Meal[]> {
    if (!db) return [];
    
    try {
      let q = query(collection(db, 'meals'), orderBy('name'));
      
      if (filters?.cuisine) {
        q = query(collection(db, 'meals'), where('cuisine', '==', filters.cuisine));
      }
      
      const snapshot = await getDocs(q);
      let meals = snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }));
      
      // Apply additional filters
      if (filters?.mealType) {
        meals = meals.filter(meal => meal.mealTypes.includes(filters.mealType));
      }
      
      if (filters?.healthIndicator) {
        meals = meals.filter(meal => meal.healthIndicator === filters.healthIndicator);
      }
      
      return meals;
    } catch (error) {
      console.error('Error fetching meals:', error);
      return [];
    }
  }

  static async getMealById(mealId: string): Promise<Meal | null> {
    if (!db) return null;
    
    try {
      const docRef = doc(db, 'meals', mealId);
      const snapshot = await getDoc(docRef);
      
      if (snapshot.exists()) {
        return convertTimestamps({ id: snapshot.id, ...snapshot.data() });
      }
      return null;
    } catch (error) {
      console.error('Error fetching meal:', error);
      return null;
    }
  }

  static async addMeal(meal: Omit<Meal, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> {
    if (!db) return null;
    
    try {
      const docRef = await addDoc(collection(db, 'meals'), {
        ...meal,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error adding meal:', error);
      return null;
    }
  }

  // Meal Ratings Management
  static async getMealRatings(familyId: string, mealId?: string, memberId?: string): Promise<MealRating[]> {
    if (!db) return [];
    
    try {
      let q = query(
        collection(db, 'meal_ratings'),
        where('familyId', '==', familyId),
        orderBy('dateEaten', 'desc')
      );
      
      const snapshot = await getDocs(q);
      let ratings = snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }));
      
      if (mealId) {
        ratings = ratings.filter(rating => rating.mealId === mealId);
      }
      
      if (memberId) {
        ratings = ratings.filter(rating => rating.memberId === memberId);
      }
      
      return ratings;
    } catch (error) {
      console.error('Error fetching meal ratings:', error);
      return [];
    }
  }

  static async addMealRating(rating: Omit<MealRating, 'id' | 'createdAt'>): Promise<string | null> {
    if (!db) return null;
    
    try {
      const docRef = await addDoc(collection(db, 'meal_ratings'), {
        ...rating,
        createdAt: serverTimestamp()
      });
      
      // Update favorite foods if meal was loved
      if (rating.rating === 'loved') {
        await this.updateFavoriteFoods(rating.memberId, rating.mealId);
      }
      
      return docRef.id;
    } catch (error) {
      console.error('Error adding meal rating:', error);
      return null;
    }
  }

  private static async updateFavoriteFoods(memberId: string, mealId: string): Promise<void> {
    if (!db) return;
    
    try {
      const meal = await this.getMealById(mealId);
      if (!meal) return;
      
      const memberDoc = await getDoc(doc(db, 'family_members', memberId));
      if (!memberDoc.exists()) return;
      
      const memberData = memberDoc.data();
      const currentFavorites = memberData.favoriteFoods || [];
      
      // Add meal name to favorites if not already there
      if (!currentFavorites.includes(meal.name)) {
        await updateDoc(doc(db, 'family_members', memberId), {
          favoriteFoods: [...currentFavorites, meal.name],
          updatedAt: serverTimestamp()
        });
      }
    } catch (error) {
      console.error('Error updating favorite foods:', error);
    }
  }

  // Weekly Meal Plans Management
  static async getWeeklyMealPlan(familyId: string, weekStartDate: string): Promise<WeeklyMealPlan | null> {
    if (!db) return null;
    
    try {
      const q = query(
        collection(db, 'weekly_meal_plans'),
        where('familyId', '==', familyId),
        where('weekStartDate', '==', weekStartDate)
      );
      
      const snapshot = await getDocs(q);
      const docs = snapshot.docs;
      
      if (docs.length > 0) {
        return convertTimestamps({ id: docs[0].id, ...docs[0].data() });
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching weekly meal plan:', error);
      return null;
    }
  }

  static async getRecentMealPlans(familyId: string, limitCount: number = 10): Promise<WeeklyMealPlan[]> {
    if (!db) return [];
    
    try {
      const q = query(
        collection(db, 'weekly_meal_plans'),
        where('familyId', '==', familyId),
        orderBy('weekStartDate', 'desc'),
        limit(limitCount)
      );
      
      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }));
    } catch (error) {
      console.error('Error fetching recent meal plans:', error);
      return [];
    }
  }

  static async saveWeeklyMealPlan(plan: Omit<WeeklyMealPlan, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> {
    if (!db) return null;
    
    try {
      const docRef = await addDoc(collection(db, 'weekly_meal_plans'), {
        ...plan,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error saving weekly meal plan:', error);
      return null;
    }
  }

  static async updateWeeklyMealPlan(planId: string, updates: Partial<WeeklyMealPlan>): Promise<boolean> {
    if (!db) return false;
    
    try {
      await updateDoc(doc(db, 'weekly_meal_plans', planId), {
        ...updates,
        updatedAt: serverTimestamp()
      });
      return true;
    } catch (error) {
      console.error('Error updating weekly meal plan:', error);
      return false;
    }
  }

  // Shopping Lists Management
  static async getShoppingList(weeklyPlanId: string): Promise<ShoppingList | null> {
    if (!db) return null;
    
    try {
      const q = query(
        collection(db, 'shopping_lists'),
        where('weeklyPlanId', '==', weeklyPlanId)
      );
      
      const snapshot = await getDocs(q);
      const docs = snapshot.docs;
      
      if (docs.length > 0) {
        return convertTimestamps({ id: docs[0].id, ...docs[0].data() });
      }
      
      return null;
    } catch (error) {
      console.error('Error fetching shopping list:', error);
      return null;
    }
  }

  static async saveShoppingList(shoppingList: Omit<ShoppingList, 'id' | 'createdAt' | 'updatedAt'>): Promise<string | null> {
    if (!db) return null;
    
    try {
      const docRef = await addDoc(collection(db, 'shopping_lists'), {
        ...shoppingList,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });
      return docRef.id;
    } catch (error) {
      console.error('Error saving shopping list:', error);
      return null;
    }
  }

  static async updateShoppingItem(listId: string, itemIndex: number, updates: Partial<any>): Promise<boolean> {
    if (!db) return false;
    
    try {
      const listDoc = await getDoc(doc(db, 'shopping_lists', listId));
      if (!listDoc.exists()) return false;
      
      const listData = listDoc.data();
      const items = [...listData.items];
      items[itemIndex] = { ...items[itemIndex], ...updates };
      
      await updateDoc(doc(db, 'shopping_lists', listId), {
        items: items,
        updatedAt: serverTimestamp()
      });
      
      return true;
    } catch (error) {
      console.error('Error updating shopping item:', error);
      return false;
    }
  }

  // Analytics and Insights
  static async getFamilyMealPreferences(familyId: string): Promise<any> {
    if (!db) return {};
    
    try {
      const ratings = await this.getMealRatings(familyId);
      const members = await this.getFamilyMembers(familyId);
      
      // Analyze preferences per member
      const preferences: any = {};
      
      for (const member of members) {
        const memberRatings = ratings.filter(r => r.memberId === member.id);
        
        preferences[member.id] = {
          name: member.name,
          lovedMeals: memberRatings.filter(r => r.rating === 'loved').length,
          likedMeals: memberRatings.filter(r => r.rating === 'liked').length,
          dislikedMeals: memberRatings.filter(r => r.rating === 'disliked').length,
          hatedMeals: memberRatings.filter(r => r.rating === 'hated').length,
          favoriteFoods: member.favoriteFoods || [],
          totalRatings: memberRatings.length
        };
      }
      
      return preferences;
    } catch (error) {
      console.error('Error analyzing meal preferences:', error);
      return {};
    }
  }

  static async getNutritionInsights(familyId: string, days: number = 30): Promise<any> {
    if (!db) return {};
    
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);
      
      const q = query(
        collection(db, 'nutrition_logs'),
        where('familyId', '==', familyId),
        where('date', '>=', cutoffDate.toISOString().split('T')[0]),
        orderBy('date', 'desc')
      );
      
      const snapshot = await getDocs(q);
      const logs = snapshot.docs.map(doc => convertTimestamps({ id: doc.id, ...doc.data() }));
      
      // Aggregate nutrition data
      const insights = {
        averageDailyCalories: 0,
        averageProtein: 0,
        averageCarbs: 0,
        averageFat: 0,
        totalDays: logs.length,
        healthyMealPercentage: 0
      };
      
      if (logs.length > 0) {
        const totals = logs.reduce((acc, log) => {
          acc.calories += log.totalNutrition.calories;
          acc.protein += log.totalNutrition.protein;
          acc.carbs += log.totalNutrition.carbs;
          acc.fat += log.totalNutrition.fat;
          return acc;
        }, { calories: 0, protein: 0, carbs: 0, fat: 0 });
        
        insights.averageDailyCalories = Math.round(totals.calories / logs.length);
        insights.averageProtein = Math.round(totals.protein / logs.length);
        insights.averageCarbs = Math.round(totals.carbs / logs.length);
        insights.averageFat = Math.round(totals.fat / logs.length);
      }
      
      return insights;
    } catch (error) {
      console.error('Error getting nutrition insights:', error);
      return {};
    }
  }
}