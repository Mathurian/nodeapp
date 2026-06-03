import axios from 'axios'
import { classifyNetworkError } from './networkErrorClassifier'
import { createMutationIdempotencyKey, IDEMPOTENCY_HEADER } from './idempotency'
import { buildTenantAwareLoginPath } from '../utils/authRedirect'
import { extractTenantSlugFromPath, isKnownRoute } from '../utils/routeSegments'
import { getStoredTenantSlug } from '../utils/tenantSession'
import type { PublicLandingContent } from '../types/publicLandingContent'

/**
 * API Version Configuration
 *
 * The API supports versioning via URL path (e.g., /api/v1/).
 * Legacy /api/ routes are supported for backward compatibility and map to v1.
 *
 * Using explicit versioning is recommended for new code.
 */
const API_VERSION = 'v1'
const BASE_URL = import.meta.env.VITE_API_URL || `/api/${API_VERSION}`

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  withCredentials: true, // CRITICAL: Send httpOnly cookies with requests
  headers: {
    'Content-Type': 'application/json',
  }
})

// Public API instance (no auth required)
export const publicApi = axios.create({
  baseURL: BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // Enable cookies for public API as well
})

const isPublicPath = (pathname: string): boolean => {
  if (pathname === '/') return true
  if (pathname === '/login' || pathname === '/help' || pathname === '/register' || pathname === '/forgot-password') return true
  const singleSegment = pathname.split('/').filter(Boolean)[0] || ''
  return /^\/[^/]+\/(login|help|register|forgot-password)$/.test(pathname) || (/^\/[^/]+$/.test(pathname) && !isKnownRoute(singleSegment))
}

const MUTATION_METHODS = new Set(['post', 'put', 'patch', 'delete'])

// Request interceptor to add CSRF token for state-changing requests
api.interceptors.request.use(
  (config) => {
    const tenantSlug =
      typeof window !== 'undefined'
        ? extractTenantSlugFromPath(window.location.pathname) || getStoredTenantSlug()
        : null

    if (
      tenantSlug &&
      config.headers &&
      !config.headers['X-Tenant-Slug'] &&
      !config.headers['x-tenant-slug']
    ) {
      config.headers['X-Tenant-Slug'] = tenantSlug
    }

    // Cookies with httpOnly are automatically sent with requests
    // Add CSRF token from cookie for POST, PUT, DELETE, PATCH requests
    const method = config.method?.toLowerCase() || ''
    if (MUTATION_METHODS.has(method)) {
      const csrfToken = document.cookie
        .split('; ')
        .find(row => row.startsWith('_csrf='))
        ?.split('=')[1]

      if (csrfToken && config.headers) {
        config.headers['X-CSRF-Token'] = csrfToken
      }

      if (config.headers && !config.headers[IDEMPOTENCY_HEADER]) {
        const action = `${method}:${String(config.url || 'unknown')}`
        config.headers[IDEMPOTENCY_HEADER] = createMutationIdempotencyKey(action)
      }
    }
    return config
  },
  (error) => {
    const classification = classifyNetworkError(error)
    error.networkClassification = classification
    return Promise.reject(error)
  }
)

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config
    const classification = classifyNetworkError(error)
    error.networkClassification = classification

    // Handle 401 - redirect to login
    if (error.response?.status === 401) {
      const requestUrl = String(originalRequest?.url || '')
      const isAuthIdentityProbe =
        requestUrl.includes('/auth/profile') || requestUrl.includes('/auth/permissions')
      const isRetryableAuthExpiry = classification.code === 'IDEMPOTENCY_AUTH_EXPIRED_RETRYABLE'
      // On public pages and auth profile probing, unauthenticated 401 is expected
      if (!isRetryableAuthExpiry && !isPublicPath(window.location.pathname) && !isAuthIdentityProbe) {
        window.location.href = buildTenantAwareLoginPath(window.location.pathname)
      }
      return Promise.reject(error)
    }

    // Handle 403 CSRF errors - fetch new token and retry
    if (error.response?.status === 403 &&
        error.response?.data?.error?.includes('CSRF') &&
        !originalRequest._retry) {
      originalRequest._retry = true

      try {
        // Fetch a fresh CSRF token
        await api.get('/csrf-token')

        // Get the new token from cookie
        const csrfToken = document.cookie
          .split('; ')
          .find(row => row.startsWith('_csrf='))
          ?.split('=')[1]

        // Update the original request with the new token
        if (csrfToken && originalRequest.headers) {
          originalRequest.headers['X-CSRF-Token'] = csrfToken
        }

        // Retry the original request
        return api(originalRequest)
      } catch (retryError) {
        return Promise.reject(retryError)
      }
    }
    return Promise.reject(error)
  }
)

export const eventsAPI = {
  getAll: (params?: {
    archived?: boolean;
    search?: string;
    createdAfter?: string;
    createdBefore?: string;
    sortBy?: string;
    sortDirection?: 'asc' | 'desc';
    tenantId?: string;
  }) =>
    api.get('/events', { params }),
  getById: (id: string) => api.get(`/events/${id}`),
  create: (data: any) => api.post('/events', data),
  update: (id: string, data: any) => api.put(`/events/${id}`, data),
  archive: (id: string) => api.post(`/events/${id}/archive`),
  unarchive: (id: string) => api.post(`/events/${id}/unarchive`),
  createTemplateFromEvent: (id: string, data: { name: string; description?: string }) =>
    api.post(`/event-templates/from-event/${id}`, data),
  delete: (id: string) => api.delete(`/events/${id}`),
}

export const contestsAPI = {
  getAll: (params?: { eventId?: string; archived?: boolean; search?: string; createdAfter?: string; createdBefore?: string; sortBy?: string; sortDirection?: 'asc' | 'desc' }) =>
    api.get('/contests', { params }),
  getByEvent: (eventId: string) => api.get(`/contests/event/${eventId}`),
  getById: (id: string) => api.get(`/contests/${id}`),
  create: (eventIdOrData: string | any, data?: any) => {
    if (typeof eventIdOrData === 'string') {
      // Called with (eventId, data)
      return api.post(`/contests/event/${eventIdOrData}`, data)
    } else {
      // Called with (data) - extract eventId from data
      const { eventId, ...contestData } = eventIdOrData
      return api.post(`/contests/event/${eventId}`, contestData)
    }
  },
  update: (id: string, data: any) => api.put(`/contests/${id}`, data),
  clone: (id: string, data: { targetEventId: string; name?: string; includeCategories?: boolean; includeCriteria?: boolean }) =>
    api.post(`/contests/${id}/clone`, data),
  createFromTemplate: (templateId: string, data: {
    templateContestId: string;
    targetEventId: string;
    contestName?: string;
    contestDescription?: string;
    commentaryMode?: 'PER_CRITERION' | 'PER_CATEGORY' | 'HYBRID';
    commentaryScope?: 'CATEGORY' | 'CONTEST' | 'EVENT';
  }) =>
    api.post(`/event-templates/${templateId}/create-contest`, data),
  archive: (id: string) => api.post(`/contests/${id}/archive`),
  reactivate: (id: string) => api.post(`/contests/${id}/reactivate`),
  delete: (id: string) => api.delete(`/contests/${id}`),
  getOlympicScoringValidation: (id: string) => api.get(`/contests/${id}/olympic-scoring-validation`),
  getMinimumWinningScore: (id: string) => api.get(`/contests/${id}/minimum-winning-score`),
  updateMinimumWinningScore: (id: string, minimumWinningScore: number | null) =>
    api.put(`/contests/${id}/minimum-winning-score`, { minimumWinningScore }),
}

export const categoriesAPI = {
  getAll: () => api.get('/categories'),
  getByContest: (contestId: string) => api.get(`/categories/contest/${contestId}`),
  getById: (id: string) => api.get(`/categories/${id}`),
  create: (contestIdOrData: string | any, data?: any) => {
    if (typeof contestIdOrData === 'string') {
      // Called with (contestId, data)
      return api.post(`/categories/contest/${contestIdOrData}`, data)
    } else {
      // Called with (data)
      return api.post('/categories', contestIdOrData)
    }
  },
  update: (id: string, data: any) => api.put(`/categories/${id}`, data),
  clone: (id: string, data: { targetEventId: string; targetContestId: string; name?: string; includeCriteria?: boolean }) =>
    api.post(`/categories/${id}/clone`, data),
  createFromTemplate: (templateId: string, data: {
    contestId: string;
    name?: string;
    description?: string;
    scoreCap?: number;
    timeLimit?: number;
    contestantMin?: number;
    contestantMax?: number;
    commentaryMode?: 'PER_CRITERION' | 'PER_CATEGORY' | 'HYBRID';
    commentaryScope?: 'CATEGORY' | 'CONTEST' | 'EVENT';
  }) => api.post(`/templates/${templateId}/create-category`, data),
  delete: (id: string) => api.delete(`/categories/${id}`),
  getCriteria: (categoryId: string) => api.get(`/categories/${categoryId}/criteria`),
  importCriteria: (categoryId: string, data: { sourceCategoryId?: string; templateId?: string }) =>
    api.post(`/categories/${categoryId}/criteria/import`, data),
  createCriterion: (categoryId: string, data: { name: string; maxScore: number }) => api.post(`/categories/${categoryId}/criteria`, data),
  updateCriterion: (criterionId: string, data: { name?: string; maxScore?: number }) => api.put(`/categories/criteria/${criterionId}`, data),
  deleteCriterion: (criterionId: string) => api.delete(`/categories/criteria/${criterionId}`),
  createTemplateFromCategory: (categoryId: string, data: { name: string; description?: string }) =>
    api.post(`/templates/categories/from-category/${categoryId}`, data),
}

export const commentaryAPI = {
  getCategoryComment: (categoryId: string, contestantId: string, judgeId?: string) =>
    api.get(`/commentary/category/${categoryId}/contestant/${contestantId}`, {
      params: judgeId ? { judgeId } : undefined,
    }),
  updateCategoryComment: (
    categoryId: string,
    contestantId: string,
    data: { comment: string; judgeId?: string },
    config?: any,
  ) => api.put(`/commentary/category/${categoryId}/contestant/${contestantId}`, data, config),
}

export const scoringAPI = {
  getScores: (categoryId: string, contestantId: string, representedJudgeId?: string) => api.get(`/scoring/category/${categoryId}/contestant/${contestantId}`, {
    params: representedJudgeId ? { representedJudgeId } : undefined,
  }),
  submitScore: (categoryIdOrData: string | any, contestantIdOrData?: string, data?: any, config?: any) => {
    if (typeof categoryIdOrData === 'string' && typeof contestantIdOrData === 'string') {
      // Called with (categoryId, contestantId, data)
      return api.post(`/scoring/category/${categoryIdOrData}/contestant/${contestantIdOrData}`, data, config)
    } else {
      // Called with (scoreData) - extract categoryId and contestantId from data
      const { categoryId, contestantId, ...scoreData } = categoryIdOrData
      return api.post(`/scoring/category/${categoryId}/contestant/${contestantId}`, scoreData, config)
    }
  },
  updateScore: (scoreId: string, data: any, config?: any) => api.put(`/scoring/${scoreId}`, data, config),
  deleteScore: (scoreId: string) => api.delete(`/scoring/${scoreId}`),
  certifyScores: (
    categoryId: string,
    signature?: {
      contestantId?: string
      typedSignature?: string
      drawnSignatureData?: string
      signatureFilePath?: string
      representedJudgeId?: string
    },
  ) => api.post(`/scoring/category/${categoryId}/certify`, signature || {}),
  certifyTotals: (categoryId: string, signature?: any) => api.post(`/scoring/category/${categoryId}/certify-totals`, signature || {}),
  finalCertification: (categoryId: string, signature?: any) => api.post(`/scoring/category/${categoryId}/final-certification`, signature || {}),
  getCategories: (params?: { eventId?: string; contestId?: string }) => api.get('/scoring/categories', { params }),
  getCriteria: (categoryId: string) => api.get(`/categories/${categoryId}/criteria`),
  requestDeduction: (data: any, config?: any) => api.post('/scoring/deductions', data, config),
  getDeductions: (params?: { eventId?: string; contestId?: string; categoryId?: string; contestantId?: string; status?: string }) =>
    api.get('/scoring/deductions', { params }),
  approveDeduction: (deductionId: string, signature: string) => api.post(`/scoring/deductions/${deductionId}/approve`, { signature }),
  rejectDeduction: (deductionId: string, reason: string) => api.post(`/scoring/deductions/${deductionId}/reject`, { reason }),
}

export const scoreFilesAPI = {
  upload: (formData: FormData, config?: any) => api.post('/score-files', formData, {
    ...config,
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(config?.headers || {}),
    },
  }),
  getAll: (params?: { categoryId?: string; judgeId?: string; contestantId?: string; status?: string; criterionId?: string; contextType?: string }) =>
    api.get('/score-files', { params }),
  getByCategory: (categoryId: string) => api.get(`/score-files/category/${categoryId}`),
  getByContestant: (contestantId: string) => api.get(`/score-files/contestant/${contestantId}`),
  download: (id: string) => api.get(`/score-files/download/${id}`, { responseType: 'blob' }),
  processScoresheetImport: (id: string, config?: any) => api.post(`/score-files/${id}/process-scoresheet-import`, {}, config),
  getScoresheetImportDraft: (id: string) => api.get(`/score-files/${id}/scoresheet-import-draft`),
  evaluateScoresheetImportUat: (formData: FormData, config?: any) => api.post('/score-files/scoresheet-import-uat', formData, {
    ...config,
    headers: {
      'Content-Type': 'multipart/form-data',
      ...(config?.headers || {}),
    },
  }),
  remove: (id: string, config?: any) => api.delete(`/score-files/${id}`, config)
}

export const scoreDelegationsAPI = {
  getAll: (params?: { activeOnly?: boolean; delegateUserId?: string }) =>
    api.get('/score-delegations', { params }),
  getEligibleJudges: (categoryId: string) =>
    api.get('/score-delegations/eligible-judges', { params: { categoryId } }),
  validate: (data: { categoryId: string; representedJudgeId: string }) =>
    api.post('/score-delegations/validate', data),
  create: (data: {
    delegateUserId: string;
    scopeLevel: 'CATEGORY' | 'CONTEST' | 'EVENT' | 'TENANT';
    coverageMode: 'SELECTED_JUDGES' | 'ALL_JUDGES_IN_SCOPE';
    judgeIds?: string[];
    categoryId?: string | null;
    contestId?: string | null;
    eventId?: string | null;
    startsAt?: string | null;
    expiresAt?: string | null;
    reason?: string;
  }) => api.post('/score-delegations', data),
  revoke: (id: string, reason?: string) =>
    api.post(`/score-delegations/${id}/revoke`, reason ? { reason } : {}),
}

export const resultsAPI = {
  getAll: () => api.get('/results'),
  getCategories: () => api.get('/results/categories'),
  getScopeOptions: () => api.get('/results/scope-options'),
  getContestantResults: (contestantId: string) => api.get(`/results/contestant/${contestantId}`),
  getCategoryResults: (categoryId: string) => api.get(`/results/category/${categoryId}`),
  getContestResults: (contestId: string) => api.get(`/results/contest/${contestId}`),
  getEventResults: (eventId: string) => api.get(`/results/event/${eventId}`),
}

export const winnersAPI = {
  getAll: (params?: { eventId?: string; contestId?: string }) => api.get('/winners', { params }),
  getByContest: (contestId: string) => api.get(`/winners/contest/${contestId}`),
  getPublicationOverview: (params?: { eventId?: string }) => api.get('/winners/publication-overview', { params }),
  getPublicationStatus: (contestId: string) => api.get(`/winners/contest/${contestId}/publication-status`),
  publish: (contestId: string) => api.post(`/winners/contest/${contestId}/publish`),
  unpublish: (contestId: string, reason: string) => api.post(`/winners/contest/${contestId}/unpublish`, { reason }),
}

export const usersAPI = {
  getAll: (params?: { includeInactive?: boolean; search?: string; createdAfter?: string; createdBefore?: string; sortBy?: string; sortDirection?: 'asc' | 'desc' }) =>
    api.get('/users', { params }),
  getById: (id: string) => api.get(`/users/${id}`),
  getContestantPrivateProfile: (id: string) => api.get(`/users/${id}/contestant-private-profile`),
  create: (data: any) => api.post('/users', data),
  update: (id: string, data: any) => api.put(`/users/${id}`, data),
  updateProfile: (id: string, data: any) => api.put(`/users/profile/${id}`, data),
  uploadImage: (id: string, formData: FormData) => api.post(`/users/${id}/image`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadBioFile: (id: string, formData: FormData) => api.post(`/users/${id}/bio-file`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  uploadContestantPrivateFiles: (id: string, formData: FormData) => api.post(`/users/${id}/contestant-private-files`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  downloadContestantPrivateFile: (id: string, fileId: string) =>
    api.get(`/users/${id}/contestant-private-files/${fileId}/download`, { responseType: 'blob' }),
  deleteContestantPrivateFile: (id: string, fileId: string) => api.delete(`/users/${id}/contestant-private-files/${fileId}`),
  delete: (id: string) => api.delete(`/users/${id}`),
  bulkDelete: (data: { userIds: string[]; forceDeleteAdmin?: boolean }) => api.post('/users/bulk-delete', data),
  reassignTenant: (id: string, tenantId: string) => api.put(`/users/${id}/tenant`, { tenantId }),
  resetPassword: (id: string, data: any) => api.post(`/users/${id}/reset-password`, data),
  changePassword: (id: string, data: { currentPassword: string; newPassword: string }) =>
    api.post(`/users/${id}/change-password`, data),
  importCSV: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/users/bulk-upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  getCSVTemplate: (userType: string) => api.get(`/users/csv-template?userType=${encodeURIComponent(userType)}`),
}

export const adminAPI = {
  getStats: () => api.get('/admin/stats'),
  getLogs: (params?: any) => api.get('/admin/logs', { params }),
  getActiveUsers: () => api.get('/admin/active-users'),
  getSettings: () => api.get('/admin/settings'),
  updateSettings: (data: any) => api.put('/admin/settings', data),
  getUsers: () => api.get('/admin/users'),
  getEvents: () => api.get('/admin/events'),
  getContests: () => api.get('/admin/contests'),
  getCategories: () => api.get('/admin/categories'),
  getScores: () => api.get('/admin/scores'),
  getActivityLogs: () => api.get('/admin/logs'),
  getAuditLogs: (params?: any) => api.get('/admin/audit-logs', { params }),
  getLoginLocations: (params?: { days?: number; limit?: number; tenantId?: string }) => api.get('/admin/login-locations', { params }),
  exportAuditLogs: (params?: any) => api.post('/admin/export-audit-logs', params),
  testConnection: (type: string) => api.post(`/admin/test/${type}`),
}

export const uploadAPI = {
  uploadFile: (file: File, type: string = 'OTHER') => {
    const formData = new FormData()
    formData.append('file', file)
    formData.append('type', type)
    return api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
  uploadFileData: (fileData: FormData, type: string = 'OTHER') => {
    fileData.append('type', type)
    return api.post('/upload', fileData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
  deleteFile: (fileId: string) => api.delete(`/upload/${fileId}`),
  getFiles: (params?: any) => api.get('/upload/files', { params }),
}

export const archiveAPI = {
  getAll: () => api.get('/archive'),
  getActiveEvents: () => api.get('/archive/events/active'),
  archive: (typeOrEventId: string, idOrReason?: string, reason?: string) => {
    if (reason !== undefined) {
      // Called with (type, id, reason)
      return api.post(`/archive/${typeOrEventId}/${idOrReason}`, { reason })
    } else {
      // Called with (eventId, reason) - treat as event archive
      return api.post(`/archive/event/${typeOrEventId}`, { reason: idOrReason })
    }
  },
  restore: (typeOrEventId: string, id?: string) => {
    if (id !== undefined) {
      // Called with (type, id)
      return api.post(`/archive/${typeOrEventId}/${id}/restore`)
    } else {
      // Called with (eventId) - treat as event restore
      return api.post(`/archive/event/${typeOrEventId}/restore`)
    }
  },
  delete: (typeOrEventId: string, id?: string) => {
    if (id !== undefined) {
      // Called with (type, id)
      return api.delete(`/archive/${typeOrEventId}/${id}`)
    } else {
      // Called with (eventId) - treat as event delete
      return api.delete(`/archive/event/${typeOrEventId}`)
    }
  },
  archiveEvent: (eventId: string, reason: string) => api.post(`/archive/event/${eventId}`, { reason }),
  restoreEvent: (eventId: string) => api.post(`/archive/event/${eventId}/restore`),
  getArchivedEvents: () => api.get('/archive/events'),
}

export const backupAPI = {
  getAll: () => api.get('/backups'),
  create: (type: 'FULL' | 'SCHEMA' | 'DATA', destination: 'LOCAL' | 'OFF_SITE' | 'BOTH' = 'LOCAL') =>
    api.post('/backups', { type, destination }),
  getSchedules: (scopeQuery: string = '') => api.get(`/backups/settings${scopeQuery}`),
  createSchedule: (payload: any, scopeQuery: string = '') => api.post(`/backups/settings${scopeQuery}`, payload),
  updateSchedule: (id: string, payload: any, scopeQuery: string = '') => api.put(`/backups/settings/${id}${scopeQuery}`, payload),
  deleteSchedule: (id: string, scopeQuery: string = '') => api.delete(`/backups/settings/${id}${scopeQuery}`),
  list: () => api.get('/backups'),
  download: async (backupId: string) => {
    const response = await api.get(`/backups/${backupId}/download`, { responseType: 'blob' })
    return response.data
  },
  restore: (backupIdOrFile: string | File) => {
    if (typeof backupIdOrFile === 'string') {
      return api.post(`/backups/${backupIdOrFile}/restore`)
    } else {
      const formData = new FormData()
      formData.append('file', backupIdOrFile)
      return api.post('/backups/restore-from-file', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      })
    }
  },
  restoreFromFile: (file: File) => {
    const formData = new FormData()
    formData.append('file', file)
    return api.post('/backups/restore-from-file', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    })
  },
  delete: (backupId: string) => api.delete(`/backups/${backupId}`),
}

export const settingsAPI = {
  getAll: () => api.get('/settings'),
  getSettings: () => api.get('/settings/general'),
  getPublicSettings: (tenantSlug?: string) => {
    if (tenantSlug) {
      return publicApi.get(`/settings/public?tenantSlug=${encodeURIComponent(tenantSlug)}`, {
        headers: { 'X-Tenant-Slug': tenantSlug },
      });
    }
    return publicApi.get('/settings/public');
  },
  getThemeSettings: (tenantId?: string, tenantSlug?: string) => {
    if (tenantId) return api.get(`/settings/theme?tenantId=${tenantId}`);
    if (tenantSlug) {
      return publicApi.get(`/settings/theme?tenantSlug=${encodeURIComponent(tenantSlug)}`, {
        headers: { 'X-Tenant-Slug': tenantSlug },
      });
    }
    return publicApi.get('/settings/theme');
  },
  getPublicLandingContent: (scopeQuery: string = '') => api.get(`/settings/public-content${scopeQuery}`),
  getAppName: () => publicApi.get('/settings/app-name'),
  update: (data: Record<string, any>) => api.put('/settings', data),
  updateSettings: (data: any) => api.put('/settings', data),
  test: (type: 'email' | 'database' | 'backup', payload?: any) => api.post(`/settings/test/${type}`, payload || {}),
  // General settings
  getGeneralSettings: () => api.get('/settings/general'),
  // Logging settings
  getLoggingLevels: () => api.get('/settings/logging-levels'),
  updateLoggingLevel: (settings: any) => api.put('/settings/logging-levels', settings),
  // Security settings
  getSecuritySettings: () => api.get('/settings/security'),
  updateSecuritySettings: (settings: any) => api.put('/settings/security', settings),
  // Backup settings
  getBackupSettings: () => api.get('/settings/backup'),
  updateBackupSettings: (settings: any) => api.put('/settings/backup', settings),
  startGoogleDriveBackupOAuth: (
    payload?: { origin?: string; clientId?: string; clientSecret?: string; redirectUri?: string },
    scopeQuery: string = ''
  ) =>
    api.post(`/settings/backup/google-drive/oauth/start${scopeQuery}`, payload || {}),
  getGoogleDriveBackupOAuthStatus: (scopeQuery: string = '') =>
    api.get(`/settings/backup/google-drive/oauth/status${scopeQuery}`),
  disconnectGoogleDriveBackupOAuth: (scopeQuery: string = '') =>
    api.post(`/settings/backup/google-drive/oauth/disconnect${scopeQuery}`),
  uploadGcsBackupServiceAccount: (serviceAccountJson: string, projectNumber?: string) =>
    api.post('/settings/backup/gcs/service-account', { serviceAccountJson, projectNumber }),
  // Email settings
  getEmailSettings: () => api.get('/settings/email'),
  updateEmailSettings: (settings: any) => api.put('/settings/email', settings),
  // JWT configuration
  getJWTConfig: () => api.get('/settings/jwt-config'),
  updateJWTConfig: (config: any) => api.put('/settings/jwt-config', config),
  // Theme settings
  updateThemeSettings: (settings: any) => api.put('/settings/theme', settings),
  updatePublicLandingContent: (content: PublicLandingContent, scopeQuery: string = '') =>
    api.put(`/settings/public-content${scopeQuery}`, content),
  uploadThemeLogo: (file: File) => {
    const formData = new FormData()
    formData.append('logo', file)
    return api.post('/settings/theme/logo', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  uploadThemeFavicon: (file: File) => {
    const formData = new FormData()
    formData.append('favicon', file)
    return api.post('/settings/theme/favicon', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    })
  },
  // Contestant visibility settings
  getContestantVisibilitySettings: () => api.get('/settings/contestant-visibility'),
  updateContestantVisibilitySettings: (settings: any) => api.put('/settings/contestant-visibility', settings),
  getPublishedResultsVisibilitySettings: () => api.get('/settings/published-results-visibility'),
  updatePublishedResultsVisibilitySettings: (settings: any) => api.put('/settings/published-results-visibility', settings),
  // Password policy
  getPasswordPolicy: () => publicApi.get('/settings/password-policy'),
  updatePasswordPolicy: (policy: any) => api.put('/settings/password-policy', policy),
  // Database connection info
  getDatabaseConnectionInfo: () => api.get('/settings/database-connection-info'),
}

export const assignmentsAPI = {
  getAll: (params?: { status?: string; judgeId?: string; categoryId?: string; contestId?: string; eventId?: string }) =>
    api.get('/assignments', { params }),
  getJudges: () => api.get('/assignments/judges'),
  getCategories: () => api.get('/assignments/categories'),
  getContestantAssignments: (params?: { eventId?: string; contestId?: string; categoryId?: string }) =>
    api.get('/assignments/contestants/assignments', { params }),
  getCategoryContestants: (categoryId: string) =>
    api.get(`/assignments/category/${categoryId}/contestants`),
  create: (data: any) => api.post('/assignments', data),
  update: (id: string, data: any) => api.put(`/assignments/${id}`, data),
  delete: (id: string) => api.put(`/assignments/remove/${id}`),
  assignJudge: (judgeId: string, categoryId: string) => api.post('/assignments/judge', { judgeId, categoryId }),
  removeAssignment: (assignmentId: string) => api.put(`/assignments/remove/${assignmentId}`),
  bulkDelete: (data: {
    assignmentType: 'judge' | 'contestant' | 'tally-master' | 'auditor';
    items: Array<{ id?: string; categoryId?: string; contestantId?: string }>;
  }) => api.post('/bulk/assignments/delete', data),
  getJudgeContestLimitPolicy: (params?: { eventId?: string; tenantId?: string }) =>
    api.get('/assignments/policies/judge-contest-limit', { params }),
  updateJudgeContestLimitPolicy: (
    data: { limit: number | null; eventId?: string },
    params?: { tenantId?: string }
  ) => api.put('/assignments/policies/judge-contest-limit', data, { params }),
}

export const judgeSchedulesAPI = {
  list: (params?: { judgeId?: string; eventId?: string; includePast?: boolean }) =>
    api.get('/judge-schedules', { params }),
  importCsv: (formData: FormData) =>
    api.post('/judge-schedules/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),
  downloadTemplate: () => api.get('/judge-schedules/template', { responseType: 'blob' }),
}

export const roleAssignmentsAPI = {
  getAll: (params?: { role?: string; contestId?: string; eventId?: string; categoryId?: string; tenantId?: string }) =>
    api.get('/role-assignments', { params }),
  create: (data: { userId: string; role: string; contestId?: string; eventId?: string; categoryId?: string; notes?: string; tenantId?: string }) =>
    api.post('/role-assignments', data),
  update: (id: string, data: { notes?: string; isActive?: boolean }) => api.put(`/role-assignments/${id}`, data),
  delete: (id: string, tenantId?: string) => api.delete(`/role-assignments/${id}`, { params: tenantId ? { tenantId } : undefined }),
}

export const auditorAPI = {
  getStats: () => api.get('/auditor/stats'),
  getPendingAudits: () => api.get('/auditor/pending-audits'),
  getCompletedAudits: () => api.get('/auditor/completed-audits'),
  getAuditHistory: (params?: { categoryId?: string; page?: number; limit?: number }) =>
    api.get('/auditor/audit-history', { params }),
  finalCertification: (categoryIdOrData: string | any, data?: any) => {
    if (typeof categoryIdOrData === 'string') {
      // Called with (categoryId, data)
      return api.post(`/auditor/category/${categoryIdOrData}/final-certification`, data)
    } else {
      // Called with (data) - extract categoryId from data
      const { categoryId, ...certificationData } = categoryIdOrData
      return api.post(`/auditor/category/${categoryId}/final-certification`, certificationData)
    }
  },
  rejectAudit: (categoryId: string, reason: string) => api.post(`/auditor/category/${categoryId}/reject`, { reason }),
}

export const boardAPI = {
  getStats: () => api.get('/board/stats'),
  getCertifications: () => api.get('/board/certifications'),
  approveCertification: (id: string, signature?: any) => api.post(`/board/certifications/${id}/approve`, signature || {}),
  rejectCertification: (id: string, reason: string) => api.post(`/board/certifications/${id}/reject`, { reason }),
  getCertificationStatus: () => api.get('/board/certification-status'),
}

export const tallyMasterAPI = {
  getStats: () => api.get('/tally-master/stats'),
  getCertifications: () => api.get('/tally-master/certifications'),
  getCertificationQueue: () => api.get('/tally-master/certification-queue'),
  getPendingCertifications: () => api.get('/tally-master/pending-certifications'),
  certifyTotals: (categoryIdOrData: string | any, data?: any) => {
    if (typeof categoryIdOrData === 'string') {
      // Called with (categoryId, data) - backend expects body payload
      return api.post('/tally-master/certify-totals', { categoryId: categoryIdOrData, ...(data || {}) })
    } else {
      // Called with (data) - extract categoryId from data
      const { categoryId, ...totalsData } = categoryIdOrData
      return api.post('/tally-master/certify-totals', { categoryId, ...totalsData })
    }
  },
}

export const scoreGovernanceAPI = {
  getScoreReview: (params?: { eventId?: string; contestId?: string; categoryId?: string; contestantId?: string }) =>
    api.get('/score-governance/review', { params }),
  getSettings: () => api.get('/score-governance/settings'),
  updateSettings: (data: { requiredAdditionalApprovals: number; approverRoles: string[]; allowDelegateJudgeCertification: boolean }) =>
    api.put('/score-governance/settings', data),
  createRequest: (data: any) => api.post('/score-governance/requests', data),
  getRequests: (params?: { eventId?: string; contestId?: string; categoryId?: string; contestantId?: string; status?: string; actionType?: string }) =>
    api.get('/score-governance/requests', { params }),
  approveRequest: (id: string, signature: any) => api.post(`/score-governance/requests/${id}/approve`, signature),
  rejectRequest: (id: string, reason: string) => api.post(`/score-governance/requests/${id}/reject`, { reason }),
}

export const emailAPI = {
  getAll: () => api.get('/email'),
  getTemplates: () => api.get('/email-templates'),
  createTemplate: (data: any) => api.post('/email-templates', data),
  updateTemplate: (id: string, data: any) => api.put(`/email-templates/${id}`, data),
  deleteTemplate: (id: string) => api.delete(`/email-templates/${id}`),
  previewTemplate: (id: string, variables: Record<string, string>) => api.post(`/email-templates/${id}/preview`, { variables }),
  sendTemplate: (id: string, data: { recipients?: string[]; roles?: string[]; variables?: Record<string, string> }) =>
    api.post(`/email-templates/${id}/send`, data),
  getCampaigns: () => api.get('/email/campaigns'),
  createCampaign: (data: any) => api.post('/email/campaigns', data),
  sendCampaign: (id: string) => api.post(`/email/campaigns/${id}/send`),
  getLogs: () => api.get('/email/logs'),
  sendEmail: (data: any) => api.post('/email/send', data),
  sendMultiple: (data: { recipients: string[]; subject: string; content?: string; body?: string; html?: string }) =>
    api.post('/email/send-multiple', {
      recipients: data.recipients,
      subject: data.subject,
      body: data.body ?? data.content ?? '',
      html: data.html,
    }),
  sendByRole: (data: { roles: string[]; subject: string; content?: string; body?: string; html?: string }) =>
    api.post('/email/send-by-role', {
      roles: data.roles,
      subject: data.subject,
      body: data.body ?? data.content ?? '',
      html: data.html,
    }),
}

export const reportsAPI = {
  generate: (data: { type: 'event' | 'contest' | 'system'; eventId?: string; contestId?: string; contestIds?: string[] }) =>
    api.post('/reports/generate', data),
  getAll: (params?: { type?: string; format?: string; startDate?: string; endDate?: string; eventId?: string; contestId?: string | string[] }) =>
    api.get('/reports', { params }),
  getById: (id: string) => api.get(`/reports/${id}/download`),
  delete: (id: string) => api.delete(`/reports/instances/${id}`),
  exportPdf: (id: string) => api.post(`/reports/${id}/export/pdf`, {}, { responseType: 'blob' }),
  exportExcel: (id: string) => api.post(`/reports/${id}/export/excel`, {}, { responseType: 'blob' }),
  exportCsv: (id: string) => api.post(`/reports/${id}/export/csv`, {}, { responseType: 'blob' }),
  sendEmail: (data: { reportId: string; recipients: string[]; subject?: string; message?: string; html?: string; format?: 'pdf' | 'excel' | 'csv' }) =>
    api.post('/reports/send-email', data),
}

export const fieldConfigurationAPI = {
  getAll: () => api.get('/settings/field-configurations'),
  getByField: (fieldName: string) => api.get(`/settings/field-configurations/${fieldName}`),
  update: (fieldName: string, data: any) => api.put(`/settings/field-configurations/${fieldName}`, data),
  updateBulk: (configurations: any[]) => api.put('/settings/field-configurations/bulk', { configurations }),
  resetToDefaults: () => api.post('/settings/field-configurations/reset'),
}

export const notificationsAPI = {
  getAll: () => api.get('/notifications'),
  getUnreadCount: () => api.get('/notifications/unread-count'),
  markAsRead: (id: string) => api.put(`/notifications/${id}/read`),
  markAllAsRead: () => api.put('/notifications/read-all'),
  delete: (id: string) => api.delete(`/notifications/${id}`),
  deleteAllRead: (daysOld?: number) => api.delete(`/notifications/read-all${daysOld ? `?daysOld=${daysOld}` : ''}`),
  sendNotification: (data: { userIds: string[], title: string, message: string, type?: string, link?: string, targetTenantId?: string | null, forcePush?: boolean }) =>
    api.post('/notifications/send', data),
  broadcastByRole: (data: { roles: string[], title: string, message: string, type?: string, link?: string, targetTenantId?: string | null, forcePush?: boolean }) =>
    api.post('/notifications/broadcast', data),
}

export const notificationPreferencesAPI = {
  getPreferences: () => api.get('/notification-preferences'),
  updatePreferences: (data: any) => api.put('/notification-preferences', data),
  resetPreferences: () => api.post('/notification-preferences/reset'),
  getPushConfig: () => api.get('/notification-preferences/push/config'),
  upsertPushSubscription: (subscription: {
    endpoint: string;
    expirationTime?: number | null;
    keys: { p256dh: string; auth: string };
  }) => api.post('/notification-preferences/push/subscription', subscription),
  removePushSubscription: (endpoint: string) => api.delete('/notification-preferences/push/subscription', { data: { endpoint } }),
}

export const tenantsAPI = {
  getAll: (params?: {
    page?: number;
    limit?: number;
    take?: number;
    skip?: number;
    status?: string;
    isActive?: boolean;
    planType?: string;
    search?: string;
  }) => {
    const normalizedParams = params
      ? {
          ...params,
          take: params.take ?? params.limit,
          skip: params.skip ?? (params.page && params.limit ? (params.page - 1) * params.limit : undefined),
        }
      : undefined

    return api.get('/tenants', { params: normalizedParams })
  },
  getById: (id: string) => api.get(`/tenants/${id}`),
  getCurrent: () => api.get('/tenants/current'),
  create: (data: any) => api.post('/tenants', data),
  update: (id: string, data: any) => api.put(`/tenants/${id}`, data),
  delete: (id: string, confirm: string) => api.delete(`/tenants/${id}?confirm=${confirm}`),
  activate: (id: string) => api.post(`/tenants/${id}/activate`),
  deactivate: (id: string, reason?: string) => api.post(`/tenants/${id}/deactivate`, { reason }),
  getAnalytics: (id: string, period?: string) => api.get(`/tenants/${id}/analytics`, { params: { period } }),
  inviteUser: (id: string, data: { email: string; role: string; name?: string }) =>
    api.post(`/tenants/${id}/users/invite`, data),
}

// Permissions API (Phase 4: Dynamic CRUD Permissions System)
export const permissionsAPI = {
  // Get all permissions for a specific role
  getRolePermissions: (role: string, tenantId?: string) =>
    api.get('/permissions', { params: { role, tenantId } }),

  // Get all permissions (all roles)
  getAllPermissions: (tenantId?: string) =>
    api.get('/permissions', { params: { tenantId } }),

  getAllScopes: (tenantId?: string) =>
    api.get('/permissions/scopes', { params: { tenantId } }),

  // Update a single permission
  updatePermission: (data: {
    role: string;
    resource: string;
    operation: string;
    allowed: boolean;
    reason?: string;
  }) => api.put('/permissions', data),

  updatePermissionScope: (data: {
    role: string;
    resource: string;
    operation?: string | null;
    scope?: 'ASSIGNMENT' | 'EVENT' | 'TENANT';
    inherit?: boolean;
    reason?: string;
  }) => api.put('/permissions/scopes', data),

  // Get permission statistics
  getStats: (tenantId?: string) =>
    api.get('/permissions/stats', { params: { tenantId } }),

  // Get audit logs for permission changes
  getAuditLogs: (params?: {
    role?: string;
    resource?: string;
    changedBy?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => api.get('/permissions/audit-logs', { params }),

  // Export permissions as CSV
  exportPermissions: (role?: string, tenantId?: string) =>
    api.get('/permissions/export', { params: { role, tenantId }, responseType: 'blob' }),

  // Warm permission cache
  warmCache: (tenantId?: string) =>
    api.post('/permissions/cache/warm', { tenantId }),
};

export const testRunnerAPI = {
  getUatIds: () => api.get('/test-runner/uat-ids'),
  getFiles: () => api.get('/test-runner/files'),
  getRuns: () => api.get('/test-runner/runs'),
  startRun: (data: { testFile: string; testPattern?: string }) =>
    api.post('/test-runner/run', data, { timeout: 30000 }),
  getRun: (runId: string) => api.get(`/test-runner/run/${runId}`),
  deleteRun: (runId: string) => api.delete(`/test-runner/run/${runId}`),
  cleanupRuns: () => api.delete('/test-runner/runs/cleanup'),
}

// Export the api instance for direct use
export { api, api as apiClient }
export default api
