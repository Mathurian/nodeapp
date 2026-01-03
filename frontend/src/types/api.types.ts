/**
 * API Response Types
 * Comprehensive type definitions for API interactions
 */

// Generic API Response Wrapper
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
  errors?: string[];
  timestamp?: string;
}

// Pagination
export interface PaginatedResponse<T> {
  success: boolean;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

// User Types
export interface User {
  id: string;
  name: string;
  preferredName?: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string;
  judge?: Judge;
  contestant?: Contestant;
}

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'ORGANIZER' | 'AUDITOR' | 'TALLY_MASTER' | 'BOARD' | 'JUDGE' | 'CONTESTANT' | 'EMCEE';

export interface Judge {
  id: string;
  userId: string;
  isActive: boolean;
}

export interface Contestant {
  id: string;
  userId: string;
  isActive: boolean;
}

// Event Types
export interface Event {
  id: string;
  name: string;
  description?: string;
  startDate: string;
  endDate: string;
  status: EventStatus;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export type EventStatus = 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'ARCHIVED';

// Contest Types
export interface Contest {
  id: string;
  eventId: string;
  name: string;
  description?: string;
  order: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Category Types
export interface Category {
  id: string;
  contestId: string;
  name: string;
  description?: string;
  order: number;
  maxScore: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Scoring Types
export interface Score {
  id: string;
  categoryId: string;
  contestantId: string;
  judgeId: string;
  value: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

// Settings Types
export interface SystemSettings {
  appName: string;
  logoUrl?: string;
  primaryColor: string;
  secondaryColor: string;
  theme: 'light' | 'dark' | 'auto';
  enableRegistration: boolean;
  enableEmails: boolean;
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  user: User;
  // Token is in httpOnly cookie, not returned
}

export interface PasswordResetRequest {
  email: string;
}

export interface PasswordResetResponse {
  message: string;
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

// Error Types
export interface ApiError {
  status: number;
  error: string;
  details?: string[];
  code?: string;
}

// File Upload Types
export interface UploadResponse {
  id: string;
  filename: string;
  originalName: string;
  mimeType: string;
  size: number;
  url: string;
  uploadedAt: string;
}

// Activity Log Types
export interface ActivityLog {
  id: string;
  userId: string;
  userName: string;
  userRole: UserRole;
  action: string;
  resourceType: string;
  resourceId?: string;
  ipAddress: string;
  userAgent: string;
  details?: Record<string, any>;
  createdAt: string;
}

// Audit Log Types
export interface AuditLog {
  id: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  oldValue?: Record<string, any>;
  newValue?: Record<string, any>;
  createdAt: string;
}

// Export all types as a namespace for easier imports
export namespace API {
  export type Response<T = any> = ApiResponse<T>;
  export type Paginated<T> = PaginatedResponse<T>;
  export type Error = ApiError;
}
