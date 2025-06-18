import React, { useState, useEffect } from 'react';
import { useAuth } from './shared/hooks/useAuth';
import { AppRouter } from './core/router/AppRouter';
import { Context } from './shared/types/context';
import { contextService } from './shared/services/contextService';

function App() {
  const { user, loading, signInWithGoogle, signInWithEmail, signUpWithEmail, signOut, error } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [demoMode, setDemoMode] = useState(false);
  const [activeContext, setActiveContext] = useState<Context | null>(null);
  const [contextLoading, setContextLoading] = useState(false);

  // Demo mode for testing without authentication
  const demoUser = { id: 'demo-user', email: 'demo@example.com', name: 'Demo User' };
  const demoFamilyId = 'demo-family-123';

  // Initialize user's default context when they log in
  useEffect(() => {
    const initializeUserContext = async () => {
      if (user && !demoMode) {
        setContextLoading(true);
        
        // Set a timeout to avoid getting stuck
        const timeout = setTimeout(() => {
          console.log('⏰ Context initialization timeout, falling back to demo mode');
          setDemoMode(true);
          setContextLoading(false);
        }, 5000); // 5 second timeout

        try {
          console.log('🔍 Initializing context for user:', user.id);
          const contexts = await contextService.getContextsForUser(user.id);
          console.log('📋 Found contexts:', contexts.length);
          
          if (contexts.length === 0) {
            console.log('🏗️ Creating default family context...');
            // Create default family context for new users
            const defaultContext = await contextService.createDefaultFamilyContext(user.id);
            setActiveContext(defaultContext);
            console.log('✅ Created default context:', defaultContext.id);
          } else {
            setActiveContext(contexts[0]);
            console.log('✅ Using existing context:', contexts[0].id);
          }
          clearTimeout(timeout);
          setContextLoading(false);
        } catch (error) {
          console.error('❌ Error initializing user context:', error);
          console.log('🎭 Falling back to demo mode due to Firebase error');
          clearTimeout(timeout);
          setDemoMode(true);
          setContextLoading(false);
        }
      }
    };

    initializeUserContext();
  }, [user, demoMode]);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h1 className="text-2xl font-bold text-gray-800">Symphony</h1>
          <p className="mt-2 text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user && !demoMode) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-10 shadow-lg">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Symphony</h1>
            <p className="mt-2 text-sm text-gray-600">Your personal life operating system</p>
          </div>
          
          <div className="mt-8 space-y-6">
            {error && (
              <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
                {error}
              </div>
            )}
            
            <div className="text-center mb-4">
              <div className="flex rounded-md border border-gray-200 p-1">
                <button
                  type="button"
                  onClick={() => setIsSignUp(false)}
                  className={`flex-1 rounded py-2 text-sm font-medium ${
                    !isSignUp 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Sign In
                </button>
                <button
                  type="button"
                  onClick={() => setIsSignUp(true)}
                  className={`flex-1 rounded py-2 text-sm font-medium ${
                    isSignUp 
                      ? 'bg-blue-600 text-white' 
                      : 'text-gray-700 hover:bg-gray-50'
                  }`}
                >
                  Sign Up
                </button>
              </div>
            </div>

            <div className="space-y-4">
              {isSignUp && (
                <div>
                  <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                    Full Name
                  </label>
                  <input
                    id="displayName"
                    name="displayName"
                    type="text"
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>
              )}
              
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
                {isSignUp && (
                  <p className="mt-1 text-xs text-gray-500">At least 6 characters</p>
                )}
              </div>
              
              {isSignUp && (
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                    Confirm Password
                  </label>
                  <input
                    id="confirmPassword"
                    name="confirmPassword"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                  />
                </div>
              )}
              
              <button
                onClick={async () => {
                  try {
                    if (isSignUp) {
                      if (password !== confirmPassword) {
                        alert("Passwords don't match");
                        return;
                      }
                      await signUpWithEmail(email, password, displayName);
                    } else {
                      await signInWithEmail(email, password);
                    }
                  } catch (error) {
                    console.error('Authentication error:', error);
                  }
                }}
                disabled={loading}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-blue-300"
              >
                {loading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Create Account' : 'Sign In')}
              </button>
            </div>
            
            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-300" />
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="bg-white px-2 text-gray-500">Or</span>
              </div>
            </div>
            
            <button
              onClick={signInWithGoogle}
              className="w-full bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700"
            >
              Continue with Google
            </button>
            
            <button
              onClick={() => setDemoMode(true)}
              className="w-full border border-green-300 bg-green-50 text-green-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-green-100"
            >
              Try Demo Mode
            </button>
            
            <div className="text-center text-sm text-gray-600">
              <p>Have an invitation code?</p>
              <button
                onClick={() => {
                  const code = window.prompt('Enter your family invitation code:');
                  if (code) {
                    alert(`To join a family:\n1. Create an account or sign in\n2. Go to Settings\n3. Use code: ${code}\n\nFor demo: Use demo mode and check console for invitation codes.`);
                  }
                }}
                className="text-blue-600 hover:text-blue-800 font-medium"
              >
                Join Family
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const currentUser = user || demoUser;
  const currentContextId = demoMode ? demoFamilyId : activeContext?.id || '';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="w-full px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <img 
                src="/color-tree.jpg" 
                alt="Symphony Logo" 
                className="w-12 h-12 rounded-lg object-cover"
              />
              <div className="flex flex-col">
                <h1 className="text-xl font-bold text-gray-900">Symphony</h1>
                <p className="text-xs text-gray-500">Personal Operating System</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              {demoMode && (
                <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                  Demo Mode
                </span>
              )}
              
              {/* User Profile Section */}
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-medium">
                      {currentUser.name?.charAt(0)?.toUpperCase() || 'U'}
                    </span>
                  </div>
                  <span className="text-sm font-medium text-gray-700">
                    {currentUser.name}
                  </span>
                </div>
                <div className="h-6 border-l border-gray-300"></div>
                <button
                  onClick={demoMode ? () => setDemoMode(false) : signOut}
                  className="text-gray-700 hover:text-gray-900 text-sm font-medium"
                >
                  {demoMode ? 'Exit Demo' : 'Sign Out'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      {currentContextId ? (
        <AppRouter
          contextId={currentContextId}
          userId={currentUser.id}
        />
      ) : (
        <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              {contextLoading ? (
                <>
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                  <h3 className="text-lg font-medium text-gray-900">Setting up your workspace...</h3>
                  <p className="text-gray-500">Please wait while we initialize your account</p>
                </>
              ) : (
                <>
                  <h3 className="text-lg font-medium text-gray-900">Unable to connect to Firebase</h3>
                  <p className="text-gray-500 mb-4">There seems to be an issue with the Firebase configuration</p>
                  <button
                    onClick={() => setDemoMode(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Continue in Demo Mode
                  </button>
                </>
              )}
            </div>
          </div>
        </main>
      )}
    </div>
  );
}

export default App;