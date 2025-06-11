import { useFirebaseAuth } from './useFirebaseAuth';

export function useAuthState() {
  const { user, loading, signOut, error } = useFirebaseAuth();

  // Transform Firebase user to match expected format
  const transformedUser = user ? {
    id: user.uid,
    email: user.email,
    name: user.displayName || user.email?.split('@')[0] || 'User',
    photoURL: user.photoURL
  } : null;

  return { 
    user: transformedUser, 
    loading, 
    signOut,
    error 
  };
}