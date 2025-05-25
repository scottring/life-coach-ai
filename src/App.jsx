import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { useAuthState } from './hooks/useAuthState';

// Components
import Login from './components/Login';
import Header from './components/Header';
import MobileNav from './components/MobileNav';

// Pages
import DashboardPage from './pages/DashboardPage';
import FamilyDashboard from './pages/FamilyDashboard';
import TasksPage from './pages/TasksPage';
import GoalsPage from './pages/GoalsPage';
import AnalyticsPage from './pages/AnalyticsPage';
import SettingsPage from './pages/SettingsPage';
import TestPage from './pages/TestPage';
import DailyItinerary from './components/DailyItinerary';
import TravelDashboard from './pages/TravelDashboard';
import CalendarView from './components/CalendarView';

// Providers
import { TaskProvider } from './providers/TaskProvider';
import { GoalProvider } from './providers/GoalProvider';
import { UserContextProvider } from './providers/UserContextProvider';

// MCP Architecture
import { AppContextProvider } from './context/AppContext.jsx';

function AppContent() {
  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true
      }}
    >
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="pb-16 md:pb-0">
          <Routes>
            <Route path="/" element={<DailyItinerary />} />
            <Route path="/today" element={<DailyItinerary />} />
            <Route path="/dashboard" element={<DashboardPage />} />
            <Route path="/dashboard/family" element={<FamilyDashboard />} />
            <Route path="/dashboard/work" element={<DashboardPage />} />
            <Route path="/tasks" element={<TasksPage />} />
            <Route path="/goals" element={<GoalsPage />} />
            <Route path="/travel" element={<TravelDashboard />} />
            <Route path="/calendar" element={<CalendarView />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
        
        {/* Mobile Navigation */}
        <MobileNav />
      </div>
    </BrowserRouter>
  );
}

function App() {
  const { user, loading } = useAuthState();
  
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
            <AppContent />
          </GoalProvider>
        </TaskProvider>
      </UserContextProvider>
    </AppContextProvider>
  );
}

export default App;