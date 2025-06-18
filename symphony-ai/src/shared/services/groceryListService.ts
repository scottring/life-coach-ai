import { collection, addDoc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import { RecipeIngredient } from '../types/recipe';

export interface GroceryListItem {
  id?: string;
  familyId: string;
  item: string;
  quantity: string;
  category: string;
  isCompleted: boolean;
  addedBy: string;
  addedAt: Date;
  completedAt?: Date;
  mealId?: string; // Optional reference to meal that added this item
}

export class GroceryListService {
  static async addIngredientsToGroceryList(
    familyId: string, 
    ingredients: RecipeIngredient[], 
    addedBy: string,
    mealId?: string
  ): Promise<string[]> {
    try {
      const addedIds: string[] = [];
      
      for (const ingredient of ingredients) {
        const groceryItem: Omit<GroceryListItem, 'id'> = {
          familyId,
          item: ingredient.item,
          quantity: ingredient.quantity,
          category: ingredient.category,
          isCompleted: false,
          addedBy,
          addedAt: new Date(),
          mealId
        };
        
        const docRef = await addDoc(collection(db, 'grocery_list'), {
          ...groceryItem,
          addedAt: Timestamp.fromDate(groceryItem.addedAt)
        });
        
        addedIds.push(docRef.id);
      }
      
      return addedIds;
    } catch (error) {
      console.error('Error adding ingredients to grocery list:', error);
      throw error;
    }
  }

  static async getGroceryList(familyId: string): Promise<GroceryListItem[]> {
    try {
      const q = query(
        collection(db, 'grocery_list'),
        where('familyId', '==', familyId),
        orderBy('addedAt', 'desc')
      );
      
      const querySnapshot = await getDocs(q);
      return querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        addedAt: doc.data().addedAt?.toDate() || new Date(),
        completedAt: doc.data().completedAt?.toDate()
      })) as GroceryListItem[];
    } catch (error) {
      console.error('Error fetching grocery list:', error);
      throw error;
    }
  }

  static async toggleItemCompleted(itemId: string, isCompleted: boolean): Promise<void> {
    try {
      const itemRef = collection(db, 'grocery_list');
      // Note: This would need updateDoc import and proper implementation
      console.log('Toggle item completed:', itemId, isCompleted);
      // TODO: Implement with updateDoc when needed
    } catch (error) {
      console.error('Error toggling grocery item:', error);
      throw error;
    }
  }
}