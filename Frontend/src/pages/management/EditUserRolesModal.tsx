import React, { useState, useEffect } from 'react';
import { useMutation } from '@tanstack/react-query';
import { X, Save, Users } from 'lucide-react';
import { managementApi } from '../../lib/api';
import StatusBadge from '../../components/StatusBadge';
import toast from 'react-hot-toast';

interface UserWithDetails {
  id: string;
  name: string;
  email: string;
  status: string;
  roles: {
    id: string;
    name: string;
  }[];
}

interface Role {
  id: string;
  name: string;
  description?: string;
}

interface EditUserRolesModalProps {
  user: UserWithDetails;
  roles: Role[];
  onClose: () => void;
  onSuccess: () => void;
}

const EditUserRolesModal = ({ user, roles, onClose, onSuccess }: EditUserRolesModalProps) => {
  const [selectedRoleIds, setSelectedRoleIds] = useState<string[]>([]);

  const updateRolesMutation = useMutation({
    mutationFn: (roleIds: string[]) => managementApi.updateUserRoles(user.id, roleIds),
    onSuccess: () => {
      toast.success('User roles updated successfully');
      onSuccess();
    },
    onError: (error) => {
      console.error('Update user roles error:', error);
      toast.error('Failed to update user roles');
    }
  });

  // Initialize selected roles
  useEffect(() => {
    setSelectedRoleIds(user.roles.map(role => role.id));
  }, [user]);

  const handleRoleToggle = (roleId: string) => {
    setSelectedRoleIds(prev => 
      prev.includes(roleId)
        ? prev.filter(id => id !== roleId)
        : [...prev, roleId]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateRolesMutation.mutate(selectedRoleIds);
  };

  const hasChanges = JSON.stringify(selectedRoleIds.sort()) !== JSON.stringify(user.roles.map(r => r.id).sort());

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg leading-6 font-medium text-gray-900">
                Edit User Roles
              </h3>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            
            {/* User Information */}
            <div className="bg-gray-50 p-4 rounded-lg mb-6">
              <div className="flex items-center">
                <Users className="h-5 w-5 text-gray-400 mr-3" />
                <div>
                  <div className="font-medium text-gray-900">{user.name}</div>
                  <div className="text-sm text-gray-500">{user.email}</div>
                  <div className="mt-1">
                    <StatusBadge status={user.status} />
                  </div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Current Roles */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Current Roles</h4>
                <div className="flex flex-wrap gap-2 mb-4">
                  {user.roles.map((role) => (
                    <StatusBadge key={role.id} status={role.name} variant="info" />
                  ))}
                  {user.roles.length === 0 && (
                    <span className="text-sm text-gray-500 italic">No roles assigned</span>
                  )}
                </div>
              </div>

              {/* Available Roles */}
              <div>
                <h4 className="text-sm font-medium text-gray-900 mb-3">Available Roles</h4>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {roles.map((role) => (
                    <label key={role.id} className="flex items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={selectedRoleIds.includes(role.id)}
                        onChange={() => handleRoleToggle(role.id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <div className="ml-3 flex-1">
                        <div className="font-medium text-gray-900">{role.name}</div>
                        {role.description && (
                          <div className="text-sm text-gray-500">{role.description}</div>
                        )}
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Changes Summary */}
              {hasChanges && (
                <div className="bg-yellow-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-yellow-800 mb-2">Changes Summary:</h4>
                  <div className="text-sm text-yellow-700 space-y-1">
                    <div>
                      <strong>Selected Roles:</strong> {selectedRoleIds.length}
                    </div>
                    <div>
                      <strong>Previous Roles:</strong> {user.roles.length}
                    </div>
                  </div>
                </div>
              )}
              
              <div className="flex justify-end space-x-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateRolesMutation.isPending || !hasChanges}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="h-4 w-4 mr-2" />
                  {updateRolesMutation.isPending ? 'Updating...' : 'Update Roles'}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EditUserRolesModal;