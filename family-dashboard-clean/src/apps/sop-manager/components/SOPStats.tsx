import React from 'react';
import { SOP } from '../../../shared/types/sop';

interface SOPStatsProps {
  sops: SOP[];
}

export const SOPStats: React.FC<SOPStatsProps> = ({ sops }) => {
  const totalSOPs = sops.length;
  const activeSOPs = sops.filter(sop => sop.status === 'active').length;
  const avgDuration = sops.length > 0 
    ? Math.round(sops.reduce((sum, sop) => sum + sop.estimatedDuration, 0) / sops.length)
    : 0;

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6">
      <h3 className="font-medium text-gray-900 mb-4">SOP Statistics</h3>
      <div className="space-y-3">
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Total SOPs</span>
          <span className="text-sm font-medium text-gray-900">{totalSOPs}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Active SOPs</span>
          <span className="text-sm font-medium text-green-600">{activeSOPs}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-sm text-gray-600">Average Duration</span>
          <span className="text-sm font-medium text-gray-900">{avgDuration} min</span>
        </div>
      </div>
    </div>
  );
};