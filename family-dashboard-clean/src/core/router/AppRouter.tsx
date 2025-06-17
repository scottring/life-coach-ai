import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../layout/AppLayout';
import { DashboardApp } from '../../apps/dashboard/DashboardApp';
import { SOPManagerApp } from '../../apps/sop-manager/SOPManagerApp';
import { CalendarApp } from '../../apps/calendar/CalendarApp';
import { ProjectsApp } from '../../apps/projects/ProjectsApp';
import { MealPlannerApp } from '../../apps/meal-planner/MealPlannerApp';

interface AppRouterProps {
  contextId: string;
  userId: string;
}

export const AppRouter: React.FC<AppRouterProps> = ({ contextId, userId }) => {
  return (
    <Router>
      <AppLayout contextId={contextId} userId={userId}>
        <Routes>
          {/* Default redirect to dashboard */}
          <Route path="/" element={<Navigate to="/dashboard" replace />} />
          
          {/* App Routes */}
          <Route 
            path="/dashboard" 
            element={<DashboardApp contextId={contextId} userId={userId} />} 
          />
          <Route 
            path="/sop-manager" 
            element={<SOPManagerApp contextId={contextId} userId={userId} />} 
          />
          <Route 
            path="/calendar" 
            element={<CalendarApp contextId={contextId} userId={userId} />} 
          />
          <Route 
            path="/projects" 
            element={<ProjectsApp contextId={contextId} userId={userId} />} 
          />
          <Route 
            path="/meals" 
            element={<MealPlannerApp contextId={contextId} userId={userId} />} 
          />
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppLayout>
    </Router>
  );
};