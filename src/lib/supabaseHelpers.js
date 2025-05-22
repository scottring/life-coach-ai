import { supabase } from './supabaseClient';

// Helper function to get the current user
export async function getCurrentUser() {
  try {
    // First check if there's a session
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.error('Error getting session:', sessionError);
      return null;
    }
    
    if (sessionData?.session?.user) {
      return sessionData.session.user;
    }
    
    // If no session, attempt to get user
    const { data: userData, error: userError } = await supabase.auth.getUser();
    
    if (userError) {
      console.error('Error getting user:', userError);
      return null;
    }
    
    return userData?.user || null;
  } catch (error) {
    console.error('Error in getCurrentUser:', error);
    return null;
  }
}

// For development, return a mock user
export function getMockUser() {
  return {
    id: 'mock-user-id',
    email: 'user@example.com',
    user_metadata: {
      full_name: 'Development User'
    }
  };
}

// Get user - either real or mock depending on development mode
export async function getUser(useMockData = true) {
  if (useMockData) {
    return getMockUser();
  }
  
  const user = await getCurrentUser();
  return user || getMockUser();
}