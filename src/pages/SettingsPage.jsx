import React, { Suspense } from 'react';
import Settings from '../components/Settings';
import IntegrationsManager from '../components/IntegrationsManager';

// Lazy load the GoogleCalendarTest component to avoid SSR issues
const GoogleCalendarTest = React.lazy(() => import('../components/GoogleCalendarTest'));

function SettingsPage() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
      
      <div className="mt-6 space-y-8">
        <IntegrationsManager />
        
        <Suspense fallback={
          <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
            <div className="text-center text-gray-500">Loading Google Calendar Test...</div>
          </div>
        }>
          <GoogleCalendarTest />
        </Suspense>
        
        <Settings />
      </div>
    </div>
  );
}

export default SettingsPage;