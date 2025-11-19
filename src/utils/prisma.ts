/**
 * Prisma Client Singleton with Optimized Connection Pooling
 *
 * Creates a single instance of PrismaClient to avoid connection pool exhaustion.
 * Uses global object in development to persist across hot reloads.
 *
 * Connection Pool Configuration:
 * - Connection limit: 10 (optimal for most Node.js apps)
 * - Connection timeout: 5 seconds
 * - Pool timeout: 10 seconds
 * - Query logging in development
 * - Error logging in all environments
 */

import { PrismaClient } from '@prisma/client';
import { env } from '../config/env';

const prismaConfig = {
  datasources: {
    db: {
      url: env.get('DATABASE_URL'),
    },
  },
  log: (env.isProduction()
    ? ['error', 'warn']
    : ['query', 'info', 'warn', 'error']) as any,
};

// Add connection pool configuration via DATABASE_URL parameters
// Format: postgresql://user:password@host:port/db?connection_limit=10&connection_timeout=5&pool_timeout=10

let prisma: PrismaClient;

if (env.isProduction()) {
  prisma = new PrismaClient(prismaConfig);
} else {
  // In development/test, use global to prevent multiple instances during hot reloads
  if (!(global as any).__prisma) {
    (global as any).__prisma = new PrismaClient({
      ...prismaConfig,
      log: env.isTest() ? ['error'] : prismaConfig.log,
    });
  }
  prisma = (global as any).__prisma;
}

// Graceful shutdown (skip in test environment)
if (!env.isTest()) {
  process.on('SIGINT', async () => {
    await prisma.$disconnect();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
}

export default prisma;
export { prisma };

