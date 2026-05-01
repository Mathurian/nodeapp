/**
 * Jest Setup File
 * This file runs before all tests to configure the testing environment
 */

// IMPORTANT: Set environment variables FIRST before any imports
// This ensures database and other configs can read them during initialization
// Note: PRISMA_QUERY_ENGINE_LIBRARY is set in jest.globalMocks.ts (runs first)
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-key-for-testing';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'test-session-secret';
process.env.CSRF_SECRET = process.env.CSRF_SECRET || 'test-csrf-secret';
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL || 'postgresql://event_manager:dittibop@localhost:5432/event_manager_test?schema=public';
process.env.TENANT_DEFAULT_SLUGS = process.env.TENANT_DEFAULT_SLUGS
  ? `${process.env.TENANT_DEFAULT_SLUGS},test-utils-tenant`
  : 'test-utils-tenant';

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
      log: process.env.DEBUG_TESTS === 'true' ? ['query', 'error', 'warn'] : [],
    });
  }
  return prismaClientInstance;
}

beforeEach(() => {
  // Reset mocks before each test
  jest.clearAllMocks();
});

function requireLoadedModule<T>(modulePath: string): T | null {
  try {
    const resolvedPath = require.resolve(modulePath);
    if (!require.cache[resolvedPath]) {
      return null;
    }

    return require(resolvedPath) as T;
  } catch {
    return null;
  }
}

async function cleanupBackgroundResources(): Promise<void> {
  const cleanupTasks: Promise<unknown>[] = [];

  const eventBusModule = requireLoadedModule<{
    default?: { shutdown?: () => Promise<void> };
  }>('../src/services/EventBusService');
  if (eventBusModule?.default?.shutdown) {
    cleanupTasks.push(eventBusModule.default.shutdown());
  }

  const queueServiceModule = requireLoadedModule<{
    default?: { shutdown?: () => Promise<void> };
  }>('../src/services/QueueService');
  if (queueServiceModule?.default?.shutdown) {
    cleanupTasks.push(queueServiceModule.default.shutdown());
  }

  const redisCacheModule = requireLoadedModule<{
    disconnectCacheService?: () => Promise<void>;
  }>('../src/services/RedisCacheService');
  if (redisCacheModule?.disconnectCacheService) {
    cleanupTasks.push(redisCacheModule.disconnectCacheService());
  }

  const idempotencyStoreModule = requireLoadedModule<{
    disconnectIdempotencyStoreCache?: () => Promise<void>;
  }>('../src/services/idempotency/IdempotencyStore');
  if (idempotencyStoreModule?.disconnectIdempotencyStoreCache) {
    cleanupTasks.push(idempotencyStoreModule.disconnectIdempotencyStoreCache());
  }

  const databaseModule = requireLoadedModule<{
    rawPrisma?: { $disconnect?: () => Promise<void> };
  }>('../src/config/database');
  if (databaseModule?.rawPrisma?.$disconnect) {
    cleanupTasks.push(databaseModule.rawPrisma.$disconnect());
  }

  const cleanupResults = await Promise.allSettled(cleanupTasks);
  cleanupResults.forEach((result) => {
    if (result.status === 'rejected') {
      console.warn('Jest background resource cleanup failed:', result.reason);
    }
  });
}

// Global cleanup after all tests complete
afterAll(async () => {
  await cleanupBackgroundResources();

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
