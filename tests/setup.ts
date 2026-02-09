/**
 * Jest Setup File
 * This file runs before all tests to configure the testing environment
 */

// IMPORTANT: Set environment variables FIRST before any imports
// This ensures database and other configs can read them during initialization
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://event_manager:dittibop@localhost:5432/event_manager_test?schema=public';

// Disable file logging in tests to avoid permission issues
process.env.DISABLE_FILE_LOGGING = 'true';

// Redis configuration for tests
process.env.REDIS_HOST = process.env.REDIS_HOST || 'localhost';
process.env.REDIS_PORT = process.env.REDIS_PORT || '6379';
process.env.REDIS_PASSWORD = process.env.REDIS_PASSWORD || '';

// Limit database connections for tests to prevent pool exhaustion
process.env.DATABASE_POOL_SIZE = '5';

// Now import dependencies (they will use the env vars set above)
import 'reflect-metadata'; // Required for tsyringe dependency injection
import { PrismaClient } from '@prisma/client';
import '../src/config/container'; // Initialize dependency injection container

// Global test timeout
jest.setTimeout(30000); // Increased timeout for integration tests

// Singleton PrismaClient for tests to prevent connection pool exhaustion
let prismaClientInstance: PrismaClient | null = null;

export function getTestPrismaClient(): PrismaClient {
  if (!prismaClientInstance) {
    prismaClientInstance = new PrismaClient({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      log: process.env.DEBUG_TESTS === 'true' ? ['query', 'error', 'warn'] : ['error'],
    });
  }
  return prismaClientInstance;
}

beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
});

// Global cleanup after all tests complete
afterAll(async () => {
  // Disconnect Prisma client
  if (prismaClientInstance) {
    await prismaClientInstance.$disconnect();
    prismaClientInstance = null;
  }

  // Force garbage collection if available (helps with connection cleanup)
  if (global.gc) {
    global.gc();
  }

  // Small delay to allow async cleanup to complete
  await new Promise(resolve => setTimeout(resolve, 100));
});
