import React, { useState, useEffect } from 'react';
import {
  UserGroupIcon,
  PlusIcon,
  TrashIcon,
  CogIcon,
  UserIcon,
  EnvelopeIcon
} from '@heroicons/react/24/outline';
import { contextService } from '../../shared/services/contextService';
import { invitationService, FamilyInvitation } from '../../shared/services/invitationService';
import { ContextMember } from '../../shared/types/context';

interface SettingsAppProps {
  contextId: string;
  userId: string;
}

export const SettingsApp: React.FC<SettingsAppProps> = ({ contextId, userId }) => {
  const [activeTab, setActiveTab] = useState('family');
  const [contextMembers, setContextMembers] = useState<ContextMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [isAddingMember, setIsAddingMember] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [pendingInvitations, setPendingInvitations] = useState<FamilyInvitation[]>([]);

  const tabs = [
    { id: 'family', name: 'Family Members', icon: UserGroupIcon },
    { id: 'preferences', name: 'Preferences', icon: CogIcon }
  ];

  useEffect(() => {
    loadContextData();
  }, [contextId]);

  const loadContextData = async () => {
    try {
      setLoading(true);
      const [members, invitations] = await Promise.all([
        contextService.getContextMembers(contextId),
        invitationService.getPendingInvitations(contextId)
      ]);
      setContextMembers(members);
      setPendingInvitations(invitations);
    } catch (error) {
      console.error('Error loading context data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAddMember = async () => {
    if (!newMemberName.trim() || !newMemberEmail.trim()) {
      alert('Please enter both name and email address');
      return;
    }

    try {
      // Get current user info to include in invitation
      const currentMember = contextMembers.find(m => m.userId === userId);
      const inviterName = currentMember?.displayName || 'Family Admin';
      const inviterEmail = 'noreply@symphony.ai'; // In real app, would be current user's email
      
      // Send invitation
      await invitationService.sendFamilyInvitation(
        contextId,
        'Family', // In real app, would get actual context name
        inviterName,
        inviterEmail,
        newMemberEmail.trim(),
        newMemberName.trim(),
        'member'
      );

      // Reload data to show pending invitation
      await loadContextData();
      
      // Reset form
      setIsAddingMember(false);
      setNewMemberName('');
      setNewMemberEmail('');
      
      alert(`Invitation sent to ${newMemberEmail}!\n\nThey'll receive an email with instructions to join the family. The invitation code will also appear in the console for demo purposes.`);
    } catch (error) {
      console.error('Error sending invitation:', error);
      alert('Failed to send invitation. Please try again.');
    }
  };

  const handleRemoveMember = async (memberId: string, memberName: string) => {
    if (window.confirm(`Are you sure you want to remove ${memberName} from the family?`)) {
      // Note: contextService doesn't have a remove method yet
      // This would need to be implemented for full functionality
      alert('Remove member functionality would be implemented here');
    }
  };

  const handleCancelInvitation = async (invitationId: string, inviteeName: string) => {
    if (window.confirm(`Are you sure you want to cancel the invitation for ${inviteeName}?`)) {
      try {
        await invitationService.cancelInvitation(invitationId);
        await loadContextData(); // Reload to update UI
        alert('Invitation cancelled successfully');
      } catch (error) {
        console.error('Error cancelling invitation:', error);
        alert('Failed to cancel invitation. Please try again.');
      }
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'admin': return 'bg-red-100 text-red-800 border-red-200';
      case 'member': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'viewer': return 'bg-gray-100 text-gray-800 border-gray-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-500">Loading settings...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500 mt-1">Manage your family and preferences</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="w-5 h-5" />
                <span>{tab.name}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Family Members Tab */}
      {activeTab === 'family' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-gray-900">Family Members</h2>
            {!isAddingMember && (
              <button
                onClick={() => setIsAddingMember(true)}
                className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
              >
                <PlusIcon className="w-4 h-4" />
                <span>Add Member</span>
              </button>
            )}
          </div>

          {/* Add Member Form */}
          {isAddingMember && (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Add Family Member</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Name
                  </label>
                  <input
                    type="text"
                    value={newMemberName}
                    onChange={(e) => setNewMemberName(e.target.value)}
                    placeholder="Enter family member's name"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email *
                  </label>
                  <input
                    type="email"
                    value={newMemberEmail}
                    onChange={(e) => setNewMemberEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    An invitation will be sent to this email address
                  </p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={handleAddMember}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Add Member
                  </button>
                  <button
                    onClick={() => {
                      setIsAddingMember(false);
                      setNewMemberName('');
                      setNewMemberEmail('');
                    }}
                    className="border border-gray-300 bg-white text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Members List */}
          <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Current Members</h3>
            </div>
            <div className="divide-y divide-gray-200">
              {contextMembers.map((member) => (
                <div key={member.id} className="px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center">
                      <UserIcon className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">{member.displayName}</h4>
                      {member.email && (
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <EnvelopeIcon className="w-3 h-3" />
                          <span>{member.email}</span>
                        </div>
                      )}
                      <p className="text-xs text-gray-500">
                        Joined {member.joinedAt.toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getRoleColor(member.role)}`}>
                      {member.role}
                    </span>
                    
                    {member.role !== 'admin' && (
                      <button
                        onClick={() => handleRemoveMember(member.id, member.displayName)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Remove member"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Pending Invitations */}
          {pendingInvitations.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Pending Invitations</h3>
              </div>
              <div className="divide-y divide-gray-200">
                {pendingInvitations.map((invitation) => (
                  <div key={invitation.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-yellow-500 rounded-full flex items-center justify-center">
                        <EnvelopeIcon className="w-5 h-5 text-white" />
                      </div>
                      <div>
                        <h4 className="text-sm font-medium text-gray-900">
                          {invitation.inviteeName || invitation.inviteeEmail}
                        </h4>
                        <div className="flex items-center space-x-1 text-sm text-gray-500">
                          <EnvelopeIcon className="w-3 h-3" />
                          <span>{invitation.inviteeEmail}</span>
                        </div>
                        <p className="text-xs text-gray-500">
                          Invited {invitation.createdAt.toLocaleDateString()} • 
                          Code: <span className="font-mono">{invitation.inviteCode}</span>
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border bg-yellow-100 text-yellow-800 border-yellow-200">
                        pending
                      </span>
                      <button
                        onClick={() => handleCancelInvitation(invitation.id, invitation.inviteeName || invitation.inviteeEmail)}
                        className="text-gray-400 hover:text-red-600 transition-colors"
                        title="Cancel invitation"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {contextMembers.length === 0 && pendingInvitations.length === 0 && (
            <div className="text-center py-8 text-gray-500">
              <UserGroupIcon className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No family members yet</p>
              <p className="text-sm">Add family members to start sharing tasks and schedules</p>
            </div>
          )}
        </div>
      )}

      {/* Preferences Tab */}
      {activeTab === 'preferences' && (
        <div className="space-y-6">
          <h2 className="text-xl font-semibold text-gray-900">Preferences</h2>
          <div className="bg-white border border-gray-200 rounded-lg p-6">
            <p className="text-gray-500">Preference settings will be implemented here</p>
          </div>
        </div>
      )}
    </div>
  );
};