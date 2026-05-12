import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import { permissionsAPI } from '../services/api';
import {
  RolePermission,
  RoleResourceScope,
  UserRole,
  UpdatePermissionRequest,
  UpdatePermissionScopeRequest,
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
import { Button, Card, PageHeader, ResponsiveTable, StatsCard } from '../components/ui';

interface PermissionMatrix {
  [role: string]: {
    [resourceOperation: string]: RolePermission;
  };
}

interface ScopeMatrix {
  [role: string]: {
    [resource: string]: RoleResourceScope;
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

const RESOURCE_DESCRIPTIONS: Record<string, string> = {
  events: 'Event lifecycle and configuration',
  contests: 'Contest setup and visibility',
  categories: 'Category structure and criteria',
  users: 'Tenant user account management',
  assignments: 'Judge/tally/auditor assignment mapping',
  scores: 'Score entry and score visibility',
  results: 'Results and standings access',
  reports: 'Report generation/export/email',
  settings: 'Tenant-level system settings',
  permissions: 'Role permission matrix controls',
  notifications: 'Notification and messaging controls',
  templates: 'Template authoring and usage',
  workflows: 'Workflow templates and execution',
  deductions: 'Score deduction governance',
  certifications: 'Certification pipeline actions',
  files: 'Uploaded file inventory and file operations',
  '*': 'Global wildcard permission',
}

const OPERATION_SORT_ORDER = ['*', 'read', 'create', 'update', 'delete', 'write']

const sortOperations = (operations: string[]): string[] => {
  return [...operations].sort((a, b) => {
    const indexA = OPERATION_SORT_ORDER.indexOf(a)
    const indexB = OPERATION_SORT_ORDER.indexOf(b)
    if (indexA >= 0 && indexB >= 0) return indexA - indexB
    if (indexA >= 0) return -1
    if (indexB >= 0) return 1
    return a.localeCompare(b)
  })
}

const defaultOperationsForResource = (resource: string): string[] => {
  if (resource === '*') return ['*']
  return ['read', 'create', 'update', 'delete', 'write']
}

const describePermission = (resource: string, operation: string): string => {
  const mapped = RESOURCE_DESCRIPTIONS[resource]
  if (mapped) return mapped

  const normalizedResource = resource.replace(/[_-]/g, ' ').trim()
  const normalizedOperation = operation.replace(/[_-]/g, ' ').trim()
  return `Controls ${normalizedOperation} access for ${normalizedResource}.`
}

const PermissionsPage: React.FC = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedRole, setSelectedRole] = useState<UserRole | 'ALL'>('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [updateReason, setUpdateReason] = useState('');
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [pendingUpdate, setPendingUpdate] = useState<UpdatePermissionRequest | null>(null);
  const [pendingScopeUpdate, setPendingScopeUpdate] = useState<UpdatePermissionScopeRequest | null>(null);

  // Check if user is admin
  const isAdmin = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'ORGANIZER';
  const canEditRole = (role: UserRole): boolean => {
    if (user?.role === 'SUPER_ADMIN') return true;
    return role !== 'SUPER_ADMIN';
  };
  const visibleRoles = ROLES.filter((role) => user?.role === 'SUPER_ADMIN' || role !== 'SUPER_ADMIN');

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

  const { data: resourceScopes = [] } = useQuery<RoleResourceScope[]>(
    'all-permission-scopes',
    async () => {
      const response = await permissionsAPI.getAllScopes();
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

  const updateScopeMutation = useMutation(
    (data: UpdatePermissionScopeRequest) => permissionsAPI.updatePermissionScope(data),
    {
      onSuccess: () => {
        queryClient.invalidateQueries('all-permission-scopes');
        toast.success('Permission scope updated successfully');
        setShowReasonModal(false);
        setPendingScopeUpdate(null);
        setPendingUpdate(null);
        setUpdateReason('');
      },
      onError: (error: any) => {
        toast.error(error.response?.data?.message || 'Failed to update permission scope');
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

  const scopeMatrix = useMemo((): ScopeMatrix => {
    const matrix: ScopeMatrix = {};
    resourceScopes.forEach((scope) => {
      if (!matrix[scope.role]) {
        matrix[scope.role] = {};
      }
      matrix[scope.role][scope.resource] = scope;
    });
    return matrix;
  }, [resourceScopes]);

  // Get unique resources and operations
  const { resources, operationsByResource } = useMemo(() => {
    if (!permissions) return { resources: new Set<string>(), operationsByResource: new Map<string, Set<string>>() };

    const resourcesSet = new Set<string>();
    const operationsMap = new Map<string, Set<string>>();

    permissions.forEach((perm) => {
      resourcesSet.add(perm.resource);
      const operations = operationsMap.get(perm.resource) || new Set<string>()
      operations.add(perm.operation)
      operationsMap.set(perm.resource, operations)
    });

    return {
      resources: resourcesSet,
      operationsByResource: operationsMap,
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

  const filteredScopeResources = useMemo(() => {
    const resourceList = Array.from(new Set(resourceScopes.map((scope) => scope.resource))).sort();
    if (!searchTerm) return resourceList;
    return resourceList.filter((resource) =>
      resource.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [resourceScopes, searchTerm]);

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
    if (pendingScopeUpdate) {
      pendingScopeUpdate.reason = updateReason;
      updateScopeMutation.mutate(pendingScopeUpdate);
      return;
    }
    if (pendingUpdate) {
      pendingUpdate.reason = updateReason;
      updatePermissionMutation.mutate(pendingUpdate);
    }
  };

  const handleScopeChange = (role: UserRole, resource: string, scope: string) => {
    setPendingScopeUpdate({
      role,
      resource,
      scope: scope as 'ASSIGNMENT' | 'EVENT' | 'TENANT',
      reason: updateReason,
    });
    setPendingUpdate(null);
    setShowReasonModal(true);
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
      <div className="cgr-page-container">
        <Card className="p-12 text-center">
          <ShieldCheckIcon className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Access Denied</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            You must be an administrator to access this page.
          </p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="cgr-page-container">
        <Card className="p-12 text-center">
          <ArrowPathIcon className="mx-auto h-12 w-12 text-blue-500 animate-spin" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading permissions...</p>
        </Card>
      </div>
    );
  }

  const rolesToDisplay = (selectedRole === 'ALL' ? visibleRoles : [selectedRole]).filter((role) => visibleRoles.includes(role));

  return (
    <div className="cgr-page-container">
      {/* Header */}
      <PageHeader
        title="Permission Management"
        subtitle="Manage role-based permissions for your organization"
        icon={ShieldCheckIcon}
        actions={(
          <Link to="/permissions/audit-logs">
            <Button variant="secondary">View Audit Logs</Button>
          </Link>
        )}
      />

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <StatsCard icon={ShieldCheckIcon} value={stats.totalPermissions} label="Total Permissions" color="blue" />
            <StatsCard icon={FunnelIcon} value={Object.keys(stats.permissionsByRole).length} label="Roles" color="indigo" />
          </div>
        )}

        {/* Toolbar */}
        <Card className="rounded-lg p-4 mb-6">
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
                  {visibleRoles.map((role) => (
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
              <Button
                onClick={handleExport}
                variant="secondary"
              >
                <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
                Export
              </Button>
              <Button
                onClick={() => warmCacheMutation.mutate()}
                disabled={warmCacheMutation.isLoading}
                variant="secondary"
              >
                <ArrowPathIcon className={`h-5 w-5 mr-2 ${warmCacheMutation.isLoading ? 'animate-spin' : ''}`} />
                Warm Cache
              </Button>
            </div>
          </div>
        </Card>

        {/* Warning Banner */}
        <Card className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-400 p-4 mb-6">
          <div className="flex">
            <ExclamationTriangleIcon className="h-5 w-5 text-yellow-400" />
            <div className="ml-3">
              <p className="text-sm text-yellow-700 dark:text-yellow-200">
                <strong>Warning:</strong> Changing permissions affects user access. Always provide a
                reason for changes and verify before saving.
              </p>
            </div>
          </div>
        </Card>

        {/* Permission Matrix Table */}
        <Card className="rounded-lg overflow-hidden p-0 mb-6">
          <ResponsiveTable
            caption="Resource scope matrix showing the record boundary applied to each role"
            minWidth="900px"
          >
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th
                    scope="col"
                    className="sticky left-0 z-10 bg-gray-50 dark:bg-gray-900 px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Resource Scope
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
                {filteredScopeResources.map((resource, rowIndex) => (
                  <tr
                    key={`scope:${resource}`}
                    className={rowIndex % 2 === 0 ? undefined : 'bg-gray-50 dark:bg-gray-900/50'}
                  >
                    <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                        {resource}
                      </code>
                      <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-sm whitespace-normal">
                        Data visibility boundary for the {resource} surface.
                      </p>
                    </td>
                    {rolesToDisplay.map((role) => {
                      const scope = scopeMatrix[role]?.[resource];
                      const editable = Boolean(scope?.editable && canEditRole(role));
                      return (
                        <td key={`${role}:${resource}`} className="px-6 py-4 whitespace-nowrap text-center">
                          {scope ? (
                            <select
                              value={scope.scope}
                              disabled={!editable}
                              onChange={(event) => handleScopeChange(role, resource, event.target.value)}
                              className="rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500 disabled:opacity-60"
                            >
                              {scope.allowedOptions.map((option) => (
                                <option key={option} value={option}>
                                  {option}
                                </option>
                              ))}
                            </select>
                          ) : (
                            <span className="text-xs text-gray-400">N/A</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </ResponsiveTable>
        </Card>

        {/* Permission Matrix Table */}
        <Card className="rounded-lg overflow-hidden p-0">
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
                  const operationSet = new Set<string>([
                    ...defaultOperationsForResource(resource),
                    ...(Array.from(operationsByResource.get(resource) || []))
                  ])
                  const resourceOperations = sortOperations(Array.from(operationSet))

                  return resourceOperations.map((operation, opIndex) => (
                    <tr
                      key={`${resource}:${operation}`}
                      className={opIndex % 2 === 0 ? undefined : 'bg-gray-50 dark:bg-gray-900/50'}
                    >
                      <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {resource}:{operation}
                        </code>
                        <p className="mt-1 text-xs text-gray-500 dark:text-gray-400 max-w-sm whitespace-normal">
                          {describePermission(resource, operation)}
                        </p>
                      </td>
                      {rolesToDisplay.map((role) => {
                        const key = `${resource}:${operation}`;
                        const permission = permissionMatrix[role]?.[key];
                        const isAllowed = permission?.allowed ?? false;

                        const editable = canEditRole(role);
                        return (
                          <td key={role} className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() =>
                                editable && handleTogglePermission(role, resource, operation, isAllowed)
                              }
                              disabled={!editable}
                              className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                isAllowed
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-900/50'
                              } ${editable ? '' : 'opacity-60 cursor-not-allowed'}`}
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
        </Card>

      {/* Reason Modal */}
      {showReasonModal && (
        <div className="cgr-modal-overlay">
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
                  Role: {pendingUpdate?.role || pendingScopeUpdate?.role}
                </p>
                {pendingScopeUpdate ? (
                  <>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Resource Scope: {pendingScopeUpdate.resource}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      New Scope: {pendingScopeUpdate.scope}
                    </p>
                  </>
                ) : (
                  <>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      Permission: {pendingUpdate?.resource}:{pendingUpdate?.operation}
                    </p>
                    <p className="text-sm text-gray-600 dark:text-gray-400">
                      New Value: {pendingUpdate?.allowed ? 'Allowed' : 'Denied'}
                    </p>
                  </>
                )}
              </div>
            </div>
            <div className="mb-4">
              <label htmlFor="pages-permissionspage-1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reason for Change (Optional but Recommended)
              </label>
              <textarea id="pages-permissionspage-1"
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
                  setPendingScopeUpdate(null);
                  setUpdateReason('');
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
              >
                Cancel
              </button>
              <button
                onClick={confirmUpdate}
                disabled={updatePermissionMutation.isLoading || updateScopeMutation.isLoading}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50"
              >
                {updatePermissionMutation.isLoading || updateScopeMutation.isLoading ? 'Updating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PermissionsPage;
