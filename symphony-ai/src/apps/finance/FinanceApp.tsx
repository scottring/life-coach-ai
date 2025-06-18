import React from 'react';
import { CurrencyDollarIcon } from '@heroicons/react/24/outline';

interface FinanceAppProps {
  contextId: string;
  userId: string;
}

export const FinanceApp: React.FC<FinanceAppProps> = ({ contextId, userId }) => {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <div className="p-4 bg-green-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
            <CurrencyDollarIcon className="w-8 h-8 text-green-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Finance Manager</h1>
          <p className="text-gray-500">Personal finance tracking and budgeting coming soon</p>
        </div>
      </div>
    </div>
  );
};