import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Edit, Shield, Users, Eye, EyeOff } from "lucide-react";
import { managementApi, userApi } from "../../lib/api";
import { DataTable } from "../../components/DataTable";
import StatusBadge from "../../components/StatusBadge";
import { useAuthStore } from "../../store/authStore";
import CreateUserModal from "../CreateUserModal";
import EditUserRolesModal from "./EditUserRolesModal";
import toast from "react-hot-toast";
import EditUserModal from "./EditUserModal";

interface UserWithDetails {
  id: string;
  name: string;
  email: string;
  status: string;
  lastLoginAt?: string;
  createdAt: string;
  roles: {
    id: string;
    name: string;
  }[];
}

const EnhancedUserManagement = () => {
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditRolesModal, setShowEditRolesModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserWithDetails | null>(
    null,
  );
  const { user: currentUser } = useAuthStore();
  const queryClient = useQueryClient();

  // Only CFO and GM can access user management
  const canManageUsers =
    currentUser?.roles.includes("Senior Accountant") ||
    currentUser?.roles.includes("General Manager");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["users-with-details", { page, search }],
    queryFn: () =>
      managementApi.getUsersWithDetails({ page, limit: 10, search }),
    enabled: canManageUsers,
  });

  const { data: roles } = useQuery({
    queryKey: ["roles-for-user-management"],
    queryFn: () => userApi.getRoles(),
    enabled: canManageUsers,
  });

  const updateUserStatusMutation = useMutation({
    mutationFn: ({ userId, status }: { userId: string; status: string }) =>
      userApi.updateUserStatus(userId, status),
    onSuccess: () => {
      toast.success("User status updated successfully");
      refetch();
    },
    onError: (error) => {
      console.error("Update user status error:", error);
      toast.error("Failed to update user status");
    },
  });

  if (!canManageUsers) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Access Denied
          </h2>
          <p className="text-gray-600">
            You don't have permission to access user management.
          </p>
        </div>
      </div>
    );
  }

  const columns = [
    {
      key: "name",
      header: "Name",
      width: "w-48",
    },
    {
      key: "email",
      header: "Email",
      width: "w-64",
    },
    {
      key: "roles",
      header: "Roles",
      cell: (user: UserWithDetails) => (
        <div className="flex flex-wrap gap-1">
          {user.roles.map((role, index) => (
            <StatusBadge key={index} status={role.name} variant="info" />
          ))}
        </div>
      ),
      width: "w-48",
    },
    {
      key: "status",
      header: "Status",
      cell: (user: UserWithDetails) => <StatusBadge status={user.status} />,
      width: "w-24",
    },
    {
      key: "lastLoginAt",
      header: "Last Login",
      cell: (user: UserWithDetails) =>
        user.lastLoginAt
          ? new Date(user.lastLoginAt).toLocaleDateString()
          : "Never",
      width: "w-32",
    },
    {
      key: "createdAt",
      header: "Created",
      cell: (user: UserWithDetails) =>
        new Date(user.createdAt).toLocaleDateString(),
      width: "w-32",
    },
  ];

  const handleCreateUser = () => {
    refetch();
    setShowCreateModal(false);
  };

  const handleEditUserRoles = () => {
    refetch();
    setShowEditRolesModal(false);
    setSelectedUser(null);
  };

  const handleToggleUserStatus = (userId: string, currentStatus: string) => {
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    updateUserStatusMutation.mutate({ userId, status: newStatus });
  };

  const actions = (user: UserWithDetails) => (
    <div className="flex space-x-2">
      {/* <button
        onClick={() => {
          setSelectedUser(user);
          setShowEditRolesModal(true);
        }}
        className="text-blue-600 hover:text-blue-900"
        title="Edit User Roles"
      >
        <Edit className="h-4 w-4" />
      </button> */}
      <button
        onClick={() => {
          setSelectedUser(user);
          setShowEditUserModal(true);
        }}
        className="text-blue-600 hover:text-blue-900"
        title="Edit User Details"
      >
        <Edit className="h-4 w-4" />
      </button>
      <button
        onClick={() => handleToggleUserStatus(user.id, user.status)}
        className={`${user.status === "ACTIVE" ? "text-red-600 hover:text-red-900" : "text-green-600 hover:text-green-900"}`}
        title={user.status === "ACTIVE" ? "Deactivate User" : "Activate User"}
      >
        {user.status === "ACTIVE" ? (
          <EyeOff className="h-4 w-4" />
        ) : (
          <Eye className="h-4 w-4" />
        )}
      </button>
    </div>
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">
            Manage system users, roles, and permissions
          </p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create User
        </button>
      </div>

      {/* Search */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search Users
            </label>
            <input
              type="text"
              placeholder="Search by name or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="block w-full px-3 py-2 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 gap-6 sm:grid-cols-4">
        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-gray-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Total Users
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {data?.pagination?.total || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Users className="h-6 w-6 text-green-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Active Users
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {data?.users?.filter(
                      (u: UserWithDetails) => u.status === "ACTIVE",
                    ).length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Shield className="h-6 w-6 text-blue-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    Accountants
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {data?.users?.filter((u: UserWithDetails) =>
                      u.roles.some((r) => r.name === "Senior Accountant"),
                    ).length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-white overflow-hidden shadow rounded-lg">
          <div className="p-5">
            <div className="flex items-center">
              <div className="flex-shrink-0">
                <Shield className="h-6 w-6 text-purple-400" />
              </div>
              <div className="ml-5 w-0 flex-1">
                <dl>
                  <dt className="text-sm font-medium text-gray-500 truncate">
                    General Managers
                  </dt>
                  <dd className="text-2xl font-semibold text-gray-900">
                    {data?.users?.filter((u: UserWithDetails) =>
                      u.roles.some((r) => r.name === "General Manager"),
                    ).length || 0}
                  </dd>
                </dl>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <DataTable
        data={data?.users || []}
        columns={columns}
        loading={isLoading}
        pagination={data?.pagination}
        onPageChange={setPage}
        actions={actions}
      />

      {/* Create Modal */}
      {showCreateModal && (
        <CreateUserModal
          roles={roles?.roles || []}
          onClose={() => setShowCreateModal(false)}
          onSuccess={handleCreateUser}
        />
      )}

      {/* Edit User Roles Modal */}
      {showEditRolesModal && selectedUser && (
        <EditUserRolesModal
          user={selectedUser}
          roles={roles?.roles || []}
          onClose={() => {
            setShowEditRolesModal(false);
            setSelectedUser(null);
          }}
          onSuccess={handleEditUserRoles}
        />
      )}

      {/* Edit User Details Modal */}
      {showEditUserModal && selectedUser && (
        <EditUserModal
          user={selectedUser}
          roles={roles?.roles || []}
          onClose={() => {
            setShowEditUserModal(false);
            setSelectedUser(null);
          }}
          onSuccess={() => {
            refetch();
            setShowEditUserModal(false);
            setSelectedUser(null);
          }}
        />
      )}
    </div>
  );
};

export default EnhancedUserManagement;
