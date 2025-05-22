import React, { createContext, useState, useContext, useEffect } from 'react';
import { useAuthState } from '../hooks/useAuthState';
import { supabase } from '../lib/supabaseClient';
import { UserContext as UserContextModel } from '../models/UserContext';

// Create context
const UserContextContext = createContext();

// Provider component
export const UserContextProvider = ({ children }) => {
  const { user } = useAuthState();
  const [context, setContext] = useState({
    current_focus: 'Work',
    energy_level: 'Medium',
    available_time: 60
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  const userId = user?.id;
  
  // Load context when user changes
  useEffect(() => {
    const loadContext = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }
      
      setLoading(true);
      
      try {
        // Get the most recent context for the user
        const { data, error } = await supabase
          .from('user_contexts')
          .select('*')
          .eq('user_id', userId)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();
        
        if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
          throw error;
        }
        
        if (data) {
          const userContext = UserContextModel.fromDB(data);
          setContext({
            current_focus: userContext.current_focus,
            energy_level: userContext.energy_level,
            available_time: userContext.available_time
          });
        }
      } catch (error) {
        console.error('Error loading user context:', error);
        // Keep default context on error
      } finally {
        setLoading(false);
      }
    };
    
    loadContext();
  }, [userId]);
  
  // Update a field in the context
  const updateContextField = async (field, value) => {
    if (!userId) return null;
    
    setSaving(true);
    
    try {
      const newContext = { ...context, [field]: value };
      
      const contextModel = new UserContextModel({
        user_id: userId,
        ...newContext
      });
      
      const { data, error } = await supabase
        .from('user_contexts')
        .insert([contextModel.toDB()])
        .select()
        .single();
        
      if (error) throw error;
      
      const updatedContext = UserContextModel.fromDB(data);
      setContext({
        current_focus: updatedContext.current_focus,
        energy_level: updatedContext.energy_level,
        available_time: updatedContext.available_time
      });
      
      return updatedContext;
    } catch (error) {
      console.error(`Error updating ${field}:`, error);
      // Update local state even if DB update fails
      setContext(prev => ({ ...prev, [field]: value }));
      return null;
    } finally {
      setSaving(false);
    }
  };
  
  // Update multiple fields
  const updateContext = async (updates) => {
    if (!userId) return null;
    
    setSaving(true);
    
    try {
      const newContext = { ...context, ...updates };
      
      const contextModel = new UserContextModel({
        user_id: userId,
        ...newContext
      });
      
      const { data, error } = await supabase
        .from('user_contexts')
        .insert([contextModel.toDB()])
        .select()
        .single();
        
      if (error) throw error;
      
      const updatedContext = UserContextModel.fromDB(data);
      setContext({
        current_focus: updatedContext.current_focus,
        energy_level: updatedContext.energy_level,
        available_time: updatedContext.available_time
      });
      
      return updatedContext;
    } catch (error) {
      console.error('Error updating context:', error);
      // Update local state even if DB update fails
      setContext(prev => ({ ...prev, ...updates }));
      return null;
    } finally {
      setSaving(false);
    }
  };
  
  // Get context history for analytics
  const getContextHistory = async (days = 7) => {
    if (!userId) return [];
    
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      
      const { data, error } = await supabase
        .from('user_contexts')
        .select('*')
        .eq('user_id', userId)
        .gte('updated_at', startDate.toISOString())
        .order('updated_at', { ascending: true });
        
      if (error) throw error;
      
      return (data || []).map(ctx => UserContextModel.fromDB(ctx));
    } catch (error) {
      console.error('Error getting context history:', error);
      return [];
    }
  };
  
  // Provider value
  const value = {
    context,
    loading,
    saving,
    updateContextField,
    updateContext,
    getContextHistory
  };
  
  return (
    <UserContextContext.Provider value={value}>
      {children}
    </UserContextContext.Provider>
  );
};

// Custom hook to use the user context
export const useUserContext = () => {
  const context = useContext(UserContextContext);
  
  if (context === undefined) {
    throw new Error('useUserContext must be used within a UserContextProvider');
  }
  
  return context;
};