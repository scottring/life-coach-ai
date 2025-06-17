import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import DashboardLayout from './DashboardLayout';
import SOPManagerPage from '../pages/SOPManagerPage';
import SymphonyDashboard from './SymphonyDashboard';

interface AppRouterProps {
  contextId: string;
  userId: string;
  refreshTrigger: number;
  onDataChange: () => void;
}

const AppRouter: React.FC<AppRouterProps> = ({
  contextId,
  userId,
  refreshTrigger,
  onDataChange
}) => {
  return (
    <Router>
      <Routes>
        {/* Main Dashboard Route */}
        <Route path="/" element={<Navigate to="/dashboard" replace />} />
        <Route 
          path="/dashboard" 
          element={
            <DashboardLayout contextId={contextId} userId={userId}>
              <SymphonyDashboard
                contextId={contextId}
                userId={userId}
                refreshTrigger={refreshTrigger}
                onDataChange={onDataChange}
              />
            </DashboardLayout>
          } 
        />
        
        {/* SOP Manager App */}
        <Route 
          path="/sop-manager" 
          element={
            <SOPManagerPage 
              contextId={contextId} 
              userId={userId} 
            />
          } 
        />
        
        {/* Future App Routes */}
        <Route 
          path="/calendar" 
          element={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900">Calendar App</h1>
                <p className="text-gray-500 mt-2">Coming Soon</p>
              </div>
            </div>
          } 
        />
        
        <Route 
          path="/projects" 
          element={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900">Project Manager</h1>
                <p className="text-gray-500 mt-2">Coming Soon</p>
              </div>
            </div>
          } 
        />
        
        <Route 
          path="/meals" 
          element={
            <div className="min-h-screen bg-gray-50 flex items-center justify-center">
              <div className="text-center">
                <h1 className="text-2xl font-bold text-gray-900">Meal Planner</h1>
                <p className="text-gray-500 mt-2">Coming Soon</p>
              </div>
            </div>
          } 
        />
        
        {/* Catch all route */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </Router>
  );
};

export default AppRouter;