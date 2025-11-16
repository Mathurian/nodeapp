/**
 * Mock Data Helpers for Testing
 */

import { User, UserRole, Event, Contest, Category } from '@prisma/client';

/**
 * Create a mock user for testing
 */
export const createMockUser = (overrides?: Partial<User>): User => {
  return {
    id: 'user-123',
    name: 'testuser',
    email: 'test@example.com',
    password: 'hashed-password',
    preferredName: 'Test User',
    role: UserRole.ADMIN,
    isActive: true,
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    lastLoginAt: null,
    gender: null,
    pronouns: null,
    judgeId: null,
    contestantId: null,
    sessionVersion: 1,
    judgeBio: null,
    judgeSpecialties: null,
    judgeCertifications: null,
    contestantBio: null,
    contestantNumber: null,
    contestantAge: null,
    contestantSchool: null,
    bio: null,
    imagePath: null,
    phone: null,
    address: null,
    city: null,
    state: null,
    country: null,
    timezone: 'UTC',
    language: 'en',
    notifications: null,
    smsPhone: null,
    smsEnabled: false,
    privacy: null,
    navigationPreferences: null,
    ...overrides,
  } as User;
};

/**
 * Create a mock user without sensitive fields
 */
export const createSanitizedMockUser = (overrides?: Partial<Omit<User, 'password'>>): Omit<User, 'password'> => {
  const user = createMockUser(overrides as Partial<User>);
  const { password, ...sanitized } = user;
  return sanitized;
};

/**
 * Create a mock event for testing
 */
export const createMockEvent = (overrides?: Partial<Event>): Partial<Event> => {
  return {
    id: 'event-123',
    name: 'Test Event',
    description: 'Test event description',
    startDate: new Date('2024-06-01'),
    endDate: new Date('2024-06-03'),
    location: 'Test Venue',
    status: 'DRAFT',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
};

/**
 * Create a mock contest for testing
 */
export const createMockContest = (overrides?: Partial<Contest>): Partial<Contest> => {
  return {
    id: 'contest-123',
    name: 'Test Contest',
    eventId: 'event-123',
    description: 'Test contest description',
    date: new Date('2024-06-01'),
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
};

/**
 * Create a mock category for testing
 */
export const createMockCategory = (overrides?: Partial<Category>): Partial<Category> => {
  return {
    id: 'category-123',
    name: 'Test Category',
    contestId: 'contest-123',
    createdAt: new Date('2024-01-01'),
    updatedAt: new Date('2024-01-01'),
    ...overrides,
  };
};

/**
 * Valid test credentials
 */
export const validCredentials = {
  email: 'test@example.com',
  password: 'TestPass123!',
};

/**
 * Invalid test credentials
 */
export const invalidCredentials = {
  email: 'invalid@example.com',
  password: 'wrongpassword',
};

/**
 * Sample valid user registration data
 */
export const validUserData = {
  email: 'newuser@example.com',
  name: 'newuser',
  preferredName: 'New User',
  password: 'SecurePass123!',
  role: 'CONTESTANT' as UserRole,
};

/**
 * Sample valid event data
 */
export const validEventData = {
  name: 'Summer Dance Competition',
  description: 'Annual summer dance competition',
  startDate: new Date('2024-07-01'),
  endDate: new Date('2024-07-03'),
  location: 'Convention Center',
  status: 'DRAFT',
};

/**
 * Sample valid contest data
 */
export const validContestData = {
  name: 'Junior Ballet',
  description: 'Ballet competition for junior dancers',
  date: new Date('2024-07-01'),
};

/**
 * Sample valid category data
 */
export const validCategoryData = {
  name: 'Solo Performance',
  description: 'Individual solo performance category',
};
