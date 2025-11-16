/**
 * Jest Setup File
 * This file runs before all tests to configure the testing environment
 */

import 'reflect-metadata'; // Required for tsyringe dependency injection
import '../src/config/container'; // Initialize dependency injection container

// Set up environment variables for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://event_manager:password@localhost:5432/event_manager_test?schema=public';

// Disable file logging in tests to avoid permission issues
process.env.DISABLE_FILE_LOGGING = 'true';

// Global test timeout
jest.setTimeout(30000); // Increased timeout for integration tests

beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
});
