/**
 * Authentication Test Helpers
 * Helpers for generating tokens, mocking users, and testing authentication flows
 */

import jwt from 'jsonwebtoken';
import { UserRole } from '@prisma/client';
import { Request, Response } from 'express';

/**
 * Generate JWT token for testing
 */
export const generateToken = (
  userId: string,
  role: UserRole = UserRole.ADMIN,
  sessionVersion: number = 1,
  expiresIn: string = '24h'
): string => {
  const secret = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';
  return jwt.sign(
    {
      userId,
      role,
      sessionVersion,
    },
    secret,
    { expiresIn }
  );
};

/**
 * Generate expired JWT token for testing
 */
export const generateExpiredToken = (
  userId: string,
  role: UserRole = UserRole.ADMIN
): string => {
  const secret = process.env.JWT_SECRET || 'test-jwt-secret-key-for-testing';
  return jwt.sign(
    {
      userId,
      role,
      sessionVersion: 1,
    },
    secret,
    { expiresIn: '-1h' } // Already expired
  );
};

/**
 * Generate invalid JWT token for testing
 */
export const generateInvalidToken = (): string => {
  return 'invalid.token.here';
};

/**
 * Decode token without verification (for testing)
 */
export const decodeToken = (token: string): any => {
  return jwt.decode(token);
};

/**
 * Mock authenticated request
 */
export const mockAuthRequest = (
  userId: string,
  role: UserRole = UserRole.ADMIN,
  additionalData: any = {}
): Partial<Request> => {
  return {
    user: {
      userId,
      role,
      sessionVersion: 1,
      ...additionalData,
    },
    headers: {
      authorization: `Bearer ${generateToken(userId, role)}`,
    },
    cookies: {},
    ...additionalData,
  };
};

/**
 * Mock unauthenticated request
 */
export const mockUnauthRequest = (additionalData: any = {}): Partial<Request> => {
  return {
    user: undefined,
    headers: {},
    cookies: {},
    ...additionalData,
  };
};

/**
 * Mock response object for middleware testing
 */
export const mockResponse = (): Partial<Response> => {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    cookie: jest.fn().mockReturnThis(),
    clearCookie: jest.fn().mockReturnThis(),
    redirect: jest.fn().mockReturnThis(),
    locals: {},
  };
  return res;
};

/**
 * Mock next function for middleware testing
 */
export const mockNext = (): jest.Mock => {
  return jest.fn();
};

/**
 * Create full mock request with body, params, query
 */
export const createMockRequest = (options: {
  user?: any;
  body?: any;
  params?: any;
  query?: any;
  headers?: any;
  cookies?: any;
  method?: string;
  path?: string;
} = {}): Partial<Request> => {
  return {
    user: options.user,
    body: options.body || {},
    params: options.params || {},
    query: options.query || {},
    headers: options.headers || {},
    cookies: options.cookies || {},
    method: options.method || 'GET',
    path: options.path || '/',
    get: jest.fn((name: string) => options.headers?.[name.toLowerCase()]),
  };
};

/**
 * Generate tokens for all roles
 */
export const generateRoleTokens = (userId: string = 'test-user-id') => {
  return {
    admin: generateToken(userId, UserRole.ADMIN),
    judge: generateToken(userId, UserRole.JUDGE),
    contestant: generateToken(userId, UserRole.CONTESTANT),
    emcee: generateToken(userId, UserRole.EMCEE),
    tallyMaster: generateToken(userId, UserRole.TALLY_MASTER),
    auditor: generateToken(userId, UserRole.AUDITOR),
  };
};

/**
 * Test user credentials
 */
export const testCredentials = {
  valid: {
    email: 'test@example.com',
    password: 'TestPass123!',
  },
  invalid: {
    email: 'invalid@example.com',
    password: 'wrongpassword',
  },
  weakPassword: {
    email: 'test@example.com',
    password: '123',
  },
  invalidEmail: {
    email: 'not-an-email',
    password: 'TestPass123!',
  },
};

/**
 * Mock CSRF token for testing
 */
export const mockCsrfToken = (): string => {
  return 'mock-csrf-token-for-testing';
};

/**
 * Mock session data
 */
export const mockSession = (userId: string, role: UserRole = UserRole.ADMIN) => {
  return {
    userId,
    role,
    sessionVersion: 1,
    createdAt: new Date(),
    lastActivity: new Date(),
  };
};

/**
 * Assert authentication headers are present
 */
export const assertAuthHeaders = (headers: any) => {
  expect(headers).toHaveProperty('authorization');
  expect(headers.authorization).toMatch(/^Bearer /);
};

/**
 * Assert token structure is valid
 */
export const assertValidToken = (token: string) => {
  const decoded = jwt.decode(token);
  expect(decoded).toBeTruthy();
  expect(decoded).toHaveProperty('userId');
  expect(decoded).toHaveProperty('role');
  expect(decoded).toHaveProperty('sessionVersion');
};

/**
 * Generate authentication header
 */
export const authHeader = (token: string): { authorization: string } => {
  return {
    authorization: `Bearer ${token}`,
  };
};

/**
 * Generate basic auth header
 */
export const basicAuthHeader = (username: string, password: string): { authorization: string } => {
  const encoded = Buffer.from(`${username}:${password}`).toString('base64');
  return {
    authorization: `Basic ${encoded}`,
  };
};
