import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth } from '../lib/firebaseClient';
import { onAuthStateChanged, signOut } from 'firebase/auth';

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
    setLoading(true);
    
    // Set up Firebase auth state listener
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setContext(prev => ({
        ...prev,
        user: user ? {
          id: user.uid,
          email: user.email,
          name: user.displayName || user.email?.split('@')[0] || 'User'
        } : null
      }));
      setLoading(false);
    });
    
    return unsubscribe;
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
    try {
      await signOut(auth);
      // Reset to initial state
      setContext({
        ...initialContextState,
        user: null
      });
    } catch (error) {
      console.error('Error signing out:', error);
    }
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