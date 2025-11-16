/**
 * Base type definitions for the application
 * Common types and utility types used throughout the codebase
 */

export type ID = string

export interface Timestamps {
  createdAt: Date
  updatedAt: Date
}

export interface BaseEntity extends Timestamps {
  id: ID
}

/**
 * Make specific properties optional
 */
export type WithOptional<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>

/**
 * Make specific properties required
 */
export type WithRequired<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>

/**
 * Pick specific properties from a type
 */
export type PickRequired<T, K extends keyof T> = Pick<T, K> & Partial<Omit<T, K>>

/**
 * API Response wrapper
 */
export interface ApiResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
  meta?: {
    page?: number
    limit?: number
    total?: number
    [key: string]: any
  }
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page?: number
  limit?: number
  sortBy?: string
  sortOrder?: 'asc' | 'desc'
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> {
  data: T[]
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
}
