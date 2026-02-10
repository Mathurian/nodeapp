import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import { permissionsAPI } from '../services/api';
import {
  RolePermission,
  UserRole,
  UpdatePermissionRequest,
  PermissionStats,
} from '../types/api.types';
import {
  ShieldCheckIcon,
  ArrowPathIcon,
  DocumentArrowDownIcon,
  DocumentArrowUpIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { ResponsiveTable } from '../components/ui';

interface PermissionMatrix {
  [role: string]: {
    [resourceOperation: string]: RolePermission;
  };
}

const ROLES: UserRole[] = [
  'SUPER_ADMIN',
  'ADMIN',
  'ORGANIZER',
  'BOARD',
  'TALLY_MASTER',
  'AUDITOR',
  'JUDGE',
  'EMCEE',
  'CONTESTANT',
];

const PermissionsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<UserRole | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [updateReason, setUpdateReason] = useState('');
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<UpdatePermissionRequest | null>(null);

  // Check if user is admin
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'ORGANIZER';

  // Fetch all permissions
  const { data: permissions, isLoading } = useQuery<RolePermission[]>(
    'all-permissions',
    async () => {
      const response = await permissionsAPI.getAllPermissions();
      return response.data.data || response.data;
    },
    {
      enabled: isAdmin,
    }
  );

  // Fetch statistics
  const { data: stats } = useQuery<PermissionStats>(
    'permission-stats',
    async () => {
      const response = await permissionsAPI.getStats();
      return response.data.data || response.data;
    },
    {
      enabled: isAdmin,
    }
  );

  // Update permission mutation
  const updatePermissionMutation = useMutation(
    (data: UpdatePermissionRequest) => permissionsAPI.updatePermission(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('all-permissions');
        queryClient.invalidateQueries('permission-stats');
        toast.success('Permission updated successfully');
        setShowReasonModal(false);
        setPendingUpdate(null);
        setUpdateReason('');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to update permission');
      },
    }
  );

  // Build permission matrix
  const permissionMatrix = useMemo((): PermissionMatrix => {
    if (!permissions) return {};

    const matrix: PermissionMatrix = {};
    permissions.forEach((perm) => {
      if (!matrix[perm.role]) {
        matrix[perm.role] = {};
      }
      const key = `${perm.resource}:${perm.operation}`;
      matrix[perm.role][key] = perm;
    });
    return matrix;
  }, [permissions]);

  // Get unique resources and operations
  const { resources, operations } = useMemo(() => {
    if (!permissions) return { resources: new Set<string>(), operations: new Set<string>() };

    const resourcesSet = new Set<string>();
    const operationsSet = new Set<string>();

    permissions.forEach((perm) => {
      resourcesSet.add(perm.resource);
      operationsSet.add(perm.operation);
    });

    return {
      resources: resourcesSet,
      operations: operationsSet,
    };
  }, [permissions]);

  // Get filtered permissions
  const filteredResources = useMemo(() => {
    const resourceList = Array.from(resources).sort();
    if (!searchTerm) return resourceList;
    return resourceList.filter((resource) =>
      resource.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [resources, searchTerm]);

  // Handle permission toggle
  const handleTogglePermission = (role: UserRole, resource: string, operation: string, currentValue: boolean) => {
    const updateData: UpdatePermissionRequest = {
      role,
      resource,
      operation,
      allowed: !currentValue,
      reason: updateReason,
    };

    setPendingUpdate(updateData);
    setShowReasonModal(true);
  };

  // Confirm update
  const confirmUpdate = () => {
    if (pendingUpdate) {
      pendingUpdate.reason = updateReason;
      updatePermissionMutation.mutate(pendingUpdate);
    }
  };

  // Export permissions
  const handleExport = async () => {
    try {
      const response = await permissionsAPI.exportPermissions(
        selectedRole !== 'ALL' ? selectedRole : undefined
      );
      const blob = new Blob([response.data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `permissions_${selectedRole}_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      toast.success('Permissions exported successfully');
    } catch (error) {
      toast.error('Failed to export permissions');
    }
  };

  // Warm cache
  const warmCacheMutation = useMutation(
    () => permissionsAPI.warmCache(),
    {
      onSuccess: () => {
        toast.success('Cache warmed successfully');
      },
      onError: () => {
        toast.error('Failed to warm cache');
      },
    }
  );

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <ShieldCheckIcon className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Access Denied</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            You must be an administrator to access this page.
          </p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <ArrowPathIcon className="mx-auto h-12 w-12 text-blue-500 animate-spin" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading permissions...</p>
        </div>
      </div>
    );
  }

  const rolesToDisplay = selectedRole === 'ALL' ? ROLES : [selectedRole];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 py-8 px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
                Permission Management
              </h1>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                Manage role-based permissions for your organization
              </p>
            </div>
            <Link
              to="/permissions/audit-logs"
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              View Audit Logs
            </Link>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <ShieldCheckIcon className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Total Permissions</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.totalPermissions}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <CheckCircleIcon className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Allowed</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.allowedCount}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <XCircleIcon className="h-8 w-8 text-red-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Denied</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {stats.deniedCount}
                  </p>
                </div>
              </div>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
              <div className="flex items-center">
                <FunnelIcon className="h-8 w-8 text-purple-500" />
                <div className="ml-4">
                  <p className="text-sm text-gray-500 dark:text-gray-400">Roles</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white">
                    {Object.keys(stats.permissionsByRole).length}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Toolbar */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
          <div className="flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-4 items-center flex-1">
              {/* Role Filter */}
              <div className="flex items-center gap-2">
                <FunnelIcon className="h-5 w-5 text-gray-400" />
                <select
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole | 'ALL')}
                  className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                >
                  <option value="ALL">All Roles</option>
                  {ROLES.map((role) => (
                    <option key={role} value={role}>
                      {role.replace('_', ' ')}
                    </option>
                  ))}
                </select>
              </div>

              {/* Search */}
              <div className="flex-1 max-w-md">
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search resources..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                  />
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleExport}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                Export
              </button>
              <button
                onClick={() => warmCacheMutation.mutate()}
                disabled={warmCacheMutation.isLoading}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50"
              >
                <ArrowPathIcon
                  className={`h-5 w-5 mr-2 ${warmCacheMutation.isLoading ? 'animate-spin' : ''}`}
                />
                Warm Cache
              </button>
            </div>
          </div>
        </div>

        {/* Warning Banner */}
        <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <p className="text-sm text-yellow-700 dark:text-yellow-200">
                <strong>Warning:</strong> Changing permissions affects user access. Always provide a
                reason for changes and verify before saving.
              </p>
            </div>
          </div>
        </div>

        {/* Permission Matrix Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <ResponsiveTable
            caption="Permission matrix showing access controls for each role"
            minWidth="1000px"
          >
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th
                    scope="col"
                    className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-900 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Resource : Operation
                  </th>
                  {rolesToDisplay.map((role) => (
                    <th
                      key={role}
                      scope="col"
                      className="px-6 py-3 text-center text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                    >
                      {role.replace('_', ' ')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {filteredResources.map((resource) => {
                  const resourceOperations = Array.from(operations).filter((op) =>
                    permissions?.some((p) => p.resource === resource && p.operation === op)
                  );

                  return resourceOperations.map((operation, opIndex) => (
                    <tr
                      key={`${resource}:${operation}`}
                      className={opIndex % 2 === 0 ? undefined : 'bg-gray-50 dark:bg-gray-900/50'}
                    >
                      <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {resource}:{operation}
                        </code>
                      </td>
                      {rolesToDisplay.map((role) => {
                        const key = `${resource}:${operation}`;
                        const permission = permissionMatrix[role]?.[key];
                        const isAllowed = permission?.allowed ?? false;

                        return (
                          <td key={role} className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() =>
                                handleTogglePermission(role, resource, operation, isAllowed)
                              }
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                isAllowed
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                              }`}
                            >
                              {isAllowed ? (
                                <>
                                  <CheckCircleIcon className="h-4 w-4 mr-1" />
                                  Allowed
                                </>
                              ) : (
                                <>
                                  <XCircleIcon className="h-4 w-4 mr-1" />
                                  Denied
                                </>
                              )}
                            </button>
                          </td>
                        );
                      })}
                    </tr>
                  ));
                })}
              </tbody>
            </table>
          </ResponsiveTable>
        </div>
      </div>

      {/* Reason Modal */}
      {showReasonModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-md w-full p-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-4">
              Confirm Permission Change
            </h3>
            <div className="mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                You are about to change:
              </p>
              <div className="bg-gray-50 dark:bg-gray-700 p-3 rounded-md">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Role: {pendingUpdate?.role}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  Permission: {pendingUpdate?.resource}:{pendingUpdate?.operation}
                </p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  New Value: {pendingUpdate?.allowed ? 'Allowed' : 'Denied'}
                </p>
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason for Change (Optional but Recommended)
              </label>
              <textarea
                value={updateReason}
                onChange={(e) => setUpdateReason(e.target.value)}
                rows={3}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                placeholder="e.g., Granting access for new feature..."
              />
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowReasonModal(false);
                  setPendingUpdate(null);
                  setUpdateReason('');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmUpdate}
                disabled={updatePermissionMutation.isLoading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {updatePermissionMutation.isLoading ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionsPage;
