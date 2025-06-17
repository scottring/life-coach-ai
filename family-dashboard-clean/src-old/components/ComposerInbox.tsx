import React, { useState, useEffect } from 'react';
import InboxWidget from './InboxWidget';
import ProjectListWidget from './ProjectListWidget';
import { MagnifyingGlassIcon, Bars3Icon } from '@heroicons/react/24/outline';
import { sopService } from '../services/sopService';
import { SOP } from '../types/sop';

interface ComposerInboxProps {
  contextId: string;
  userId: string;
  lifeDomains: Array<{
    id: string;
    name: string;
    icon: string;
    color: string;
    active: boolean;
  }>;
  onDataChange?: () => void;
  refreshTrigger?: number;
}

const ComposerInbox: React.FC<ComposerInboxProps> = ({
  contextId,
  userId,
  lifeDomains,
  onDataChange,
  refreshTrigger
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SOP[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  // Debounced search effect
  useEffect(() => {
    const searchSOPs = async () => {
      if (searchQuery.trim().length < 2) {
        setSearchResults([]);
        return;
      }

      setIsSearching(true);
      try {
        const allSOPs = await sopService.getSOPsForContext(contextId);
        const filtered = allSOPs.filter(sop => 
          sop.status === 'active' &&
          (sop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           sop.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
           sop.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase())))
        ).slice(0, 6); // Limit to 6 results
        
        setSearchResults(filtered);
      } catch (error) {
        console.error('Error searching SOPs:', error);
        setSearchResults([]);
      } finally {
        setIsSearching(false);
      }
    };

    const debounceTimer = setTimeout(searchSOPs, 300);
    return () => clearTimeout(debounceTimer);
  }, [searchQuery, contextId]);
  return (
    <div className="space-y-6">
      {/* Universal Inbox */}
      <InboxWidget
        contextId={contextId}
        userId={userId}
        onItemScheduled={onDataChange}
        refreshTrigger={refreshTrigger}
      />

      {/* Smart Search */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">🔍 Search to Schedule</h3>
          <p className="text-sm text-gray-600">Find SOPs to add to calendar</p>
        </div>
        <div className="p-4">
          {/* Search Input */}
          <div className="relative mb-4">
            <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search SOPs..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          {/* Search Results */}
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {isSearching && (
              <div className="text-center py-4 text-sm text-gray-500">
                Searching...
              </div>
            )}
            
            {!isSearching && searchQuery.trim().length >= 2 && searchResults.length === 0 && (
              <div className="text-center py-4 text-sm text-gray-500">
                No SOPs found for "{searchQuery}"
              </div>
            )}
            
            {!isSearching && searchQuery.trim().length < 2 && (
              <div className="text-center py-4 text-sm text-gray-400">
                Type at least 2 characters to search
              </div>
            )}

            {searchResults.map((sop) => (
              <div
                key={sop.id}
                className="flex items-center p-3 bg-gray-50 rounded-lg border hover:bg-gray-100 cursor-move transition-colors"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData('application/json', JSON.stringify({
                    type: 'sop_item',
                    data: sop
                  }));
                  e.currentTarget.style.opacity = '0.5';
                }}
                onDragEnd={(e) => {
                  e.currentTarget.style.opacity = '1';
                }}
                title="Drag to Calendar & Planning widget to schedule"
              >
                <Bars3Icon className="w-4 h-4 text-gray-400 mr-3 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-sm font-medium text-gray-900 truncate">{sop.name}</h4>
                    <div 
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: sopService.getCategoryColor(sop.category) }}
                    />
                  </div>
                  {sop.description && (
                    <p className="text-xs text-gray-600 truncate mt-1">{sop.description}</p>
                  )}
                  <div className="flex items-center space-x-2 mt-1">
                    <span className="text-xs text-gray-500">{sop.estimatedDuration} min</span>
                    <span className="text-xs text-gray-500">•</span>
                    <span className="text-xs text-gray-500">{sop.steps.length} steps</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Project Lists */}
      <ProjectListWidget
        contextId={contextId}
        userId={userId}
        onItemScheduled={onDataChange}
      />

      {/* AI Scheduling Insights */}
      <div className="bg-gradient-to-br from-purple-50 to-blue-50 rounded-lg border border-purple-200 p-4">
        <div className="flex items-center space-x-2 mb-3">
          <span className="text-lg">🤖</span>
          <h3 className="font-medium text-gray-900">AI Insights</h3>
        </div>
        <div className="space-y-2 text-sm text-gray-700">
          <p>• Your morning energy is perfect for work tasks</p>
          <p>• Family time aligns well with meal planning</p>
          <p>• Consider 15-min buffers between life area switches</p>
        </div>
      </div>
    </div>
  );
};

export default ComposerInbox;