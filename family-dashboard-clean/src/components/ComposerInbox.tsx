import React from 'react';
import InboxWidget from './InboxWidget';

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
  return (
    <div className="space-y-6">
      {/* Universal Inbox */}
      <InboxWidget
        contextId={contextId}
        userId={userId}
        onItemScheduled={onDataChange}
        refreshTrigger={refreshTrigger}
      />

      {/* Quick Add Actions */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h3 className="font-medium text-gray-900">➕ Quick Add</h3>
          <p className="text-sm text-gray-600">Add to any life area</p>
        </div>
        <div className="p-4 space-y-3">
          {lifeDomains.filter(d => d.active).map((domain) => (
            <button
              key={domain.id}
              className={`w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-${domain.color}-50 transition-colors`}
            >
              <div className="flex items-center space-x-3">
                <span className="text-lg">{domain.icon}</span>
                <div>
                  <div className="font-medium text-gray-900">{domain.name}</div>
                  <div className="text-xs text-gray-500">Add new item</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>

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