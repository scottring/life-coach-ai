import React from 'react';
import Dashboard from '../components/Dashboard';
import InsightsPanel from '../components/InsightsPanel';
import CalendarView from '../components/CalendarView';
import ContextManager from '../components/ContextManager';
import { useAppContext } from '../context/AppContext.jsx';

function DashboardPage() {
  const { userContext } = useAppContext();

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Dashboard />
      
      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <CalendarView />
        </div>
        
        <div className="space-y-6">
          <ContextManager />
          <InsightsPanel userContext={userContext} />
        </div>
      </div>
    </div>
  );
}

export default DashboardPage;