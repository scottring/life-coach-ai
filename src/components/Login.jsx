import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

function Login() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          scopes: 'https://www.googleapis.com/auth/gmail.readonly https://www.googleapis.com/auth/calendar.readonly',
          redirectTo: `${window.location.origin}/dashboard`
        }
      });
      
      if (error) throw error;
      
    } catch (error) {
      console.error('Login error:', error);
      setError("Google login not configured. Try email login or use demo mode.");
      setShowEmailForm(true);
    } finally {
      setLoading(false);
    }
  };

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    
    if (isSignUp && password !== confirmPassword) {
      setError("Passwords don't match");
      return;
    }
    
    try {
      setLoading(true);
      setError(null);
      
      if (isSignUp) {
        // Sign up new user
        console.log('Attempting signup with:', { email, password: '***' });
        
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/dashboard`
          }
        });
        
        console.log('Full signup response:', { 
          data, 
          error,
          user: data?.user,
          session: data?.session 
        });
        
        if (error) {
          console.error('Signup error:', error);
          throw error;
        }
        
        if (data.user && !data.session) {
          console.log('User created but no session - email confirmation required');
          setError("Check your email for a confirmation link to complete signup.");
        } else if (data.user && data.session) {
          console.log('User created and logged in immediately:', data.user);
        } else {
          console.log('Unexpected signup response:', data);
        }
      } else {
        // Sign in existing user
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password
        });
        
        if (error) throw error;
      }
      
    } catch (error) {
      console.error('Email auth error:', error);
      setError(error.message || `An error occurred during ${isSignUp ? 'signup' : 'login'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoMode = () => {
    // For demo purposes, just redirect to dashboard
    // The app will use mock data since no real user is authenticated
    window.location.href = '/dashboard';
  };

  const testConnection = async () => {
    try {
      const { data, error } = await supabase.auth.getSession();
      console.log('Current session:', { data, error });
      
      const { data: { user } } = await supabase.auth.getUser();
      console.log('Current user:', user);
    } catch (err) {
      console.error('Connection test failed:', err);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50">
      <div className="w-full max-w-md space-y-8 rounded-lg bg-white p-10 shadow-lg">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">Life Coach AI</h1>
          <p className="mt-2 text-sm text-gray-600">Your intelligent assistant for unified task management</p>
        </div>
        
        <div className="mt-8 space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-sm text-red-700">
              {error}
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
            <p>Demo mode uses mock data to showcase features</p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;