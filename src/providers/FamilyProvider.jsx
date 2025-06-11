import React, { createContext, useContext, useReducer, useEffect, useCallback } from 'react';
import { FirebaseFamilyAdapter as FamilyAdapter } from '../adapters/FirebaseFamilyAdapter';

const FamilyContext = createContext();

const initialState = {
  currentFamily: null,
  families: [],
  familyMembers: [],
  familyMeals: [],
  familyTasks: [],
  familyGoals: [],
  familyMilestones: [],
  shoppingItems: [],
  loading: false,
  error: null
};

function familyReducer(state, action) {
  switch (action.type) {
    case 'SET_LOADING':
      return { ...state, loading: action.payload };
    case 'SET_ERROR':
      return { ...state, error: action.payload, loading: false };
    case 'SET_CURRENT_FAMILY':
      return { ...state, currentFamily: action.payload };
    case 'SET_FAMILIES':
      return { ...state, families: action.payload };
    case 'SET_FAMILY_MEMBERS':
      return { ...state, familyMembers: action.payload };
    case 'SET_FAMILY_MEALS':
      return { ...state, familyMeals: action.payload };
    case 'SET_FAMILY_TASKS':
      return { ...state, familyTasks: action.payload };
    case 'SET_FAMILY_GOALS':
      return { ...state, familyGoals: action.payload };
    case 'SET_FAMILY_MILESTONES':
      return { ...state, familyMilestones: action.payload };
    case 'SET_SHOPPING_ITEMS':
      return { ...state, shoppingItems: action.payload };
    case 'ADD_FAMILY_MEAL':
      return { ...state, familyMeals: [...state.familyMeals, action.payload] };
    case 'UPDATE_FAMILY_MEAL':
      return {
        ...state,
        familyMeals: state.familyMeals.map(meal =>
          meal.id === action.payload.id ? action.payload : meal
        )
      };
    case 'DELETE_FAMILY_MEAL':
      return {
        ...state,
        familyMeals: state.familyMeals.filter(meal => meal.id !== action.payload)
      };
    case 'ADD_SHOPPING_ITEM':
      return { ...state, shoppingItems: [...state.shoppingItems, action.payload] };
    case 'UPDATE_SHOPPING_ITEM':
      return {
        ...state,
        shoppingItems: state.shoppingItems.map(item =>
          item.id === action.payload.id ? action.payload : item
        )
      };
    case 'DELETE_SHOPPING_ITEM':
      return {
        ...state,
        shoppingItems: state.shoppingItems.filter(item => item.id !== action.payload)
      };
    default:
      return state;
  }
}

export function FamilyProvider({ children }) {
  const [state, dispatch] = useReducer(familyReducer, initialState);

  const loadFamilyData = useCallback(async (familyId) => {
    try {
      dispatch({ type: 'SET_LOADING', payload: true });
      
      // Try to load data from Supabase, but fallback to empty arrays if database isn't set up yet
      let meals = [], tasks = [], goals = [], milestones = [], members = [], shoppingItems = [];
      
      try {
        [meals, tasks, goals, milestones, members, shoppingItems] = await Promise.all([
          FamilyAdapter.getFamilyMeals(familyId),
          FamilyAdapter.getFamilyTasks(familyId),
          FamilyAdapter.getFamilyGoals(familyId),
          FamilyAdapter.getFamilyMilestones(familyId),
          FamilyAdapter.getFamilyMembers(familyId),
          FamilyAdapter.getShoppingItems(familyId)
        ]);
      } catch (dbError) {
        console.warn('Database not fully configured, using empty data:', dbError.message);
        // Use empty arrays as fallback - the components will handle empty state
      }

      dispatch({ type: 'SET_FAMILY_MEALS', payload: meals });
      dispatch({ type: 'SET_FAMILY_TASKS', payload: tasks });
      dispatch({ type: 'SET_FAMILY_GOALS', payload: goals });
      dispatch({ type: 'SET_FAMILY_MILESTONES', payload: milestones });
      dispatch({ type: 'SET_FAMILY_MEMBERS', payload: members });
      dispatch({ type: 'SET_SHOPPING_ITEMS', payload: shoppingItems });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, []);

  const createFamilyMeal = async (mealData) => {
    try {
      const newMeal = await FamilyAdapter.createFamilyMeal(mealData);
      dispatch({ type: 'ADD_FAMILY_MEAL', payload: newMeal });
      return newMeal;
    } catch (error) {
      console.warn('Database operation failed:', error.message);
      dispatch({ type: 'SET_ERROR', payload: 'Database not configured. Please set up Supabase connection.' });
      throw error;
    }
  };

  const updateFamilyMeal = async (mealId, mealData) => {
    try {
      const updatedMeal = await FamilyAdapter.updateFamilyMeal(mealId, mealData);
      dispatch({ type: 'UPDATE_FAMILY_MEAL', payload: updatedMeal });
      return updatedMeal;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const deleteFamilyMeal = async (mealId) => {
    try {
      await FamilyAdapter.deleteFamilyMeal(mealId);
      dispatch({ type: 'DELETE_FAMILY_MEAL', payload: mealId });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const createShoppingItem = async (itemData) => {
    try {
      const newItem = await FamilyAdapter.createShoppingItem(itemData);
      dispatch({ type: 'ADD_SHOPPING_ITEM', payload: newItem });
      return newItem;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const updateShoppingItem = async (itemId, itemData) => {
    try {
      const updatedItem = await FamilyAdapter.updateShoppingItem(itemId, itemData);
      dispatch({ type: 'UPDATE_SHOPPING_ITEM', payload: updatedItem });
      return updatedItem;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const deleteShoppingItem = async (itemId) => {
    try {
      await FamilyAdapter.deleteShoppingItem(itemId);
      dispatch({ type: 'DELETE_SHOPPING_ITEM', payload: itemId });
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const createFamilyTask = async (taskData) => {
    try {
      const newTask = await FamilyAdapter.createFamilyTask(taskData);
      dispatch({ type: 'SET_FAMILY_TASKS', payload: [...state.familyTasks, newTask] });
      return newTask;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const updateFamilyTask = async (taskId, taskData) => {
    try {
      const updatedTask = await FamilyAdapter.updateFamilyTask(taskId, taskData);
      dispatch({ 
        type: 'SET_FAMILY_TASKS', 
        payload: state.familyTasks.map(task => task.id === taskId ? updatedTask : task)
      });
      return updatedTask;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const createFamilyGoal = async (goalData) => {
    try {
      const newGoal = await FamilyAdapter.createFamilyGoal(goalData);
      dispatch({ type: 'SET_FAMILY_GOALS', payload: [...state.familyGoals, newGoal] });
      return newGoal;
    } catch (error) {
      console.warn('Database operation failed:', error.message);
      dispatch({ type: 'SET_ERROR', payload: 'Database not configured. Please set up Supabase connection.' });
      throw error;
    }
  };

  const updateFamilyGoal = async (goalId, goalData) => {
    try {
      const updatedGoal = await FamilyAdapter.updateFamilyGoal(goalId, goalData);
      dispatch({ 
        type: 'SET_FAMILY_GOALS', 
        payload: state.familyGoals.map(goal => goal.id === goalId ? updatedGoal : goal)
      });
      return updatedGoal;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const addFamilyMember = async (memberData) => {
    try {
      const newMember = await FamilyAdapter.createFamilyMember(memberData);
      dispatch({ 
        type: 'SET_FAMILY_MEMBERS', 
        payload: [...state.familyMembers, newMember]
      });
      return newMember;
    } catch (error) {
      dispatch({ type: 'SET_ERROR', payload: error.message });
      throw error;
    }
  };

  const value = {
    ...state,
    loadFamilyData,
    createFamilyMeal,
    updateFamilyMeal,
    deleteFamilyMeal,
    createShoppingItem,
    updateShoppingItem,
    deleteShoppingItem,
    createFamilyTask,
    updateFamilyTask,
    createFamilyGoal,
    updateFamilyGoal,
    addFamilyMember
  };

  return (
    <FamilyContext.Provider value={value}>
      {children}
    </FamilyContext.Provider>
  );
}

export function useFamily() {
  const context = useContext(FamilyContext);
  if (!context) {
    throw new Error('useFamily must be used within a FamilyProvider');
  }
  return context;
}