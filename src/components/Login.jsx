import React, { useState } from 'react';
import { useFirebaseAuth } from '../hooks/useFirebaseAuth';

function Login() {
  const { signInWithEmail, signUpWithEmail, signInWithGoogle, loading: authLoading, error: authError } = useFirebaseAuth();
  const [error, setError] = useState(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');

  const loading = authLoading;

  const handleGoogleLogin = async () => {
    try {
      setError(null);
      await signInWithGoogle();
    } catch (error) {
      console.error('Google login error:', error);
      setError("Google login failed. Try email login instead.");
      setShowEmailForm(true);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    
    if (isSignUp && password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    
    try {
      setError(null);
      
      if (isSignUp) {
        // Sign up new user
        await signUpWithEmail(email, password, displayName);
      } else {
        // Sign in existing user
        await signInWithEmail(email, password);
      }
    } catch (error) {
      console.error('Auth error:', error);
      setError(error.message || 'Authentication failed');
    }
  };

  const handleDemoMode = () => {
    // For demo purposes, create a temporary demo user
    console.log('Demo mode activated - using demo data');
    // You could set up demo auth here if needed
    window.location.href = '/dashboard';
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-10 shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Life Coach AI</h1>
          <p className="mt-2 text-sm text-gray-600">Your intelligent assistant for unified task management</p>
        </div>
        
        <div className="mt-8 space-y-6">
          {(error || authError) && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
              {error || authError}
            </div>
          )}
          
          {!showEmailForm ? (
            <>
              <button
                onClick={handleGoogleLogin}
                disabled={loading}
                className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300"
              >
                {loading ? 'Connecting...' : 'Continue with Google'}
              </button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="bg-white px-2 text-gray-500">Or</span>
                </div>
              </div>
              
              <button
                onClick={() => setShowEmailForm(true)}
                className="group relative flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                Sign in with Email
              </button>
              
              <button
                onClick={handleDemoMode}
                className="group relative flex w-full justify-center rounded-md border border-green-300 bg-green-50 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-100 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
              >
                Try Demo Mode
              </button>
            </>
          ) : (
            <form onSubmit={handleEmailAuth} className="space-y-4">
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
                type="submit"
                disabled={loading}
                className="group relative flex w-full justify-center rounded-md border border-transparent bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:bg-blue-300"
              >
                {loading ? (isSignUp ? 'Creating account...' : 'Signing in...') : (isSignUp ? 'Create Account' : 'Sign In')}
              </button>
              
              <button
                type="button"
                onClick={() => setShowEmailForm(false)}
                className="group relative flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Back to other options
              </button>
            </form>
          )}
          
          <div className="text-center text-xs text-gray-500">
            <p>Demo mode uses Firebase with mock data to showcase features</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;