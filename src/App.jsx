import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthState } from './hooks/useAuthState';
import { useAIAssistant } from './hooks/useAIAssistant';

// Components
import Login from './components/Login';
import Header from './components/Header';
import ContextBar from './components/ContextBar';
import AIAssistant from './components/AIAssistant';

// Pages
import DashboardPage from './pages/DashboardPage';
import FamilyDashboard from './pages/FamilyDashboard';
import TasksPage from './pages/TasksPage';
import GoalsPage from './pages/GoalsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import TestPage from './pages/TestPage';

// Providers
import { TaskProvider } from './providers/TaskProvider';
import { GoalProvider } from './providers/GoalProvider';
import { UserContextProvider } from './providers/UserContextProvider';

// MCP Architecture
import { AppContextProvider } from './context/AppContext.jsx';

function App() {
  const { user, loading } = useAuthState();
  const { isAssistantOpen, assistantContext, openAssistant, closeAssistant } = useAIAssistant();
  
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-800">Life Coach AI</h1>
          <p className="mt-2 text-gray-500">Loading your experience...</p>
        </div>
      </div>
    );
  }
  
  // Use authentication to control access to the app
  if (!user) {
    return <Login />;
  }
  
  // Return the app after successful authentication
  return (
    <AppContextProvider>
      <UserContextProvider>
        <TaskProvider>
          <GoalProvider>
            <BrowserRouter
              future={{
                v7_startTransition: true,
                v7_relativeSplatPath: true
              }}
            >
              <div className="min-h-screen bg-gray-50">
                <Header />
                <ContextBar />
                <main className="pb-12">
                  <Routes>
                    <Route path="/" element={<DashboardPage />} />
                    <Route path="/dashboard" element={<DashboardPage />} />
                    <Route path="/dashboard/family" element={<FamilyDashboard />} />
                    <Route path="/dashboard/work" element={<DashboardPage />} />
                    <Route path="/tasks" element={<TasksPage />} />
                    <Route path="/goals" element={<GoalsPage />} />
                    <Route path="/analytics" element={<AnalyticsPage />} />
                    <Route path="/settings" element={<SettingsPage />} />
                  </Routes>
                </main>
                
                {/* Global AI Assistant */}
                {!isAssistantOpen && (
                  <button
                    onClick={() => openAssistant()}
                    className="fixed bottom-4 right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-blue-600 text-white shadow-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.959 8.959 0 01-2.646-.4c-.9.35-1.89.4-2.846.4-1.25 0-2.455-.2-3.57-.57a8.996 8.996 0 01-3.93-3.93C.2 12.455 0 11.25 0 10c0-.956.05-1.946.4-2.846A8.959 8.959 0 014 4c4.418 0 8 3.582 8 8z" />
                    </svg>
                  </button>
                )}
                
                {isAssistantOpen && (
                  <AIAssistant
                    initialContext={assistantContext}
                    onClose={closeAssistant}
                    onActionComplete={(action, data) => {
                      console.log('Assistant completed action:', action, data);
                    }}
                  />
                )}
              </div>
            </BrowserRouter>
          </GoalProvider>
        </TaskProvider>
      </UserContextProvider>
    </AppContextProvider>
  );
}

export default App;