import React, { useState } from 'react';
import { useFamily } from '../providers/FamilyProvider';
import { useAuthState } from '../hooks/useAuthState';

function FamilyMembers({ familyId }) {
  const {
    familyMembers,
    loading,
    error,
    addFamilyMember
  } = useFamily();
  const { user } = useAuthState();

  const [showInvite, setShowInvite] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('member');
  const [newMember, setNewMember] = useState({
    name: '',
    role: 'member',
    avatar_color: '#3B82F6'
  });
  const [adding, setAdding] = useState(false);

  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) return;

    try {
      // In a real implementation, this would send an invitation email
      console.log('Inviting member:', inviteEmail, 'with role:', inviteRole);
      setInviteEmail('');
      setInviteRole('member');
      setShowInvite(false);
      // TODO: Implement actual invitation system
    } catch (err) {
      console.error('Error inviting family member:', err);
    }
  };

  const handleAddMember = async () => {
    if (!newMember.name.trim()) return;

    setAdding(true);
    try {
      await addFamilyMember({
        user_id: user?.id,
        name: newMember.name,
        role: newMember.role,
        avatar_color: newMember.avatar_color
      });
      
      // Reset form
      setNewMember({
        name: '',
        role: 'member',
        avatar_color: '#3B82F6'
      });
      setShowAddMember(false);
    } catch (err) {
      console.error('Error adding family member:', err);
    }
    setAdding(false);
  };

  const avatarColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
    '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'
  ];

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'text-purple-600 bg-purple-50';
      case 'parent': return 'text-blue-600 bg-blue-50';
      case 'child': return 'text-green-600 bg-green-50';
      default: return 'text-gray-600 bg-gray-50';
    }
  };

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin': return '👑';
      case 'parent': return '👨‍👩‍👧‍👦';
      case 'child': return '🧒';
      default: return '👤';
    }
  };

  if (loading) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-center h-32">
          <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-6 shadow-sm">
        <div className="text-red-800">Error loading family members: {error}</div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 p-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-lg font-medium text-gray-900">Family Member Management</h3>
            <p className="text-sm text-gray-500">Manage who has access to your family dashboard</p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddMember(true)}
              className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white shadow-sm hover:bg-blue-700"
            >
              <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Add Member
            </button>
            <button
              onClick={() => setShowInvite(true)}
              className="inline-flex items-center rounded-md border border-blue-600 px-3 py-2 text-sm font-medium text-blue-600 hover:bg-blue-50"
            >
              <svg className="mr-1 h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
              Invite
            </button>
          </div>
        </div>
      </div>

      <div className="p-4">
        {showAddMember && (
          <div className="mb-6 rounded-lg border border-gray-200 p-4">
            <h4 className="font-medium text-gray-900 mb-3">Add Family Member</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Name *</label>
                <input
                  type="text"
                  value={newMember.name}
                  onChange={(e) => setNewMember({ ...newMember, name: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="Family member name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  value={newMember.role}
                  onChange={(e) => setNewMember({ ...newMember, role: e.target.value })}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="member">Member</option>
                  <option value="child">Child</option>
                  <option value="parent">Parent</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Avatar Color</label>
                <div className="flex space-x-2">
                  {avatarColors.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setNewMember({ ...newMember, avatar_color: color })}
                      className={`w-8 h-8 rounded-full border-2 ${
                        newMember.avatar_color === color ? 'border-gray-800' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleAddMember}
                  disabled={adding || !newMember.name.trim()}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:bg-blue-300"
                >
                  {adding ? 'Adding...' : 'Add Member'}
                </button>
                <button
                  onClick={() => {
                    setShowAddMember(false);
                    setNewMember({ name: '', role: 'member', avatar_color: '#3B82F6' });
                  }}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {showInvite && (
          <div className="mb-6 rounded-lg border border-gray-200 p-4">
            <h4 className="font-medium text-gray-900 mb-3">Invite Family Member</h4>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700">Email Address</label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                  placeholder="member@example.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Role</label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
                >
                  <option value="member">Member</option>
                  <option value="child">Child</option>
                  <option value="parent">Parent</option>
                  <option value="admin">Admin</option>
                </select>
                <p className="mt-1 text-xs text-gray-500">
                  {inviteRole === 'admin' && 'Full access to manage family settings and members'}
                  {inviteRole === 'parent' && 'Can manage family tasks, goals, and meals'}
                  {inviteRole === 'child' && 'Can view and participate in family activities'}
                  {inviteRole === 'member' && 'Basic access to family dashboard'}
                </p>
              </div>
              <div className="flex space-x-3">
                <button
                  onClick={handleInviteMember}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700"
                >
                  Send Invitation
                </button>
                <button
                  onClick={() => setShowInvite(false)}
                  className="flex-1 bg-gray-300 text-gray-700 px-4 py-2 rounded-md text-sm font-medium hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {familyMembers.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-500">No family members yet</div>
              <p className="text-sm text-gray-400 mt-1">Invite family members to collaborate together</p>
            </div>
          ) : (
            familyMembers.map((member) => (
              <div key={member.id} className="rounded-lg border border-gray-200 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="flex-shrink-0">
                      <div 
                        className="h-10 w-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: member.avatar_color || '#9CA3AF' }}
                      >
                        <span className="text-lg">{getRoleIcon(member.role)}</span>
                      </div>
                    </div>
                    <div>
                      <h4 className="text-sm font-medium text-gray-900">
                        {member.name || `User ${member.user_id?.substring(0, 8)}`}
                      </h4>
                      <p className="text-sm text-gray-500">Family Member</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getRoleColor(member.role)}`}>
                          {member.role}
                        </span>
                        <span className="text-xs text-gray-500">
                          Joined {new Date(member.joined_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    {member.role !== 'admin' && (
                      <button className="text-gray-400 hover:text-gray-600">
                        <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {familyMembers.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-500">Total Members:</span>
                <span className="ml-2 font-medium text-gray-900">{familyMembers.length}</span>
              </div>
              <div>
                <span className="text-gray-500">Admins:</span>
                <span className="ml-2 font-medium text-gray-900">
                  {familyMembers.filter(m => m.role === 'admin').length}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default FamilyMembers;