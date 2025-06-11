import React, { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import EnhancedMealPlanner from './components/EnhancedMealPlanner';

function App() {
  const { user, loading, signInWithGoogle, signInWithEmail, signOut } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [demoMode, setDemoMode] = useState(false);

  // Demo mode for testing without authentication
  const demoUser = { id: 'demo-user', email: 'demo@example.com', name: 'Demo User' };
  const demoFamilyId = 'demo-family-123';

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Family Dashboard</h1>
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
            <h1 className="text-3xl font-bold text-gray-900">Family Dashboard</h1>
            <p className="mt-2 text-sm text-gray-600">Clean Firebase-powered family management</p>
          </div>
          
          <div className="mt-8 space-y-6">
            <div className="space-y-4">
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
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500"
                />
              </div>
              
              <button
                onClick={() => signInWithEmail(email, password)}
                className="w-full bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
              >
                Sign In
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
          </div>
        </div>
      </div>
    );
  }

  const currentUser = user || demoUser;
  const currentFamilyId = demoMode ? demoFamilyId : 'family-123'; // In real app, get from user's families

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Family Dashboard</h1>
              <p className="text-sm text-gray-600">Welcome back, {currentUser.name}!</p>
            </div>
            <div className="flex items-center space-x-4">
              {demoMode && (
                <span className="bg-green-100 text-green-800 text-xs font-medium px-2.5 py-0.5 rounded">
                  Demo Mode
                </span>
              )}
              <button
                onClick={demoMode ? () => setDemoMode(false) : signOut}
                className="text-gray-700 hover:text-gray-900 text-sm font-medium"
              >
                {demoMode ? 'Exit Demo' : 'Sign Out'}
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <EnhancedMealPlanner familyId={currentFamilyId} userId={currentUser.id} />
      </main>
    </div>
  );
}

export default App;