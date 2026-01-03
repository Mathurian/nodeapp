export interface AuditLog {
  id: string
  userId: string
  action: string
  resource: string
  resourceId: string | null
  metadata: Record<string, any> | null
  ipAddress: string | null
  userAgent: string | null
  timestamp: string
  tenantId: string
  user?: {
    id: string
    name: string
    email: string
  }
}

export interface AuditLogFilters {
  search?: string
  action?: string
  resource?: string
  userId?: string
  startDate?: string
  endDate?: string
  page?: number
  limit?: number
}

export interface AuditLogResponse {
  success: boolean
  data: AuditLog[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
  }
  statistics?: {
    totalLogs: number
    uniqueUsers: number
    actionBreakdown: Record<string, number>
    resourceBreakdown: Record<string, number>
  }
}

export interface ExportAuditLogsParams {
  format: 'csv' | 'json'
  filters?: AuditLogFilters
}
