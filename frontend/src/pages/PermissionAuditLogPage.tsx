import React, { useState } from 'react';
import { useQuery } from 'react-query';
import { useAuth } from '../contexts/AuthContext';
import { permissionsAPI } from '../services/api';
import { PermissionAuditLog, UserRole } from '../types/api.types';
import {
  ClockIcon,
  UserIcon,
  ShieldCheckIcon,
  FunnelIcon,
  MagnifyingGlassIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
} from '@heroicons/react/24/outline';
import { CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/solid';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Button, Card, PageHeader, ResponsiveTable } from '../components/ui';
import { safeFormatDate } from '../utils/dateUtils';

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

const PermissionAuditLogPage: React.FC = () => {
  const { user } = useAuth();
  const [roleFilter, setRoleFilter] = useState<string>('');
  const [resourceFilter, setResourceFilter] = useState<string>('');
  const [changedByFilter, setChangedByFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  const [page, setPage] = useState<number>(1);
  const [limit] = useState<number>(50);

  // Check if user is admin
  const isAdmin =
    user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN' || user?.role === 'ORGANIZER';

  // Build query params
  const queryParams = {
    role: roleFilter || undefined,
    resource: resourceFilter || undefined,
    changedBy: changedByFilter || undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    page,
    limit,
  };

  // Fetch audit logs
  const { data: auditLogsResponse, isLoading, refetch } = useQuery(
    ['permission-audit-logs', queryParams],
    async () => {
      const response = await permissionsAPI.getAuditLogs(queryParams);
      return response.data;
    },
    {
      enabled: isAdmin,
      keepPreviousData: true,
    }
  );

  const auditLogs = auditLogsResponse?.data || [];
  const total = auditLogsResponse?.total || 0;
  const totalPages = Math.ceil(total / limit);

  // Format date
  const formatDate = (dateString: string) =>
    safeFormatDate(dateString, 'MMM dd, yyyy HH:mm:ss', dateString);

  // Get value change display
  const getValueChangeDisplay = (log: PermissionAuditLog) => {
    const previousDisplay =
      log.previousVal === null ? (
        <span className="text-gray-400 italic">not set</span>
      ) : log.previousVal ? (
        <span className="inline-flex items-center text-green-600 dark:text-green-400">
          <CheckCircleIcon className="h-4 w-4 mr-1" />
          Allowed
        </span>
      ) : (
        <span className="inline-flex items-center text-red-600 dark:text-red-400">
          <XCircleIcon className="h-4 w-4 mr-1" />
          Denied
        </span>
      );

    const newDisplay = log.newVal ? (
      <span className="inline-flex items-center text-green-600 dark:text-green-400">
        <CheckCircleIcon className="h-4 w-4 mr-1" />
        Allowed
      </span>
    ) : (
      <span className="inline-flex items-center text-red-600 dark:text-red-400">
        <XCircleIcon className="h-4 w-4 mr-1" />
        Denied
      </span>
    );

    return (
      <div className="flex items-center gap-2">
        {previousDisplay}
        <span className="text-gray-400">→</span>
        {newDisplay}
      </div>
    );
  };

  // Clear all filters
  const clearFilters = () => {
    setRoleFilter('');
    setResourceFilter('');
    setChangedByFilter('');
    setStartDate('');
    setEndDate('');
    setPage(1);
  };

  // Export audit logs
  const handleExport = () => {
    toast('Export functionality coming soon');
  };

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

  if (isLoading && auditLogs.length === 0) {
    return (
      <div className="cgr-page-container">
        <Card className="p-12 text-center">
          <ArrowPathIcon className="mx-auto h-12 w-12 text-blue-500 animate-spin" />
          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">Loading audit logs...</p>
        </Card>
      </div>
    );
  }

  return (
    <div className="cgr-page-container">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <PageHeader
              title="Permission Audit Logs"
              subtitle="View history of all permission changes"
              icon={ClockIcon}
            />
            <Link
              to="/permissions"
              className="inline-flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <ChevronLeftIcon className="h-5 w-5 mr-2" />
              Back to Permissions
            </Link>
          </div>
        </div>

        {/* Filters */}
        <Card className="rounded-lg p-6 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-medium text-gray-900 dark:text-white flex items-center">
              <FunnelIcon className="h-5 w-5 mr-2" />
              Filters
            </h2>
            <Button
              onClick={clearFilters}
              variant="ghost"
              size="sm"
            >
              Clear All
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Role Filter */}
            <div>
              <label htmlFor="pages-permissionauditlogpage-1" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Role
              </label>
              <select id="pages-permissionauditlogpage-1"
                value={roleFilter}
                onChange={(e) => {
                  setRoleFilter(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
              >
                <option value="">All Roles</option>
                {ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role.replace('_', ' ')}
                  </option>
                ))}
              </select>
            </div>

            {/* Resource Filter */}
            <div>
              <label htmlFor="pages-permissionauditlogpage-2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Resource
              </label>
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={resourceFilter}
                  onChange={(e) => {
                    setResourceFilter(e.target.value);
                    setPage(1);
                  }}
                  placeholder="e.g., events, users"
                  className="pl-10 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Changed By Filter */}
            <div>
              <label htmlFor="pages-permissionauditlogpage-2" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Changed By
              </label>
              <div className="relative">
                <UserIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  value={changedByFilter}
                  onChange={(e) => {
                    setChangedByFilter(e.target.value);
                    setPage(1);
                  }}
                  placeholder="User ID or name"
                  className="pl-10 w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Start Date */}
            <div>
              <span className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Start Date
              </span>
              <input id="pages-permissionauditlogpage-2"
                type="date"
                value={startDate}
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>

            {/* End Date */}
            <div>
              <label htmlFor="pages-permissionauditlogpage-3" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                End Date
              </label>
              <input id="pages-permissionauditlogpage-3"
                type="date"
                value={endDate}
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setPage(1);
                }}
                className="w-full rounded-md border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white shadow-sm focus:border-blue-500 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Active Filters Summary */}
          {(roleFilter || resourceFilter || changedByFilter || startDate || endDate) && (
            <div className="mt-4 flex flex-wrap gap-2">
              <span className="text-sm text-gray-500 dark:text-gray-400">Active filters:</span>
              {roleFilter && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  Role: {roleFilter}
                </span>
              )}
              {resourceFilter && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  Resource: {resourceFilter}
                </span>
              )}
              {changedByFilter && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  Changed By: {changedByFilter}
                </span>
              )}
              {startDate && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  From: {startDate}
                </span>
              )}
              {endDate && (
                <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                  To: {endDate}
                </span>
              )}
            </div>
          )}
        </Card>

        {/* Results Summary */}
        <div className="flex items-center justify-between mb-4">
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Showing {auditLogs.length > 0 ? (page - 1) * limit + 1 : 0} -{' '}
            {Math.min(page * limit, total)} of {total} entries
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => refetch()}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <ArrowPathIcon className="h-5 w-5 mr-2" />
              Refresh
            </button>
            <button
              onClick={handleExport}
              className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              <DocumentArrowDownIcon className="h-5 w-5 mr-2" />
              Export
            </button>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <ResponsiveTable>
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead className="bg-gray-50 dark:bg-gray-900">
                <tr>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Timestamp
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Role
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Permission
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Change
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Changed By
                  </th>
                  <th
                    scope="col"
                    className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider"
                  >
                    Reason
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                      <ClockIcon className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        No audit logs found
                      </p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">
                        Try adjusting your filters
                      </p>
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log: PermissionAuditLog) => (
                    <tr
                      key={log.id}
                      className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                    >
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <div className="flex items-center">
                          <ClockIcon className="h-4 w-4 mr-2 text-gray-400" />
                          {formatDate(log.changedAt)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300">
                          {log.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                        <code className="bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                          {log.resource}:{log.operation}
                        </code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        {getValueChangeDisplay(log)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 dark:text-white">
                        <div className="flex items-center">
                          <UserIcon className="h-4 w-4 mr-2 text-gray-400" />
                          <div>
                            {log.changedByUser ? (
                              <>
                                <div className="font-medium">{log.changedByUser.name}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">
                                  {log.changedByUser.email}
                                </div>
                              </>
                            ) : (
                              <span className="text-gray-500 dark:text-gray-400">
                                {log.changedBy}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500 dark:text-gray-400 max-w-xs truncate">
                        {log.reason || (
                          <span className="italic text-gray-400 dark:text-gray-500">
                            No reason provided
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </ResponsiveTable>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-600 dark:text-gray-400">
              Page {page} of {totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ChevronLeftIcon className="h-5 w-5 mr-1" />
                Previous
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="inline-flex items-center px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 hover:bg-gray-50 dark:hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
                <ChevronRightIcon className="h-5 w-5 ml-1" />
              </button>
            </div>
          </div>
        )}
    </div>
  );
};

export default PermissionAuditLogPage;
