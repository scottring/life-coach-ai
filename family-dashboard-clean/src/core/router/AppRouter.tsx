import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AppLayout } from '../layout/AppLayout';
import { DashboardApp } from '../../apps/dashboard/DashboardApp';
import { SOPManagerApp } from '../../apps/sop-manager/SOPManagerApp';
import { CalendarApp } from '../../apps/calendar/CalendarApp';
import { ProjectsApp } from '../../apps/projects/ProjectsApp';
import { MealPlannerApp } from '../../apps/meal-planner/MealPlannerApp';
import { FinanceApp } from '../../apps/finance/FinanceApp';
import { SettingsApp } from '../../apps/settings/SettingsApp';
import { TodayView } from '../../apps/today/TodayView';
import { PlanningView } from '../../apps/planning/PlanningView';
import { CaptureView } from '../../apps/capture/CaptureView';

interface AppRouterProps {
  contextId: string;
  userId: string;
}

export const AppRouter: React.FC<AppRouterProps> = ({ contextId, userId }) => {
  return (
    <Router>
      <AppLayout contextId={contextId} userId={userId}>
        <Routes>
          {/* Default redirect to today */}
          <Route path="/" element={<Navigate to="/today" replace />} />
          
          {/* App Routes */}
          <Route 
            path="/today" 
            element={<TodayView contextId={contextId} userId={userId} />} 
          />
          <Route 
            path="/planning" 
            element={<PlanningView contextId={contextId} userId={userId} />} 
          />
          <Route 
            path="/capture" 
            element={<CaptureView contextId={contextId} userId={userId} />} 
          />
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
          <Route 
            path="/finance" 
            element={<FinanceApp contextId={contextId} userId={userId} />} 
          />
          <Route 
            path="/settings" 
            element={<SettingsApp contextId={contextId} userId={userId} />} 
          />
          
          {/* Catch all */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </AppLayout>
    </Router>
  );
};