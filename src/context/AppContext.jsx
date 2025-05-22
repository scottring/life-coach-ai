import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient';

// Create context object
export const AppContext = createContext();

// Initial context state
const initialContextState = {
  user: null,
  userContext: {
    current_focus: 'Work',
    energy_level: 'Medium',
    available_time: 60
  },
  config: {
    theme: 'light'
  }
};

// Provider component
export const AppContextProvider = ({ children }) => {
  const [context, setContext] = useState(initialContextState);
  const [loading, setLoading] = useState(true);
  
  // Load user information on mount
  useEffect(() => {
    const loadUser = async () => {
      setLoading(true);
      
      try {
        // Check for Supabase user session
        const { data, error } = await supabase.auth.getSession();
        
        if (error) throw error;
        
        if (data?.session?.user) {
          // Real user found
          setContext(prev => ({
            ...prev,
            user: data.session.user
          }));
        } else {
          // User not authenticated
          setContext(prev => ({
            ...prev,
            user: null
          }));
        }
      } catch (error) {
        console.error('Error loading user:', error);
      } finally {
        setLoading(false);
      }
    };
    
    loadUser();
    
    // Set up auth state listener
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setContext(prev => ({
          ...prev,
          user: session?.user || null
        }));
      }
    );
    
    return () => {
      authListener?.subscription?.unsubscribe();
    };
  }, []);
  
  // Update user context
  const updateUserContext = (updates) => {
    setContext(prev => ({
      ...prev,
      userContext: {
        ...prev.userContext,
        ...updates
      }
    }));
  };
  
  // Update config
  const updateConfig = (updates) => {
    setContext(prev => ({
      ...prev,
      config: {
        ...prev.config,
        ...updates
      }
    }));
  };
  
  // Logout user
  const logout = async () => {
    await supabase.auth.signOut();
    
    // Reset to initial state
    setContext({
      ...initialContextState,
      user: null
    });
  };
  
  return (
    <AppContext.Provider 
      value={{ 
        ...context, 
        loading, 
        updateUserContext, 
        updateConfig,
        logout
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

// Custom hook to use the app context
export const useAppContext = () => {
  const context = useContext(AppContext);
  
  if (context === undefined) {
    throw new Error('useAppContext must be used within an AppContextProvider');
  }
  
  return context;
};