import React, { useState, useEffect, useCallback } from 'react';
import { 
  PlusIcon, 
  CalendarIcon,
  ChartBarIcon,
  ClockIcon,
  FolderIcon
} from '@heroicons/react/24/outline';
import { SOPList } from './components/SOPList';
import { CreateSOPModal } from './components/CreateSOPModal';
import { ConnectedApps } from './components/ConnectedApps';
import { SOPStats } from './components/SOPStats';
import { SOP } from '../../shared/types/sop';
import { sopService } from '../../shared/services/sopService';

interface SOPManagerAppProps {
  contextId: string;
  userId: string;
}

export const SOPManagerApp: React.FC<SOPManagerAppProps> = ({ 
  contextId, 
  userId 
}) => {
  const [sops, setSOPs] = useState<SOP[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSOP, setEditingSOP] = useState<SOP | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const loadSOPs = useCallback(async () => {
    try {
      setLoading(true);
      const sopsData = await sopService.getSOPsForContext(contextId);
      setSOPs(sopsData);
    } catch (error) {
      console.error('Error loading SOPs:', error);
    } finally {
      setLoading(false);
    }
  }, [contextId]);

  useEffect(() => {
    loadSOPs();
  }, [loadSOPs]);

  useEffect(() => {
    if (refreshTrigger > 0) {
      loadSOPs();
    }
  }, [refreshTrigger, loadSOPs]);

  const handleSOPCreated = () => {
    setShowCreateModal(false);
    setEditingSOP(null);
    setRefreshTrigger(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-3 bg-blue-100 rounded-xl">
              <FolderIcon className="w-8 h-8 text-blue-600" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">SOP Manager</h1>
              <p className="text-gray-600">Create, manage, and execute your standard operating procedures</p>
            </div>
          </div>
          
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            <PlusIcon className="w-5 h-5" />
            <span>New SOP</span>
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FolderIcon className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Total SOPs</p>
              <p className="text-2xl font-bold text-gray-900">{sops.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <ChartBarIcon className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Active</p>
              <p className="text-2xl font-bold text-gray-900">
                {sops.filter(sop => sop.status === 'active').length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-purple-100 rounded-lg">
              <CalendarIcon className="w-6 h-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Scheduled</p>
              <p className="text-2xl font-bold text-gray-900">2</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg p-6 border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-orange-100 rounded-lg">
              <ClockIcon className="w-6 h-6 text-orange-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-500">Avg Duration</p>
              <p className="text-2xl font-bold text-gray-900">
                {sops.length > 0 
                  ? Math.round(sops.reduce((sum, sop) => sum + sop.estimatedDuration, 0) / sops.length)
                  : 0}m
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
        {/* SOP List - Main Content (3 columns) */}
        <div className="lg:col-span-3">
          <SOPList 
            sops={sops}
            contextId={contextId}
            userId={userId}
            onSOPUpdated={() => setRefreshTrigger(prev => prev + 1)}
            onSOPEdit={(sop) => {
              setEditingSOP(sop);
              setShowCreateModal(true);
            }}
          />
        </div>

        {/* Sidebar (1 column) */}
        <div className="lg:col-span-1 space-y-6">
          <SOPStats 
            sops={sops}
            contextId={contextId}
            userId={userId}
            onSOPsUpdated={() => setRefreshTrigger(prev => prev + 1)}
          />
          <ConnectedApps contextId={contextId} userId={userId} />
        </div>
      </div>

      {/* Create/Edit SOP Modal */}
      {showCreateModal && (
        <CreateSOPModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false);
            setEditingSOP(null);
          }}
          contextId={contextId}
          userId={userId}
          onSOPCreated={handleSOPCreated}
          editingSOP={editingSOP}
        />
      )}
    </div>
  );
};