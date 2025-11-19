/**
 * Jest Setup File
 * This file runs before all tests to configure the testing environment
 */

// IMPORTANT: Set environment variables FIRST before any imports
// This ensures database and other configs can read them during initialization
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://event_manager:password@localhost:5432/event_manager_test?schema=public';

// Disable file logging in tests to avoid permission issues
process.env.DISABLE_FILE_LOGGING = 'true';

// Redis configuration for tests
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
process.env.REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';

// Now import dependencies (they will use the env vars set above)
import 'reflect-metadata'; // Required for tsyringe dependency injection
import '../src/config/container'; // Initialize dependency injection container

// Global test timeout
jest.setTimeout(30000); // Increased timeout for integration tests

beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
});
